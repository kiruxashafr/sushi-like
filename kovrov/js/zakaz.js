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

    function getCurrentCity() {
        const path = window.location.pathname.toLowerCase();
        return path.includes('/kovrov') ? 'kovrov' : path.includes('/nnovgorod') ? 'nnovgorod' : 'kovrov';
    }

    const currentCity = getCurrentCity();

    const currentCityConfig = {
        kovrov: {
            pickupAddress: 'ул. Клязьменская 11, Ковров'
        },
        nnovgorod: {
            pickupAddress: 'Южное Шоссе 12д, Нижний Новгород'
        }
    };

    if (!orderButton) return;

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
        }
    }

    function clearError() {
        if (errorMessage) {
            errorMessage.textContent = '';
            errorMessage.style.display = 'none';
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
    }

    function hideConfirmationModal() {
        confirmationModal.classList.remove('active');
        confirmationModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

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

    async function submitOrder(orderData, attempt = 1) {
        try {
            const response = await fetch(`/api/${currentCity}/submit-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(orderData)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                return submitOrder(orderData, attempt + 1);
            }
            throw error;
        }
    }

    function updateAddressFields() {
        const addressInput = document.querySelector('.address-container-item[data-field="currentAddress"] .address-input');
        const apartmentInput = document.querySelector('.address-container-item[data-field="currentApartment"] .address-input');
        const entranceInput = document.querySelector('.address-container-item[data-field="currentEntrance"] .address-input');
        const floorInput = document.querySelector('.address-container-item[data-field="currentFloor"] .address-input');
        const additionalFields = document.querySelector('.additional-address-fields');

        if (window.currentMode === 'delivery') {
            if (addressInput) {
                addressInput.value = window.currentAddress || '';
                addressInput.closest('.address-container-item').classList.toggle('active', !!addressInput.value);
            }
            if (apartmentInput) {
                apartmentInput.value = window.currentApartment || '';
                apartmentInput.closest('.address-container-item').classList.toggle('active', !!apartmentInput.value);
            }
            if (entranceInput) {
                entranceInput.value = window.currentEntrance || '';
                entranceInput.closest('.address-container-item').classList.toggle('active', !!entranceInput.value);
            }
            if (floorInput) {
                floorInput.value = window.currentFloor || '';
                floorInput.closest('.address-container-item').classList.toggle('active', !!floorInput.value);
            }
            if (additionalFields) additionalFields.style.display = 'flex';
        } else {
            if (addressInput) {
                addressInput.value = `Адрес самовывоза: ${currentCityConfig[currentCity].pickupAddress}`;
                addressInput.closest('.address-container-item').classList.add('active');
            }
            if (apartmentInput) {
                apartmentInput.value = '';
                apartmentInput.closest('.address-container-item').classList.remove('active');
            }
            if (entranceInput) {
                entranceInput.value = '';
                entranceInput.closest('.address-container-item').classList.remove('active');
            }
            if (floorInput) {
                floorInput.value = '';
                floorInput.closest('.address-container-item').classList.remove('active');
            }
            if (additionalFields) additionalFields.style.display = 'none';
        }
    }

    orderButton.addEventListener('click', async () => {
        clearError();
        orderButton.disabled = true;

        const addressInput = document.querySelector('.address-container-item[data-field="currentAddress"] .address-input');
        const apartmentInput = document.querySelector('.address-container-item[data-field="currentApartment"] .address-input');
        const entranceInput = document.querySelector('.address-container-item[data-field="currentEntrance"] .address-input');
        const floorInput = document.querySelector('.address-container-item[data-field="currentFloor"] .address-input');

        const address = addressInput?.value || '';
        const apartment = apartmentInput?.value || '';
        const entrance = entranceInput?.value || '';
        const floor = floorInput?.value || '';
        const phone = document.getElementById('orderPhone')?.value.trim() || '';
        const timeMode = document.querySelector('.time-switcher .active')?.classList.contains('asap') ? 'asap' : 'pre-order';
        const paymentMethod = document.getElementById('paymentInput')?.value || 'Наличными';
        const comments = document.getElementById('orderComment')?.value || '';
        const utensilsCount = parseInt(document.querySelector('.utensils-container .quantity')?.textContent || '0');
        const deliveryType = window.currentMode || 'delivery';

        const products = Object.keys(window.cart?.items || {}).map(id => {
            const product = window.products?.find(p => p.id == id);
            return product ? { article: product.article, quantity: window.cart.items[id] } : null;
        }).filter(item => item !== null);

        const errors = [];
        if (!phone || !validatePhoneNumber(phone)) errors.push('Укажите корректный номер телефона');
        if (deliveryType === 'delivery' && (!address || address === 'Укажите адрес доставки')) errors.push('Укажите адрес доставки');
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

        const fullAddress = deliveryType === 'delivery' ? `${address}${apartment ? ', кв. ' + apartment : ''}${entrance ? ', подъезд ' + entrance : ''}${floor ? ', этаж ' + floor : ''}` : currentCityConfig[currentCity].pickupAddress;

        const orderData = {
            city: currentCity,
            customer_name: document.getElementById('orderName')?.value.trim() || 'Клиент',
            phone_number: phone,
            delivery_type: deliveryType,
            address: fullAddress,
            street: window.currentStreet || '',
            home: window.currentHouse || '',
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

    document.getElementById('orderName')?.addEventListener('input', saveOrderData);
    document.getElementById('orderPhone')?.addEventListener('input', saveOrderData);
    document.getElementById('orderComment')?.addEventListener('input', saveOrderData);
    document.getElementById('preOrderDate')?.addEventListener('change', saveOrderData);
    document.getElementById('preOrderTime')?.addEventListener('change', saveOrderData);
    document.querySelectorAll('.time-switcher .mode').forEach(btn => btn.addEventListener('click', saveOrderData));
    document.querySelectorAll('.payment-option').forEach(option => option.addEventListener('click', saveOrderData));

    window.populateOrderModal = function() {
        const today = new Date();
        updateAddressFields();

        const deliverySwitcher = document.querySelector('.order-modal .delivery-switcher');
        if (deliverySwitcher) {
            const deliveryButton = deliverySwitcher.querySelector('.delivery');
            const pickupButton = deliverySwitcher.querySelector('.pickup');
            deliveryButton.classList.toggle('active', window.currentMode === 'delivery');
            pickupButton.classList.toggle('active', window.currentMode === 'pickup');

            deliveryButton.addEventListener('click', () => {
                if (window.currentMode !== 'delivery') {
                    window.currentMode = 'delivery';
                    deliveryButton.classList.add('active');
                    pickupButton.classList.remove('active');
                    updateAddressFields();
                }
            });

            pickupButton.addEventListener('click', () => {
                if (window.currentMode !== 'pickup') {
                    window.currentMode = 'pickup';
                    pickupButton.classList.add('active');
                    deliveryButton.classList.remove('active');
                    updateAddressFields();
                }
            });
        }

        const addressItems = document.querySelectorAll('.order-modal .address-container-item');
        addressItems.forEach(item => {
            const input = item.querySelector('.address-input');
            const labelText = item.querySelector('.address-label-text');

            if (labelText) {
                labelText.addEventListener('click', () => {
                    item.classList.add('active');
                    if (input) input.focus();
                });
            }

            if (input) {
                input.addEventListener('focus', () => item.classList.add('active'));
                input.addEventListener('input', () => item.classList.add('active'));
                input.addEventListener('blur', () => {
                    if (!input.value.trim()) item.classList.remove('active');
                });
            }
        });

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
            dateSelect.addEventListener('change', () => {
                window.generateTimeOptions(dateSelect.value);
                saveOrderData();
            });
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
                window.generateTimeOptions(dateSelect.value);
            }
            const timeSelect = document.getElementById('preOrderTime');
            if (timeSelect) timeSelect.value = savedOrder.preOrderTime || '';
        } else if (asapButton && preOrderButton && preOrderFields) {
            asapButton.classList.add('active');
            preOrderButton.classList.remove('active');
            preOrderFields.style.display = 'none';
        }

        window.updateCartSummaryInModal?.('orderModal');

        const paymentItem = document.querySelector('.payment-method-item');
        const paymentLabel = document.querySelector('.payment-label-text');
        const paymentDropdown = document.querySelector('.payment-dropdown');
        const paymentOptions = document.querySelectorAll('.payment-option');

        const toggleDropdown = () => {
            paymentDropdown.classList.toggle('active');
            paymentItem.classList.add('active');
        };

        paymentInput?.addEventListener('click', toggleDropdown);
        paymentLabel?.addEventListener('click', toggleDropdown);
        paymentOptions.forEach(option => option.addEventListener('click', () => {
            paymentInput.value = option.textContent;
            paymentDropdown.classList.remove('active');
            saveOrderData();
        }));

        document.addEventListener('click', (e) => {
            if (!paymentItem.contains(e.target) && paymentDropdown.classList.contains('active')) {
                paymentDropdown.classList.remove('active');
                if (!paymentInput.value) paymentItem.classList.remove('active');
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
            }));

            phoneInputElement.addEventListener('focus', () => phoneItem.classList.add('active'));
            phoneInputElement.addEventListener('input', () => phoneItem.classList.add('active'));
        }
    };
});

window.generateTimeOptions = function(selectedDate) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const isToday = selectedDate === today;
    const timeSelect = document.getElementById('preOrderTime');
    if (timeSelect) {
        timeSelect.innerHTML = '';
        let startHour = isToday ? now.getHours() : 10;
        let startMinute = isToday ? Math.ceil(now.getMinutes() / 15) * 15 : 0;
        if (startMinute >= 60) { startHour++; startMinute = 0; }
        while (startHour < 22 || (startHour === 22 && startMinute <= 30)) {
            const timeString = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = timeString;
            option.textContent = timeString;
            timeSelect.appendChild(option);
            startMinute += 15;
            if (startMinute >= 60) { startHour++; startMinute = 0; }
        }
    }
};