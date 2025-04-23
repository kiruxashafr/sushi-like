const switcherContainer = document.querySelector('.switcher-container');
const addressPanel = document.querySelector('.address-panel');
const deliveryModal = document.getElementById('deliveryModal');
const modalOverlay = document.getElementById('modalOverlay');
const closeModal = document.getElementById('closeModal');
const confirmButton = document.getElementById('confirmButton');
const modeButtons = document.querySelectorAll('.mode-switcher .mode');
const addressInput = document.getElementById('addressInput');
const apartmentInput = document.getElementById('apartment');
const entranceInput = document.getElementById('entrance');
const floorInput = document.getElementById('floor');

let currentMode = 'delivery'; // По умолчанию
let currentAddress = '';
const pickupAddress = 'ул. Клязьменская 11, Ковров';
const pickupCoords = [56.354167, 41.315278]; // Координаты для ул. Клязьменская 11, Ковров
let map;
let suggestView;

// Функция для фильтрации "Владимирская область" из адреса
function formatAddress(address) {
    const parts = address.split(', ');
    const filteredParts = parts.filter(part => !part.includes('Владимирская область'));
    if (filteredParts[0].includes('Ковров')) {
        return filteredParts.join(', ');
    }
    return address;
}

// Debounce для обработки ввода адреса
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Обработка ввода адреса
const handleAddressInput = debounce((value) => {
    if (value && currentMode === 'delivery') {
        ymaps.geocode('Ковров, ' + value).then(res => {
            const coords = res.geoObjects.get(0).geometry.getCoordinates();
            map.setCenter(coords, 16);
            if (map.myMarker) {
                map.myMarker.geometry.setCoordinates(coords);
            } else {
                map.myMarker = new ymaps.Placemark(coords, {}, {
                    draggable: true
                });
                map.geoObjects.add(map.myMarker);
                map.myMarker.events.add('dragend', () => {
                    const newCoords = map.myMarker.geometry.getCoordinates();
                    ymaps.geocode(newCoords).then(res => {
                        const newAddress = formatAddress(res.geoObjects.get(0).getAddressLine());
                        addressInput.value = newAddress;
                    }).catch(err => console.error('Ошибка геокодирования при перетаскивании:', err));
                });
            }
        }).catch(err => console.error('Ошибка геокодирования при вводе:', err));
    }
}, 500);

// Функция открытия модального окна
function openDeliveryModal(event) {
    event.preventDefault();
    deliveryModal.classList.add('active');
    modalOverlay.classList.add('active');

    // Установка активного режима
    const activeMode = currentMode;
    modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === activeMode);
    });

    // Показ настроек
    document.querySelector('.delivery-settings').classList.toggle('active', activeMode === 'delivery');
    document.querySelector('.pickup-settings').classList.toggle('active', activeMode === 'pickup');
    if (activeMode === 'delivery') {
        addressInput.value = currentAddress || 'Ковров';
        apartmentInput.value = '';
        entranceInput.value = '';
        floorInput.value = '';
    }

    // Инициализация карты
    if (!map) {
        if (typeof ymaps === 'undefined') {
            console.error('Yandex Maps API не загружен. Проверьте API ключ и подключение.');
            return;
        }
        ymaps.ready(() => {
            try {
                console.log('Инициализация карты. Размер окна:', window.innerWidth);
                map = new ymaps.Map('map', {
                    center: [56.356, 41.316], // Ковров
                    zoom: 12,
                    controls: ['zoomControl']
                }, {
                    suppressMapOpenBlock: true // Отключаем лишние элементы интерфейса
                });

                // Подсказки для ввода адреса
                suggestView = new ymaps.SuggestView('addressInput', {
                    provider: {
                        suggest: (request, options) => ymaps.suggest('Ковров, ' + request)
                    },
                    boundedBy: [[56.3, 41.2], [56.4, 41.4]] // Ограничиваем подсказки Ковровом
                });

                suggestView.events.add('select', (e) => {
                    console.log('Выбрана подсказка:', e.get('item').value);
                    const address = e.get('item').value;
                    ymaps.geocode(address).then(res => {
                        const coords = res.geoObjects.get(0).geometry.getCoordinates();
                        map.setCenter(coords, 16);
                        addressInput.value = formatAddress(res.geoObjects.get(0).getAddressLine());
                        if (map.myMarker) {
                            map.myMarker.geometry.setCoordinates(coords);
                        } else {
                            map.myMarker = new ymaps.Placemark(coords, {}, {
                                draggable: true
                            });
                            map.geoObjects.add(map.myMarker);
                            map.myMarker.events.add('dragend', () => {
                                const newCoords = map.myMarker.geometry.getCoordinates();
                                ymaps.geocode(newCoords).then(res => {
                                    const newAddress = formatAddress(res.geoObjects.get(0).getAddressLine());
                                    addressInput.value = newAddress;
                                }).catch(err => console.error('Ошибка геокодирования при перетаскивании:', err));
                            });
                        }
                    }).catch(err => console.error('Ошибка геокодирования:', err));
                });

                // Клик по карте для установки метки
                map.events.add('click', (e) => {
                    if (currentMode === 'delivery') {
                        console.log('Клик по карте:', e.get('coords'));
                        const coords = e.get('coords');
                        ymaps.geocode(coords).then(res => {
                            const address = formatAddress(res.geoObjects.get(0).getAddressLine());
                            addressInput.value = address;
                            if (map.myMarker) {
                                map.myMarker.geometry.setCoordinates(coords);
                            } else {
                                map.myMarker = new ymaps.Placemark(coords, {}, {
                                    draggable: true
                                });
                                map.geoObjects.add(map.myMarker);
                                map.myMarker.events.add('dragend', () => {
                                    const newCoords = map.myMarker.geometry.getCoordinates();
                                    ymaps.geocode(newCoords).then(res => {
                                        const newAddress = formatAddress(res.geoObjects.get(0).getAddressLine());
                                        addressInput.value = newAddress;
                                    }).catch(err => console.error('Ошибка геокодирования при перетаскивании:', err));
                                });
                            }
                        }).catch(err => console.error('Ошибка геокодирования:', err));
                    }
                });

                // Обработчик ввода адреса
                addressInput.addEventListener('input', (e) => {
                    console.log('Ввод адреса:', e.target.value);
                    handleAddressInput(e.target.value);
                });

                // Обработчик изменения размера окна
                window.addEventListener('resize', () => {
                    if (map) {
                        map.container.fitToViewport();
                        console.log('Карта перерисована при изменении размера окна:', window.innerWidth);
                    }
                });

                setMapForMode(activeMode);
            } catch (err) {
                console.error('Ошибка инициализации карты:', err);
            }
        });
    } else {
        setMapForMode(activeMode);
        map.container.fitToViewport(); // Перерисовка карты
    }
}

