document.addEventListener('DOMContentLoaded', () => {
    const orderButton = document.querySelector('.order-button');
    const errorMessage = document.getElementById('orderErrorMessage');
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmationModalOverlay = document.getElementById('confirmationModalOverlay');
    const confirmationTitle = document.querySelector('.confirmation-title');
    const confirmationMessage = document.querySelector('.confirmation-message');
    const confirmationDetails = document.querySelector('.confirmation-details');
    const closeConfirmationModal = document.getElementById('closeConfirmationModal');
    const confirmButton = document.querySelector('.confirmation-modal .confirm-button');
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    if (!orderButton) {
        console.error('Order button not found. Ensure element with class="order-button" exists.');
        return;
    }

    // Validate phone number (e.g., +79255355278 or 89255355278)
    function validatePhoneNumber(phone) {
        const digitsOnly = phone.replace(/\D/g, '');
        return /^(?:\+7|8|7)\d{10}$/.test(digitsOnly);
    }

    // Validate products array
    function isValidProducts(products) {
        return Array.isArray(products) && 
               products.length > 0 && 
               products.every(p => p.article && typeof p.quantity === 'number' && p.quantity > 0);
    }

    // Display error message in order modal
    function displayError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        } else {
            console.warn('Error message container not found, falling back to alert.');
            alert(message);
        }
    }

    // Clear error message in order modal
    function clearError() {
        if (errorMessage) {
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
        }
    }

    // Show confirmation modal
    function showConfirmationModal(isSuccess, message, orderDetails = null) {
        if (confirmationTitle) confirmationTitle.textContent = isSuccess ? 'Заказ принят' : 'Ошибка';
        if (confirmationMessage) confirmationMessage.textContent = message;
        if (confirmationDetails) confirmationDetails.innerHTML = '';

        if (isSuccess && orderDetails) {
            const { orderId, address, items, total } = orderDetails;
            if (confirmationDetails) {
                confirmationDetails.innerHTML = `
                    <p><strong>Адрес:</strong> ${address}</p>
                    <p><strong>Товары:</strong></p>
                    <div class="items-list">
                        ${items.map(item => `<div class="item"><span>${item.name} (${item.quantity} шт.)</span><span>${item.price * item.quantity} ₽</span></div>`).join('')}
                    </div>
                    <p><strong>Итого:</strong> ${total} ₽</p>
                `;
            }
        }

        if (confirmationModal && confirmationModalOverlay) {
            confirmationModal.classList.add('active');
            confirmationModalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            console.warn('Confirmation modal or overlay not found.');
        }
    }

    // Hide confirmation modal
    function hideConfirmationModal() {
        if (confirmationModal && confirmationModalOverlay) {
            confirmationModal.classList.remove('active');
            confirmationModalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            console.warn('Confirmation modal or overlay not found.');
        }
    }

    // Save order data to localStorage
    function saveOrderData() {
        const orderData = {
            name: document.getElementById('orderName')?.value || '',
            phone: document.getElementById('orderPhone')?.value || '',
            paymentMethod: document.getElementById('paymentInput')?.value || '',
            comments: document.getElementById('orderComment')?.value || '',
            timeMode: document.querySelector('.time-switcher .active')?.classList.contains('asap') ? 'asap' : 'pre-order',
            preOrderDate: document.getElementById('preOrderDate')?.value || '',
            preOrderTime: document.getElementById('preOrderTime')?.value || ''
        };
        localStorage.setItem('sushi_like_order', JSON.stringify(orderData));
    }

    // Submit order to server
    async function submitOrder(orderData, attempt = 1) {
        try {
            const response = await fetch('/submit-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(orderData)
            });
            console.log(`Submit order response status: ${response.status}`);
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error submitting order (attempt ${attempt}):`, error);
            if (attempt < MAX_RETRIES) {
                console.log(`Retrying in ${RETRY_DELAY}ms...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return submitOrder(orderData, attempt + 1);
            }
            throw error;
        }
    }

    // Reset cart and update UI
    function resetCart() {
        const productIds = Object.keys(window.cart?.items || {});
        window.cart = window.cart || {};
        window.cart.items = {};
        window.cart.total = 0;
        window.cart.discount = 0;
        window.cart.totalAfterDiscount = 0;
        window.cart.appliedPromoCode = null;
        window.cart.discountPercentage = 0;
        localStorage.setItem('sushi_like_cart', JSON.stringify(window.cart));
        localStorage.setItem('sushi_like_utensils', '0');
        localStorage.removeItem('sushi_like_order');

        // Update UI with null checks
        const utensilsContainer = document.querySelector('.utensils-container');
        if (utensilsContainer) {
            const quantitySpan = utensilsContainer.querySelector('.quantity');
            if (quantitySpan) quantitySpan.textContent = '0';
        }
        const promoContainer = document.querySelector('.promo-code-container');
        if (promoContainer) {
            promoContainer.classList.remove('active');
            const promoInput = promoContainer.querySelector('.promo-code-input');
            const promoMessage = promoContainer.querySelector('.promo-message');
            if (promoInput) promoInput.value = '';
            if (promoMessage) promoMessage.style.display = 'none';
        }
        window.updateCartSummary?.();
        if (window.products && window.updateProductButton) {
            productIds.forEach(productId => window.updateProductButton(productId));
        }
        const cartItemsContainer = document.querySelector('.cart-items');
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <img src="photo/карточки/корзинапуст.png" alt="Пустая корзина">
                    <p class="empty-cart-title">Ваша корзина пуста</p>
                    <p class="empty-cart-subtitle">Загляните в меню и наполните её прямо сейчас любимыми блюдами!</p>
                </div>
            `;
        }
        window.updateCartSummaryInModal?.('cartModal');
    }

    // Handle order submission
    orderButton.addEventListener('click', async () => {
        clearError();
        orderButton.disabled = true;

        // Collect order data
        const address = document.getElementById('orderAddressText')?.textContent || '';
        const apartment = document.getElementById('orderApartment')?.textContent || '';
        const entrance = document.getElementById('orderEntrance')?.textContent || '';
        const floor = document.getElementById('orderFloor')?.textContent || '';
        const phone = document.getElementById('orderPhone')?.value.trim() || '';
        const timeMode = document.querySelector('.time-switcher .active')?.classList.contains('asap') ? 'asap' : 'pre-order';
        const paymentMethod = document.getElementById('paymentInput')?.value || 'Наличными';
        const comments = document.getElementById('orderComment')?.value || '';
        const utensilsCount = parseInt(document.querySelector('.utensils-container .quantity')?.textContent || '0');
        const deliveryType = window.currentMode || 'delivery';
        const promoCode = window.cart?.appliedPromoCode || null;

        // Construct full address
        const fullAddress = apartment || entrance || floor
            ? `${address} (кв. ${apartment || ''}${entrance ? ', подъезд ' + entrance : ''}${floor ? ', этаж ' + floor : ''})`
            : address;

        // Validate products
        const products = Object.keys(window.cart?.items || {}).map(id => {
            const product = window.products?.find(p => p.id == id);
            if (!product || !product.article) {
                console.warn(`Skipping product with ID ${id}: missing article`);
                return null;
            }
            return { article: product.article, quantity: window.cart.items[id] };
        }).filter(item => item !== null);

        // Validate mandatory fields
        const errors = [];
        if (!phone || !validatePhoneNumber(phone)) errors.push('Укажите корректный номер телефона (например, +79255355278)');
        if (!address || address === 'Укажите адрес доставки') errors.push('Укажите адрес доставки');
        if (!isValidProducts(products)) errors.push('Корзина пуста или содержит некорректные товары');
        if (timeMode === 'pre-order') {
            const date = document.getElementById('preOrderDate')?.value;
            const time = document.getElementById('preOrderTime')?.value;
            if (!date || !time) errors.push('Укажите дату и время предзаказа');
        }

        if (errors.length > 0) {
            displayError(errors.join(', '));
            orderButton.disabled = false;
            return;
        }

        // Construct order data
        const orderData = {
            customer_name: document.getElementById('orderName')?.value.trim() || 'Клиент',
            phone_number: phone,
            delivery_type: deliveryType,
            address: deliveryType === 'delivery' ? fullAddress : null,
            payment_method: paymentMethod,
            delivery_time: timeMode === 'asap' ? 'now' : `${document.getElementById('preOrderDate')?.value} ${document.getElementById('preOrderTime')?.value}:00`,
            comments: comments || null,
            utensils_count: utensilsCount,
            products: products,
            promo_code: promoCode,
            status: 'new'
        };

        console.log('Submitting order to /submit-order with data:', orderData);

        try {
            const data = await submitOrder(orderData);
            orderButton.disabled = false;
            if (data.result === 'success') {
                // Prepare order details for confirmation modal
                const items = Object.keys(window.cart?.items || {}).map(id => {
                    const product = window.products?.find(p => p.id == id);
                    return {
                        name: product?.name || 'Неизвестный товар',
                        quantity: window.cart.items[id],
                        price: product?.price || 0
                    };
                });
                const orderDetails = {
                    orderId: data.order_id,
                    address: fullAddress,
                    items: items,
                    total: Math.floor(window.cart?.totalAfterDiscount || window.cart?.total || 0)
                };

                // Reset cart and update UI
                resetCart();

                // Close order modal
                const orderModal = document.getElementById('orderModal');
                if (orderModal) orderModal.classList.remove('active');
                window.toggleModalOverlay?.(false, 'orderModal');

                // Show confirmation modal
                showConfirmationModal(true, `Ваш заказ №${data.order_id} принят! В ближайшее время с вами свяжется оператор для подтверждения.`, orderDetails);
            } else {
                showConfirmationModal(false, `Ошибка при отправке заказа: ${data.error || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            orderButton.disabled = false;
            console.error('Error submitting order:', error);
            showConfirmationModal(false, `Ошибка при отправке заказа: ${error.message}. Проверьте данные и попробуйте снова.`);
        }
    });

    // Event listeners for confirmation modal
    closeConfirmationModal?.addEventListener('click', hideConfirmationModal);
    confirmButton?.addEventListener('click', hideConfirmationModal);
    confirmationModalOverlay?.addEventListener('click', (e) => {
        if (window.innerWidth > 768 && e.target === e.currentTarget) {
            hideConfirmationModal();
        }
    });

    // Attach input listeners for saving order data
    document.getElementById('orderName')?.addEventListener('input', saveOrderData);
    document.getElementById('orderPhone')?.addEventListener('input', saveOrderData);
    document.getElementById('orderComment')?.addEventListener('input', saveOrderData);
    document.getElementById('preOrderDate')?.addEventListener('change', saveOrderData);
    document.getElementById('preOrderTime')?.addEventListener('change', saveOrderData);
    document.querySelectorAll('.time-switcher .mode').forEach(btn => {
        btn.addEventListener('click', saveOrderData);
    });
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', saveOrderData);
    });

    // Populate order modal
    window.populateOrderModal = function() {
        const today = new Date(); // Define today at the start to avoid scope issues

        const addressText = document.getElementById('addressText')?.textContent || '';
        const orderAddressText = document.getElementById('orderAddressText');
        if (orderAddressText) {
            const mainAddress = addressText.split(' (')[0];
            orderAddressText.textContent = mainAddress;
        }

        const apartmentSpan = document.getElementById('orderApartment');
        const entranceSpan = document.getElementById('orderEntrance');
        const floorSpan = document.getElementById('orderFloor');

        const match = addressText.match(/\(кв\. (.*?)(?:, подъезд (.*?))?(?:, этаж (.*?))?\)/);
        if (apartmentSpan) apartmentSpan.textContent = match ? match[1] || '' : '';
        if (entranceSpan) entranceSpan.textContent = match ? match[2] || '' : '';
        if (floorSpan) floorSpan.textContent = match ? match[3] || '' : '';

        const orderTitle = document.querySelector('.order-title');
        if (orderTitle) {
            orderTitle.textContent = window.currentMode === 'delivery' ? 'Доставка' : 'Самовывоз';
        }

        const dateSelect = document.getElementById('preOrderDate');
        if (dateSelect) {
            dateSelect.innerHTML = '';
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dateString = date.toISOString().split('T')[0];
                const option = document.createElement('option');
                option.value = dateString;
                option.textContent = date.toLocaleDateString('ru-RU');
                dateSelect.appendChild(option);
            }
        }

        const savedOrder = JSON.parse(localStorage.getItem('sushi_like_order')) || {};
        const nameInput = document.getElementById('orderName');
        const phoneInput = document.getElementById('orderPhone');
        const paymentInput = document.getElementById('paymentInput');
        const commentInput = document.getElementById('orderComment');
        const asapButton = document.querySelector('.time-switcher .asap');
        const preOrderButton = document.querySelector('.time-switcher .pre-order');
        const preOrderFields = document.querySelector('.pre-order-fields');

        if (nameInput) nameInput.value = savedOrder.name || '';
        if (phoneInput) phoneInput.value = savedOrder.phone || '';
        if (paymentInput) paymentInput.value = savedOrder.paymentMethod || 'Наличными';
        if (commentInput) commentInput.value = savedOrder.comments || '';

        if (savedOrder.timeMode === 'pre-order' && asapButton && preOrderButton && preOrderFields) {
            preOrderButton.classList.add('active');
            asapButton.classList.remove('active');
            preOrderFields.style.display = 'flex';
            if (dateSelect) {
                dateSelect.value = savedOrder.preOrderDate || today.toISOString().split('T')[0];
                generateTimeOptions(dateSelect.value);
            }
            const timeSelect = document.getElementById('preOrderTime');
            if (timeSelect) timeSelect.value = savedOrder.preOrderTime || '';
        } else if (asapButton && preOrderButton && preOrderFields) {
            asapButton.classList.add('active');
            preOrderButton.classList.remove('active');
            preOrderFields.style.display = 'none';
            generateTimeOptions(today.toISOString().split('T')[0]);
        }

        if (dateSelect) {
            dateSelect.addEventListener('change', () => {
                generateTimeOptions(dateSelect.value);
                saveOrderData();
            });
        }

        window.updateCartSummaryInModal?.('orderModal');

        const paymentItem = document.querySelector('.payment-method-item');
        const paymentLabel = document.querySelector('.payment-label-text');
        const paymentDropdown = document.querySelector('.payment-dropdown');
        const paymentOptions = document.querySelectorAll('.payment-option');

        const toggleDropdown = () => {
            if (paymentDropdown) paymentDropdown.classList.toggle('active');
            if (paymentItem) paymentItem.classList.add('active');
        };

        if (paymentInput) paymentInput.addEventListener('click', toggleDropdown);
        if (paymentLabel) paymentLabel.addEventListener('click', () => {
            if (paymentItem) paymentItem.classList.add('active');
            toggleDropdown();
        });

        paymentOptions.forEach(option => {
            option.addEventListener('click', () => {
                if (paymentInput) paymentInput.value = option.textContent;
                if (paymentDropdown) paymentDropdown.classList.remove('active');
                saveOrderData();
            });
        });

        document.addEventListener('click', (e) => {
            if (paymentItem && paymentDropdown && !paymentItem.contains(e.target) && paymentDropdown.classList.contains('active')) {
                paymentDropdown.classList.remove('active');
                if (paymentInput && !paymentInput.value) paymentItem.classList.remove('active');
            }
        });

        // Phone input handling
        const phoneInputElement = document.getElementById('orderPhone');
        if (!phoneInputElement) {
            console.warn('Phone input (#orderPhone) not found in order modal.');
            return;
        }
        const phoneItem = phoneInputElement.closest('.contact-container-item');
        if (!phoneItem) {
            console.warn('Parent .contact-container-item for phone input not found.');
            return;
        }
        const phoneLabel = phoneItem.querySelector('.contact-label-text');
        const phoneIcon = phoneItem.querySelector('.contact-icon-wrapper');

        [phoneLabel, phoneIcon].forEach(el => {
            if (el) el.addEventListener('click', () => {
                phoneItem.classList.add('active');
                phoneInputElement.focus();
            });
        });

        phoneInputElement.addEventListener('focus', () => {
            phoneItem.classList.add('active');
        });
        phoneInputElement.addEventListener('input', () => {
            phoneItem.classList.add('active');
            saveOrderData();
        });
    };

    function generateTimeOptions(selectedDate) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const isToday = selectedDate === today;
        const timeSelect = document.getElementById('preOrderTime');
        if (timeSelect) {
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
    }
});