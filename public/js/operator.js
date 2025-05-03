document.addEventListener('DOMContentLoaded', () => {
    const ordersDiv = document.getElementById('orders');
    const manageCategoriesButton = document.getElementById('manageCategoriesButton');
    const categoriesModal = document.getElementById('categoriesModal');
    const categoriesList = document.getElementById('categoriesList');
    const saveCategoriesButton = document.getElementById('saveCategoriesButton');
    const closeCategoriesModal = document.getElementById('closeCategoriesModal');
    const categoriesModalOverlay = document.getElementById('categoriesModalOverlay');
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    async function fetchProductPrices(articles) {
        if (!Array.isArray(articles) || articles.length === 0) {
            console.warn('No valid articles to fetch prices for:', articles);
            return {};
        }

        try {
            const response = await fetch('/product-prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articles })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
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
            const response = await fetch('/orders/history');
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
        const articles = products.map(p => p.article).filter(article => article);
        let productList = 'Нет товаров';
        let totalPrice = 0;

        if (articles.length > 0) {
            productList = products.map(p => `${p.article} x ${p.quantity}`).join(', ');
            const priceMap = await fetchProductPrices(articles);
            products.forEach(p => {
                const price = priceMap[p.article] || 0;
                totalPrice += price * p.quantity;
            });
        } else if (products.length > 0) {
            productList = 'Товары с некорректными артикулами';
        }

        div.innerHTML = `
            <h3>Заказ #${order.id}</h3>
            <p><strong>Имя:</strong> ${order.customer_name || 'N/A'}</p>
            <p><strong>Телефон:</strong> ${order.phone_number || 'N/A'}</p>
            <p><strong>Тип доставки:</strong> ${order.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'}</p>
            <p><strong>Адрес:</strong> ${order.address || 'N/A'}</p>
            <p><strong>Оплата:</strong> ${order.payment_method || 'N/A'}</p>
            <p><strong>Время доставки:</strong> ${order.delivery_time || 'N/A'}</p>
            <p><strong>Комментарий:</strong> ${order.comments || 'Нет'}</p>
            <p><strong>Количество персон:</strong> ${order.utensils_count != null ? order.utensils_count : '0'}</p>
            <p><strong>Товары:</strong> ${productList}</p>
            <p><strong>Итоговая сумма:</strong> ${Math.floor(totalPrice)} ₽</p>
            <p><strong>Статус:</strong> ${order.status || 'Неизвестно'}</p>
            <p><strong>Создан:</strong> ${order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
        `;
        return div;
    }

    async function fetchCategoriesWithPriorities(attempt = 1) {
        try {
            const response = await fetch('/categories/priorities');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const categories = await response.json();
            console.log('Fetched categories with priorities:', categories);
            return categories;
        } catch (error) {
            console.error(`Error fetching categories with priorities (attempt ${attempt}):`, error);
            if (attempt < MAX_RETRIES) {
                console.log(`Retrying in ${RETRY_DELAY}ms...`);
                setTimeout(() => fetchCategoriesWithPriorities(attempt + 1), RETRY_DELAY);
                return [];
            } else {
                alert('Не удалось загрузить категории. Проверьте сервер и endpoint /categories/priorities.');
                return [];
            }
        }
    }

    function renderCategoriesModal(categories) {
        categoriesList.innerHTML = '';
        categories.forEach((cat, index) => {
            const div = document.createElement('div');
            div.className = 'category-item';
            div.innerHTML = `
                <span>${cat.category}</span>
                <input type="number" min="1" value="${cat.order_priority !== 999 ? cat.order_priority : index + 1}" data-category="${cat.category}">
            `;
            categoriesList.appendChild(div);
        });
    }

    async function openCategoriesModal() {
        const categories = await fetchCategoriesWithPriorities();
        if (categories.length === 0) {
            categoriesList.innerHTML = '<p>Нет категорий для настройки</p>';
        } else {
            renderCategoriesModal(categories);
        }
        categoriesModal.classList.add('active');
        categoriesModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeCategoriesModalFunc() {
        categoriesModal.classList.remove('active');
        categoriesModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    async function saveCategoriesOrder() {
        const inputs = categoriesList.querySelectorAll('input');
        const priorities = Array.from(inputs).map(input => ({
            category: input.dataset.category,
            order_priority: parseInt(input.value) || 999
        }));

        try {
            const response = await fetch('/categories/priorities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(priorities)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.result === 'success') {
                console.log('Category priorities saved');
                document.dispatchEvent(new Event('categoryOrderUpdated'));
                closeCategoriesModalFunc();
            } else {
                console.error('Failed to save priorities:', result.error);
                alert('Ошибка при сохранении порядка категорий: ' + (result.error || 'Неизвестная ошибка'));
            }
        } catch (error) {
            console.error('Error saving category priorities:', error);
            alert('Ошибка при сохранении порядка категорий: ' + error.message);
        }
    }

    manageCategoriesButton.addEventListener('click', openCategoriesModal);
    closeCategoriesModal.addEventListener('click', closeCategoriesModalFunc);
    categoriesModalOverlay.addEventListener('click', closeCategoriesModalFunc);
    saveCategoriesButton.addEventListener('click', saveCategoriesOrder);

    fetchAllOrders();
    setInterval(() => fetchAllOrders(), 10000);
});