// Установка карты в зависимости от режима
function setMapForMode(mode) {
    if (!map) {
        console.error('Карта не инициализирована.');
        return;
    }
    try {
        if (mode === 'delivery' && currentAddress) {
            ymaps.geocode(currentAddress).then(res => {
                const coords = res.geoObjects.get(0).geometry.getCoordinates();
                map.setCenter(coords, 16);
                if (map.myMarker) {
                    map.myMarker.geometry.setCoordinates(coords);
                } else {
                    map.myMarker = new ymaps.Placemark(coords, {}, {
                        draggable: true
                    });
                    map.geoObjects.add(map.myMarker);
                    map.myMarker.events.add('dragend', () => {
                        const newCoords = map.myMarker.geometry.getCoordinates();
                        ymaps.geocode(newCoords).then(res => {
                            const newAddress = formatAddress(res.geoObjects.get(0).getAddressLine());
                            addressInput.value = newAddress;
                        }).catch(err => console.error('Ошибка геокодирования при перетаскивании:', err));
                    });
                }
            }).catch(err => console.error('Ошибка геокодирования:', err));
        } else if (mode === 'pickup') {
            map.setCenter(pickupCoords, 16);
            if (map.myMarker) {
                map.myMarker.geometry.setCoordinates(pickupCoords);
            } else {
                map.myMarker = new ymaps.Placemark(pickupCoords);
                map.geoObjects.add(map.myMarker);
            }
        } else {
            map.setCenter([56.356, 41.316], 12);
            if (map.myMarker) {
                map.geoObjects.remove(map.myMarker);
                map.myMarker = null;
            }
        }
        map.container.fitToViewport(); // Перерисовка карты
    } catch (err) {
        console.error('Ошибка установки карты:', err);
    }
}

// Закрытие модального окна
function closeDeliveryModal() {
    deliveryModal.classList.remove('active');
    modalOverlay.classList.remove('active');
}

// Обработчики событий
switcherContainer.addEventListener('click', openDeliveryModal);
addressPanel.addEventListener('click', openDeliveryModal);
closeModal.addEventListener('click', closeDeliveryModal);
modalOverlay.addEventListener('click', closeDeliveryModal);

// Переключение режимов в модальном окне
modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        modeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const mode = button.dataset.mode;
        currentMode = mode;
        document.querySelector('.delivery-settings').classList.toggle('active', mode === 'delivery');
        document.querySelector('.pickup-settings').classList.toggle('active', mode === 'pickup');
        setMapForMode(mode);
    });
});

// Подтверждение выбора
confirmButton.addEventListener('click', () => {
    const selectedMode = document.querySelector('.mode-switcher .mode.active').dataset.mode;
    currentMode = selectedMode;
    if (selectedMode === 'delivery') {
        currentAddress = addressInput.value;
        const apartment = apartmentInput.value;
        const entrance = entranceInput.value;
        const floor = floorInput.value;
        let fullAddress = currentAddress;
        if (apartment || entrance || floor) {
            fullAddress += ' (';
            if (apartment) fullAddress += `кв. ${apartment}`;
            if (entrance) fullAddress += `${apartment ? ', ' : ''}подъезд ${entrance}`;
            if (floor) fullAddress += `${apartment || entrance ? ', ' : ''}этаж ${floor}`;
            fullAddress += ')';
        }
        currentAddress = fullAddress;
    } else {
        currentAddress = pickupAddress;
    }

    // Обновление switcher-container
    switcherContainer.classList.remove('delivery-selected', 'pickup-selected');
    switcherContainer.classList.add(`${currentMode}-selected`);

    // Обновление текста адреса
    const addressText = document.getElementById('addressText');
    const addressTextMobile = document.getElementById('addressTextMobile');
    const displayText = currentMode === 'delivery' ? (currentAddress || 'Укажите адрес доставки') : `Самовывоз: ${pickupAddress}`;
    addressText.textContent = displayText;
    addressTextMobile.textContent = displayText;

    closeDeliveryModal();
});