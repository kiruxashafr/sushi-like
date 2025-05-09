require('dotenv').config();
const axios = require('axios');
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
const FRONTPAD_SECRET = process.env.FRONTPAD_SECRET;

// Функция для разбора адреса
function parseAddress(address) {
    if (!address) return { street: '', home: '', apart: '', pod: '', et: '' };

    // Пример: "городской округ Нижний Новгород, Автозаводский район, жилой район Соцгород, микрорайон Соцгород-1, проспект Кирова, 9"
    // Попробуем извлечь улицу и дом, остальное оставим пустым
    const parts = address.split(',');
    let street = '';
    let home = '';

    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('проспект') || trimmed.includes('улица') || trimmed.includes('ул.') || trimmed.includes('пр-кт')) {
            street = trimmed;
        } else if (trimmed.match(/^\d+$/) || trimmed.includes('д.') || trimmed.includes('дом')) {
            home = trimmed.replace(/д\.|дом/, '').trim();
        }
    }

    return {
        street: street || address, // Если не удалось разобрать, отправляем весь адрес в street
        home: home,
        apart: '',
        pod: '',
        et: ''
    };
}

async function submitOrderToFrontpad(orderData, dbNnovgorod) {
    if (orderData.city !== 'nnovgorod') {
        logger.info('Order submission to Frontpad skipped for city:', { city: orderData.city });
        return { success: true };
    }

    if (!FRONTPAD_SECRET) {
        logger.error('FRONTPAD_SECRET is not defined in environment variables');
        return { success: false, error: 'Frontpad secret not configured' };
    }

    // Validate product articles against shop_nnovgorod.db
    const articles = orderData.products.map(p => p.article);
    const placeholders = articles.map(() => '?').join(',');
    let validArticles;
    try {
        validArticles = await new Promise((resolve, reject) => {
            dbNnovgorod.all(`SELECT article FROM products WHERE article IN (${placeholders})`, articles, (err, rows) => {
                if (err) reject(err);
                resolve(rows.map(row => row.article));
            });
        });
    } catch (err) {
        logger.error('Error validating product articles', { error: err.message, stack: err.stack });
        return { success: false, error: 'Database error validating product articles' };
    }

    const invalidArticles = articles.filter(a => !validArticles.includes(a));
    if (invalidArticles.length > 0) {
        logger.error('Invalid product articles', { invalidArticles });
        return { success: false, error: `Invalid product articles: ${invalidArticles.join(', ')}` };
    }

    // Parse address if street is empty
    const addressComponents = parseAddress(orderData.address);

    // Prepare address for logging
    const addressLog = [
        addressComponents.street ? `ул. ${addressComponents.street}` : '',
        addressComponents.home ? `д. ${addressComponents.home}` : '',
        addressComponents.apart ? `кв. ${addressComponents.apart}` : '',
        addressComponents.pod ? `подъезд ${addressComponents.pod}` : '',
        addressComponents.et ? `этаж ${addressComponents.et}` : ''
    ].filter(Boolean).join(', ');

    // Prepare data for Frontpad
    const frontpadData = {
        secret: FRONTPAD_SECRET,
        product: orderData.products.map(p => p.article),
        product_kol: orderData.products.map(p => p.quantity),
        name: orderData.customer_name || 'Клиент',
        phone: orderData.phone_number || '',
        street: addressComponents.street || orderData.street || '',
        home: addressComponents.home || orderData.home || '',
        apart: addressComponents.apart || orderData.apart || '',
        pod: addressComponents.pod || orderData.pod || '',
        et: addressComponents.et || orderData.et || '',
        pay: {
            'Наличными': 1,
            'Картой при получении': 2,
            'Перевод на карту': 3
        }[orderData.payment_method] || 1,
        descr: orderData.comments || '',
        person: orderData.utensils_count || 0,
        channel: '1' // Замените на актуальный код канала продаж
    };

    // Add discount if applicable
    if (orderData.discount_percentage) {
        frontpadData.sale = orderData.discount_percentage;
    }

    // Add pre-order time if not "now"
    if (orderData.delivery_time && orderData.delivery_time !== 'now') {
        frontpadData.datetime = orderData.delivery_time;
    }

    // Log prepared data
    logger.info('Prepared Frontpad data', {
        frontpadData: { ...frontpadData, secret: '[REDACTED]' },
        orderData,
        address: addressLog,
        parsedAddress: addressComponents
    });

    // Prepare request body
    const body = new URLSearchParams();
    Object.entries(frontpadData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((val, index) => {
                body.append(`${key}[${index}]`, val);
            });
        } else {
            body.append(key, value);
        }
    });

    // Log raw request body
    logger.info('Frontpad request body', { rawBody: body.toString() });

    try {
        const response = await axios.post(FRONTPAD_API_URL, body, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 15000
        });

        // Log response
        logger.info('Frontpad API response', {
            status: response.status,
            data: response.data,
            address: addressLog
        });

        if (response.data.result === 'success') {
            logger.info('Order submitted to Frontpad', {
                order_id: response.data.order_id,
                order_number: response.data.order_number,
                address: addressLog
            });
            return {
                success: true,
                frontpad_order_id: response.data.order_id,
                frontpad_order_number: response.data.order_number
            };
        } else {
            logger.error('Frontpad API error', {
                error: response.data.error,
                warnings: response.data.warnings || null
            });
            return { success: false, error: response.data.error || 'Unknown Frontpad error' };
        }
    } catch (error) {
        logger.error('Error submitting to Frontpad', {
            message: error.message,
            code: error.code,
            response: error.response ? {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            } : null
        });
        return { success: false, error: `Network error or Frontpad unavailable: ${error.message}` };
    }
}

module.exports = { submitOrderToFrontpad };