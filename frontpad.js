require('dotenv').config();
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/frontpad.log' }),
        new winston.transports.Console()
    ]
});

const FRONTPAD_API_URL = 'https://app.frontpad.ru/api/index.php?new_order';
const FRONTPAD_SECRET_NNOVGOROD = process.env.FRONTPAD_SECRET_NNOVGOROD;
const FRONTPAD_SECRET_KOVROV = process.env.FRONTPAD_SECRET_KOVROV;

function getFrontpadSecret(city) {
    if (city === 'nnovgorod') {
        if (!FRONTPAD_SECRET_NNOVGOROD) {
            logger.error('FRONTPAD_SECRET_NNOVGOROD not set in environment');
            return null;
        }
        return FRONTPAD_SECRET_NNOVGOROD;
    } else if (city === 'kovrov') {
        if (!FRONTPAD_SECRET_KOVROV) {
            logger.error('FRONTPAD_SECRET_KOVROV not set in environment');
            return null;
        }
        return FRONTPAD_SECRET_KOVROV;
    }
    logger.error('Invalid city for Frontpad secret', { city });
    return null;
}

function parseAddress(orderData) {
    const address = orderData.address || '';
    let street = orderData.street || '';
    let home = orderData.home || '';

    if (address && (!street || !home)) {
        const parts = address.split(',').map(part => part.trim());
        for (const part of parts) {
            if (!street && (part.includes('проспект') || part.includes('улица') || part.includes('ул.') || part.includes('пр-кт'))) {
                street = part.slice(0, 50);
            }
            else if (!home && (part.match(/^\d+[А-Яа-яA-Za-z]?$/) || part.includes('д.') || part.includes('дом'))) {
                home = part.replace(/д\.|дом/i, '').trim().slice(0, 50);
            }
        }
    }

    return {
        street: street.slice(0, 50),
        home: home.slice(0, 50),
        apart: (orderData.apart || '').slice(0, 50),
        pod: (orderData.pod || '').slice(0, 2),
        et: (orderData.et || '').slice(0, 2)
    };
}

function getPaymentValue(paymentMethod, city) {
    const paymentMap = {
        'Наличными': 1,
        'Картой при получении': 2,
        'Перевод на карту': city === 'kovrov' ? 317 : 1396
    };
    const payValue = paymentMap[paymentMethod];
    if (!payValue) {
        logger.warn('Unknown payment method, defaulting to cash', { payment_method: paymentMethod });
        return 1;
    }
    return payValue;
}

function validatePreOrderDatetime(deliveryTime) {
    if (deliveryTime === 'now') return null;

    const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!datetimeRegex.test(deliveryTime)) {
        logger.warn('Invalid datetime format for pre-order', { deliveryTime });
        return null;
    }

    const orderDate = new Date(deliveryTime);
    const now = new Date();
    const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    if (isNaN(orderDate.getTime())) {
        logger.warn('Invalid datetime value', { deliveryTime });
        return null;
    }

    if (orderDate <= now) {
        logger.warn('Pre-order time is in the past or now', { deliveryTime });
        return null;
    }

    if (orderDate > maxDate) {
        logger.warn('Pre-order time exceeds 30-day limit', { deliveryTime });
        return null;
    }

    return deliveryTime;
}

