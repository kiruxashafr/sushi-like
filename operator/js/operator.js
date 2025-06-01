document.addEventListener('DOMContentLoaded', () => {
    const ordersContainer = document.getElementById('orders');
    const manageCategoriesButton = document.getElementById('manageCategoriesButton');
    const categoriesModal = document.getElementById('categoriesModal');
    const closeCategoriesModal = document.getElementById('closeCategoriesModal');
    const categoriesModalOverlay = document.getElementById('categoriesModalOverlay');
    const categoriesList = document.getElementById('categoriesList');
    const saveCategoriesButton = document.getElementById('saveCategoriesButton');
    const managePromoCodesButton = document.getElementById('managePromoCodesButton');
    const addPromoCodeButton = document.getElementById('addPromoCodeButton');
    const cancelPromoCodeButton = document.getElementById('cancelPromoCodeButton');
    const promoCodesList = document.getElementById('promoCodesList');
    const citySelect = document.getElementById('citySelect');
    const manageProductsButton = document.getElementById('manageProductsButton');
    const productsModal = document.getElementById('productsModal');
    const closeProductsModal = document.getElementById('closeProductsModal');
    const productsModalOverlay = document.getElementById('productsModalOverlay');
    const viewOrdersButton = document.getElementById('viewOrdersButton');
    const ordersModal = document.getElementById('ordersModal');
    const closeOrdersModal = document.getElementById('closeOrdersModal');
    const ordersModalOverlay = document.getElementById('ordersModalOverlay');
    const dateRangeInput = document.getElementById('dateRange');
    const showOrdersButton = document.getElementById('showOrdersButton');
    const todayOrdersButton = document.getElementById('todayOrdersButton');
    const allOrdersButton = document.getElementById('allOrdersButton');

    let currentCity = citySelect.value;
    let lastOrderId = 0;
    let pollingInterval = null;
    let dateRangePicker;
    let promoDateRangePicker;

    // Initialize date range picker for orders
    dateRangePicker = flatpickr(dateRangeInput, {
        mode: 'range',
        dateFormat: 'Y-m-d',
        locale: 'ru',
        allowInput: true,
        defaultDate: [getTodayDate(), getTodayDate()], // Default to today
        onClose: (selectedDates) => {
            // Do not fetch orders on date selection
        }
    });

    // Initialize date range picker for promo codes
    promoDateRangePicker = flatpickr(document.getElementById('promoDateRange'), {
        mode: 'range',
        dateFormat: 'Y-m-d',
        locale: 'ru',
        allowInput: true
    });

    function getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(fetchNewOrders, 10000);
    }

    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    citySelect.addEventListener('change', () => {
        currentCity = citySelect.value;
        lastOrderId = 0;
        ordersContainer.innerHTML = '';
        fetchCategories();
        fetchPromoCodes();
        fetchProducts();
        startPolling();
    });

    document.getElementById('promoType').addEventListener('change', () => {
        if (document.getElementById('promoType').value === 'discount') {
            document.getElementById('discountFields').style.display = 'block';
            document.getElementById('productFields').style.display = 'none';
        } else {
            document.getElementById('discountFields').style.display = 'none';
            document.getElementById('productFields').style.display = 'block';
        }
    });

    function toggleModal(modal, overlay, show) {
        modal.classList.toggle('active', show);
        overlay.classList.toggle('active', show);
    }

    async function fetchOrders(startDate, endDate) {
        if (!startDate) {
            ordersContainer.innerHTML = '<p>Пожалуйста, выберите период или дату.</p>';
            return;
        }
        endDate = endDate || startDate; // Use startDate if endDate is not provided
        const url = `/api/${currentCity}/orders/history?start_date=${startDate}&end_date=${endDate}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const orders = await response.json();
            renderOrders(orders);
            lastOrderId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) : 0;
        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersContainer.innerHTML = `<p>Ошибка загрузки заказов: ${error.message}</p>`;
        }
    }

    async function fetchTodayOrders() {
        const today = getTodayDate();
        dateRangeInput.value = today;
        dateRangePicker.setDate([today, today]);
        await fetchOrders(today, today);
    }

    async function fetchAllOrders() {
        const startDate = '2025-01-01'; // Adjust as needed
        const endDate = getTodayDate();
        dateRangeInput.value = `${startDate} до ${endDate}`;
        dateRangePicker.setDate([startDate, endDate]);
        await fetchOrders(startDate, endDate);
    }

    async function fetchNewOrders() {
        try {
            const response = await fetch(`/api/${currentCity}/orders/new?last_id=${lastOrderId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const newOrders = await response.json();
            if (newOrders.length > 0) {
                const enrichedOrders = await enrichOrders(newOrders);
                prependOrders(enrichedOrders);
                lastOrderId = Math.max(...newOrders.map(o => o.id));
            }
        } catch (error) {
            console.error('Error fetching new orders:', error);
        }
    }

    async function enrichOrders(orders) {
        return await Promise.all(orders.map(async (order) => {
            let totalPrice = 0;
            let discountedPrice = null;
            let discountPercentage = 0;

            let products;
            try {
                products = JSON.parse(order.products);
                if (!Array.isArray(products)) throw new Error('Products is not an array');
            } catch (e) {
                console.error(`Invalid products data for order ${order.id}:`, e);
                return { ...order, total_price: 0, discounted_price: null, product_names: [] };
            }

            const articles = products.map(p => p.article);
            const priceResponse = await fetch(`/api/${currentCity}/product-prices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articles })
            });
            if (!priceResponse.ok) throw new Error(`HTTP error! status: ${priceResponse.status}`);
            const priceMap = await priceResponse.json();

            const productResponse = await fetch(`/api/${currentCity}/products/all`);
            if (!productResponse.ok) throw new Error(`HTTP error! status: ${productResponse.status}`);
            const allProducts = await productResponse.json();
            const productNameMap = allProducts.reduce((map, product) => {
                map[product.article] = product.name;
                return map;
            }, {});

            totalPrice = products.reduce((sum, product) => {
                const price = priceMap[product.article] || 0;
                return sum + (price * product.quantity);
            }, 0);

            if (order.promo_code) {
                const promoResponse = await fetch(`/api/${currentCity}/promo-code/validate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: order.promo_code })
                });
                if (promoResponse.ok) {
                    const promoData = await promoResponse.json();
                    if (promoData.result === 'success' && promoData.type === 'discount') {
                        discountPercentage = promoData.discount_percentage;
                        discountedPrice = totalPrice * (1 - discountPercentage / 100);
                    }
                }
            }

            return {
                ...order,
                total_price: totalPrice,
                discounted_price: discountedPrice,
                discount_percentage: discountPercentage,
                product_names: products.map(p => ({
                    name: productNameMap[p.article] || p.article,
                    quantity: p.quantity
                }))
            };
        }));
    }

    function formatMoscowTime(created_at) {
        try {
            const [date, time] = created_at.split(' ');
            const [year, month, day] = date.split('-');
            return `${day}.${month}.${year}, ${time}`;
        } catch (e) {
            console.error('Error formatting date:', created_at, e);
            return created_at; // Fallback to raw value
        }
    }

    function renderOrders(orders) {
        ordersContainer.innerHTML = '';
        if (orders.length === 0) {
            ordersContainer.innerHTML = '<p>Нет заказов за выбранный период.</p>';
            return;
        }
        orders.forEach(order => {
            const productList = order.product_names.map(p => `${p.name} (x${p.quantity})${p.isFree ? ' (Бесплатно)' : ''}`).join(', ');
            const orderElement = document.createElement('div');
            orderElement.className = 'order';
            orderElement.dataset.orderId = order.id;
            let discountHtml = '';
            if (order.promo_code) {
                if (order.discount_percentage > 0) {
                    discountHtml = `<p><strong>Скидка:</strong> Промокод ${order.promo_code} (${order.discount_percentage}%)</p>`;
                } else if (order.product_names.some(p => p.isFree)) {
                    discountHtml = `<p><strong>Скидка:</strong> Промокод ${order.promo_code} (бесплатный товар)</p>`;
                }
            }
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
                ${order.promo_code ? `<p><strong>Промокод:</strong> ${order.promo_code}</p>` : ''}
                ${discountHtml}
                <p><strong>Итоговая сумма:</strong> ${order.total_price.toFixed(2)} ₽</p>
                ${order.discounted_price !== null ? `<p><strong>Сумма со скидкой:</strong> <span class="discount">${order.discounted_price.toFixed(2)} ₽</span></p>` : ''}
                <p><strong>Статус:</strong> ${order.status}</p>
                <p><strong>Создан:</strong> ${formatMoscowTime(order.created_at)}</p>
                <button class="delete-order-button" data-id="${order.id}">Удалить</button>
            `;
            ordersContainer.appendChild(orderElement);
        });

        // Обработчики удаления остаются без изменений
        ordersContainer.querySelectorAll('.delete-order-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                if (confirm('Вы уверены, что хотите удалить этот заказ?')) {
                    try {
                        const response = await fetch(`/api/${currentCity}/orders/delete`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id })
                        });
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const data = await response.json();
                        if (data.result === 'success') {
                            alert('Заказ успешно удален.');
                            fetchOrders(dateRangePicker.selectedDates[0]?.toISOString().split('T')[0], dateRangePicker.selectedDates[1]?.toISOString().split('T')[0]);
                        } else {
                            alert('Ошибка при удалении заказа: ' + data.error);
                        }
                    } catch (error) {
                        console.error('Error deleting order:', error);
                        alert('Ошибка при удалении заказа.');
                    }
                }
            });
        });
    }

    function prependOrders(orders) {
        orders.forEach(order => {
            const productList = order.product_names.map(p => `${p.name} (x${p.quantity})${p.isFree ? ' (Бесплатно)' : ''}`).join(', ');
            const orderElement = document.createElement('div');
            orderElement.className = 'order';
            orderElement.dataset.orderId = order.id;
            let discountHtml = '';
            if (order.promo_code) {
                if (order.discount_percentage > 0) {
                    discountHtml = `<p><strong>Скидка:</strong> Промокод ${order.promo_code} (${order.discount_percentage}%)</p>`;
                } else if (order.product_names.some(p => p.isFree)) {
                    discountHtml = `<p><strong>Скидка:</strong> Промокод ${order.promo_code} (бесплатный товар)</p>`;
                }
            }
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
                ${order.promo_code ? `<p><strong>Промокод:</strong> ${order.promo_code}</p>` : ''}
                ${discountHtml}
                <p><strong>Итоговая сумма:</strong> ${order.total_price.toFixed(2)} ₽</p>
                ${order.discounted_price !== null ? `<p><strong>Сумма со скидкой:</strong> <span class="discount">${order.discounted_price.toFixed(2)} ₽</span></p>` : ''}
                <p><strong>Статус:</strong> ${order.status}</p>
                <p><strong>Создан:</strong> ${formatMoscowTime(order.created_at)}</p>
                <button class="delete-order-button" data-id="${order.id}">Удалить</button>
            `;
            ordersContainer.prepend(orderElement);
        });

        ordersContainer.querySelectorAll('.delete-order-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                if (confirm('Вы уверены, что хотите удалить этот заказ?')) {
                    try {
                        const response = await fetch(`/api/${currentCity}/orders/delete`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id })
                        });
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        const data = await response.json();
                        if (data.result === 'success') {
                            alert('Заказ успешно удален.');
                            fetchOrders(dateRangePicker.selectedDates[0]?.toISOString().split('T')[0], dateRangePicker.selectedDates[1]?.toISOString().split('T')[0]);
                        } else {
                            alert('Ошибка при удалении заказа: ' + data.error);
                        }
                    } catch (error) {
                        console.error('Error deleting order:', error);
                        alert('Ошибка при удалении заказа.');
                    }
                }
            });
        });
    }

    async function fetchCategories() {
        try {
            const response = await fetch(`/api/${currentCity}/categories/priorities`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const categories = await response.json();
            renderCategories(categories);
        } catch (error) {
            console.error('Error fetching categories:', error);
            categoriesList.innerHTML = '<p>Ошибка загрузки категорий.</p>';
        }
    }

    function renderCategories(categories) {
        categoriesList.innerHTML = '';
        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.dataset.category = category.category;
            categoryItem.innerHTML = `
                <span>${category.category}</span>
                <div class="move-buttons">
                    <button class="move-up-button" title="Переместить вверх">↑</button>
                    <button class="move-down-button" title="Перейти вниз">↓</button>
                </div>
            `;
            categoriesList.appendChild(categoryItem);
        });

        updateMoveButtonsState();
        categoriesList.querySelectorAll('.move-up-button').forEach(button => {
            button.addEventListener('click', () => {
                const categoryItem = button.closest('.category-item');
                const previousItem = categoryItem.previousElementSibling;
                if (previousItem) {
                    categoriesList.insertBefore(categoryItem, previousItem);
                    updateMoveButtonsState();
                }
            });
        });

        categoriesList.querySelectorAll('.move-down-button').forEach(button => {
            button.addEventListener('click', () => {
                const categoryItem = button.closest('.category-item');
                const nextItem = categoryItem.nextElementSibling;
                if (nextItem) {
                    categoriesList.insertBefore(nextItem, categoryItem);
                    updateMoveButtonsState();
                }
            });
        });
    }

    function updateMoveButtonsState() {
        const items = categoriesList.querySelectorAll('.category-item');
        items.forEach((item, index) => {
            const upButton = item.querySelector('.move-up-button');
            const downButton = item.querySelector('.move-down-button');
            upButton.disabled = index === 0;
            downButton.disabled = index === items.length - 1;
        });
    }

    async function saveCategories() {
        const categoryItems = categoriesList.querySelectorAll('.category-item');
        const priorities = Array.from(categoryItems).map((item, index) => ({
            category: item.dataset.category,
            order_priority: index + 1
        }));

        try {
            const response = await fetch(`/api/${currentCity}/categories/priorities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(priorities)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            toggleModal(categoriesModal, categoriesModalOverlay, false);
            alert('Порядок категорий успешно сохранен.');
        } catch (error) {
            console.error('Error saving categories:', error);
            alert('Ошибка при сохранении категорий.');
        }
    }

    async function fetchPromoCodes() {
        try {
            const response = await fetch(`/api/${currentCity}/promo-codes`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const promoCodes = await response.json();
            renderPromoCodes(promoCodes);
        } catch (error) {
            console.error('Error fetching promo codes:', error);
            promoCodesList.innerHTML = '<p>Ошибка загрузки промокодов.</p>';
        }
    }

    function renderPromoCodes(promoCodes) {
        promoCodesList.innerHTML = '';
        promoCodes.forEach(promo => {
            let promoText = '';
            const isActive = promo.active ? 'Активен' : 'Неактивен';
            const dateRange = promo.start_date && promo.end_date ? 
                `${promo.start_date} - ${promo.end_date}` : 'Без ограничений';
            const usage = promo.max_uses ? `Использовано: ${promo.current_uses || 0}/${promo.max_uses}` : 'Без лимита';

            if (promo.discount_percentage) {
                promoText = `${promo.code} (Скидка: ${promo.discount_percentage}%, ${isActive}, ${dateRange}, ${usage})`;
            } else if (promo.product_name || promo.product_article) {
                promoText = `${promo.code} (Товар: ${promo.product_name || 'Не указан'}, Артикул: ${promo.product_article || 'Не указан'}, Мин. сумма: ${promo.min_order_amount || 'Не указана'} ₽, ${isActive}, ${dateRange}, ${usage})`;
            } else {
                promoText = `${promo.code} (Без информации, ${isActive}, ${dateRange}, ${usage})`;
            }

            const promoItem = document.createElement('div');
            promoItem.className = 'promo-code-item';
            promoItem.innerHTML = `
                <span>${promoText}</span>
                <div class="promo-buttons">
                    <button class="toggle-promo-button ${promo.active ? 'active' : 'inactive'}" data-id="${promo.id}">
                        ${promo.active ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button class="delete-promo-button" data-id="${promo.id}">Удалить</button>
                </div>
            `;
            promoCodesList.appendChild(promoItem);
        });

        promoCodesList.querySelectorAll('.toggle-promo-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                const isActive = button.classList.contains('active');
                try {
                    const response = await fetch(`/api/${currentCity}/promo-code/toggle-active`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, active: !isActive })
                    });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    fetchPromoCodes();
                    alert(`Промокод ${isActive ? 'деактивирован' : 'активирован'}.`);
                } catch (error) {
                    console.error('Error toggling promo code:', error);
                    alert('Ошибка при изменении состояния промокода.');
                }
            });
        });

        promoCodesList.querySelectorAll('.delete-promo-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                if (confirm('Вы уверены, что хотите удалить этот промокод?')) {
                    try {
                        const response = await fetch(`/api/${currentCity}/promo-codes/delete`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id })
                        });
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        fetchPromoCodes();
                        alert('Промокод успешно удален.');
                    } catch (error) {
                        console.error('Error deleting promo code:', error);
                        alert('Ошибка при удалении промокода.');
                    }
                }
            });
        });
    }

    async function addPromoCode() {
        const code = document.getElementById('newPromoCode').value.trim().toUpperCase();
        const type = document.getElementById('promoType').value || 'product';
        const discount = document.getElementById('newPromoDiscount').value ? parseInt(document.getElementById('newPromoDiscount').value) : null;
        const productArticle = document.getElementById('promoArticle').value.trim() || null;
        const productName = document.getElementById('promoProductName').value.trim() || null;
        const minOrderAmount = document.getElementById('promoMinOrderAmount').value ? parseFloat(document.getElementById('promoMinOrderAmount').value) : null;
        const [startDate, endDate] = promoDateRangePicker.selectedDates.map(date => date.toISOString().split('T')[0]) || [null, null];
        const maxUses = document.getElementById('promoMaxUses').value ? parseInt(document.getElementById('promoMaxUses').value) : null;

        if (!code) {
            alert('Промокод не может быть пустым.');
            return;
        }

        if (type === 'discount' && (!discount || discount <= 0 || discount > 100)) {
            alert('Введите корректный процент скидки (1-100).');
            return;
        }

        if (type === 'product' && (!productArticle || !productName)) {
            alert('Артикул и название товара обязательны для промокода типа "Товар".');
            return;
        }

        const data = {
            code,
            type,
            discount_percentage: type === 'discount' ? discount : null,
            product_article: type === 'product' ? productArticle : null,
            product_name: type === 'product' ? productName : null,
            min_order_amount: type === 'product' ? minOrderAmount : null,
            start_date: startDate || null,
            end_date: endDate || startDate || null,
            max_uses: maxUses
        };

        try {
            const response = await fetch(`/api/${currentCity}/promo-codes/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            resetPromoForm();
            fetchPromoCodes();
            alert('Промокод успешно добавлен.');
        } catch (error) {
            console.error('Error saving promo code:', error);
            if (error.message.includes('UNIQUE constraint failed')) {
                alert('Ошибка: Промокод с таким кодом уже существует.');
            } else {
                alert(`Ошибка при сохранении промокода: ${error.message}`);
            }
        }
    }

    function resetPromoForm() {
        document.getElementById('newPromoCode').value = '';
        document.getElementById('newPromoDiscount').value = '';
        document.getElementById('promoArticle').value = '';
        document.getElementById('promoProductName').value = '';
        document.getElementById('promoMinOrderAmount').value = '';
        document.getElementById('promoMaxUses').value = '';
        promoDateRangePicker.clear();
        document.getElementById('cancelPromoCodeButton').style.display = 'none';
        document.getElementById('promoType').value = 'discount';
        document.getElementById('promoType').dispatchEvent(new Event('change'));
    }

    async function fetchProducts() {
        try {
            const response = await fetch(`/api/${currentCity}/products/all`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const products = await response.json();
            renderProducts(products);
        } catch (error) {
            console.error('Error fetching products:', error);
            document.getElementById('productsList').innerHTML = '<p>Ошибка загрузки товаров.</p>';
        }
    }

    function renderProducts(products) {
        const productsList = document.getElementById('productsList');
        productsList.innerHTML = '';
        const categories = [...new Set(products.map(p => p.category))].sort();
        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <div class="category-header">
                    <span>${category}</span>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="product-list" style="display: none;">
                    ${products
                        .filter(p => p.category === category)
                        .map(product => `
                            <div class="product-item">
                                <span class="product-name">${product.name}</span>
                                <button class="toggle-availability-button ${product.available ? 'available' : 'unavailable'}" data-id="${product.id}">
                                    ${product.available ? 'В наличии' : 'Нет в наличии'}
                                </button>
                            </div>
                        `).join('')}
                </div>
            `;
            productsList.appendChild(categoryItem);
        });

        productsList.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const productList = header.nextElementSibling;
                const toggleIcon = header.querySelector('.toggle-icon');
                if (productList.style.display === 'none') {
                    productList.style.display = 'block';
                    toggleIcon.textContent = '▲';
                    productList.style.maxHeight = '0px';
                    productList.style.opacity = '0';
                    setTimeout(() => {
                        productList.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
                        productList.style.maxHeight = `${productList.scrollHeight}px`;
                        productList.style.opacity = '1';
                    }, 10);
                } else {
                    productList.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
                    productList.style.maxHeight = '0px';
                    productList.style.opacity = '0';
                    setTimeout(() => {
                        productList.style.display = 'none';
                        toggleIcon.textContent = '▼';
                    }, 300);
                }
            });
        });

        productsList.querySelectorAll('.toggle-availability-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                const isAvailable = button.classList.contains('available');
                try {
                    const response = await fetch(`/api/${currentCity}/products/toggle-availability`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, available: !isAvailable })
                    });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    fetchProducts();
                } catch (error) {
                    console.error('Error toggling product availability:', error);
                    alert('Ошибка при изменении статуса товара.');
                }
            });
        });
    }

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
        toggleModal(document.getElementById('promoCodeModal'), document.getElementById('promoCodeModalOverlay'), true);
        fetchPromoCodes();
        resetPromoForm();
    });

    document.getElementById('closePromoCodeModal').addEventListener('click', () => {
        toggleModal(document.getElementById('promoCodeModal'), document.getElementById('promoCodeModalOverlay'), false);
    });

    document.getElementById('promoCodeModalOverlay').addEventListener('click', () => {
        toggleModal(document.getElementById('promoCodeModal'), document.getElementById('promoCodeModalOverlay'), false);
    });

    addPromoCodeButton.addEventListener('click', addPromoCode);

    cancelPromoCodeButton.addEventListener('click', resetPromoForm);

    manageProductsButton.addEventListener('click', () => {
        toggleModal(productsModal, productsModalOverlay, true);
        fetchProducts();
    });

    closeProductsModal.addEventListener('click', () => {
        toggleModal(productsModal, productsModalOverlay, false);
    });

    productsModalOverlay.addEventListener('click', () => {
        toggleModal(productsModal, productsModalOverlay, false);
    });

    viewOrdersButton.addEventListener('click', () => {
        toggleModal(ordersModal, ordersModalOverlay, true);
        ordersContainer.innerHTML = '';
        const today = getTodayDate();
        dateRangePicker.setDate([today, today]);
        fetchOrders(today, today);
    });

    closeOrdersModal.addEventListener('click', () => {
        toggleModal(ordersModal, ordersModalOverlay, false);
    });

    ordersModalOverlay.addEventListener('click', () => {
        toggleModal(ordersModal, ordersModalOverlay, false);
    });

    showOrdersButton.addEventListener('click', () => {
        const [startDate, endDate] = dateRangePicker.selectedDates.map(date => date.toISOString().split('T')[0]);
        if (!startDate) {
            alert('Пожалуйста, выберите дату или диапазон дат.');
            return;
        }
        fetchOrders(startDate, endDate || startDate);
    });

    todayOrdersButton.addEventListener('click', fetchTodayOrders);

    allOrdersButton.addEventListener('click', fetchAllOrders);

    fetchCategories();
    fetchPromoCodes();
    fetchProducts();
    startPolling();

    window.addEventListener('unload', stopPolling);
});