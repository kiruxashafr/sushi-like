document.addEventListener('DOMContentLoaded', () => {
    const ordersContainer = document.getElementById('orders');
    const manageCategoriesButton = document.getElementById('manageCategoriesButton');
    const categoriesModal = document.getElementById('categoriesModal');
    const closeCategoriesModal = document.getElementById('closeCategoriesModal');
    const categoriesModalOverlay = document.getElementById('categoriesModalOverlay');
    const categoriesList = document.getElementById('categoriesList');
    const saveCategoriesButton = document.getElementById('saveCategoriesButton');
    const managePromoCodesButton = document.getElementById('managePromoCodesButton');
    const promoCodesModal = document.getElementById('promoCodesModal');
    const closePromoCodesModal = document.getElementById('closePromoCodesModal');
    const promoCodesModalOverlay = document.getElementById('promoCodesModalOverlay');
    const newPromoCodeInput = document.getElementById('newPromoCode');
    const newPromoDiscountInput = document.getElementById('newPromoDiscount');
    const addPromoCodeButton = document.getElementById('addPromoCodeButton');
    const promoCodesList = document.getElementById('promoCodesList');

    // Toggle modal visibility
    function toggleModal(modal, overlay, show) {
        modal.classList.toggle('active', show);
        overlay.classList.toggle('active', show);
    }

    // Fetch and display orders
    async function fetchOrders() {
        try {
            const response = await fetch('/orders/history');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const orders = await response.json();
            renderOrders(orders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersContainer.innerHTML = '<p>Ошибка загрузки заказов.</p>';
        }
    }

    // Helper function to format created_at string to DD.MM.YYYY, HH:MM:SS
    function formatMoscowTime(created_at) {
        // Input format: YYYY-MM-DD HH:MM:SS
        console.log('Formatting created_at:', created_at); // Log raw created_at
        const [date, time] = created_at.split(' ');
        const [year, month, day] = date.split('-');
        return `${day}.${month}.${year}, ${time}`;
    }

    // Render orders
    function renderOrders(orders) {
        ordersContainer.innerHTML = '';
        orders.forEach(order => {
            console.log('Raw created_at from server:', order.created_at); // Log raw created_at
            const products = JSON.parse(order.products);
            const productList = products.map(p => `${p.article} (x${p.quantity})`).join(', ');
            const orderElement = document.createElement('div');
            orderElement.className = 'order';
            orderElement.innerHTML = `
                <h3>Заказ #${order.id}</h3>
                <p><strong>Клиент:</strong> ${order.customer_name}</p>
                <p><strong>Телефон:</strong> ${order.phone_number}</p>
                <p><strong>Тип доставки:</strong> ${order.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'}</p>
                ${order.address ? `<p><strong>Адрес:</strong> ${order.address}</p>` : ''}
                <p><strong>Способ оплаты:</strong> ${order.payment_method}</p>
                <p><strong>Время доставки:</strong> ${order.delivery_time}</p>
                ${order.comments ? `<p><strong>Комментарий:</strong> ${order.comments}</p>` : ''}
                <p><strong>Приборы:</strong> ${order.utensils_count}</p>
                <p><strong>Товары:</strong> ${productList}</p>
                ${order.promo_code ? `<p><strong>Промокод:</strong> ${order.promo_code} (${order.discount_percentage}%)</p>` : ''}
                <p><strong>Итоговая сумма:</strong> ${order.total_price.toFixed(2)} ₽</p>
                ${order.discounted_price !== null ? `<p><strong>Сумма со скидкой:</strong> <span class="discount">${order.discounted_price.toFixed(2)} ₽</span></p>` : ''}
                <p><strong>Статус:</strong> ${order.status}</p>
                <p><strong>Создан:</strong> ${formatMoscowTime(order.created_at)}</p>
            `;
            ordersContainer.appendChild(orderElement);
        });
    }

    // Fetch and display categories
    async function fetchCategories() {
        try {
            const response = await fetch('/categories/priorities');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const categories = await response.json();
            renderCategories(categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
            categoriesList.innerHTML = '<p>Ошибка загрузки категорий.</p>';
        }
    }

    // Render categories
    function renderCategories(categories) {
        categoriesList.innerHTML = '';
        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <span>${category.category}</span>
                <input type="number" value="${category.order_priority}" min="1" data-category="${category.category}">
            `;
            categoriesList.appendChild(categoryItem);
        });
    }

    // Save category priorities
    async function saveCategories() {
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
            toggleModal(categoriesModal, categoriesModalOverlay, false);
        } catch (error) {
            console.error('Error saving categories:', error);
            alert('Ошибка при сохранении категорий.');
        }
    }

    // Fetch and display promo codes
    async function fetchPromoCodes() {
        try {
            const response = await fetch('/promo-codes');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const promoCodes = await response.json();
            renderPromoCodes(promoCodes);
        } catch (error) {
            console.error('Error fetching promo codes:', error);
            promoCodesList.innerHTML = '<p>Ошибка загрузки промокодов.</p>';
        }
    }

    // Render promo codes
    function renderPromoCodes(promoCodes) {
        promoCodesList.innerHTML = '';
        promoCodes.forEach(promo => {
            const promoItem = document.createElement('div');
            promoItem.className = 'promo-code-item';
            promoItem.innerHTML = `
                <span>${promo.code} (${promo.discount_percentage}%)</span>
                <button class="delete-promo-button" data-id="${promo.id}">Удалить</button>
            `;
            promoCodesList.appendChild(promoItem);
        });

        // Add delete event listeners
        promoCodesList.querySelectorAll('.delete-promo-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                try {
                    const response = await fetch('/promo-codes/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id })
                    });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    fetchPromoCodes();
                } catch (error) {
                    console.error('Error deleting promo code:', error);
                    alert('Ошибка при удалении промокода.');
                }
            });
        });
    }

    // Add new promo code
    async function addPromoCode() {
        const code = newPromoCodeInput.value.trim();
        const discount = parseInt(newPromoDiscountInput.value);
        if (!code || isNaN(discount) || discount <= 0 || discount > 100) {
            alert('Введите корректный промокод и процент скидки (1-100).');
            return;
        }

        try {
            const response = await fetch('/promo-codes/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, discount_percentage: discount })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            newPromoCodeInput.value = '';
            newPromoDiscountInput.value = '';
            fetchPromoCodes();
        } catch (error) {
            console.error('Error adding promo code:', error);
            alert('Ошибка при добавлении промокода.');
        }
    }

    // Event listeners
    manageCategoriesButton.addEventListener('click', () => {
        toggleModal(categoriesModal, categoriesModalOverlay, true);
        fetchCategories();
    });

    closeCategoriesModal.addEventListener('click', () => {
        toggleModal(categoriesModal, categoriesModalOverlay, false);
    });

    categoriesModalOverlay.addEventListener('click', () => {
        toggleModal(categoriesModal, categoriesModalOverlay, false);
    });

    saveCategoriesButton.addEventListener('click', saveCategories);

    managePromoCodesButton.addEventListener('click', () => {
        toggleModal(promoCodesModal, promoCodesModalOverlay, true);
        fetchPromoCodes();
    });

    closePromoCodesModal.addEventListener('click', () => {
        toggleModal(promoCodesModal, promoCodesModalOverlay, false);
    });

    promoCodesModalOverlay.addEventListener('click', () => {
        toggleModal(promoCodesModal, promoCodesModalOverlay, false);
    });

    addPromoCodeButton.addEventListener('click', addPromoCode);

    // Initial fetch
    fetchOrders();
});