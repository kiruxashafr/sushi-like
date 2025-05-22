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
    const citySelect = document.getElementById('citySelect');
    const manageProductsButton = document.getElementById('manageProductsButton');
    const productsModal = document.getElementById('productsModal');
    const closeProductsModal = document.getElementById('closeProductsModal');
    const productsModalOverlay = document.getElementById('productsModalOverlay');
    const productsList = document.getElementById('productsList');
    const viewOrdersButton = document.getElementById('viewOrdersButton');
    const ordersModal = document.getElementById('ordersModal');
    const closeOrdersModal = document.getElementById('closeOrdersModal');
    const ordersModalOverlay = document.getElementById('ordersModalOverlay');
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    const showOrdersButton = document.getElementById('showOrdersButton');

    let currentCity = citySelect.value;
    let lastOrderId = 0;
    let pollingInterval = null;

    // Function to get today's date in 'YYYY-MM-DD' format
    function getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Start polling for new orders
    function startPolling() {
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(fetchNewOrders, 10000); // Poll every 10 seconds
    }

    // Stop polling
    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    citySelect.addEventListener('change', () => {
        currentCity = citySelect.value;
        lastOrderId = 0; // Reset last order ID when city changes
        ordersContainer.innerHTML = ''; // Clear current orders
        fetchCategories();
        fetchPromoCodes();
        fetchProducts();
        startPolling();
    });

    // Toggle modal visibility
    function toggleModal(modal, overlay, show) {
        modal.classList.toggle('active', show);
        overlay.classList.toggle('active', show);
    }

    // Fetch and display orders for the current city and date range
    async function fetchOrders() {
        const startDate = fromDateInput.value;
        const endDate = toDateInput.value;
        if (!startDate || !endDate) {
            ordersContainer.innerHTML = '<p>Пожалуйста, выберите даты.</p>';
            return;
        }
        const url = `/api/${currentCity}/orders/history?start_date=${startDate}&end_date=${endDate}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const orders = await response.json();
            renderOrders(orders);
            // Update lastOrderId to the highest ID in the fetched orders
            lastOrderId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) : 0;
        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersContainer.innerHTML = '<p>Ошибка загрузки заказов.</p>';
        }
    }

    // Fetch new orders since lastOrderId
    async function fetchNewOrders() {
        try {
            const response = await fetch(`/api/${currentCity}/orders/new?last_id=${lastOrderId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const newOrders = await response.json();
            if (newOrders.length > 0) {
                // Fetch enriched order details (with prices) for new orders
                const enrichedOrders = await enrichOrders(newOrders);
                prependOrders(enrichedOrders);
                lastOrderId = Math.max(...newOrders.map(o => o.id));
            }
        } catch (error) {
            console.error('Error fetching new orders:', error);
        }
    }

    // Enrich new orders with price and discount information
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
                return { ...order, total_price: 0, discounted_price: null };
            }

            const articles = products.map(p => p.article);
            const priceResponse = await fetch(`/api/${currentCity}/product-prices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articles })
            });
            if (!priceResponse.ok) throw new Error(`HTTP error! status: ${priceResponse.status}`);
            const priceMap = await priceResponse.json();

            // Fetch product names
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
                    if (promoData.result === 'success') {
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

    // Helper function to format created_at string to DD.MM.YYYY, HH:MM:SS
    function formatMoscowTime(created_at) {
        const [date, time] = created_at.split(' ');
        const [year, month, day] = date.split('-');
        return `${day}.${month}.${year}, ${time}`;
    }

    // Render orders
    function renderOrders(orders) {
        ordersContainer.innerHTML = '';
        orders.forEach(order => {
            const productList = order.product_names.map(p => `${p.name} (x${p.quantity})`).join(', ');
            const orderElement = document.createElement('div');
            orderElement.className = 'order';
            orderElement.dataset.orderId = order.id;
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
                <button class="delete-order-button" data-id="${order.id}">Удалить</button>
            `;
            ordersContainer.appendChild(orderElement);
        });

        // Add event listeners for delete buttons
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
                            fetchOrders();
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

    // Prepend new orders to the orders container
    function prependOrders(orders) {
        orders.forEach(order => {
            const productList = order.product_names.map(p => `${p.name} (x${p.quantity})`).join(', ');
            const orderElement = document.createElement('div');
            orderElement.className = 'order';
            orderElement.dataset.orderId = order.id;
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
                <button class="delete-order-button" data-id="${order.id}">Удалить</button>
            `;
            ordersContainer.prepend(orderElement);
        });

        // Add event listeners for delete buttons
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
                            fetchOrders();
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

    // Fetch and display categories for the current city
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

    // Render categories with up/down buttons
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
                    <button class="move-down-button" title="Переместить вниз">↓</button>
                </div>
            `;
            categoriesList.appendChild(categoryItem);
        });

        // Add event listeners for move buttons
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

    // Update the state of move buttons (disable if at top/bottom)
    function updateMoveButtonsState() {
        const items = categoriesList.querySelectorAll('.category-item');
        items.forEach((item, index) => {
            const upButton = item.querySelector('.move-up-button');
            const downButton = item.querySelector('.move-down-button');
            upButton.disabled = index === 0;
            downButton.disabled = index === items.length - 1;
        });
    }

    // Save category priorities for the current city
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

    // Fetch and display promo codes for the current city
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

        promoCodesList.querySelectorAll('.delete-promo-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                try {
                    const response = await fetch(`/api/${currentCity}/promo-codes/delete`, {
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

    // Add new promo code for the current city
    async function addPromoCode() {
        const code = newPromoCodeInput.value.trim();
        const discount = parseInt(newPromoDiscountInput.value);
        if (!code || isNaN(discount) || discount <= 0 || discount > 100) {
            alert('Введите корректный промокод и процент скидки (1-100).');
            return;
        }

        try {
            const response = await fetch(`/api/${currentCity}/promo-codes/add`, {
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

    // Fetch all products for the current city (including unavailable)
    async function fetchProducts() {
        try {
            const response = await fetch(`/api/${currentCity}/products/all`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const products = await response.json();
            renderProducts(products);
        } catch (error) {
            console.error('Error fetching products:', error);
            productsList.innerHTML = '<p>Ошибка загрузки товаров.</p>';
        }
    }

    // Render products grouped by category
    function renderProducts(products) {
        productsList.innerHTML = '';
        // Group products by category
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
                        .sort((a, b) => a.name.localeCompare(b.name))
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

        // Add click event listeners for category headers
        productsList.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const productList = header.nextElementSibling;
                const toggleIcon = header.querySelector('.toggle-icon');
                if (productList.style.display === 'none') {
                    productList.style.display = 'block';
                    toggleIcon.textContent = '▲';
                    // Trigger slide-down animation
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

        // Add click event listeners for availability toggle buttons
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
        // Set default dates (e.g., last 7 days)
        const today = new Date();
        const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        fromDateInput.value = fromDate.toISOString().split('T')[0];
        toDateInput.value = today.toISOString().split('T')[0];
        ordersContainer.innerHTML = ''; // Clear orders until "Показать" is clicked
    });

    closeOrdersModal.addEventListener('click', () => {
        toggleModal(ordersModal, ordersModalOverlay, false);
    });

    ordersModalOverlay.addEventListener('click', () => {
        toggleModal(ordersModal, ordersModalOverlay, false);
    });

    showOrdersButton.addEventListener('click', fetchOrders);

    // Initial fetch and start polling
    fetchCategories();
    fetchPromoCodes();
    fetchProducts();
    startPolling();

    // Clean up polling on page unload
    window.addEventListener('unload', stopPolling);
});