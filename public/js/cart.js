document.addEventListener('DOMContentLoaded', () => {
    // Load cart and utensils from localStorage
    window.cart = JSON.parse(localStorage.getItem('sushi_like_cart')) || {
        items: {},
        total: 0
    };
    let utensilsCount = parseInt(localStorage.getItem('sushi_like_utensils')) || 0;
    let previousModal = null;

    function toggleModalOverlay(isOpen, modalId) {
        ['modalOverlay', 'cartModalOverlay', 'orderModalOverlay'].forEach(id => {
            const overlay = document.getElementById(id);
            if (overlay) overlay.classList.remove('active');
        });
        const overlay = document.getElementById(modalId === 'cartModal' ? 'cartModalOverlay' : modalId === 'orderModal' ? 'orderModalOverlay' : 'modalOverlay');
        if (overlay && isOpen) overlay.classList.add('active');
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    function openDeliveryModal(e, fromModal) {
        e.preventDefault();
        e.stopPropagation();
        const cartModal = document.getElementById('cartModal');
        const orderModal = document.getElementById('orderModal');
        previousModal = fromModal;
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

            let utensilsContainer = document.querySelector('.utensils-container');
            if (!utensilsContainer) {
                utensilsContainer = document.createElement('div');
                utensilsContainer.className = 'utensils-container';
                utensilsContainer.innerHTML = `
                    <div class="utensils-label">Количество приборов</div>
                    <div class="quantity-adjuster">
                        <button class="minus"><img src="photo/карточки/minus.png" alt="Уменьшить"></button>
                        <span class="quantity">${utensilsCount}</span>
                        <button class="plus"><img src="photo/карточки/plus.png" alt="Увеличить"></button>
                    </div>
                `;
                const cartItemsContainer = document.querySelector('.cart-items');
                cartItemsContainer.insertAdjacentElement('afterend', utensilsContainer);

                utensilsContainer.querySelector('.minus').addEventListener('click', () => {
                    if (utensilsCount > 0) {
                        utensilsCount--;
                        utensilsContainer.querySelector('.quantity').textContent = utensilsCount;
                        localStorage.setItem('sushi_like_utensils', utensilsCount);
                    }
                });
                utensilsContainer.querySelector('.plus').addEventListener('click', () => {
                    utensilsCount++;
                    utensilsContainer.querySelector('.quantity').textContent = utensilsCount;
                    localStorage.setItem('sushi_like_utensils', utensilsCount);
                });
            } else {
                utensilsContainer.querySelector('.quantity').textContent = utensilsCount;
            }
        }
    }

    function generateTimeOptions(selectedDate) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const isToday = selectedDate === today;
        const timeSelect = document.getElementById('preOrderTime');
        timeSelect.innerHTML = '';

        let startHour, startMinute;
        const openingHour = 10;
        const openingMinute = 0;
        const closingHour = 22;
        const closingMinute = 30;

        if (isToday) {
            startHour = now.getHours();
            startMinute = Math.ceil(now.getMinutes() / 15) * 15;
            if (startMinute >= 60) {
                startHour++;
                startMinute = 0;
            }
        } else {
            startHour = openingHour;
            startMinute = openingMinute;
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
            const dateString = date.toISOString().split('T')[0];
            const option = document.createElement('option');
            option.value = dateString;
            option.textContent = date.toLocaleDateString('ru-RU');
            dateSelect.appendChild(option);
        }

        generateTimeOptions(today.toISOString().split('T')[0]);

        dateSelect.addEventListener('change', () => {
            generateTimeOptions(dateSelect.value);
        });

        updateCartSummaryInModal('orderModal');

        const paymentItem = document.querySelector('.payment-method-item');
        const paymentInput = document.getElementById('paymentInput');
        const paymentLabel = document.querySelector('.payment-label-text');
        const paymentDropdown = document.querySelector('.payment-dropdown');
        const paymentOptions = document.querySelectorAll('.payment-option');

        const toggleDropdown = () => {
            paymentDropdown.classList.toggle('active');
            paymentItem.classList.add('active');
        };

        paymentInput.addEventListener('click', toggleDropdown);
        paymentLabel.addEventListener('click', () => {
            paymentItem.classList.add('active');
            toggleDropdown();
        });

        paymentOptions.forEach(option => {
            option.addEventListener('click', () => {
                paymentInput.value = option.textContent;
                paymentDropdown.classList.remove('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (!paymentItem.contains(e.target) && paymentDropdown.classList.contains('active')) {
                paymentDropdown.classList.remove('active');
                if (!paymentInput.value) paymentItem.classList.remove('active');
            }
        });

        const phoneInput = document.getElementById('orderPhone');
        const phoneItem = phoneInput.closest('.contact-container-item');
        const phoneLabel = phoneItem.querySelector('.contact-label-text');
        const phoneIcon = phoneItem.querySelector('.contact-icon-wrapper');

        [phoneLabel, phoneIcon].forEach(el => {
            el.addEventListener('click', () => {
                phoneItem.classList.add('active');
                phoneInput.focus();
            });
        });

        phoneInput.addEventListener('focus', () => phoneItem.classList.add('active'));
        phoneInput.addEventListener('input', () => phoneItem.classList.add('active'));
    }

    document.querySelector('.products-container').addEventListener('click', (e) => {
        const productElement = e.target.closest('.product');
        if (!productElement) return;
        const productId = productElement.dataset.productId;

        if (e.target.closest('.product-action-button')) {
            addToCart(productId);
        } else if (e.target.closest('.minus')) {
            if (window.cart.items[productId] > 1) {
                window.cart.items[productId]--;
            } else {
                delete window.cart.items[productId];
            }
            updateCartTotal();
            updateProductButton(productId);
            updateCartSummary();
        } else if (e.target.closest('.plus')) {
            if (!window.cart.items[productId]) window.cart.items[productId] = 1;
            else window.cart.items[productId]++;
            updateCartTotal();
            updateProductButton(productId);
            updateCartSummary();
        }
    });

    function addToCart(productId) {
        console.log('Adding product:', productId, 'Cart:', window.cart);
        if (!window.cart.items[productId]) window.cart.items[productId] = 1;
        else window.cart.items[productId]++;
        updateCartTotal();
        updateProductButton(productId);
        updateCartSummary();
        localStorage.setItem('sushi_like_cart', JSON.stringify(window.cart));
    }

    function updateCartTotal() {
        window.cart.total = 0;
        for (const productId in window.cart.items) {
            const product = window.products.find(p => p.id == productId);
            if (product) window.cart.total += product.price * window.cart.items[productId];
        }
        localStorage.setItem('sushi_like_cart', JSON.stringify(window.cart));
    }

    function updateProductButton(productId) {
        const productElement = document.querySelector(`.product[data-product-id="${productId}"]`);
        if (productElement) {
            const priceCart = productElement.querySelector('.product-price-cart');
            const product = window.products.find(p => p.id == productId);
            const quantity = window.cart.items[productId] || 0;
            if (quantity > 0) {
                priceCart.innerHTML = `
                    <span class="price">${Math.floor(product.price)} ₽</span>
                    <div class="quantity-adjuster" style="animation: none;">
                        <button class="minus"><img src="photo/карточки/minus.png" alt="Уменьшить"></button>
                        <span class="quantity">${quantity}</span>
                        <button class="plus"><img src="photo/карточки/plus.png" alt="Увеличить"></button>
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
        const itemCount = Object.values(window.cart.items).reduce((sum, qty) => sum + qty, 0);
        const total = Math.floor(window.cart.total);
        const cartAmount = document.querySelector('.cart-amount');
        if (cartAmount) cartAmount.textContent = total;
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
        if (Object.keys(window.cart.items).length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <img src="photo/карточки/корзинапуст.png" alt="Пустая корзина">
                    <p class="empty-cart-title">Ваша корзина пуста</p>
                    <p class="empty-cart-subtitle">Загляните в меню и наполните её прямо сейчас любимыми блюдами!</p>
                </div>
            `;
        } else {
            for (const productId in window.cart.items) {
                const product = window.products.find(p => p.id == productId);
                if (product) {
                    const quantity = window.cart.items[productId];
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
                                    <button class="minus"><img src="photo/карточки/minus.png" alt="Уменьшить"></button>
                                    <span class="quantity">${quantity}</span>
                                    <button class="plus"><img src="photo/карточки/plus.png" alt="Увеличить"></button>
                                </div>
                            </div>
                        </div>
                    `;
                    cartItemsContainer.appendChild(itemElement);
                    itemElement.querySelector('.minus').addEventListener('click', () => {
                        if (window.cart.items[productId] > 1) window.cart.items[productId]--;
                        else delete window.cart.items[productId];
                        updateCartTotal();
                        renderCartItems();
                        updateCartSummaryInModal('cartModal');
                        updateProductButton(productId);
                        updateCartSummary();
                    });
                    itemElement.querySelector('.plus').addEventListener('click', () => {
                        window.cart.items[productId]++;
                        updateCartTotal();
                        renderCartItems();
                        updateCartSummaryInModal('cartModal');
                        updateProductButton(productId);
                        updateCartSummary();
                    });
                }
            }
        }
    }

    function updateCartSummaryInModal(modalId) {
        const itemCount = Object.values(window.cart.items).reduce((sum, qty) => sum + qty, 0);
        const itemsTotal = Math.floor(window.cart.total);
        const deliveryCost = 0;
        const totalCost = itemsTotal + deliveryCost;
        const modal = document.getElementById(modalId);
        if (modal) {
            const itemCountSpan = modal.querySelector('.item-count');
            const itemsTotalSpan = modal.querySelector('.items-total');
            const deliveryCostSpan = modal.querySelector('.delivery-cost');
            const totalCostSpan = modal.querySelector('.total-cost');
            if (itemCountSpan) itemCountSpan.textContent = itemCount;
            if (itemsTotalSpan) itemsTotalSpan.textContent = itemsTotal + ' ₽';
            if (deliveryCostSpan) deliveryCostSpan.textContent = deliveryCost + ' ₽';
            if (totalCostSpan) totalCostSpan.textContent = totalCost + ' ₽';
        }
    }

    function validatePhoneNumber(phone) {
        const digitsOnly = phone.replace(/\D/g, '');
        return /^(?:\+7|8|7)\d{10}$/.test(digitsOnly);
    }

    document.querySelector('.cart').addEventListener('click', openCartModal);
    document.getElementById('cartSummaryMobile').addEventListener('click', openCartModal);
    document.querySelector('.clear-cart-icon').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите очистить корзину?')) {
            const productIds = Object.keys(window.cart.items);
            window.cart.items = {};
            window.cart.total = 0;
            utensilsCount = 0;
            localStorage.setItem('sushi_like_cart', JSON.stringify(window.cart));
            localStorage.setItem('sushi_like_utensils', utensilsCount);
            renderCartItems();
            updateCartSummaryInModal('cartModal');
            updateCartSummary();
            productIds.forEach(productId => updateProductButton(productId));
            const utensilsContainer = document.querySelector('.utensils-container');
            if (utensilsContainer) utensilsContainer.querySelector('.quantity').textContent = utensilsCount;
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

    document.querySelector('#orderModal .address-container').addEventListener('click', (e) => openDeliveryModal(e, 'order'));

    const addressPanel = document.querySelector('#orderModal .address-panel');
    if (addressPanel) addressPanel.removeEventListener('click', (e) => openDeliveryModal(e, 'order'));
    const additionalFields = document.querySelector('#orderModal .additional-fields');
    if (additionalFields) additionalFields.removeEventListener('click', (e) => openDeliveryModal(e, 'order'));

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
        generateTimeOptions(document.getElementById('preOrderDate').value);
    });

    const contactItems = document.querySelectorAll('.order-modal .contact-container-item');
    contactItems.forEach(item => {
        const input = item.querySelector('.contact-input');
        const labelText = item.querySelector('.contact-label-text');
        const iconWrapper = item.querySelector('.contact-icon-wrapper');

        [labelText, iconWrapper].forEach(el => {
            el.addEventListener('click', () => {
                item.classList.add('active');
                input.focus();
            });
        });

        input.addEventListener('focus', () => item.classList.add('active'));
        input.addEventListener('blur', () => {
            if (!input.value || input.value === '+7') item.classList.remove('active');
        });
    });

    window.addEventListener('resize', updateCartSummary);

    window.restorePreviousModal = function() {
        if (previousModal === 'cart') openCartModal();
        else if (previousModal === 'order') openOrderModal();
    };

    window.updateCartTotal = updateCartTotal;
    window.updateProductButton = updateProductButton;
    window.updateCartSummary = updateCartSummary;
    window.toggleModalOverlay = toggleModalOverlay;

    // Initial update to reflect loaded cart
    updateCartSummary();
});