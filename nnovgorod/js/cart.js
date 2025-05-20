document.addEventListener('DOMContentLoaded', () => {
    const city = window.location.pathname.includes('/nnovgorod') ? 'nnovgorod' : 'kovrov';
    const pickupAddress = city === 'nnovgorod' ? 'Южное Шоссе 12д, Нижний Новгород' : 'ул. Клязьменская 11, Ковров';

    window.cart = JSON.parse(localStorage.getItem(`sushi_like_cart_${city}`)) || {
        items: {},
        total: 0,
        discount: 0,
        totalAfterDiscount: 0,
        appliedDiscount: null
    };
    let utensilsCount = parseInt(localStorage.getItem(`sushi_like_utensils_${city}`)) || 0;
    let previousModal = null;

    function toggleModalOverlay(isOpen, modalId) {
        ['modalOverlay', 'cartModalOverlay', 'orderModalOverlay', 'confirmationModalOverlay'].forEach(id => {
            const overlay = document.getElementById(id);
            if (overlay) overlay.classList.remove('active');
        });
        const overlay = document.getElementById(modalId === 'cartModal' ? 'cartModalOverlay' : modalId === 'orderModal' ? 'orderModalOverlay' : modalId === 'confirmationModal' ? 'confirmationModalOverlay' : 'modalOverlay');
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
            updateCartTotal();
            updateCartSummaryInModal('orderModal');
            populateOrderModal();
            // Update order title based on delivery mode
            const orderTitle = document.querySelector('.order-title');
            if (orderTitle) {
                orderTitle.textContent = window.currentMode === 'delivery' ? 'Доставка' : 'Самовывоз';
            }
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
            const displayText = window.currentMode === 'delivery' ? (window.currentAddress || 'Укажите адрес доставки') : `Самовывоз: ${pickupAddress}`;
            if (addressTextInModal) addressTextInModal.textContent = displayText;
            if (addressTextMobileInModal) addressTextMobileInModal.textContent = displayText;

            const addressPanelInModal = document.querySelector('#cartModal .address-panel');
            if (addressPanelInModal) {
                addressPanelInModal.removeEventListener('click', (e) => openDeliveryModal(e, 'cart'));
                addressPanelInModal.addEventListener('click', (e) => openDeliveryModal(e, 'cart'));
            }

            let cartOptionsContainer = document.querySelector('.cart-options-container');
            if (!cartOptionsContainer) {
                cartOptionsContainer = document.createElement('div');
                cartOptionsContainer.className = 'cart-options-container';
                cartOptionsContainer.innerHTML = `
                    <div class="utensils-container">
                        <div class="utensils-label">Количество приборов</div>
                        <div class="quantity-adjuster">
                            <button class="minus"><img src="/${city}/photo/карточки/minus.png" alt="Уменьшить"></button>
                            <span class="quantity">${utensilsCount}</span>
                            <button class="plus"><img src="/${city}/photo/карточки/plus.png" alt="Увеличить"></button>
                        </div>
                    </div>
                    <div class="promo-code-container">
                        <div class="promo-code-input-wrapper">
                            <div class="promo-code-icon-wrapper">
                                <img src="/${city}/photo/карточки/промокод.png" alt="Промокод" class="promo-code-icon">
                            </div>
                            <input type="text" class="promo-code-input" placeholder="Введите промокод или сертификат">
                            <button class="apply-promo-button">➤</button>
                        </div>
                        <span class="promo-code-label">Промокод</span>
                    </div>
                    <div class="promo-message" style="display: none; color: red; font-size: 14px; padding-bottom: 10px;"></div>
                `;
                const cartItemsContainer = document.querySelector('.cart-items');
                if (cartItemsContainer) {
                    cartItemsContainer.insertAdjacentElement('afterend', cartOptionsContainer);
                }

                cartOptionsContainer.querySelector('.utensils-container .minus').addEventListener('click', () => {
                    if (utensilsCount > 0) {
                        utensilsCount--;
                        cartOptionsContainer.querySelector('.utensils-container .quantity').textContent = utensilsCount;
                        localStorage.setItem(`sushi_like_utensils_${city}`, utensilsCount);
                    }
                });
                cartOptionsContainer.querySelector('.utensils-container .plus').addEventListener('click', () => {
                    utensilsCount++;
                    cartOptionsContainer.querySelector('.utensils-container .quantity').textContent = utensilsCount;
                    localStorage.setItem(`sushi_like_utensils_${city}`, utensilsCount);
                });

                const promoContainer = cartOptionsContainer.querySelector('.promo-code-container');
                const promoInput = cartOptionsContainer.querySelector('.promo-code-input');
                const promoLabel = cartOptionsContainer.querySelector('.promo-code-label');
                const applyButton = cartOptionsContainer.querySelector('.apply-promo-button');
                const promoMessage = cartOptionsContainer.querySelector('.promo-message');
                const promoIcon = cartOptionsContainer.querySelector('.promo-code-icon-wrapper');

                [promoLabel, promoIcon].forEach(el => {
                    el.addEventListener('click', () => {
                        promoContainer.classList.add('active');
                        promoInput.focus();
                    });
                });

                promoInput.addEventListener('focus', () => {
                    promoContainer.classList.add('active');
                });

                promoInput.addEventListener('blur', () => {
                    if (!promoInput.value.trim()) {
                        promoContainer.classList.remove('active');
                    }
                });

                applyButton.addEventListener('click', async () => {
                    const code = promoInput.value.trim();
                    if (!code) {
                        promoMessage.textContent = 'Введите промокод или сертификат';
                        promoMessage.style.color = 'red';
                        promoMessage.style.display = 'block';
                        return;
                    }

                    try {
                        const promoResponse = await fetch(`/api/${city}/promo-code/validate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code })
                        });
                        const promoResult = await promoResponse.json();
                        if (promoResult.result === 'success') {
                            window.cart.appliedDiscount = {
                                type: 'promo_code',
                                code: code,
                                discountPercentage: promoResult.discount_percentage
                            };
                            promoMessage.textContent = `Промокод успешно применен (-${window.cart.appliedDiscount.discountPercentage}%)`;
                            promoMessage.style.color = 'green';
                            promoMessage.style.display = 'block';
                            updateCartTotal();
                            updateCartSummaryInModal('cartModal');
                            updateCartSummary();
                            localStorage.setItem(`sushi_like_cart_${city}`, JSON.stringify(window.cart));
                            return;
                        }

                        if (promoResult.error === 'Извините, такого промокода не существует') {
                            const certResponse = await fetch(`/api/${city}/certificate/validate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ certificate: code })
                            });
                            const certResult = await certResponse.json();
                            if (certResult.result === 'success') {
                                window.cart.appliedDiscount = {
                                    type: 'certificate',
                                    code: code,
                                    discountPercentage: parseInt(certResult.sale, 10)
                                };
                                promoMessage.textContent = `Сертификат успешно применен (-${window.cart.appliedDiscount.discountPercentage}%)`;
                                promoMessage.style.color = 'green';
                                promoMessage.style.display = 'block';
                                updateCartTotal();
                                updateCartSummaryInModal('cartModal');
                                updateCartSummary();
                                localStorage.setItem(`sushi_like_cart_${city}`, JSON.stringify(window.cart));
                            } else {
                                promoMessage.textContent = certResult.error || 'Неверный сертификат';
                                promoMessage.style.color = 'red';
                                promoMessage.style.display = 'block';
                            }
                        } else {
                            promoMessage.textContent = promoResult.error || 'Ошибка при проверке промокода';
                            promoMessage.style.color = 'red';
                            promoMessage.style.display = 'block';
                        }
                    } catch (error) {
                        promoMessage.textContent = 'Ошибка при проверке кода';
                        promoMessage.style.color = 'red';
                        promoMessage.style.display = 'block';
                    }
                });
            } else {
                cartOptionsContainer.querySelector('.utensils-container .quantity').textContent = utensilsCount;
                const promoInput = cartOptionsContainer.querySelector('.promo-code-input');
                if (window.cart.appliedDiscount) {
                    promoInput.value = window.cart.appliedDiscount.code;
                    cartOptionsContainer.querySelector('.promo-code-container').classList.add('active');
                    const promoMessage = cartOptionsContainer.querySelector('.promo-message');
                    if (promoMessage) {
                        promoMessage.textContent = `${window.cart.appliedDiscount.type === 'certificate' ? 'Сертификат' : 'Промокод'} успешно применен (-${window.cart.appliedDiscount.discountPercentage}%)`;
                        promoMessage.style.color = 'green';
                        promoMessage.style.display = 'block';
                    }
                }
            }
        }
    }

    function resetCart() {
        const productIds = Object.keys(window.cart.items);
        window.cart.items = {};
        window.cart.total = 0;
        window.cart.discount = 0;
        window.cart.totalAfterDiscount = 0;
        window.cart.appliedDiscount = null;
        utensilsCount = 0;
        localStorage.setItem(`sushi_like_cart_${city}`, JSON.stringify(window.cart));
        localStorage.setItem(`sushi_like_utensils_${city}`, utensilsCount);
        localStorage.removeItem('sushi_like_order');

        renderCartItems();
        updateCartSummaryInModal('cartModal');
        updateCartSummary();
        productIds.forEach(productId => window.updateProductButton?.(productId));
        const utensilsContainer = document.querySelector('.utensils-container');
        if (utensilsContainer) {
            const quantitySpan = utensilsContainer.querySelector('.quantity');
            if (quantitySpan) quantitySpan.textContent = utensilsCount;
        }
        const promoContainer = document.querySelector('.promo-code-container');
        if (promoContainer) {
            promoContainer.classList.remove('active');
            const promoInput = promoContainer.querySelector('.promo-code-input');
            const promoMessage = promoContainer.querySelector('.promo-message');
            if (promoInput) promoInput.value = '';
            if (promoMessage) promoMessage.style.display = 'none';
        }
    }

    document.querySelector('.products-container')?.addEventListener('click', (e) => {
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
        if (!window.cart.items[productId]) window.cart.items[productId] = 1;
        else window.cart.items[productId]++;
        updateCartTotal();
        updateProductButton(productId);
        updateCartSummary();
        localStorage.setItem(`sushi_like_cart_${city}`, JSON.stringify(window.cart));
    }

    function updateCartTotal() {
        window.cart.total = 0;
        for (const productId in window.cart.items) {
            const product = window.products.find(p => p.id == productId);
            if (product) window.cart.total += product.price * window.cart.items[productId];
        }
        const discountPercentage = window.cart.appliedDiscount?.discountPercentage || 0;
        if (discountPercentage > 0) {
            window.cart.discount = (window.cart.total * discountPercentage) / 100;
            window.cart.totalAfterDiscount = window.cart.total - window.cart.discount;
        } else {
            window.cart.discount = 0;
            window.cart.totalAfterDiscount = window.cart.total;
        }
        localStorage.setItem(`sushi_like_cart_${city}`, JSON.stringify(window.cart));
    }

    function updateProductButton(productId) {
        const productElement = document.querySelector(`.product[data-product-id="${productId}"]`);
        if (productElement) {
            const priceCart = productElement.querySelector('.product-price-cart');
            const product = window.products.find(p => p.id == productId);
            const quantity = window.cart.items[productId] || 0;
            if (quantity > 0 && product) {
                priceCart.innerHTML = `
                    <span class="price">${Math.floor(product.price)} ₽</span>
                    <div class="quantity-adjuster" style="animation: none;">
                        <button class="minus"><img src="/${city}/photo/карточки/minus.png" alt="Уменьшить"></button>
                        <span class="quantity">${quantity}</span>
                        <button class="plus"><img src="/${city}/photo/карточки/plus.png" alt="Увеличить"></button>
                    </div>
                `;
            } else if (product) {
                priceCart.innerHTML = `
                    <button class="product-action-button">
                        <span>${Math.floor(product.price)} ₽</span>
                        <img src="/${city}/photo/карточки/добавить.png" alt="Add" class="plus-icon">
                    </button>
                `;
            }
        }
    }

    function updateCartSummary() {
        const itemCount = Object.values(window.cart.items).reduce((sum, qty) => sum + qty, 0);
        const total = Math.floor(window.cart.totalAfterDiscount || window.cart.total);
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
                    <img src="/${city}/photo/карточки/корзинапуст.png" alt="Пустая корзина">
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
                                    <button class="minus"><img src="/${city}/photo/карточки/minus.png" alt="Уменьшить"></button>
                                    <span class="quantity">${quantity}</span>
                                    <button class="plus"><img src="/${city}/photo/карточки/plus.png" alt="Увеличить"></button>
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
        const discount = window.cart.appliedDiscount?.discountPercentage > 0 ? Math.floor(window.cart.discount) : 0;
        const totalCost = Math.floor(window.cart.totalAfterDiscount || window.cart.total);
        const modal = document.getElementById(modalId);
        if (modal) {
            const itemCountSpan = modal.querySelector('.item-count');
            const itemsTotalSpan = modal.querySelector('.items-total');
            const totalCostSpan = modal.querySelector('.total-cost');
            const discountSpan = modal.querySelector('.discount');
            if (itemCountSpan) itemCountSpan.textContent = itemCount;
            if (itemsTotalSpan) itemsTotalSpan.textContent = itemsTotal + ' ₽';
            if (totalCostSpan) totalCostSpan.textContent = totalCost + ' ₽';
            if (discountSpan) {
                discountSpan.textContent = discount > 0 ? `- ${discount} ₽ (-${window.cart.appliedDiscount.discountPercentage}%)` : '0 ₽';
            } else if (discount > 0) {
                const discountLine = document.createElement('div');
                discountLine.className = 'summary-line';
                discountLine.innerHTML = `<span>Скидка</span><span class="discount">- ${discount} ₽ (-${window.cart.appliedDiscount.discountPercentage}%)</span>`;
                modal.querySelector('.cart-summary')?.insertBefore(discountLine, modal.querySelector('.summary-line:last-child'));
            }
        }
    }

    function initializeProductButtons() {
        if (window.products && window.cart) {
            Object.keys(window.cart.items).forEach(productId => {
                if (window.cart.items[productId] > 0) {
                    updateProductButton(productId);
                }
            });
        }
    }

    function populateOrderModal() {
        const savedAddress = JSON.parse(localStorage.getItem('sushi_like_address')) || {};
        const addressContainer = document.querySelector('.order-modal .address-container');
        if (!addressContainer) {
            console.error('Address container not found in order modal');
            return;
        }

        const fieldMappings = {
            currentAddress: 'Адрес',
            currentApartment: 'Квартира',
            currentEntrance: 'Подъезд',
            currentFloor: 'Этаж'
        };

        // Toggle visibility of apartment, entrance, and floor fields based on mode
        const additionalFields = ['currentApartment', 'currentEntrance', 'currentFloor'];
        addressContainer.querySelectorAll('.address-container-item').forEach(item => {
            const fieldType = item.dataset.field;
            if (additionalFields.includes(fieldType)) {
                item.style.display = window.currentMode === 'delivery' ? 'block' : 'none';
            }
        });

        // Update address fields
        const addressItems = addressContainer.querySelectorAll('.address-container-item');
        addressItems.forEach(item => {
            const input = item.querySelector('.address-input');
            const labelText = item.querySelector('.address-label-text');
            const iconWrapper = item.querySelector('.address-icon-wrapper');
            const fieldType = item.dataset.field;

            if (!input || !fieldType) {
                console.error(`Missing input or dataset.field for address item:`, item);
                return;
            }

            // Set input value
            if (fieldType === 'currentAddress') {
                input.value = window.currentMode === 'delivery' ? (savedAddress.currentAddress || '') : pickupAddress;
                item.classList.add('active');
            } else if (window.currentMode === 'delivery' && savedAddress[fieldType]) {
                input.value = savedAddress[fieldType];
                item.classList.add('active');
            } else {
                input.value = '';
                item.classList.remove('active');
            }

            // Update label text
            if (labelText && fieldMappings[fieldType]) {
                labelText.textContent = fieldMappings[fieldType];
            }

            // Attach event listeners
            [labelText, iconWrapper].forEach(el => {
                if (el) {
                    el.addEventListener('click', () => {
                        item.classList.add('active');
                        input.focus();
                    });
                }
            });

            input.addEventListener('focus', () => item.classList.add('active'));
            input.addEventListener('blur', () => {
                if (!input.value.trim()) {
                    item.classList.remove('active');
                }
                // Save to localStorage for delivery mode
                if (window.currentMode === 'delivery') {
                    savedAddress[fieldType] = input.value.trim();
                    localStorage.setItem('sushi_like_address', JSON.stringify(savedAddress));
                }
            });
        });

        // Update contact fields
        const contactItems = document.querySelectorAll('.order-modal .contact-container-item');
        contactItems.forEach(item => {
            const input = item.querySelector('.contact-input');
            const labelText = item.querySelector('.contact-label-text');
            const iconWrapper = item.querySelector('.contact-icon-wrapper');

            [labelText, iconWrapper].forEach(el => {
                if (el) el.addEventListener('click', () => {
                    item.classList.add('active');
                    if (input) input.focus();
                });
            });

            if (input) {
                input.addEventListener('focus', () => item.classList.add('active'));
                input.addEventListener('blur', () => {
                    if (!input.value || input.value === '+7') item.classList.remove('active');
                });
            }
        });

        // Update comment field
        const commentItem = document.querySelector('.order-modal .order-comment-item');
        if (commentItem) {
            const textarea = commentItem.querySelector('.order-comment-textarea');
            const labelText = commentItem.querySelector('.order-comment-label-text');
            const iconWrapper = document.querySelector('.order-comment-icon-wrapper');

            [labelText, iconWrapper].forEach(el => {
                if (el) el.addEventListener('click', () => {
                    commentItem.classList.add('active');
                    if (textarea) textarea.focus();
                });
            });

            if (textarea) {
                textarea.addEventListener('focus', () => commentItem.classList.add('active'));
                textarea.addEventListener('blur', () => {
                    if (!textarea.value.trim()) commentItem.classList.remove('active');
                });
            }
        }

        // Update payment dropdown
        const paymentContainer = document.querySelector('.order-modal .payment-method-container');
        if (paymentContainer) {
            const paymentItem = paymentContainer.querySelector('.payment-method-item');
            const input = paymentContainer.querySelector('.payment-input');
            const dropdown = paymentContainer.querySelector('.payment-dropdown');
            const options = paymentContainer.querySelectorAll('.payment-option');

            const openDropdown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!dropdown.classList.contains('active')) {
                    dropdown.classList.add('active');
                }
                paymentItem.classList.add('active');
            };

            paymentContainer.addEventListener('click', openDropdown);

            options.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (input) input.value = option.textContent;
                    dropdown.classList.remove('active');
                    paymentItem.classList.add('active');
                });
            });

            document.addEventListener('click', (e) => {
                if (!paymentContainer.contains(e.target) && dropdown.classList.contains('active')) {
                    dropdown.classList.remove('active');
                    if (input && !input.value.trim()) {
                        paymentItem.classList.remove('active');
                    }
                }
            });
        }
    }

    // Delivery switcher logic for order modal
    function setupDeliverySwitcher() {
        const switcherButtons = document.querySelectorAll('.order-modal .delivery-switcher .mode');
        switcherButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Update active state
                switcherButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update mode
                window.currentMode = button.dataset.mode;
                const savedAddress = JSON.parse(localStorage.getItem('sushi_like_address')) || {};

                // Update localStorage
                if (window.currentMode === 'pickup') {
                    savedAddress.currentMode = 'pickup';
                    savedAddress.currentAddress = pickupAddress;
                    savedAddress.currentApartment = '';
                    savedAddress.currentEntrance = '';
                    savedAddress.currentFloor = '';
                } else {
                    savedAddress.currentMode = 'delivery';
                    savedAddress.currentAddress = savedAddress.currentAddress || '';
                }
                localStorage.setItem('sushi_like_address', JSON.stringify(savedAddress));

                // Update order title
                const orderTitle = document.querySelector('.order-title');
                if (orderTitle) {
                    orderTitle.textContent = window.currentMode === 'delivery' ? 'Доставка' : 'Самовывоз';
                }

                // Refresh address fields
                populateOrderModal();
            });
        });
    }

    // Привязываем клик на пункт меню "Корзина" к кнопке "Мой заказ"
    document.querySelector('.cart')?.addEventListener('click', () => {
        const cartSummaryMobile = document.getElementById('cartSummaryMobile');
        if (cartSummaryMobile) {
            cartSummaryMobile.click(); // Имитируем клик на кнопку "Мой заказ"
        } else {
            openCartModal(); // Резервный вариант, если кнопка "Мой заказ" не найдена
        }
    });

    document.getElementById('cartSummaryMobile')?.addEventListener('click', openCartModal);
    document.querySelector('.clear-cart-icon')?.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите очистить корзину?')) {
            resetCart();
        }
    });
    document.querySelector('.close-cart')?.addEventListener('click', () => {
        document.getElementById('cartModal')?.classList.remove('active');
        toggleModalOverlay(false, 'cartModal');
    });
    document.getElementById('cartModalOverlay')?.addEventListener('click', (e) => {
        if (window.innerWidth > 768 && e.target === e.currentTarget) {
            document.getElementById('cartModal')?.classList.remove('active');
            toggleModalOverlay(false, 'cartModal');
        }
    });

    document.querySelector('.cart-modal .next-button')?.addEventListener('click', () => {
        openOrderModal();
        setupDeliverySwitcher(); // Initialize switcher after opening order modal
    });
    document.getElementById('closeOrderModal')?.addEventListener('click', () => {
        document.getElementById('orderModal')?.classList.remove('active');
        toggleModalOverlay(false, 'orderModal');
    });
    document.getElementById('orderModalOverlay')?.addEventListener('click', (e) => {
        if (window.innerWidth > 768 && e.target === e.currentTarget) {
            document.getElementById('orderModal')?.classList.remove('active');
            toggleModalOverlay(false, 'orderModal');
        }
    });

    document.querySelector('.back-arrow')?.addEventListener('click', (e) => {
        e.preventDefault();
        openCartModal();
    });

    const asapButton = document.querySelector('.time-switcher .asap');
    const preOrderButton = document.querySelector('.time-switcher .pre-order');
    const preOrderFields = document.querySelector('.pre-order-fields');

    if (asapButton) asapButton.addEventListener('click', () => {
        asapButton.classList.add('active');
        if (preOrderButton) preOrderButton.classList.remove('active');
        if (preOrderFields) preOrderFields.style.display = 'none';
    });

    if (preOrderButton) preOrderButton.addEventListener('click', () => {
        preOrderButton.classList.add('active');
        if (asapButton) asapButton.classList.remove('active');
        if (preOrderFields) preOrderFields.style.display = 'flex';
        const dateSelect = document.getElementById('preOrderDate');
        if (dateSelect) generateTimeOptions(dateSelect.value);
    });

    window.addEventListener('resize', updateCartSummary);

    window.populateOrderModal = populateOrderModal;
    window.restorePreviousModal = function() {
        if (previousModal === 'cart') openCartModal();
        else if (previousModal === 'order') openOrderModal();
    };

    window.updateCartTotal = updateCartTotal;
    window.updateProductButton = updateProductButton;
    window.updateCartSummary = updateCartSummary;
    window.toggleModalOverlay = toggleModalOverlay;
    window.resetCart = resetCart;

    updateCartSummary();
    window.addEventListener('initialProductsLoaded', initializeProductButtons);
    window.addEventListener('productsLoaded', initializeProductButtons);
});