async function submitOrderToFrontpad(orderData, dbNnovgorod, dbKovrov) {
    const city = orderData.city;
    const frontpadSecret = getFrontpadSecret(city);

    if (!frontpadSecret) {
        logger.error('No Frontpad secret defined for city', { city });
        return { success: false, error: 'Frontpad secret not configured for this city' };
    }

    if (!orderData.products || !Array.isArray(orderData.products) || orderData.products.length === 0) {
        logger.error('Invalid or empty products array', { city, products: orderData.products });
        return { success: false, error: 'No valid products provided' };
    }

    const db = city === 'nnovgorod' ? dbNnovgorod : city === 'kovrov' ? dbKovrov : null;
    if (!db) {
        logger.error('No database available for city', { city });
        return { success: false, error: 'Invalid city for database' };
    }

    try {
        const articles = orderData.products.map(p => p.article).filter(a => a);
        if (articles.length !== orderData.products.length) {
            logger.error('Missing articles in products', { city, products: orderData.products });
            return { success: false, error: 'Some products are missing articles' };
        }

        const placeholders = articles.map(() => '?').join(',');
        const validArticles = await new Promise((resolve, reject) => {
            db.all(`SELECT article FROM products WHERE article IN (${placeholders})`, articles, (err, rows) => {
                if (err) reject(err);
                resolve(rows.map(row => row.article));
            });
        });

        const invalidArticles = articles.filter(article => !validArticles.includes(article));
        if (invalidArticles.length > 0) {
            logger.error('Invalid product articles', { invalidArticles, city });
            return { success: false, error: `Invalid product articles: ${invalidArticles.join(', ')}`, invalidArticles };
        }

        const parsedAddress = parseAddress(orderData);
        const datetime = validatePreOrderDatetime(orderData.delivery_time);
        const frontpadData = {
            secret: frontpadSecret,
            product: orderData.products.map(p => p.article),
            product_kol: orderData.products.map(p => Math.max(1, Math.floor(p.quantity))),
            street: parsedAddress.street,
            home: parsedAddress.home,
            apart: parsedAddress.apart,
            pod: parsedAddress.pod,
            et: parsedAddress.et,
            phone: (orderData.phone_number || '').replace(/\D/g, '').slice(0, 50),
            descr: (orderData.comments || '').slice(0, 100),
            name: (orderData.customer_name || 'Клиент').slice(0, 50),
            person: String(Math.max(0, orderData.utensils_count || 0)).slice(0, 2),
            pay: getPaymentValue(orderData.payment_method, city),
            channel: '1',
            ...(city === 'kovrov' && { affiliate: '133' }),
            ...(orderData.discount_type === 'promo_code' && orderData.discount_percentage > 0 && { sale: orderData.discount_percentage }),
            ...(orderData.discount_type === 'certificate' && orderData.discount_code && { certificate: orderData.discount_code }),
            ...(datetime && { datetime })
        };

        logger.info('Submitting order to Frontpad', { city, frontpadData: { ...frontpadData, secret: '[REDACTED]' } });

        const response = await axios.post(FRONTPAD_API_URL, frontpadData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: [(data) => {
                return Object.entries(data)
                    .map(([key, value]) => {
                        if (Array.isArray(value)) {
                            return value.map((val, index) => `${key}[${index}]=${encodeURIComponent(val)}`).join('&');
                        }
                        return `${key}=${encodeURIComponent(value)}`;
                    })
                    .join('&');
            }],
            timeout: 10000
        });

        const result = response.data;
        logger.info('Frontpad API response', { city, response: result, status: response.status });

        if (result.result === 'success' && result.order_id) {
            if (!/^\d+$/.test(result.order_id)) {
                logger.error('Invalid frontpad_order_id format', { order_id: result.order_id, city });
                return { success: false, error: 'Invalid order ID format from Frontpad' };
            }

            const existingOrder = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM orders WHERE frontpad_order_id = ?', [result.order_id], (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                });
            });

            if (existingOrder) {
                logger.error('Duplicate frontpad_order_id detected', {
                    order_id: result.order_id,
                    existing_order_id: existingOrder.id,
                    city
                });
                return {
                    success: false,
                    error: 'Duplicate order ID from Frontpad',
                    details: { order_id: result.order_id, existing_order_id: existingOrder.id }
                };
            }

            logger.info('Order successfully submitted to Frontpad', {
                order_id: result.order_id,
                order_number: result.order_number,
                city,
                warnings: result.warnings || null
            });

            return {
                success: true,
                frontpad_order_id: result.order_id,
                order_number: result.order_number,
                warnings: result.warnings || null
            };
        }

        logger.error('Frontpad API returned error', { city, result, warnings: result.warnings || null });
        return {
            success: false,
            error: result.error || 'Invalid response from Frontpad',
            warnings: result.warnings || null,
            response: result
        };
    } catch (error) {
        logger.error('Error submitting order to Frontpad', {
            city,
            error: error.message,
            stack: error.stack,
            requestData: { ...orderData, secret: '[REDACTED]' }
        });

        return {
            success: false,
            error: error.response?.data?.error || error.message || 'Failed to submit order to Frontpad'
        };
    }
}

module.exports = { submitOrderToFrontpad };