window.generateTimeOptions = function(selectedDate) {
    console.log(`generateTimeOptions called with selectedDate: ${selectedDate}`);
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // e.g., "2025-05-21"
    console.log(`Current date (today): ${today}, Current time: ${now.toLocaleTimeString()}`);
    
    // Default to today if selectedDate is undefined or invalid
    const effectiveDate = selectedDate && !isNaN(new Date(selectedDate)) ? selectedDate : today;
    const isToday = effectiveDate === today;
    console.log(`Effective date: ${effectiveDate}, isToday: ${isToday}`);

    const timeSelect = document.getElementById('preOrderTime');
    if (!timeSelect) {
        console.warn('preOrderTime select not found in DOM');
        return;
    }

    timeSelect.innerHTML = ''; // Clear existing options
    let startHour = isToday ? now.getHours() : 10;
    let startMinute = isToday ? Math.ceil((now.getMinutes() + 1) / 15) * 15 : 0;

    if (isToday && startMinute >= 60) {
        startHour++;
        startMinute = 0;
    }
    console.log(`Starting time: ${startHour}:${startMinute.toString().padStart(2, '0')}`);

    const timeOptions = [];
    while (startHour < 22 || (startHour === 22 && startMinute <= 30)) {
        if (startHour >= 24) break;
        const timeString = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        timeOptions.push(timeString);
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
    console.log(`Generated time options: ${timeOptions.join(', ')}`);

    // Restore saved time if available and valid
    const savedOrder = JSON.parse(localStorage.getItem('sushi_like_order')) || {};
    if (savedOrder.preOrderTime && timeSelect.querySelector(`option[value="${savedOrder.preOrderTime}"]`)) {
        timeSelect.value = savedOrder.preOrderTime;
        console.log(`Restored saved time: ${savedOrder.preOrderTime}`);
    } else if (timeOptions.length > 0) {
        timeSelect.value = timeOptions[0];
        console.log(`Set default time: ${timeOptions[0]}`);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('zakaz.js loaded, initializing order modal');
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

    function getCurrentCity() {
        const path = window.location.pathname.toLowerCase();
        return path.includes('/kovrov') ? 'kovrov' : path.includes('/nnovgorod') ? 'nnovgorod' : 'kovrov';
    }

    const currentCity = getCurrentCity();
    const cityConfig = {
        kovrov: {
            pickupAddress: 'ул. Клязьменская 11, Ковров',
            defaultAddress: 'Ковров'
        },
        nnovgorod: {
            pickupAddress: 'Южное Шоссе 12д, Нижний Новгород',
            defaultAddress: 'Нижний Новгород'
        }
    };
    const currentCityConfig = cityConfig[currentCity];

    if (!orderButton) {
        console.warn('Order button not found in DOM');
        return;
    }

    function validatePhoneNumber(phone) {
        const digitsOnly = phone.replace(/\D/g, '');
        return /^(?:\+7|8|7)\d{10}$/.test(digitsOnly);
    }

    function isValidProducts(products) {
        return Array.isArray(products) && products.length > 0 && products.every(p => p.article && typeof p.quantity === 'number' && p.quantity > 0);
    }

    function displayError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            console.log(`Displaying error: ${message}`);
        }
    }

    function clearError() {
        if (errorMessage) {
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
            console.log('Cleared error message');
        }
    }

    function showConfirmationModal(isSuccess, message, orderDetails = null) {
        confirmationTitle.textContent = isSuccess ? 'Заказ принят' : 'Ошибка';
        confirmationMessage.textContent = message;
        confirmationDetails.innerHTML = '';

        if (isSuccess && orderDetails) {
            const { orderId, address, items, total } = orderDetails;
            confirmationDetails.innerHTML = `
                <p><strong>Адрес:</strong> ${address}</p>
                <p><strong>Товары:</strong></p>
                <div class="items-list">
                    ${items.map(item => `<div class="item"><span>${item.name} (${item.quantity} шт.)</span><span>${item.price * item.quantity} ₽</span></div>`).join('')}
                </div>
                <p><strong>Итого:</strong> ${total} ₽</p>
            `;
        }

        confirmationModal.classList.add('active');
        confirmationModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log(`Showing confirmation modal: ${isSuccess ? 'Success' : 'Error'}, Message: ${message}`);
    }

    function hideConfirmationModal() {
        confirmationModal.classList.remove('active');
        confirmationModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        console.log('Hiding confirmation modal');
    }

    function saveOrderData() {
        const orderData = {
            name: document.getElementById('orderName')?.value || '',
            phone: document.getElementById('orderPhone')?.value || '',
            paymentMethod: document.getElementById('paymentInput')?.value || '',
            comments: document.getElementById('orderComment')?.value || '',
            timeMode: document.querySelector('.time-switcher .active')?.classList.contains('asap') ? 'asap' : 'pre-order',
            preOrderDate: document.getElementById('preOrderDate')?.value || '',
            preOrderTime: document.getElementById('preOrderTime')?.value || '',
            deliveryType: window.currentMode || 'delivery',
            address: window.currentMode === 'delivery' ? document.getElementById('addressInput')?.value || '' : currentCityConfig.pickupAddress,
            apartment: window.currentMode === 'delivery' ? document.getElementById('apartmentInput')?.value || '' : '',
            entrance: window.currentMode === 'delivery' ? document.getElementById('entranceInput')?.value || '' : '',
            floor: window.currentMode === 'delivery' ? document.getElementById('floorInput')?.value || '' : ''
        };
        localStorage.setItem('sushi_like_order', JSON.stringify(orderData));
        console.log('Saved order data:', orderData);
    }

    async function submitOrder(orderData, attempt = 1) {
        console.log(`Submitting order, attempt ${attempt}:`, orderData);
        try {
            const response = await fetch(`/api/${currentCity}/submit-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(orderData)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log('Order submission response:', data);
            return data;
        } catch (error) {
            console.error(`Order submission error on attempt ${attempt}:`, error);
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return submitOrder(orderData, attempt + 1);
            }
            throw error;
        }
    }

    orderButton.addEventListener('click', async () => {
        clearError();
        orderButton.disabled = true;
        console.log('Order button clicked');

        const deliveryType = window.currentMode || 'delivery';
        const address = deliveryType === 'delivery' ? document.getElementById('addressInput')?.value.trim() || '' : currentCityConfig.pickupAddress;
        const apartment = document.getElementById('apartmentInput')?.value.trim() || '';
        const entrance = document.getElementById('entranceInput')?.value.trim() || '';
        const floor = document.getElementById('floorInput')?.value.trim() || '';
        const phone = document.getElementById('orderPhone')?.value.trim() || '';
        const timeMode = document.querySelector('.time-switcher .active')?.classList.contains('asap') ? 'asap' : 'pre-order';
        const paymentMethod = document.getElementById('paymentInput')?.value || 'Наличными';
        const comments = document.getElementById('orderComment')?.value || '';
        const utensilsCount = parseInt(document.querySelector('.utensils-container .quantity')?.textContent || '0');

        const products = Object.keys(window.cart?.items || {}).map(id => {
            const product = window.products?.find(p => p.id == id);
            return product ? { article: product.article, quantity: window.cart.items[id] } : null;
        }).filter(item => item !== null);

        const errors = [];
        if (!phone || !validatePhoneNumber(phone)) errors.push('Укажите корректный номер телефона');
        if (deliveryType === 'delivery' && (!address || address === currentCityConfig.defaultAddress)) errors.push('Укажите адрес доставки');
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

        let fullAddress = address;
        if (deliveryType === 'delivery' && (apartment || entrance || floor)) {
            fullAddress += ' (';
            if (apartment) fullAddress += `кв. ${apartment}`;
            if (entrance) fullAddress += `${apartment ? ', ' : ''}подъезд ${entrance}`;
            if (floor) fullAddress += `${apartment || entrance ? ', ' : ''}этаж ${floor}`;
            fullAddress += ')';
        }

        const orderData = {
            city: currentCity,
            customer_name: document.getElementById('orderName')?.value.trim() || 'Клиент',
            phone_number: phone,
            delivery_type: deliveryType,
            address: deliveryType === 'delivery' ? fullAddress : null,
            street: deliveryType === 'delivery' ? address : '',
            home: '',
            apart: apartment,
            pod: entrance,
            et: floor,
            payment_method: paymentMethod,
            delivery_time: timeMode === 'asap' ? 'now' : `${document.getElementById('preOrderDate')?.value} ${document.getElementById('preOrderTime')?.value}:00`,
            comments: comments || null,
            utensils_count: utensilsCount,
            products: products,
            promo_code: window.cart.appliedDiscount?.type === 'promo_code' ? window.cart.appliedDiscount.code : null,
            discount_type: window.cart.appliedDiscount?.type || null,
            discount_code: window.cart.appliedDiscount?.code || null,
            discount_percentage: window.cart.appliedDiscount?.discountPercentage || 0,
            status: 'new'
        };

        try {
            const data = await submitOrder(orderData);
            orderButton.disabled = false;
            if (data.result === 'success') {
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

                window.resetCart?.();
                document.getElementById('orderModal')?.classList.remove('active');
                window.toggleModalOverlay?.(false, 'orderModal');
                showConfirmationModal(true, `Ваш заказ №${data.order_id} принят!`, orderDetails);
            } else {
                showConfirmationModal(false, `Ошибка: ${data.error || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            orderButton.disabled = false;
            showConfirmationModal(false, `Ошибка: ${error.message}`);
        }
    });

    closeConfirmationModal?.addEventListener('click', hideConfirmationModal);
    confirmButton?.addEventListener('click', hideConfirmationModal);
    confirmationModalOverlay?.addEventListener('click', (e) => {
        if (window.innerWidth > 768 && e.target === e.currentTarget) hideConfirmationModal();
    });

    function initializeAddressFields() {
        const addressContainer = document.querySelector('.order-modal .address-container');
        if (!addressContainer) {
            console.warn('Address container not found in order modal');
            return;
        }

        const addressInput = document.getElementById('addressInput');
        const apartmentInput = document.getElementById('apartmentInput');
        const entranceInput = document.getElementById('entranceInput');
        const floorInput = document.getElementById('floorInput');

        [addressInput, apartmentInput, entranceInput, floorInput].forEach(input => {
            if (input) {
                const wrapper = input.closest('.address-input-wrapper');
                const label = wrapper.querySelector('.address-input-label');

                input.addEventListener('focus', () => wrapper.classList.add('active'));
                input.addEventListener('blur', () => {
                    if (!input.value.trim()) wrapper.classList.remove('active');
                });
                input.addEventListener('input', saveOrderData);

                label.addEventListener('click', () => {
                    wrapper.classList.add('active');
                    input.focus();
                });
            }
        });
    }

    window.populateOrderModal = function() {
        console.log('Populating order modal');
        const modal = document.getElementById('orderModal');
        if (!modal) {
            console.warn('Order modal not found in DOM');
            return;
        }

        const waitForDateSelect = (attempt = 1, maxAttempts = 5) => {
            const dateSelect = document.getElementById('preOrderDate');
            if (dateSelect) {
                console.log('Found preOrderDate select, populating options');
                populateDateSelect(dateSelect);
            } else if (attempt <= maxAttempts) {
                console.log(`preOrderDate select not found, retrying (${attempt}/${maxAttempts})`);
                setTimeout(() => waitForDateSelect(attempt + 1, maxAttempts), 100);
            } else {
                console.warn('preOrderDate select not found after retries');
            }
        };

        const populateDateSelect = (dateSelect) => {
            const today = new Date();
            const savedOrder = JSON.parse(localStorage.getItem('sushi_like_order')) || {};
            dateSelect.innerHTML = ''; // Clear existing options
            const dateOptions = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(today.getDate() + i);
                const dateString = date.toISOString().split('T')[0];
                const displayString = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
                const option = document.createElement('option');
                option.value = dateString;
                option.textContent = displayString;
                dateSelect.appendChild(option);
                dateOptions.push(displayString);
            }
            console.log(`Generated date options: ${dateOptions.join(', ')}`);

            // Set saved or default date
            const defaultDate = savedOrder.preOrderDate || today.toISOString().split('T')[0];
            if (dateSelect.querySelector(`option[value="${defaultDate}"]`)) {
                dateSelect.value = defaultDate;
                console.log(`Set date to: ${defaultDate}`);
            } else {
                dateSelect.value = today.toISOString().split('T')[0];
                console.log(`Set default date to today: ${dateSelect.value}`);
            }

            // Generate time options for the selected date
            window.generateTimeOptions(dateSelect.value);

            // Update time options when date changes
            dateSelect.addEventListener('change', () => {
                console.log(`Date changed to: ${dateSelect.value}`);
                window.generateTimeOptions(dateSelect.value);
                saveOrderData();
            });
        };

        const savedOrder = JSON.parse(localStorage.getItem('sushi_like_order')) || {};
        window.currentMode = savedOrder.deliveryType || window.currentMode || 'delivery';

        const deliverySwitcher = document.querySelector('.order-modal .delivery-switcher');
        if (deliverySwitcher) {
            const modeButtons = deliverySwitcher.querySelectorAll('.mode');
            modeButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === window.currentMode);
                btn.addEventListener('click', () => {
                    modeButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    window.currentMode = btn.dataset.mode;
                    updateAddressFields();
                    updateOrderTitle();
                    saveOrderData();
                });
            });
        } else {
            console.warn('Delivery switcher not found in order modal');
        }

        function updateOrderTitle() {
            const orderTitle = document.querySelector('.order-title');
            if (orderTitle) {
                orderTitle.textContent = window.currentMode === 'delivery' ? 'Доставка' : 'Самовывоз';
                console.log(`Updated order title to: ${orderTitle.textContent}`);
            } else {
                console.warn('Order title element not found');
            }
        }

        function updateAddressFields() {
            const addressContainer = document.querySelector('.order-modal .address-container');
            if (!addressContainer) {
                console.warn('Address container not found in order modal');
                return;
            }

            addressContainer.innerHTML = '';
            if (window.currentMode === 'delivery') {
                addressContainer.innerHTML = `
                    <div class="address-input-wrapper active">
                        <span class="address-input-label">Адрес доставки</span>
                        <input type="text" id="addressInput" class="address-input" value="${savedOrder.address || window.currentAddress?.split(' (')[0] || currentCityConfig.defaultAddress}">
                    </div>
                    <div class="address-input-wrapper ${savedOrder.apartment ? 'active' : ''}">
                        <span class="address-input-label">Квартира</span>
                        <input type="text" id="apartmentInput" class="address-input" value="${savedOrder.apartment || window.currentApartment || ''}">
                    </div>
                    <div class="address-input-wrapper ${savedOrder.entrance ? 'active' : ''}">
                        <span class="address-input-label">Подъезд</span>
                        <input type="text" id="entranceInput" class="address-input" value="${savedOrder.entrance || window.currentEntrance || ''}">
                    </div>
                    <div class="address-input-wrapper ${savedOrder.floor ? 'active' : ''}">
                        <span class="address-input-label">Этаж</span>
                        <input type="text" id="floorInput" class="address-input" value="${savedOrder.floor || window.currentFloor || ''}">
                    </div>
                `;
            } else {
                addressContainer.innerHTML = `
                    <div class="pickup-address-text">Адрес самовывоза: ${currentCityConfig.pickupAddress}</div>
                `;
            }
            console.log(`Updated address fields for mode: ${window.currentMode}`);
            initializeAddressFields();
        }

        updateAddressFields();
        updateOrderTitle();
        waitForDateSelect();

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
            console.log('Pre-order mode active, showing pre-order fields');
            const dateSelect = document.getElementById('preOrderDate');
            if (dateSelect) {
                dateSelect.value = savedOrder.preOrderDate || today.toISOString().split('T')[0];
                window.generateTimeOptions(dateSelect.value);
            }
            const timeSelect = document.getElementById('preOrderTime');
            if (timeSelect && savedOrder.preOrderTime) {
                timeSelect.value = savedOrder.preOrderTime;
                console.log(`Restored saved pre-order time: ${savedOrder.preOrderTime}`);
            }
        } else if (asapButton && preOrderButton && preOrderFields) {
            asapButton.classList.add('active');
            preOrderButton.classList.remove('active');
            preOrderFields.style.display = 'none';
            console.log('ASAP mode active, hiding pre-order fields');
        } else {
            console.warn('Time switcher or pre-order fields not found');
        }

        if (asapButton) {
            asapButton.addEventListener('click', () => {
                asapButton.classList.add('active');
                preOrderButton?.classList.remove('active');
                if (preOrderFields) {
                    preOrderFields.style.display = 'none';
                    console.log('Switched to ASAP, hid pre-order fields');
                }
                saveOrderData();
            });
        }

        if (preOrderButton) {
            preOrderButton.addEventListener('click', () => {
                preOrderButton.classList.add('active');
                asapButton?.classList.remove('active');
                if (preOrderFields) {
                    preOrderFields.style.display = 'flex';
                    console.log('Switched to pre-order, showing pre-order fields');
                }
                const dateSelect = document.getElementById('preOrderDate');
                if (dateSelect) window.generateTimeOptions(dateSelect.value);
                saveOrderData();
            });
        }

        window.updateCartSummaryInModal?.('orderModal');

        const paymentItem = document.querySelector('.payment-method-item');
        const paymentLabel = document.querySelector('.payment-label-text');
        const paymentDropdown = document.querySelector('.payment-dropdown');
        const paymentOptions = document.querySelectorAll('.payment-option');

        const toggleDropdown = () => {
            paymentDropdown.classList.toggle('active');
            paymentItem.classList.add('active');
            console.log('Toggled payment dropdown');
        };

        paymentInput?.addEventListener('click', toggleDropdown);
        paymentLabel?.addEventListener('click', toggleDropdown);
        paymentOptions.forEach(option => option.addEventListener('click', () => {
            paymentInput.value = option.textContent;
            paymentDropdown.classList.remove('active');
            console.log(`Selected payment method: ${option.textContent}`);
            saveOrderData();
        }));

        document.addEventListener('click', (e) => {
            if (!paymentItem.contains(e.target) && paymentDropdown.classList.contains('active')) {
                paymentDropdown.classList.remove('active');
                if (!paymentInput.value) paymentItem.classList.remove('active');
                console.log('Closed payment dropdown');
            }
        });

        const phoneInputElement = document.getElementById('orderPhone');
        if (phoneInputElement) {
            const phoneItem = phoneInputElement.closest('.contact-container-item');
            const phoneLabel = phoneItem.querySelector('.contact-label-text');
            const phoneIcon = phoneItem.querySelector('.contact-icon-wrapper');

            [phoneLabel, phoneIcon].forEach(el => el?.addEventListener('click', () => {
                phoneItem.classList.add('active');
                phoneInputElement.focus();
                console.log('Phone input focused via label or icon');
            }));

            phoneInputElement.addEventListener('focus', () => {
                phoneItem.classList.add('active');
                if (!phoneInputElement.value.trim()) phoneInputElement.value = '+7';
                console.log('Phone input focused');
            });
            phoneInputElement.addEventListener('input', () => {
                phoneItem.classList.add('active');
                if (!phoneInputElement.value.startsWith('+7')) {
                    phoneInputElement.value = '+7' + phoneInputElement.value.replace(/^\+7/, '');
                }
                console.log(`Phone input updated: ${phoneInputElement.value}`);
                saveOrderData();
            });
            phoneInputElement.addEventListener('blur', () => {
                if (!phoneInputElement.value || phoneInputElement.value === '+7') {
                    phoneItem.classList.remove('active');
                    phoneInputElement.value = '';
                    console.log('Phone input cleared on blur');
                }
            });
        }

        nameInput?.addEventListener('input', () => {
            console.log(`Name input updated: ${nameInput.value}`);
            saveOrderData();
        });
        commentInput?.addEventListener('input', () => {
            console.log(`Comment input updated: ${commentInput.value}`);
            saveOrderData();
        });
        paymentInput?.addEventListener('input', () => {
            console.log(`Payment input updated: ${paymentInput.value}`);
            saveOrderData();
        });
    };
});