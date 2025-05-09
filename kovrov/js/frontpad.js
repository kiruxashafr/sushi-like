const fetch = require('node-fetch');

const FRONTPAD_API_URL = 'https://app.frontpad.ru/api/index.php?new_order';
const FRONTPAD_SECRET = 'zN3KRsnbn2TA7k36DDyAayEH6BKentTK6GiK3ANbkyDfGrb9TzzTS4sKr5SFiAee6sRTRsZ4Nk9hEafiAF5ezhSNazfkZntSF9Bhrka4Aa95bfbDQ6G9dkNeKTtz7NbDKDN3QQSbQS6R37fD4QD74bbDZy2T83hHsYA6zd8aZ4SK22bQBEKsGNTs8Ga7zhEQ64Hr7FrSz7shYy2h3ADy9iQ8SQ5dZyTRkr7fZk3fhfs5DdbrDENDQnBy4s';
const WEBHOOK_URL = 'https://chibbis.ru/orders-integration/api/hook/order-status/frontpad';

async function submitOrderToFrontpad(orderData) {
    const frontpadData = {
        secret: FRONTPAD_SECRET,
        product: orderData.products.map(p => p.article),
        product_kol: orderData.products.map(p => p.quantity),
        name: orderData.customer_name,
        phone: orderData.phone_number,
        street: orderData.street || '',
        home: orderData.home || '',
        apart: orderData.apart || '',
        pod: orderData.pod || '',
        et: orderData.et || '',
        pay: {
            'Наличными': 1,
            'Картой при получении': 2,
            'Перевод на карту': 3
        }[orderData.payment_method] || 1,
        descr: orderData.comments || '',
        hook_url: WEBHOOK_URL
    };

    if (orderData.discount_percentage) {
        frontpadData.sale = orderData.discount_percentage;
    }

    if (orderData.delivery_time !== 'now') {
        frontpadData.datetime = orderData.delivery_time;
    }

    try {
        const response = await fetch(FRONTPAD_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(frontpadData).toString()
        });

        const result = await response.json();
        if (result.result === 'success') {
            return {
                success: true,
                order_id: result.order_id,
                order_number: result.order_number
            };
        } else {
            console.error('Frontpad API error:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('Error submitting to Frontpad:', error.message);
        return { success: false, error: 'Network error' };
    }
}

function updateOrderStatus(dbKovrov, dbNnovgorod, webhookData) {
    const { action, order_id, status, datetime } = webhookData;
    if (action !== 'change_status') return false;

    return new Promise((resolve) => {
        dbKovrov.get('SELECT id FROM orders WHERE frontpad_order_id = ?', [order_id], (err, row) => {
            if (err) {
                console.error('Error querying Kovrov DB:', err.message);
                resolve(false);
                return;
            }
            if (row) {
                dbKovrov.run('UPDATE orders SET status = ? WHERE id = ?', [status, row.id], (updateErr) => {
                    if (updateErr) console.error('Error updating Kovrov DB:', updateErr.message);
                    resolve(!updateErr);
                });
            } else {
                dbNnovgorod.get('SELECT id FROM orders WHERE frontpad_order_id = ?', [order_id], (err, row) => {
                    if (err) {
                        console.error('Error querying Nnovgorod DB:', err.message);
                        resolve(false);
                        return;
                    }
                    if (row) {
                        dbNnovgorod.run('UPDATE orders SET status = ? WHERE id = ?', [status, row.id], (updateErr) => {
                            if (updateErr) console.error('Error updating Nnovgorod DB:', updateErr.message);
                            resolve(!updateErr);
                        });
                    } else {
                        console.warn(`Order ${order_id} not found`);
                        resolve(false);
                    }
                });
            }
        });
    });
}

module.exports = { submitOrderToFrontpad, updateOrderStatus };