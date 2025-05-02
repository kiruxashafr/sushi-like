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

// Load from localStorage
const savedAddress = JSON.parse(localStorage.getItem('sushi_like_address')) || {};
window.currentMode = savedAddress.currentMode || 'delivery';
window.currentAddress = savedAddress.currentAddress || '';
const pickupAddress = 'ул. Клязьменская 11, Ковров';
const pickupCoords = [56.354167, 41.315278];
let map;
let suggestView;
let isUpdatingAddress = false;

function formatAddress(address) {
    const parts = address.split(', ');
    const filteredParts = parts.filter(part => !part.includes('Владимирская область'));
    if (filteredParts[0].includes('Ковров')) {
        return filteredParts.join(', ');
    }
    return address;
}

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

const handleAddressInput = debounce((value) => {
    if (value && window.currentMode === 'delivery' && !isUpdatingAddress) {
        ymaps.geocode('Ковров, ' + value).then(res => {
            const coords = res.geoObjects.get(0).geometry.getCoordinates();
            map.setCenter(coords, 16);
        }).catch(err => console.error('Ошибка геокодирования при вводе:', err));
    }
}, 500);

const updateAddressFromMap = debounce(() => {
    if (window.currentMode === 'delivery') {
        const centerCoords = map.getCenter();
        ymaps.geocode(centerCoords).then(res => {
            const newAddress = formatAddress(res.geoObjects.get(0).getAddressLine());
            isUpdatingAddress = true;
            addressInput.value = newAddress;
            isUpdatingAddress = false;
        }).catch(err => console.error('Ошибка геокодирования при движении карты:', err));
    }
}, 500);

function updateMainAddressPanel() {
    const addressText = document.getElementById('addressText');
    const addressTextMobile = document.getElementById('addressTextMobile');
    const displayText = window.currentMode === 'delivery' ? (window.currentAddress || 'Укажите адрес доставки') : `Самовывоз: ${pickupAddress}`;
    
    if (addressText) addressText.textContent = displayText;
    if (addressTextMobile) addressTextMobile.textContent = displayText;

    // Обновляем адрес в cartModal
    const cartModalAddressText = document.querySelector('#cartModal #addressText');
    const cartModalAddressTextMobile = document.querySelector('#cartModal #addressTextMobile');
    if (cartModalAddressText) cartModalAddressText.textContent = displayText;
    if (cartModalAddressTextMobile) cartModalAddressTextMobile.textContent = displayText;

    // Обновляем адрес в orderModal
    const orderAddressText = document.getElementById('orderAddressText');
    const orderAddressTextMobile = document.getElementById('orderAddressTextMobile');
    const mainAddress = displayText.split(' (')[0];
    if (orderAddressText) orderAddressText.textContent = mainAddress;
    if (orderAddressTextMobile) orderAddressTextMobile.textContent = mainAddress;

    const apartmentSpan = document.getElementById('orderApartment');
    const entranceSpan = document.getElementById('orderEntrance');
    const floorSpan = document.getElementById('orderFloor');
    const match = displayText.match(/\(кв\. (.*?)(?:, подъезд (.*?))?(?:, этаж (.*?))?\)/);
    if (apartmentSpan) apartmentSpan.textContent = match ? match[1] || '' : '';
    if (entranceSpan) entranceSpan.textContent = match ? match[2] || '' : '';
    if (floorSpan) floorSpan.textContent = match ? match[3] || '' : '';
}

