document.addEventListener('DOMContentLoaded', () => {
    const switcherContainer = document.querySelector('.switcher-container');
    const addressPanel = document.querySelector('.address-panel');
    const deliveryModal = document.getElementById('deliveryModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModal = document.getElementById('closeModal');
    const pickupCloseModal = document.getElementById('pickupCloseModal');
    const confirmButton = document.getElementById('confirmButton');
    const pickupConfirmButton = document.querySelector('.pickup-settings .confirm-button');
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
            pickupCoords: [56.390669, 41.319566],
            initialMapCenter: [56.390669, 41.319566],
            regionFilter: 'Владимирская область',
            suggestBounds: [[56.3, 41.2], [56.4, 41.4]],
            defaultAddress: 'Ковров'
        },
        nnovgorod: {
            cityName: 'Нижний Новгород',
            pickupAddress: 'Южное Шоссе 12д, Нижний Новгород',
            pickupCoords: [56.221875, 43.858312],
            initialMapCenter: [56.221875, 43.858312],
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
        savedAddress.currentApartment = '';
        savedAddress.currentEntrance = '';
        savedAddress.currentFloor = '';
        savedAddress.city = city;
        localStorage.setItem('sushi_like_address', JSON.stringify(savedAddress));
    }

    window.currentMode = savedAddress.currentMode || 'delivery';
    window.currentAddress = savedAddress.currentAddress || currentCityConfig.defaultAddress;
    window.currentApartment = savedAddress.currentApartment || '';
    window.currentEntrance = savedAddress.currentEntrance || '';
    window.currentFloor = savedAddress.currentFloor || '';
    let map = null;
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
                if (map) {
                    map.setCenter(coords, 16);
                }
                window.currentAddress = formatAddress(res.geoObjects.get(0).getAddressLine());
                localStorage.setItem('sushi_like_address', JSON.stringify({
                    currentMode: window.currentMode,
                    currentAddress: window.currentAddress,
                    currentApartment: window.currentApartment,
                    currentEntrance: window.currentEntrance,
                    currentFloor: window.currentFloor,
                    city: city
                }));
            }).catch(err => console.error('Ошибка геокодирования при вводе:', err));
        }
    }, 500);

    const updateAddressFromMap = debounce(() => {
        if (window.currentMode === 'delivery' && map) {
            const centerCoords = map.getCenter();
            ymaps.geocode(centerCoords).then(res => {
                const newAddress = formatAddress(res.geoObjects.get(0).getAddressLine());
                isUpdatingAddress = true;
                if (addressInput) {
                    addressInput.value = newAddress;
                }
                window.currentAddress = newAddress;
                localStorage.setItem('sushi_like_address', JSON.stringify({
                    currentMode: window.currentMode,
                    currentAddress: window.currentAddress,
                    currentApartment: window.currentApartment,
                    currentEntrance: window.currentEntrance,
                    currentFloor: window.currentFloor,
                    city: city
                }));
                isUpdatingAddress = false;
            }).catch(err => console.error('Ошибка геокодирования при движении карты:', err));
        }
    }, 500);

    function updateMainAddressPanel() {
        const addressText = document.getElementById('addressText');
        const addressTextMobile = document.getElementById('addressTextMobile');
        const displayText = window.currentMode === 'delivery' ? (window.currentAddress || currentCityConfig.defaultAddress) : `Адрес самовывоза: ${currentCityConfig.pickupAddress}`;

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

        if (switcherContainer) {
            switcherContainer.classList.remove('delivery-selected', 'pickup-selected');
            switcherContainer.classList.add(`${window.currentMode}-selected`);
        }

        const cartModalSwitcher = document.querySelector('#cartModal .switcher-container');
        if (cartModalSwitcher) {
            cartModalSwitcher.classList.remove('delivery-selected', 'pickup-selected');
            cartModalSwitcher.classList.add(`${window.currentMode}-selected`);
        }
    }

    function initializeAutocomplete() {
        if (!addressInput) return;

        const autocompleteContainer = document.createElement('div');
        autocompleteContainer.className = 'autocomplete-suggestions';
        autocompleteContainer.style.position = 'absolute';
        autocompleteContainer.style.background = 'white';
        autocompleteContainer.style.border = '1px solid #ccc';
        autocompleteContainer.style.zIndex = '1000';
        autocompleteContainer.style.width = addressInput.offsetWidth + 'px';
        addressInput.parentNode.appendChild(autocompleteContainer);

        const fetchSuggestions = debounce((query) => {
            if (!query || window.currentMode !== 'delivery') {
                autocompleteContainer.innerHTML = '';
                autocompleteContainer.style.display = 'none';
                return;
            }

            ymaps.geocode(`${currentCityConfig.cityName}, ${query}`, { results: 5 }).then(res => {
                autocompleteContainer.innerHTML = '';
                const suggestions = res.geoObjects.toArray().map(geoObject => ({
                    address: formatAddress(geoObject.getAddressLine()),
                    coords: geoObject.geometry.getCoordinates()
                }));

                suggestions.forEach(suggestion => {
                    const suggestionElement = document.createElement('div');
                    suggestionElement.className = 'suggestion-item';
                    suggestionElement.style.padding = '8px';
                    suggestionElement.style.cursor = 'pointer';
                    suggestionElement.textContent = suggestion.address;
                    suggestionElement.addEventListener('click', () => {
                        addressInput.value = suggestion.address;
                        window.currentAddress = suggestion.address;
                        if (map) {
                            map.setCenter(suggestion.coords, 16);
                        }
                        const container = addressInput.closest('.address-container-item');
                        if (container) {
                            container.classList.add('active');
                        }
                        localStorage.setItem('sushi_like_address', JSON.stringify({
                            currentMode: window.currentMode,
                            currentAddress: window.currentAddress,
                            currentApartment: window.currentApartment,
                            currentEntrance: window.currentEntrance,
                            currentFloor: window.currentFloor,
                            city: city
                        }));
                        autocompleteContainer.innerHTML = '';
                        autocompleteContainer.style.display = 'none';
                    });
                    autocompleteContainer.appendChild(suggestionElement);
                });

                autocompleteContainer.style.display = suggestions.length > 0 ? 'block' : 'none';
            }).catch(err => console.error('Ошибка получения подсказок:', err));
        }, 300);

        addressInput.addEventListener('input', (e) => {
            fetchSuggestions(e.target.value.trim());
        });

        document.addEventListener('click', (e) => {
            if (!addressInput.contains(e.target) && !autocompleteContainer.contains(e.target)) {
                autocompleteContainer.innerHTML = '';
                autocompleteContainer.style.display = 'none';
            }
        });
    }

    window.openDeliveryModal = function(event, mode, fromModal) {
        event.preventDefault();
        if (deliveryModal) {
            deliveryModal.classList.add('active');
        }
        if (modalOverlay) {
            modalOverlay.classList.add('active');
        }

        window.currentMode = mode || (window.currentAddress ? window.currentMode : 'delivery');
        const activeMode = window.currentMode;
        modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === activeMode);
        });

        const deliverySettings = document.querySelector('.delivery-settings');
        const pickupSettings = document.querySelector('.pickup-settings');
        const mapContainer = document.querySelector('.map-container');
        if (deliverySettings) {
            deliverySettings.classList.toggle('active', activeMode === 'delivery');
        }
        if (pickupSettings) {
            pickupSettings.classList.toggle('active', activeMode === 'pickup');
        }
        if (mapContainer) {
            mapContainer.classList.toggle('delivery', activeMode === 'delivery');
        }

        deliveryModal.dataset.fromModal = fromModal || '';

        if (activeMode === 'delivery') {
            if (addressInput) {
                addressInput.value = window.currentAddress || currentCityConfig.defaultAddress;
            }
            if (apartmentInput) {
                apartmentInput.value = window.currentApartment || '';
            }
            if (entranceInput) {
                entranceInput.value = window.currentEntrance || '';
            }
            if (floorInput) {
                floorInput.value = window.currentFloor || '';
            }
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

                    initializeAutocomplete();

                    addressInput?.addEventListener('input', (e) => {
                        const value = e.target.value.trim();
                        handleAddressInput(value);
                        window.currentAddress = value;
                        const container = addressInput.closest('.address-container-item');
                        if (container) {
                            container.classList.toggle('active', !!value && value !== currentCityConfig.defaultAddress);
                        }
                        localStorage.setItem('sushi_like_address', JSON.stringify({
                            currentMode: window.currentMode,
                            currentAddress: window.currentAddress,
                            currentApartment: window.currentApartment,
                            currentEntrance: window.currentEntrance,
                            currentFloor: window.currentFloor,
                            city: city
                        }));
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
            if (map) {
                map.container.fitToViewport();
            }
            const mapMarker = map?.geoObjects.get(0);
            if (mapMarker) {
                mapMarker.geometry.setCoordinates(map.getCenter());
            }
        }
    };

    function setMapForMode(mode) {
        if (!map) return;
        const mapMarker = map.geoObjects.get(0);
        if (mapMarker) {
            mapMarker.options.set('visible', true);
        }

        if (mode === 'delivery' && window.currentAddress && window.currentAddress !== currentCityConfig.defaultAddress) {
            ymaps.geocode(window.currentAddress).then(res => {
                const coords = res.geoObjects.get(0).geometry.getCoordinates();
                map.setCenter(coords, 16);
                if (mapMarker) {
                    mapMarker.geometry.setCoordinates(coords);
                }
            }).catch(err => console.error('Ошибка геокодирования:', err));
        } else if (mode === 'pickup') {
            map.setCenter(currentCityConfig.pickupCoords, 16);
            if (mapMarker) {
                mapMarker.geometry.setCoordinates(currentCityConfig.pickupCoords);
            }
        } else {
            map.setCenter(currentCityConfig.initialMapCenter, 12);
            if (mapMarker) {
                mapMarker.geometry.setCoordinates(currentCityConfig.initialMapCenter);
            }
        }
        map.container.fitToViewport();
    }

    function closeDeliveryModal() {
        const fromModal = deliveryModal?.dataset.fromModal;
        if (deliveryModal) {
            deliveryModal.classList.remove('active');
        }
        if (modalOverlay) {
            modalOverlay.classList.remove('active');
        }
        if (fromModal && window.restorePreviousModal) {
            window.restorePreviousModal();
        } else {
            document.body.style.overflow = '';
        }
    }

    function saveAndClose() {
        const activeModeButton = document.querySelector('.mode-switcher .mode.active');
        window.currentMode = activeModeButton ? activeModeButton.dataset.mode : window.currentMode;
        if (window.currentMode === 'delivery') {
            window.currentAddress = addressInput ? addressInput.value || currentCityConfig.defaultAddress : currentCityConfig.defaultAddress;
            window.currentApartment = apartmentInput ? apartmentInput.value.trim() : '';
            window.currentEntrance = entranceInput ? entranceInput.value.trim() : '';
            window.currentFloor = floorInput ? floorInput.value.trim() : '';
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
            currentApartment: window.currentApartment,
            currentEntrance: window.currentEntrance,
            currentFloor: window.currentFloor,
            city: city
        }));

        if (switcherContainer) {
            switcherContainer.classList.remove('delivery-selected', 'pickup-selected');
            switcherContainer.classList.add(`${window.currentMode}-selected`);
        }

        const cartModalSwitcher = document.querySelector('#cartModal .switcher-container');
        if (cartModalSwitcher) {
            cartModalSwitcher.classList.remove('delivery-selected', 'pickup-selected');
            cartModalSwitcher.classList.add(`${window.currentMode}-selected`);
        }

        updateMainAddressPanel();
        closeDeliveryModal();
    }

    if (switcherContainer) {
        switcherContainer.addEventListener('click', (e) => window.openDeliveryModal(e, window.currentMode, ''));
    }
    if (addressPanel) {
        addressPanel.addEventListener('click', (e) => window.openDeliveryModal(e, window.currentMode, ''));
    }

    closeModal?.addEventListener('click', closeDeliveryModal);
    pickupCloseModal?.addEventListener('click', closeDeliveryModal);
    modalOverlay?.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeDeliveryModal();
    });

    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            window.currentMode = button.dataset.mode;
            const deliverySettings = document.querySelector('.delivery-settings');
            const pickupSettings = document.querySelector('.pickup-settings');
            const mapContainer = document.querySelector('.map-container');
            if (deliverySettings) {
                deliverySettings.classList.toggle('active', window.currentMode === 'delivery');
            }
            if (pickupSettings) {
                pickupSettings.classList.toggle('active', window.currentMode === 'pickup');
            }
            if (mapContainer) {
                mapContainer.classList.toggle('delivery', window.currentMode === 'delivery');
            }
            setMapForMode(window.currentMode);
            if (addressInput) {
                addressInput.value = window.currentMode === 'delivery' ? (window.currentAddress || currentCityConfig.defaultAddress) : currentCityConfig.pickupAddress;
                const container = addressInput.closest('.address-container-item');
                if (container) {
                    container.classList.toggle('active', !!addressInput.value.trim() && addressInput.value !== currentCityConfig.defaultAddress);
                }
            }
        });
    });

    confirmButton?.addEventListener('click', saveAndClose);
    pickupConfirmButton?.addEventListener('click', saveAndClose);

    updateMainAddressPanel();

    const desktopConditionsButton = document.querySelector('.delivery-conditions-button.desktop-only');
    const desktopConditions = document.querySelector('.delivery-conditions.desktop-only');
    const mobileConditionsButton = document.querySelector('.delivery-conditions-button.mobile-only');
    const conditionsModal = document.querySelector('#deliveryConditionsModal');

    if (desktopConditionsButton && desktopConditions) {
        desktopConditionsButton.addEventListener('click', () => {
            desktopConditions.style.display = desktopConditions.style.display === 'block' ? 'none' : 'block';
        });
    }

    if (mobileConditionsButton && conditionsModal) {
        mobileConditionsButton.addEventListener('click', () => {
            conditionsModal.classList.add('active');
            if (deliveryModal) {
                deliveryModal.classList.remove('active');
            }
            if (modalOverlay) {
                modalOverlay.classList.add('active');
            }
        });

        const modalCloseButton = document.querySelector('#deliveryConditionsModal .conditions-modal-close');
        if (modalCloseButton) {
            modalCloseButton.addEventListener('click', () => {
                conditionsModal.classList.remove('active');
                window.openDeliveryModal(new Event('click'), window.currentMode, '');
            });
        }
    }
});