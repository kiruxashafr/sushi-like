document.addEventListener('DOMContentLoaded', () => {
    const city = window.location.pathname.includes('/nnovgorod') ? 'nnovgorod' : 'kovrov';
    const pickupAddress = city === 'nnovgorod' ? 'ул. Советская 12, Нижний Новгород' : 'ул. Клязьменская 11, Ковров';

    window.cart = JSON.parse(localStorage.getItem('sushi_like_cart')) || {
        items: {},
        total: 0,
        discount: 0,
        totalAfterDiscount: 0,
        appliedPromoCode: null,
        discountPercentage: 0
    };
    let utensilsCount = parseInt(localStorage.getItem('sushi_like_utensils')) || 0;
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
            window.populateOrderModal?.();
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
                            <input type="text" class="promo-code-input" placeholder="Введите промокод">
                            <button class="apply-promo-button">➤</button>
                        </div>
                        <span class="promo-code-label">Промокод</span>
                    </div>
                    <div class="promo-message" style="display: none; color: red; font-size: 14px; margin-top: 5px;"></div>
                `;
                const cartItemsContainer = document.querySelector('.cart-items');
                if (cartItemsContainer) {
                    cartItemsContainer.insertAdjacentElement('afterend', cartOptionsContainer);
                }

                cartOptionsContainer.querySelector('.utensils-container .minus').addEventListener('click', () => {
                    if (utensilsCount > 0) {
                        utensilsCount--;
                        cartOptionsContainer.querySelector('.utensils-container .quantity').textContent = utensilsCount;
                        localStorage.setItem('sushi_like_utensils', utensilsCount);
                    }
                });
                cartOptionsContainer.querySelector('.utensils-container .plus').addEventListener('click', () => {
                    utensilsCount++;
                    cartOptionsContainer.querySelector('.utensils-container .quantity').textContent = utensilsCount;
                    localStorage.setItem('sushi_like_utensils', utensilsCount);
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
                        promoMessage.textContent = 'Введите промокод';
                        promoMessage.style.color = 'red';
                        promoMessage.style.display = 'block';
                        return;
                    }

                    try {
                        const response = await fetch(`/api/${city}/promo-code/validate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code })
                        });
                        const result = await response.json();
                        if (result.result === 'success') {
                            window.cart.appliedPromoCode = code;
                            window.cart.discountPercentage = result.discount_percentage;
                            promoMessage.textContent = `Промокод успешно применен (-${window.cart.discountPercentage}%)`;
                            promoMessage.style.color = 'green';
                            promoMessage.style.display = 'block';
                            updateCartTotal();
                            updateCartSummaryInModal('cartModal');
                            updateCartSummary();
                        } else {
                            window.cart.appliedPromoCode = null;
                            window.cart.discountPercentage = 0;
                            promoMessage.textContent = result.error || 'Промокод не существует';
                            promoMessage.style.color = 'red';
                            promoMessage.style.display = 'block';
                            updateCartTotal();
                            updateCartSummaryInModal('cartModal');
                            updateCartSummary();
                        }
                    } catch (error) {
                        promoMessage.textContent = 'Ошибка при проверке промокода';
                        promoMessage.style.color = 'red';
                        promoMessage.style.display = 'block';
                    }
                });
            } else {
                cartOptionsContainer.querySelector('.utensils-container .quantity').textContent = utensilsCount;
                const promoInput = cartOptionsContainer.querySelector('.promo-code-input');
                if (window.cart.appliedPromoCode) {
                    promoInput.value = window.cart.appliedPromoCode;
                    cartOptionsContainer.querySelector('.promo-code-container').classList.add('active');
                    const promoMessage = cartOptionsContainer.querySelector('.promo-message');
                    if (promoMessage) {
                        promoMessage.textContent = `Промокод успешно применен (-${window.cart.discountPercentage}%)`;
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
        window.cart.appliedPromoCode = null;
        window.cart.discountPercentage = 0;
        utensilsCount = 0;
        localStorage.setItem('sushi_like_cart', JSON.stringify(window.cart));
        localStorage.setItem('sushi_like_utensils', utensilsCount);
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
        localStorage.setItem('sushi_like_cart', JSON.stringify(window.cart));
    }

    function updateCartTotal() {
        window.cart.total = 0;
        for (const productId in window.cart.items) {
            const product = window.products.find(p => p.id == productId);
            if (product) window.cart.total += product.price * window.cart.items[productId];
        }
        if (window.cart.discountPercentage > 0) {
            window.cart.discount = (window.cart.total * window.cart.discountPercentage) / 100;
            window.cart.totalAfterDiscount = window.cart.total - window.cart.discount;
        } else {
            window.cart.discount = 0;
            window.cart.totalAfterDiscount = window.cart.total;
        }
        localStorage.setItem('sushi_like_cart', JSON.stringify(window.cart));
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
        const discount = window.cart.discountPercentage > 0 ? Math.floor(window.cart.discount) : 0;
        const deliveryCost = window.currentMode === 'delivery' ? 150 : 0;
        const totalCost = Math.floor((window.cart.totalAfterDiscount || window.cart.total) + deliveryCost);
        const modal = document.getElementById(modalId);
        if (modal) {
            const itemCountSpan = modal.querySelector('.item-count');
            const itemsTotalSpan = modal.querySelector('.items-total');
            const deliveryCostSpan = modal.querySelector('.delivery-cost');
            const totalCostSpan = modal.querySelector('.total-cost');
            const discountSpan = modal.querySelector('.discount');
            if (itemCountSpan) itemCountSpan.textContent = itemCount;
            if (itemsTotalSpan) itemsTotalSpan.textContent = itemsTotal + ' ₽';
            if (deliveryCostSpan) deliveryCostSpan.textContent = deliveryCost + ' ₽';
            if (totalCostSpan) totalCostSpan.textContent = totalCost + ' ₽';
            if (discountSpan) {
                discountSpan.textContent = discount > 0 ? `- ${discount} ₽ (-${window.cart.discountPercentage}%)` : '0 ₽';
            } else if (discount > 0) {
                const discountLine = document.createElement('div');
                discountLine.className = 'summary-line';
                discountLine.innerHTML = `<span class="summary-text">Скидка</span><span class="discount">- ${discount} ₽ (-${window.cart.discountPercentage}%)</span>`;
                modal.querySelector('.cart-summary')?.insertBefore(discountLine, modal.querySelector('.summary-line:last-child'));
            }
        }
        if (modalId === 'orderModal') {
            window.cart.appliedPromoCode = window.cart.appliedPromoCode;
            window.cart.discountPercentage = window.cart.discountPercentage;
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

    document.querySelector('.cart')?.addEventListener('click', openCartModal);
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

    document.querySelector('.cart-modal .next-button')?.addEventListener('click', openOrderModal);
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

    document.querySelector('#orderModal .address-container')?.addEventListener('click', (e) => openDeliveryModal(e, 'order'));

    const addressPanel = document.querySelector('#orderModal .address-panel');
    if (addressPanel) addressPanel.removeEventListener('click', (e) => openDeliveryModal(e, 'order'));
    const additionalFields = document.querySelector('#orderModal .additional-fields');
    if (additionalFields) additionalFields.removeEventListener('click', (e) => openDeliveryModal(e, 'order'));

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

    const commentItem = document.querySelector('.order-modal .order-comment-item');
    if (commentItem) {
        const textarea = commentItem.querySelector('.order-comment-textarea');
        const labelText = commentItem.querySelector('.order-comment-label-text');
        const iconWrapper = commentItem.querySelector('.order-comment-icon-wrapper');

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

    const paymentItem = document.querySelector('.order-modal .payment-method-item');
    if (paymentItem) {
        const input = paymentItem.querySelector('.payment-input');
        const dropdown = paymentItem.querySelector('.payment-dropdown');
        const options = paymentItem.querySelectorAll('.payment-option');

        const toggleDropdown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isActive = dropdown.classList.contains('active');
            dropdown.classList.toggle('active', !isActive);
            paymentItem.classList.add('active');
        };

        paymentItem.addEventListener('click', toggleDropdown);

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                if (input) input.value = option.textContent;
                dropdown.classList.remove('active');
                paymentItem.classList.add('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (!paymentItem.contains(e.target) && dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
                if (input && !input.value.trim()) {
                    paymentItem.classList.remove('active');
                }
            }
        });
    }

    window.addEventListener('resize', updateCartSummary);

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