document.addEventListener('DOMContentLoaded', () => {
    let cart = {
        items: {}, // {productId: quantity}
        total: 0
    };

    // Prevent background interaction when modals are open
    function toggleModalOverlay(isOpen, modalId) {
        const overlay = document.getElementById(modalId === 'cartModal' ? 'cartModalOverlay' : 'modalOverlay');
        if (overlay) {
            overlay.style.display = isOpen ? 'block' : 'none';
        }
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    // Open delivery modal and close cart modal
    function openDeliveryModal(e) {
        e.preventDefault();
        e.stopPropagation();
        const cartModal = document.getElementById('cartModal');
        const deliveryModal = document.getElementById('deliveryModal');
        if (cartModal && deliveryModal) {
            cartModal.classList.remove('active');
            toggleModalOverlay(false, 'cartModal');
            window.openDeliveryModal(e, 'delivery'); // Call global function with 'delivery' mode
        }
    }

    // Product button click handler
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
                    <span class="price">${product.price} ₽</span>
                    <div class="quantity-adjuster" style="animation: none;">
                        <button class="minus">-</button>
                        <span class="quantity">${quantity}</span>
                        <button class="plus">+</button>
                    </div>
                `;
            } else {
                priceCart.innerHTML = `
                    <button class="product-action-button">
                        <span>${product.price} ₽</span>
                        <img src="photo/карточки/добавить.png" alt="Add" class="plus-icon">
                    </button>
                `;
            }
        }
    }

    function updateCartSummary() {
        const itemCount = Object.values(cart.items).reduce((sum, qty) => sum + qty, 0);
        const total = cart.total;
        const cartAmount = document.querySelector('.cart-amount');
        if (cartAmount) {
            cartAmount.textContent = total.toFixed(2);
        }
        const cartSummaryMobile = document.getElementById('cartSummaryMobile');
        if (cartSummaryMobile) {
            const itemCountSpan = cartSummaryMobile.querySelector('.cart-item-count');
            const totalSpan = cartSummaryMobile.querySelector('.cart-total');
            if (itemCountSpan) itemCountSpan.textContent = itemCount;
            if (totalSpan) totalSpan.textContent = total.toFixed(2);
            cartSummaryMobile.style.display = itemCount > 0 && window.innerWidth <= 768 ? 'flex' : 'none';
        }
    }

    function openCartModal() {
        const cartModal = document.getElementById('cartModal');
        if (cartModal) {
            cartModal.classList.add('active');
            toggleModalOverlay(true, 'cartModal');
            renderCartItems();
            updateCartSummaryInModal();
            // Add delivery modal triggers
            const addressPanelInModal = document.querySelector('#cartModal .address-panel');
            const switcherContainerInModal = document.querySelector('#cartModal .switcher-container');
            if (addressPanelInModal) {
                addressPanelInModal.removeEventListener('click', openDeliveryModal); // Prevent multiple listeners
                addressPanelInModal.addEventListener('click', openDeliveryModal);
            }
            if (switcherContainerInModal) {
                switcherContainerInModal.removeEventListener('click', openDeliveryModal); // Prevent multiple listeners
                switcherContainerInModal.addEventListener('click', openDeliveryModal);
            }
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
                            <div class="item-price">${product.price} ₽</div>
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
                    updateCartSummaryInModal();
                    updateProductButton(productId);
                    updateCartSummary();
                });
                itemElement.querySelector('.plus').addEventListener('click', () => {
                    cart.items[productId]++;
                    updateCartTotal();
                    renderCartItems();
                    updateCartSummaryInModal();
                    updateProductButton(productId);
                    updateCartSummary();
                });
            }
        }
    }

    function updateCartSummaryInModal() {
        const itemCount = Object.values(cart.items).reduce((sum, qty) => sum + qty, 0);
        const itemsTotal = cart.total;
        const deliveryCost = 0;
        const totalCost = itemsTotal + deliveryCost;
        const cartModal = document.getElementById('cartModal');
        if (cartModal) {
            const itemCountSpan = cartModal.querySelector('.item-count');
            const itemsTotalSpan = cartModal.querySelector('.items-total');
            const deliveryCostSpan = cartModal.querySelector('.delivery-cost');
            const totalCostSpan = cartModal.querySelector('.total-cost');
            if (itemCountSpan) itemCountSpan.textContent = itemCount;
            if (itemsTotalSpan) itemsTotalSpan.textContent = itemsTotal.toFixed(2) + ' ₽';
            if (deliveryCostSpan) deliveryCostSpan.textContent = deliveryCost.toFixed(2) + ' ₽';
            if (totalCostSpan) totalCostSpan.textContent = totalCost.toFixed(2) + ' ₽';
        }
    }

    // Cart header click
    document.querySelector('.cart').addEventListener('click', openCartModal);

    // Mobile cart summary click
    document.getElementById('cartSummaryMobile').addEventListener('click', openCartModal);

    // Clear cart
    document.querySelector('.clear-cart').addEventListener('click', () => {
        const productIds = Object.keys(cart.items);
        cart.items = {};
        cart.total = 0;
        renderCartItems();
        updateCartSummaryInModal();
        updateCartSummary();
        productIds.forEach(productId => updateProductButton(productId));
    });

    // Close cart modal
    document.querySelector('.close-cart').addEventListener('click', () => {
        document.getElementById('cartModal').classList.remove('active');
        toggleModalOverlay(false, 'cartModal');
    });

    // Close cart modal on outside click (desktop only)
    document.getElementById('cartModalOverlay').addEventListener('click', (e) => {
        if (window.innerWidth > 768 && e.target === e.currentTarget) {
            document.getElementById('cartModal').classList.remove('active');
            toggleModalOverlay(false, 'cartModal');
        }
    });

    // Update cart summary on resize to handle mobile/desktop visibility
    window.addEventListener('resize', updateCartSummary);
});