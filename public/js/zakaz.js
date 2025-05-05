document.addEventListener('DOMContentLoaded', () => {
    const orderButton = document.querySelector('.order-button');
    const errorMessage = document.getElementById('orderErrorMessage');
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

    // Display error message
    function displayError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        } else {
            console.warn('Error message container not found, falling back to alert.');
            alert(message);
        }
    }

    // Clear error message
    function clearError() {
        if (errorMessage) {
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
        }
    }

    // Save order data to localStorage
    function saveOrderData() {
        const orderData = {
            name: document.getElementById('orderName').value,
            phone: document.getElementById('orderPhone').value,
            paymentMethod: document.getElementById('paymentInput').value,
            comments: document.getElementById('orderComment').value,
            timeMode: document.querySelector('.time-switcher .active').classList.contains('asap') ? 'asap' : 'pre-order',
            preOrderDate: document.getElementById('preOrderDate').value,
            preOrderTime: document.getElementById('preOrderTime').value
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

    // Handle order submission
    orderButton.addEventListener('click', async () => {
        clearError();
        orderButton.disabled = true;

        // Collect order data
        const address = document.getElementById('orderAddressText').textContent;
        const apartment = document.getElementById('orderApartment').textContent;
        const entrance = document.getElementById('orderEntrance').textContent;
        const floor = document.getElementById('orderFloor').textContent;
        const name = document.getElementById('orderName').value.trim();
        const phone = document.getElementById('orderPhone').value.trim();
        const timeMode = document.querySelector('.time-switcher .active').classList.contains('asap') ? 'asap' : 'pre-order';
        const paymentMethod = document.getElementById('paymentInput').value || 'Наличными'; // Default if empty
        const comments = document.getElementById('orderComment').value;
        const utensilsCount = parseInt(document.querySelector('.utensils-container .quantity')?.textContent || '0');
        const deliveryType = window.currentMode || 'delivery'; // Default to delivery
        const promoCode = window.cart.appliedPromoCode || null;

        // Construct full address
        const fullAddress = apartment || entrance || floor
            ? `${address} (кв. ${apartment || ''}${entrance ? ', подъезд ' + entrance : ''}${floor ? ', этаж ' + floor : ''})`
            : address;

        // Validate products
        const products = Object.keys(window.cart?.items || {}).map(id => {
            const product = window.products.find(p => p.id == id);
            if (!product || !product.article) {
                console.warn(`Skipping product with ID ${id}: missing article`);
                return null;
            }
            return { article: product.article, quantity: window.cart.items[id] };
        }).filter(item => item !== null);

        // Validate all required fields
        const errors = [];
        if (!name) errors.push('Укажите ваше имя');
        if (!phone || !validatePhoneNumber(phone)) errors.push('Укажите корректный номер телефона (например, +79255355278)');
        if (!address || address === 'Укажите адрес доставки') errors.push('Укажите адрес доставки');
        if (!deliveryType) errors.push('Выберите тип доставки (доставка или самовывоз)');
        if (!paymentMethod) errors.push('Выберите способ оплаты');
        if (!isValidProducts(products)) errors.push('Корзина пуста или содержит некорректные товары');
        if (timeMode === 'pre-order') {
            const date = document.getElementById('preOrderDate').value;
            const time = document.getElementById('preOrderTime').value;
            if (!date || !time) errors.push('Укажите дату и время предзаказа');
        }

        if (errors.length > 0) {
            displayError(errors.join(', '));
            orderButton.disabled = false;
            return;
        }

        // Construct order data
        const orderData = {
            customer_name: name,
            phone_number: phone,
            delivery_type: deliveryType,
            address: deliveryType === 'delivery' ? fullAddress : null,
            payment_method: paymentMethod,
            delivery_time: timeMode === 'asap' ? 'now' : `${document.getElementById('preOrderDate').value} ${document.getElementById('preOrderTime').value}:00`,
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
                displayError(`Заказ успешно отправлен! Номер заказа: ${data.order_id}`);
                // Clear cart and localStorage
                window.cart.items = {};
                window.cart.total = 0;
                window.cart.discount = 0;
                window.cart.totalAfterDiscount = 0;
                window.cart.appliedPromoCode = null;
                window.cart.discountPercentage = 0;
                localStorage.setItem('sushi_like_cart', JSON.stringify(window.cart));
                localStorage.setItem('sushi_like_utensils', '0');
                localStorage.removeItem('sushi_like_order');
                // Reset UI
                const utensilsContainer = document.querySelector('.utensils-container');
                if (utensilsContainer) utensilsContainer.querySelector('.quantity').textContent = '0';
                window.updateCartSummary?.();
                if (window.products && window.updateProductButton) {
                    window.products.forEach(product => window.updateProductButton(product.id));
                }
                const orderModal = document.getElementById('orderModal');
                if (orderModal) orderModal.classList.remove('active');
                window.toggleModalOverlay?.(false, 'orderModal');
                document.body.style.overflow = '';
                // Redirect after 2 seconds
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                displayError('Ошибка при отправке заказа: ' + (data.error || 'Неизвестная ошибка'));
            }
        } catch (error) {
            orderButton.disabled = false;
            console.error('Error submitting order:', error);
            displayError(`Ошибка при отправке заказа: ${error.message}. Проверьте данные и попробуйте снова.`);
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

        const savedOrder = JSON.parse(localStorage.getItem('sushi_like_order')) || {};
        const nameInput = document.getElementById('orderName');
        const phoneInput = document.getElementById('orderPhone');
        const paymentInput = document.getElementById('paymentInput');
        const commentInput = document.getElementById('orderComment');
        const asapButton = document.querySelector('.time-switcher .asap');
        const preOrderButton = document.querySelector('.time-switcher .pre-order');
        const preOrderFields = document.querySelector('.pre-order-fields');

        nameInput.value = savedOrder.name || '';
        phoneInput.value = savedOrder.phone || '';
        paymentInput.value = savedOrder.paymentMethod || 'Наличными'; // Default
        commentInput.value = savedOrder.comments || '';

        if (savedOrder.timeMode === 'pre-order') {
            preOrderButton.classList.add('active');
            asapButton.classList.remove('active');
            preOrderFields.style.display = 'flex';
            dateSelect.value = savedOrder.preOrderDate || today.toISOString().split('T')[0];
            generateTimeOptions(dateSelect.value);
            document.getElementById('preOrderTime').value = savedOrder.preOrderTime || '';
        } else {
            asapButton.classList.add('active');
            preOrderButton.classList.remove('active');
            preOrderFields.style.display = 'none';
            generateTimeOptions(today.toISOString().split('T')[0]);
        }

        dateSelect.addEventListener('change', () => {
            generateTimeOptions(dateSelect.value);
            saveOrderData();
        });

        window.updateCartSummaryInModal?.('orderModal');

        const paymentItem = document.querySelector('.payment-method-item');
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
                saveOrderData();
            });
        });

        document.addEventListener('click', (e) => {
            if (!paymentItem.contains(e.target) && paymentDropdown.classList.contains('active')) {
                paymentDropdown.classList.remove('active');
                if (!paymentInput.value) paymentItem.classList.remove('active');
            }
        });

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
        phoneInput.addEventListener('input', () => {
            phoneItem.classList.add('active');
            saveOrderData();
        });
    };

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
});