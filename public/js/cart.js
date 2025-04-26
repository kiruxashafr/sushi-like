document.addEventListener('DOMContentLoaded', () => {
    let cart = {
        items: {},
        total: 0
    };
    let previousModal = null; // Track the modal that opened the delivery modal

    function toggleModalOverlay(isOpen, modalId) {
        // Remove .active from all overlays to prevent multiple active overlays
        ['modalOverlay', 'cartModalOverlay', 'orderModalOverlay'].forEach(id => {
            const overlay = document.getElementById(id);
            if (overlay) {
                overlay.classList.remove('active');
            }
        });
        // Activate the target overlay if isOpen is true
        const overlay = document.getElementById(modalId === 'cartModal' ? 'cartModalOverlay' : modalId === 'orderModal' ? 'orderModalOverlay' : 'modalOverlay');
        if (overlay && isOpen) {
            overlay.classList.add('active');
        }
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    function openDeliveryModal(e, fromModal) {
        e.preventDefault();
        e.stopPropagation();
        const cartModal = document.getElementById('cartModal');
        const orderModal = document.getElementById('orderModal');
        previousModal = fromModal; // Store the originating modal
        if (cartModal && fromModal === 'cart') {
            cartModal.classList.remove('active');
            toggleModalOverlay(false, 'cartModal');
        } else if (orderModal && fromModal === 'order') {
            orderModal.classList.remove('active');
            toggleModalOverlay(false, 'orderModal');
        }
        window.openDeliveryModal(e, window.currentMode, fromModal);
    }

    function openOrderModal() {
        const cartModal = document.getElementById('cartModal');
        const orderModal = document.getElementById('orderModal');
        if (cartModal && orderModal) {
            cartModal.classList.remove('active');
            toggleModalOverlay(false, 'cartModal');
            orderModal.classList.add('active');
            toggleModalOverlay(true, 'orderModal');
            populateOrderModal();
        }
    }

    function openCartModal() {
        const cartModal = document.getElementById('cartModal');
        const orderModal = document.getElementById('orderModal');
        if (cartModal) {
            if (orderModal) {
                orderModal.classList.remove('active');
                toggleModalOverlay(false, 'orderModal');
            }
            cartModal.classList.add('active');
            toggleModalOverlay(true, 'cartModal');
            renderCartItems();
            updateCartSummaryInModal('cartModal');
            
            const switcherContainerInModal = document.querySelector('#cartModal .switcher-container');
            if (switcherContainerInModal) {
                switcherContainerInModal.classList.remove('delivery-selected', 'pickup-selected');
                switcherContainerInModal.classList.add(`${window.currentMode}-selected`);
                switcherContainerInModal.removeEventListener('click', (e) => openDeliveryModal(e, 'cart'));
                switcherContainerInModal.addEventListener('click', (e) => openDeliveryModal(e, 'cart'));
            }
            
            const addressTextInModal = document.querySelector('#cartModal #addressText');
            const addressTextMobileInModal = document.querySelector('#cartModal #addressTextMobile');
            const displayText = window.currentMode === 'delivery' ? (window.currentAddress || 'Укажите адрес доставки') : `Самовывоз: ${window.pickupAddress || 'ул. Клязьменская 11, Ковров'}`;
            if (addressTextInModal) addressTextInModal.textContent = displayText;
            if (addressTextMobileInModal) addressTextMobileInModal.textContent = displayText;
            
            const addressPanelInModal = document.querySelector('#cartModal .address-panel');
            if (addressPanelInModal) {
                addressPanelInModal.removeEventListener('click', (e) => openDeliveryModal(e, 'cart'));
                addressPanelInModal.addEventListener('click', (e) => openDeliveryModal(e, 'cart'));
            }
        }
    }

    function generateTimeOptions() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const closingHour = 22; // 22:30
        const closingMinute = 30;
        const timeSelect = document.getElementById('preOrderTime');
        timeSelect.innerHTML = '';

        let startHour = currentHour;
        let startMinute = Math.ceil(currentMinute / 15) * 15; // Округление до ближайшего 15-минутного интервала
        if (startMinute >= 60) {
            startHour++;
            startMinute = 0;
        }

        while (startHour < closingHour || (startHour === closingHour && startMinute <= closingMinute)) {
            const timeString = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = timeString;
            option.textContent = timeString;
            timeSelect.appendChild(option);
            startMinute += 15;
            if (startMinute >= 60) {
                startHour++;
                startMinute = 0;
            }
        }
    }

    function populateOrderModal() {
        const addressText = document.getElementById('addressText').textContent;
        const orderAddressText = document.getElementById('orderAddressText');
        const mainAddress = addressText.split(' (')[0];
        orderAddressText.textContent = mainAddress;

        const apartmentSpan = document.getElementById('orderApartment');
        const entranceSpan = document.getElementById('orderEntrance');
        const floorSpan = document.getElementById('orderFloor');
        
        const match = addressText.match(/\(кв\. (.*?)(?:, подъезд (.*?))?(?:, этаж (.*?))?\)/);
        apartmentSpan.textContent = match ? match[1] || '' : '';
        entranceSpan.textContent = match ? match[2] || '' : '';
        floorSpan.textContent = match ? match[3] || '' : '';

        // Set delivery mode text in header
        const orderTitle = document.querySelector('.order-title');
        if (orderTitle) {
            orderTitle.textContent = window.currentMode === 'delivery' ? 'Доставка' : 'Самовывоз';
        }

        const dateSelect = document.getElementById('preOrderDate');
        dateSelect.innerHTML = '';
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const option = document.createElement('option');
            option.value = date.toISOString().split('T')[0];
            option.textContent = date.toLocaleDateString('ru-RU');
            dateSelect.appendChild(option);
        }

        generateTimeOptions();
        updateCartSummaryInModal('orderModal');
    }

    document.querySelector('.products-container').addEventListener('click', (e) => {
        const productElement = e.target.closest('.product');
        if (!productElement) return;
        const productId = productElement.dataset.productId;

        if (e.target.closest('.product-action-button')) {
            addToCart(productId);
        } else if (e.target.closest('.minus')) {
            if (cart.items[productId] > 1) {
                cart.items[productId]--;
            } else {
                delete cart.items[productId];
            }
            updateCartTotal();
            updateProductButton(productId);
            updateCartSummary();
        } else if (e.target.closest('.plus')) {
            if (!cart.items[productId]) {
                cart.items[productId] = 1;
            } else {
                cart.items[productId]++;
            }
            updateCartTotal();
            updateProductButton(productId);
            updateCartSummary();
        }
    });

    function addToCart(productId) {
        if (!cart.items[productId]) {
            cart.items[productId] = 1;
        } else {
            cart.items[productId]++;
        }
        updateCartTotal();
        updateProductButton(productId);
        updateCartSummary();
    }

    function updateCartTotal() {
        cart.total = 0;
        for (const productId in cart.items) {
            const product = window.products.find(p => p.id == productId);
            if (product) {
                cart.total += product.price * cart.items[productId];
            }
        }
    }

    function updateProductButton(productId) {
        const productElement = document.querySelector(`.product[data-product-id="${productId}"]`);
        if (productElement) {
            const priceCart = productElement.querySelector('.product-price-cart');
            const product = window.products.find(p => p.id == productId);
            const quantity = cart.items[productId] || 0;
            if (quantity > 0) {
                priceCart.innerHTML = `
                    <span class="price">${Math.floor(product.price)} ₽</span>
                    <div class="quantity-adjuster" style="animation: none;">
                        <button class="minus">-</button>
                        <span class="quantity">${quantity}</span>
                        <button class="plus">+</button>
                    </div>
                `;
            } else {
                priceCart.innerHTML = `
                    <button class="product-action-button">
                        <span>${Math.floor(product.price)} ₽</span>
                        <img src="photo/карточки/добавить.png" alt="Add" class="plus-icon">
                    </button>
                `;
            }
        }
    }

    function updateCartSummary() {
        const itemCount = Object.values(cart.items).reduce((sum, qty) => sum + qty, 0);
        const total = Math.floor(cart.total);
        const cartAmount = document.querySelector('.cart-amount');
        if (cartAmount) {
            cartAmount.textContent = total;
        }
        const cartSummaryMobile = document.getElementById('cartSummaryMobile');
        if (cartSummaryMobile) {
            const itemCountSpan = cartSummaryMobile.querySelector('.cart-item-count');
            const totalSpan = cartSummaryMobile.querySelector('.cart-total');
            if (itemCountSpan) itemCountSpan.textContent = itemCount;
            if (totalSpan) totalSpan.textContent = total;
            cartSummaryMobile.style.display = itemCount > 0 && window.innerWidth <= 768 ? 'flex' : 'none';
        }
    }

    function renderCartItems() {
        const cartItemsContainer = document.querySelector('.cart-items');
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';
        for (const productId in cart.items) {
            const product = window.products.find(p => p.id == productId);
            if (product) {
                const quantity = cart.items[productId];
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.innerHTML = `
                    <img src="${product.photo}" alt="${product.name}">
                    <div class="item-info">
                        <h3>${product.name}</h3>
                        <p>${product.weight ? product.weight + ' г' : ''}</p>
                        <div class="item-controls">
                            <div class="item-price">${Math.floor(product.price)} ₽</div>
                            <div class="quantity-adjuster">
                                <button class="minus">-</button>
                                <span class="quantity">${quantity}</span>
                                <button class="plus">+</button>
                            </div>
                        </div>
                    </div>
                `;
                cartItemsContainer.appendChild(itemElement);
                itemElement.querySelector('.minus').addEventListener('click', () => {
                    if (cart.items[productId] > 1) {
                        cart.items[productId]--;
                    } else {
                        delete cart.items[productId];
                    }
                    updateCartTotal();
                    renderCartItems();
                    updateCartSummaryInModal('cartModal');
                    updateProductButton(productId);
                    updateCartSummary();
                });
                itemElement.querySelector('.plus').addEventListener('click', () => {
                    cart.items[productId]++;
                    updateCartTotal();
                    renderCartItems();
                    updateCartSummaryInModal('cartModal');
                    updateProductButton(productId);
                    updateCartSummary();
                });
            }
        }
    }

    function updateCartSummaryInModal(modalId) {
        const itemCount = Object.values(cart.items).reduce((sum, qty) => sum + qty, 0);
        const itemsTotal = Math.floor(cart.total);
        const deliveryCost = 0;
        const totalCost = itemsTotal + deliveryCost;
        const modal = document.getElementById(modalId);
        if (modal) {
            const itemCountSpan = modal.querySelector('.item-count');
            const itemsTotalSpan = modal.querySelector('.items-total');
            const deliveryCostSpan = document.querySelector('.delivery-cost');
            const totalCostSpan = modal.querySelector('.total-cost');
            if (itemCountSpan) itemCountSpan.textContent = itemCount;
            if (itemsTotalSpan) itemsTotalSpan.textContent = itemsTotal + ' ₽';
            if (deliveryCostSpan) deliveryCostSpan.textContent = deliveryCost + ' ₽';
            if (totalCostSpan) totalCostSpan.textContent = totalCost + ' ₽';
        }
    }

    document.querySelector('.cart').addEventListener('click', openCartModal);
    document.getElementById('cartSummaryMobile').addEventListener('click', openCartModal);
    document.querySelector('.clear-cart-icon').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите очистить корзину?')) {
            const productIds = Object.keys(cart.items);
            cart.items = {};
            cart.total = 0;
            renderCartItems();
            updateCartSummaryInModal('cartModal');
            updateCartSummary();
            productIds.forEach(productId => updateProductButton(productId));
        }
    });
    document.querySelector('.close-cart').addEventListener('click', () => {
        document.getElementById('cartModal').classList.remove('active');
        toggleModalOverlay(false, 'cartModal');
    });
    document.getElementById('cartModalOverlay').addEventListener('click', (e) => {
        if (window.innerWidth > 768 && e.target === e.currentTarget) {
            document.getElementById('cartModal').classList.remove('active');
            toggleModalOverlay(false, 'cartModal');
        }
    });

    document.querySelector('.cart-modal .next-button').addEventListener('click', openOrderModal);
    document.getElementById('closeOrderModal').addEventListener('click', () => {
        document.getElementById('orderModal').classList.remove('active');
        toggleModalOverlay(false, 'orderModal');
    });
    document.getElementById('orderModalOverlay').addEventListener('click', (e) => {
        if (window.innerWidth > 768 && e.target === e.currentTarget) {
            document.getElementById('orderModal').classList.remove('active');
            toggleModalOverlay(false, 'orderModal');
        }
    });

    // Add click event for address-container
    document.querySelector('#orderModal .address-container').addEventListener('click', (e) => openDeliveryModal(e, 'order'));
    
    // Remove old listeners to prevent duplicates
    const addressPanel = document.querySelector('#orderModal .address-panel');
    if (addressPanel) {
        addressPanel.removeEventListener('click', (e) => openDeliveryModal(e, 'order'));
    }
    const additionalFields = document.querySelector('#orderModal .additional-fields');
    if (additionalFields) {
        additionalFields.removeEventListener('click', (e) => openDeliveryModal(e, 'order'));
    }

    document.querySelector('.back-arrow').addEventListener('click', (e) => {
        e.preventDefault();
        openCartModal();
    });

    const asapButton = document.querySelector('.time-switcher .asap');
    const preOrderButton = document.querySelector('.time-switcher .pre-order');
    const preOrderFields = document.querySelector('.pre-order-fields');

    asapButton.addEventListener('click', () => {
        asapButton.classList.add('active');
        preOrderButton.classList.remove('active');
        preOrderFields.style.display = 'none';
    });

    preOrderButton.addEventListener('click', () => {
        preOrderButton.classList.add('active');
        asapButton.classList.remove('active');
        preOrderFields.style.display = 'flex';
        generateTimeOptions();
    });

    document.querySelector('.order-button').addEventListener('click', () => {
        const address = document.getElementById('orderAddressText').textContent;
        const apartment = document.getElementById('orderApartment').textContent;
        const entrance = document.getElementById('orderEntrance').textContent;
        const floor = document.getElementById('orderFloor').textContent;
        const name = document.getElementById('orderName').value;
        const phone = document.getElementById('orderPhone').value;
        const timeMode = document.querySelector('.time-switcher .active').classList.contains('asap') ? 'asap' : 'pre-order';
        let orderDateTime = null;
        if (timeMode === 'pre-order') {
            const date = document.getElementById('preOrderDate').value;
            const time = document.getElementById('preOrderTime').value;
            if (!date || !time) {
                alert('Пожалуйста, укажите дату и время предзаказа.');
                return;
            }
            orderDateTime = `${date} ${time}:00`;
        }
        const paymentMethod = document.getElementById('paymentSelect').value;
        const comment = document.getElementById('orderComment').value;

        const apiData = {
            secret: 'your_secret_key',
            product: Object.keys(cart.items),
            product_kol: Object.values(cart.items),
            street: address.split(', ')[1] || address,
            home: '',
            apart: apartment,
            pod: entrance,
            et: floor,
            phone: phone || '+79004794343',
            name: name || 'Клиент',
            pay: paymentMethod === 'cash' ? 'cash_code' : 'card_code',
            descr: comment,
            ...(timeMode === 'pre-order' && { datetime: orderDateTime })
        };

        fetch('https://app.frontpad.ru/api/index.php?new_order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(apiData).toString(),
        })
        .then(response => response.json())
        .then(data => {
            if (data.result === 'success') {
                alert('Заказ успешно отправлен! Номер заказа: ' + data.order_number);
                cart.items = {};
                cart.total = 0;
                updateCartSummary();
                document.getElementById('orderModal').classList.remove('active');
                toggleModalOverlay(false, 'orderModal');
            } else {
                alert('Ошибка при отправке заказа: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при отправке заказа.');
        });
    });

    window.addEventListener('resize', updateCartSummary);

    // Expose a function for adres.js to call when delivery modal is closed or confirmed
    window.restorePreviousModal = function() {
        if (previousModal === 'cart') {
            openCartModal();
        } else if (previousModal === 'order') {
            openOrderModal();
        }
    };
});