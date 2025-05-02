document.addEventListener('DOMContentLoaded', () => {
    const orderButton = document.querySelector('.order-button');
    if (!orderButton) return;

    console.log('Zakaz.js loaded. BASE_URL:', BASE_URL);

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

    document.getElementById('orderName').addEventListener('input', saveOrderData);
    document.getElementById('orderPhone').addEventListener('input', saveOrderData);
    document.getElementById('orderComment').addEventListener('input', saveOrderData);
    document.getElementById('preOrderDate').addEventListener('change', saveOrderData);
    document.getElementById('preOrderTime').addEventListener('change', saveOrderData);
    document.querySelectorAll('.time-switcher .mode').forEach(btn => {
        btn.addEventListener('click', saveOrderData);
    });
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', saveOrderData);
    });

    orderButton.addEventListener('click', () => {
        const address = document.getElementById('orderAddressText').textContent;
        const apartment = document.getElementById('orderApartment').textContent;
        const entrance = document.getElementById('orderEntrance').textContent;
        const floor = document.getElementById('orderFloor').textContent;
        const name = document.getElementById('orderName').value.trim();
        const phone = document.getElementById('orderPhone').value.trim();
        const timeMode = document.querySelector('.time-switcher .active').classList.contains('asap') ? 'asap' : 'pre-order';
        const paymentMethod = document.getElementById('paymentInput').value;
        const comments = document.getElementById('orderComment').value;
        const utensilsCount = parseInt(document.querySelector('.utensils-container .quantity')?.textContent || '0');

        let errors = [];
        if (!name) errors.push('Пожалуйста, укажите ваше имя.');
        if (!phone || !validatePhoneNumber(phone)) errors.push('Пожалуйста, укажите корректный номер телефона (например, +79255355278).');
        if (!address) errors.push('Пожалуйста, укажите адрес доставки.');

        let orderDateTime = null;
        if (timeMode === 'pre-order') {
            const date = document.getElementById('preOrderDate').value;
            const time = document.getElementById('preOrderTime').value;
            if (!date || !time) {
                errors.push('Пожалуйста, укажите дату и время предзаказа.');
            } else {
                orderDateTime = `${date} ${time}:00`;
            }
        }

        const products = Object.keys(window.cart.items).map(id => {
            const product = window.products.find(p => p.id == id);
            return product ? { article: product.article, quantity: window.cart.items[id] } : null;
        }).filter(item => item !== null);

        if (products.length === 0) {
            errors.push('Корзина пуста. Добавьте товары перед оформлением заказа.');
        }

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return;
        }

        const fullAddress = apartment || entrance || floor
            ? `${address} (кв. ${apartment || ''}${entrance ? ', подъезд ' + entrance : ''}${floor ? ', этаж ' + floor : ''})`
            : address;

        const orderData = {
            customer_name: name,
            phone_number: phone,
            delivery_type: window.currentMode,
            address: fullAddress,
            payment_method: paymentMethod,
            delivery_time: timeMode === 'asap' ? 'now' : orderDateTime,
            comments: comments,
            utensils_count: utensilsCount,
            products: products,
            status: 'new'
        };

        console.log('Submitting order to', `${BASE_URL}/submit-order`, 'with data:', orderData);

        orderButton.disabled = true;

        fetch(`${BASE_URL}/submit-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(orderData)
        })
        .then(async response => {
            console.log(`Submit order response status: ${response.status}`);
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
            }
            return response.json();
        })
        .then(data => {
            orderButton.disabled = false;
            if (data.result === 'success') {
                alert(`Заказ успешно отправлен! Номер заказа: ${data.order_id}`);
                // Store product IDs before clearing the cart
                const productIds = Object.keys(window.cart.items);
                // Clear cart
                window.cart.items = {};
                window.cart.total = 0;
                localStorage.setItem('sushi_like_cart', JSON.stringify(window.cart));
                localStorage.setItem('sushi_like_utensils', '0');
                localStorage.removeItem('sushi_like_order');
                const utensilsContainer = document.querySelector('.utensils-container');
                if (utensilsContainer) utensilsContainer.querySelector('.quantity').textContent = '0';
                // Update cart summary
                window.updateCartSummary();
                // Reset all product buttons
                if (window.products && window.updateProductButton) {
                    window.products.forEach(product => {
                        window.updateProductButton(product.id);
                    });
                }
                const orderModal = document.getElementById('orderModal');
                if (orderModal) orderModal.classList.remove('active');
                window.toggleModalOverlay(false, 'orderModal');
                document.body.style.overflow = '';
            } else {
                alert('Ошибка при отправке заказа: ' + (data.error || 'Неизвестная ошибка'));
            }
        })
        .catch(error => {
            orderButton.disabled = false;
            console.error('Error submitting order:', error);
            alert(`Произошла ошибка при отправке заказа: ${error.message}. Проверьте консоль и сервер.`);
        });
    });

    function validatePhoneNumber(phone) {
        const digitsOnly = phone.replace(/\D/g, '');
        return /^(?:\+7|8|7)\d{10}$/.test(digitsOnly);
    }

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
        paymentInput.value = savedOrder.paymentMethod || '';
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

        window.updateCartSummaryInModal('orderModal');

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