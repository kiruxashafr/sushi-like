document.addEventListener('DOMContentLoaded', () => {
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

    const city = window.location.pathname.includes('/nnovgorod') ? 'nnovgorod' : 'kovrov';

    const cityConfig = {
        kovrov: {
            cityName: 'Ковров',
            pickupAddress: 'ул. Клязьменская 11, Ковров',
            pickupCoords: [56.354167, 41.315278],
            initialMapCenter: [56.356, 41.316],
            regionFilter: 'Владимирская область',
            suggestBounds: [[56.3, 41.2], [56.4, 41.4]],
            defaultAddress: 'Ковров'
        },
        nnovgorod: {
            cityName: 'Нижний Новгород',
            pickupAddress: 'Нижний Новгород, Южное шоссе, 12Д',
            pickupCoords: [56.247082, 43.863896],
            initialMapCenter: [56.326887, 44.005986],
            regionFilter: 'Нижегородская область',
            suggestBounds: [[56.2, 43.8], [56.4, 44.2]],
            defaultAddress: 'Нижний Новгород'
        }
    };

    const currentCityConfig = cityConfig[city];

    const savedAddress = JSON.parse(localStorage.getItem('sushi_like_address')) || {};
    if (savedAddress.city !== city) {
        savedAddress.currentMode = 'delivery';
        savedAddress.currentAddress = currentCityConfig.defaultAddress;
        savedAddress.city = city;
        localStorage.setItem('sushi_like_address', JSON.stringify(savedAddress));
    }

    window.currentMode = savedAddress.currentMode || 'delivery';
    window.currentAddress = savedAddress.currentAddress || currentCityConfig.defaultAddress;
    let map;
    let suggestView;
    let isUpdatingAddress = false;

    function formatAddress(address) {
        const parts = address.split(', ');
        const filteredParts = parts.filter(part => !part.includes(currentCityConfig.regionFilter));
        if (filteredParts[0].includes(currentCityConfig.cityName)) {
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
            ymaps.geocode(`${currentCityConfig.cityName}, ${value}`).then(res => {
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
        const displayText = window.currentMode === 'delivery' ? (window.currentAddress || currentCityConfig.defaultAddress) : `Самовывоз: ${currentCityConfig.pickupAddress}`;

        if (addressText) addressText.textContent = displayText;
        if (addressTextMobile) addressTextMobile.textContent = displayText;

        const cartModalAddressText = document.querySelector('#cartModal #addressText');
        const cartModalAddressTextMobile = document.querySelector('#cartModal #addressTextMobile');
        if (cartModalAddressText) cartModalAddressText.textContent = displayText;
        if (cartModalAddressTextMobile) cartModalAddressTextMobile.textContent = displayText;

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

        switcherContainer.classList.remove('delivery-selected', 'pickup-selected');
        switcherContainer.classList.add(`${window.currentMode}-selected`);

        const cartModalSwitcher = document.querySelector('#cartModal .switcher-container');
        if (cartModalSwitcher) {
            cartModalSwitcher.classList.remove('delivery-selected', 'pickup-selected');
            cartModalSwitcher.classList.add(`${window.currentMode}-selected`);
        }
    }

    window.openDeliveryModal = function(event, mode, fromModal) {
        event.preventDefault();
        deliveryModal.classList.add('active');
        modalOverlay.classList.add('active');

        window.currentMode = mode || (window.currentAddress ? window.currentMode : 'delivery');
        const activeMode = window.currentMode;
        modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === activeMode);
        });

        document.querySelector('.delivery-settings').classList.toggle('active', activeMode === 'delivery');
        document.querySelector('.pickup-settings').classList.toggle('active', activeMode === 'pickup');
        document.querySelector('.map-container').classList.toggle('delivery', activeMode === 'delivery');

        deliveryModal.dataset.fromModal = fromModal || '';

        if (activeMode === 'delivery') {
            addressInput.value = window.currentAddress.split(' (')[0] || currentCityConfig.defaultAddress;
            const match = window.currentAddress.match(/\(кв\. (.*?)(?:, подъезд (.*?))?(?:, этаж (.*?))?\)/);
            apartmentInput.value = match ? match[1] : '';
            entranceInput.value = match ? match[2] : '';
            floorInput.value = match ? match[3] : '';
        }

        if (!map) {
            ymaps.ready(() => {
                try {
                    map = new ymaps.Map('map', {
                        center: currentCityConfig.initialMapCenter,
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
                            suggest: (request, options) => ymaps.suggest(`${currentCityConfig.cityName}, ${request}`)
                        },
                        boundedBy: currentCityConfig.suggestBounds
                    });

                    suggestView.events.add('select', (e) => {
                        const address = e.get('item').value;
                        ymaps.geocode(address, { results: 1 }).then(res => {
                            const geoObject = res.geoObjects.get(0);
                            const coords = geoObject.geometry.getCoordinates();
                            map.setCenter(coords, 16);
                            addressInput.value = formatAddress(geoObject.getAddressLine());
                            const components = geoObject.properties.get('metaDataProperty.GeocoderMetaData.Address.Components');
                            window.currentStreet = components.find(c => c.kind === 'street')?.name || '';
                            window.currentHouse = components.find(c => c.kind === 'house')?.name || '';
                        }).catch(err => console.error('Ошибка геокодирования:', err));
                    });

                    addressInput.addEventListener('input', (e) => {
                        handleAddressInput(e.target.value);
                    });

                    window.addEventListener('resize', () => {
                        if (map) map.container.fitToViewport();
                    });

                    setMapForMode(activeMode);
                } catch (err) {
                    console.error('Ошибка инициализации карты:', err);
                }
            });
        } else {
            setMapForMode(activeMode);
            map.container.fitToViewport();
        }
    };

    function setMapForMode(mode) {
        if (!map) return;
        const mapMarker = document.querySelector('.map-marker');
        if (mapMarker) mapMarker.style.display = 'block';

        if (mode === 'delivery' && window.currentAddress && window.currentAddress !== currentCityConfig.defaultAddress) {
            ymaps.geogeocode(window.currentAddress.split(' (')[0]).then(res => {
                const coords = res.geoObjects.get(0).geometry.getCoordinates();
                map.setCenter(coords, 16);
            }).catch(err => console.error('Ошибка геокодирования:', err));
        } else if (mode === 'pickup') {
            map.setCenter(currentCityConfig.pickupCoords, 16);
        } else {
            map.setCenter(currentCityConfig.initialMapCenter, 12);
        }
        map.container.fitToViewport();
    }

    function closeDeliveryModal() {
        const fromModal = deliveryModal.dataset.fromModal;
        deliveryModal.classList.remove('active');
        modalOverlay.classList.remove('active');
        if (fromModal && window.restorePreviousModal) {
            window.restorePreviousModal();
        } else {
            document.body.style.overflow = '';
        }
    }

    switcherContainer.addEventListener('click', (e) => window.openDeliveryModal(e, window.currentMode, ''));
    addressPanel.addEventListener('click', (e) => window.openDeliveryModal(e, window.currentMode, ''));

    closeModal.addEventListener('click', closeDeliveryModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeDeliveryModal();
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
            window.currentAddress = addressInput.value;
            window.currentApartment = apartmentInput.value;
            window.currentEntrance = entranceInput.value;
            window.currentFloor = floorInput.value;
            let fullAddress = window.currentAddress;
            if (window.currentApartment || window.currentEntrance || window.currentFloor) {
                fullAddress += ' (';
                if (window.currentApartment) fullAddress += `кв. ${window.currentApartment}`;
                if (window.currentEntrance) fullAddress += `${window.currentApartment ? ', ' : ''}подъезд ${window.currentEntrance}`;
                if (window.currentFloor) fullAddress += `${window.currentApartment || window.currentEntrance ? ', ' : ''}этаж ${window.currentFloor}`;
                fullAddress += ')';
            }
            window.currentAddress = fullAddress;
        } else {
            window.currentAddress = currentCityConfig.pickupAddress;
            window.currentStreet = '';
            window.currentHouse = '';
            window.currentApartment = '';
            window.currentEntrance = '';
            window.currentFloor = '';
        }

        localStorage.setItem('sushi_like_address', JSON.stringify({
            currentMode: window.currentMode,
            currentAddress: window.currentAddress,
            city: city
        }));

        switcherContainer.classList.remove('delivery-selected', 'pickup-selected');
        switcherContainer.classList.add(`${window.currentMode}-selected`);

        const cartModalSwitcher = document.querySelector('#cartModal .switcher-container');
        if (cartModalSwitcher) {
            cartModalSwitcher.classList.remove('delivery-selected', 'pickup-selected');
            cartModalSwitcher.classList.add(`${window.currentMode}-selected`);
        }

        updateMainAddressPanel();
        closeDeliveryModal();
    });

    updateMainAddressPanel();
});