window.openDeliveryModal = function(event, mode, fromModal) {
    event.preventDefault();
    deliveryModal.classList.add('active');
    modalOverlay.classList.add('active');

    window.currentMode = mode || window.currentMode;
    const activeMode = window.currentMode;
    modeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === activeMode);
    });

    document.querySelector('.delivery-settings').classList.toggle('active', activeMode === 'delivery');
    document.querySelector('.pickup-settings').classList.toggle('active', activeMode === 'pickup');
    document.querySelector('.map-container').classList.toggle('delivery', activeMode === 'delivery');

    if (activeMode === 'delivery') {
        addressInput.value = window.currentAddress.split(' (')[0] || 'Ковров';
        const match = window.currentAddress.match(/\(кв\. (.*?)(?:, подъезд (.*?))?(?:, этаж (.*?))?\)/);
        apartmentInput.value = match ? match[1] : '';
        entranceInput.value = match ? match[2] : '';
        floorInput.value = match ? match[3] : '';
    }

    // Сохраняем, из какого модального окна открыли доставку
    deliveryModal.dataset.fromModal = fromModal || '';

    if (!map) {
        if (typeof ymaps === 'undefined') {
            console.error('Yandex Maps API не загружен.');
            return;
        }
        ymaps.ready(() => {
            try {
                map = new ymaps.Map('map', {
                    center: [56.356, 41.316],
                    zoom: 12,
                    controls: ['zoomControl']
                }, {
                    suppressMapOpenBlock: true
                });

                map.events.add('boundschange', () => {
                    updateAddressFromMap();
                });

                suggestView = new ymaps.SuggestView('addressInput', {
                    provider: {
                        suggest: (request, options) => ymaps.suggest('Ковров, ' + request)
                    },
                    boundedBy: [[56.3, 41.2], [56.4, 41.4]]
                });

                suggestView.events.add('select', (e) => {
                    const address = e.get('item').value;
                    ymaps.geocode(address).then(res => {
                        const coords = res.geoObjects.get(0).geometry.getCoordinates();
                        map.setCenter(coords, 16);
                        addressInput.value = formatAddress(res.geoObjects.get(0).getAddressLine());
                    }).catch(err => console.error('Ошибка геокодирования:', err));
                });

                addressInput.addEventListener('input', (e) => {
                    handleAddressInput(e.target.value);
                });

                window.addEventListener('resize', () => {
                    if (map) map.container.fitToViewport();
                });

                const mapMarker = document.querySelector('.map-marker');
                if (mapMarker) {
                    mapMarker.style.display = activeMode === 'delivery' ? 'block' : 'none';
                }

                setMapForMode(activeMode);
            } catch (err) {
                console.error('Ошибка инициализации карты:', err);
            }
        });
    } else {
        setMapForMode(activeMode);
        map.container.fitToViewport();
        const mapMarker = document.querySelector('.map-marker');
        if (mapMarker) {
            mapMarker.style.display = activeMode === 'delivery' ? 'block' : 'none';
        }
    }
};

function setMapForMode(mode) {
    if (!map) return;
    try {
        if (mode === 'delivery' && window.currentAddress) {
            ymaps.geocode(window.currentAddress.split(' (')[0]).then(res => {
                const coords = res.geoObjects.get(0).geometry.getCoordinates();
                map.setCenter(coords, 16);
            }).catch(err => console.error('Ошибка геокодирования:', err));
        } else if (mode === 'pickup') {
            map.setCenter(pickupCoords, 16);
        } else {
            map.setCenter([56.356, 41.316], 12);
        }
        map.container.fitToViewport();
        const mapMarker = document.querySelector('.map-marker');
        if (mapMarker) {
            mapMarker.style.display = mode === 'delivery' ? 'block' : 'none';
        }
    } catch (err) {
        console.error('Ошибка установки карты:', err);
    }
}

function closeDeliveryModal() {
    const fromModal = deliveryModal.dataset.fromModal;
    deliveryModal.classList.remove('active');
    modalOverlay.classList.remove('active');
    
    // Restore the previous modal using cart.js logic
    if (fromModal && window.restorePreviousModal) {
        window.restorePreviousModal();
    } else {
        // Reset body overflow if no modal is restored
        document.body.style.overflow = '';
    }
}

switcherContainer.addEventListener('click', (e) => window.openDeliveryModal(e, window.currentMode, ''));
addressPanel.addEventListener('click', (e) => window.openDeliveryModal(e, window.currentMode, ''));

closeModal.addEventListener('click', closeDeliveryModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeDeliveryModal();
    }
});

modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        modeButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        window.currentMode = button.dataset.mode;
        document.querySelector('.delivery-settings').classList.toggle('active', window.currentMode === 'delivery');
        document.querySelector('.pickup-settings').classList.toggle('active', window.currentMode === 'pickup');
        document.querySelector('.map-container').classList.toggle('delivery', window.currentMode === 'delivery');
        setMapForMode(window.currentMode);
    });
});

confirmButton.addEventListener('click', () => {
    window.currentMode = document.querySelector('.mode-switcher .mode.active').dataset.mode;
    if (window.currentMode === 'delivery') {
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
        window.currentAddress = fullAddress;
    } else {
        window.currentAddress = pickupAddress;
    }
    // Save to localStorage
    localStorage.setItem('sushi_like_address', JSON.stringify({
        currentMode: window.currentMode,
        currentAddress: window.currentAddress
    }));

    // Обновляем switcher на главной странице
    switcherContainer.classList.remove('delivery-selected', 'pickup-selected');
    switcherContainer.classList.add(`${window.currentMode}-selected`);

    // Обновляем switcher в cartModal
    const cartModalSwitcher = document.querySelector('#cartModal .switcher-container');
    if (cartModalSwitcher) {
        cartModalSwitcher.classList.remove('delivery-selected', 'pickup-selected');
        cartModalSwitcher.classList.add(`${window.currentMode}-selected`);
    }

    // Обновляем все адресные панели
    updateMainAddressPanel();

    closeDeliveryModal();
});

// Инициализация адресной панели при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateMainAddressPanel();
});