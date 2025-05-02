document.addEventListener('DOMContentLoaded', () => {
    const ordersDiv = document.getElementById('orders');
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    console.log('Using BASE_URL:', BASE_URL);

    async function fetchProductPrices(articles) {
        // Ensure articles is a valid, non-empty array
        if (!Array.isArray(articles) || articles.length === 0) {
            console.warn('No valid articles to fetch prices for:', articles);
            return {};
        }

        try {
            const response = await fetch(`${BASE_URL}/product-prices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articles })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            // Handle warning for invalid/empty articles
            if (data.warning) {
                console.warn('Server returned warning:', data.warning);
                return data.prices || {};
            }
            return data;
        } catch (error) {
            console.error('Error fetching product prices:', error);
            return {};
        }
    }

    async function fetchAllOrders(attempt = 1) {
        try {
            const response = await fetch(`${BASE_URL}/orders/history`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const orders = await response.json();
            console.log('Fetched orders:', orders);
            if (!Array.isArray(orders)) throw new Error('Invalid response: orders is not an array');
            ordersDiv.innerHTML = '';
            if (orders.length === 0) {
                ordersDiv.innerHTML = '<p>Нет заказов</p>';
            } else {
                for (const order of orders) {
                    const orderElement = await createOrderElement(order);
                    ordersDiv.appendChild(orderElement);
                }
            }
        } catch (error) {
            console.error(`Error fetching orders (attempt ${attempt}):`, error);
            if (attempt < MAX_RETRIES) {
                console.log(`Retrying in ${RETRY_DELAY}ms...`);
                setTimeout(() => fetchAllOrders(attempt + 1), RETRY_DELAY);
            } else {
                ordersDiv.innerHTML = `<p>Ошибка загрузки заказов: ${error.message}. Пожалуйста, проверьте сервер и endpoint /orders/history.</p>`;
            }
        }
    }

    async function createOrderElement(order) {
        const div = document.createElement('div');
        div.className = 'order';
        let products = [];
        if (order.products) {
            try {
                products = JSON.parse(order.products);
                if (!Array.isArray(products)) throw new Error('Products is not an array');
            } catch (e) {
                console.error(`Invalid products JSON for order ${order.id}:`, order.products, e);
                products = [];
            }
        }
        const productList = products.length > 0 ? products.map(p => `${p.article} x ${p.quantity}`).join(', ') : 'Нет товаров';

        // Calculate total price
        const articles = products.map(p => p.article).filter(article => article); // Filter out invalid articles
        const priceMap = await fetchProductPrices(articles);
        let totalPrice = 0;
        products.forEach(p => {
            const price = priceMap[p.article] || 0;
            totalPrice += price * p.quantity;
        });

        div.innerHTML = `
            <h3>Заказ #${order.id}</h3>
            <p><strong>Имя:</strong> ${order.customer_name || 'N/A'}</p>
            <p><strong>Телефон:</strong> ${order.phone_number || 'N/A'}</p>
            <p><strong>Тип доставки:</strong> ${order.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'}</p>
            <p><strong>Адрес:</strong> ${order.address || 'N/A'}</p>
            <p><strong>Оплата:</strong> ${order.payment_method || 'N/A'}</p>
            <p><strong>Время доставки:</strong> ${order.delivery_time || 'N/A'}</p>
            <p><strong>Комментарий:</strong> ${order.comments || 'Нет'}</p>
            <p><strong>Приборы:</strong> ${order.utensils_count != null ? order.utensils_count : '0'}</p>
            <p><strong>Товары:</strong> ${productList}</p>
            <p><strong>Итоговая сумма:</strong> ${Math.floor(totalPrice)} ₽</p>
            <p><strong>Статус:</strong> ${order.status || 'Неизвестно'}</p>
            <p><strong>Создан:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
        `;
        return div;
    }

    fetchAllOrders();
    setInterval(() => fetchAllOrders(), 10000);
});