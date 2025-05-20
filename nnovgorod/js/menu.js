(function() {
    // Only initialize on mobile devices
    if (window.innerWidth >= 768) return;

    // DOM Elements for modals
    const privacyModal = document.getElementById('privacyModal');
    const privacyModalOverlay = document.getElementById('privacyModalOverlay');
    const aboutUsModal = document.getElementById('aboutUsModal');
    const aboutUsModalOverlay = document.getElementById('aboutUsModalOverlay');
    const cartModal = document.getElementById('cartModal');
    const cartModalOverlay = document.getElementById('cartModalOverlay');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const menuItems = document.querySelectorAll('#mobileMenu ul li a');

    let isAnimating = false;

    // City configuration for map
    const city = window.location.pathname.includes('/nnovgorod') ? 'nnovgorod' : 'kovrov';
    const cityConfig = {
        kovrov: {
            cityName: 'Ковров',
            address: 'ул. Клязьменская 11, Ковров',
            phone: '+7 (900) 479-43-43',
            vkLink: 'https://vk.com/your_kovrov_vk_link', // Replace with actual VK link for Kovrov
            coords: [56.390669, 41.319566],
            mapCenter: [56.390669, 41.319566]
        },
        nnovgorod: {
            cityName: 'Нижний Новгород',
            address: 'Южное Шоссе 12д, Нижний Новгород',
            phone: '+7 (903) 060-86-66',
            vkLink: 'https://vk.com/your_nnovgorod_vk_link', // Replace with actual VK link for Nizhniy Novgorod
            coords: [56.221875, 43.858312],
            mapCenter: [56.221875, 43.858312]
        }
    };

    const currentCityConfig = cityConfig[city];
    let aboutUsMap = null;

    // Smooth scroll function
    function smoothScrollTo(targetY, duration = 500) {
        const startY = window.pageYOffset;
        const diff = targetY - startY;
        let start;

        function step(timestamp) {
            if (!start) start = timestamp;
            const time = timestamp - start;
            const percent = Math.min(time / duration, 1);
            const easing = percent * percent * (3 - 2 * percent);
            window.scrollTo(0, startY + diff * easing);
            if (time < duration) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    // Open privacy modal
    function openPrivacyModal() {
        if (isAnimating || !privacyModal || !privacyModalOverlay) return;
        isAnimating = true;

        privacyModal.classList.add('active');
        privacyModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            isAnimating = false;
        }, 400);
    }

    // Close privacy modal
    function closePrivacyModal() {
        if (isAnimating || !privacyModal || !privacyModalOverlay) return;
        isAnimating = true;

        privacyModal.classList.remove('active');
        privacyModalOverlay.classList.remove('active');
        document.body.style.overflow = 'hidden'; // Maintain mobile menu's overflow state

        setTimeout(() => {
            isAnimating = false;
        }, 400);
    }

    // Open About Us modal
    function openAboutUsModal() {
        if (isAnimating || !aboutUsModal || !aboutUsModalOverlay) return;
        isAnimating = true;

        aboutUsModal.classList.add('active');
        aboutUsModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Update modal content dynamically
        const aboutUsContent = aboutUsModal.querySelector('.about-us-content');
        const vkIconPath = city === 'kovrov' ? '/kovrov/photo/header/вк.png' : '/nnovgorod/photo/header/вк.png';
        if (aboutUsContent) {
            aboutUsContent.innerHTML = `
                <p>Адрес: ${currentCityConfig.address}</p>
                <p>Телефон: ${currentCityConfig.phone}</p>
                <p>Следите за нами в соцсетях:</p>
                <div class="social-links">
                    <a href="${currentCityConfig.vkLink}" target="_blank">
                        <img src="${vkIconPath}" alt="VK">
                    </a>
                </div>
                <div id="aboutUsMap" class="about-us-map"></div>
            `;
        }

        // Initialize Yandex Map if not already initialized
        if (!aboutUsMap) {
            ymaps.ready(() => {
                try {
                    aboutUsMap = new ymaps.Map('aboutUsMap', {
                        center: currentCityConfig.mapCenter,
                        zoom: 16,
                        controls: ['zoomControl']
                    }, {
                        suppressMapOpenBlock: true
                    });

                    // Add marker
                    const placemark = new ymaps.Placemark(currentCityConfig.coords, {
                        balloonContent: currentCityConfig.address
                    }, {
                        preset: 'islands#redDotIcon'
                    });
                    aboutUsMap.geoObjects.add(placemark);
                    aboutUsMap.setCenter(currentCityConfig.coords, 16);

                    // Adjust map on resize
                    window.addEventListener('resize', () => {
                        if (aboutUsMap) aboutUsMap.container.fitToViewport();
                    });
                } catch (err) {
                    console.error('Ошибка инициализации карты:', err);
                }
            });
        } else {
            aboutUsMap.setCenter(currentCityConfig.coords, 16);
            aboutUsMap.container.fitToViewport();
        }

        setTimeout(() => {
            isAnimating = false;
        }, 400);
    }

    // Close About Us modal
    function closeAboutUsModal() {
        if (isAnimating || !aboutUsModal || !aboutUsModalOverlay) return;
        isAnimating = true;

        aboutUsModal.classList.remove('active');
        aboutUsModalOverlay.classList.remove('active');
        document.body.style.overflow = 'hidden'; // Maintain mobile menu's overflow state

        setTimeout(() => {
            isAnimating = false;
        }, 400);
    }

    // Open cart modal
    function openCartModal() {
        if (isAnimating || !cartModal || !cartModalOverlay) return;
        isAnimating = true;

        // Call the openCartModal function from cart.js to ensure proper cart rendering
        if (typeof window.openCartModal === 'function') {
            window.openCartModal();
        } else {
            // Fallback in case cart.js hasn't loaded yet
            cartModal.classList.add('active');
            cartModalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        if (mobileMenuClose) {
            mobileMenuClose.click(); // Trigger mobile menu close
        }

        setTimeout(() => {
            isAnimating = false;
        }, 400);
    }

    // Handle menu item clicks
    function handleMenuItemClick(event) {
        event.preventDefault();
        const menuText = event.currentTarget.textContent.trim();

        switch (menuText) {
            case 'Меню':
                smoothScrollTo(0, 500);
                if (mobileMenuClose) {
                    mobileMenuClose.click(); // Trigger mobile menu close
                }
                break;
            case 'Акции':
                smoothScrollTo(0, 500);
                if (mobileMenuClose) {
                    mobileMenuClose.click(); // Trigger mobile menu close
                }
                break;
            case 'Корзина':
                openCartModal();
                break;
            case 'Информация':
                openPrivacyModal();
                break;
            case 'О нас':
                openAboutUsModal();
                break;
        }
    }

    // Event listeners for menu items
    menuItems.forEach(item => {
        const menuText = item.textContent.trim();
        if (['Меню', 'Акции', 'Корзина', 'Информация', 'О нас'].includes(menuText)) {
            item.addEventListener('click', handleMenuItemClick);
        }
    });

    // Privacy modal close button
    const closePrivacyButton = privacyModal ? privacyModal.querySelector('.close-privacy') : null;
    if (closePrivacyButton) {
        closePrivacyButton.addEventListener('click', closePrivacyModal);
    }

    if (privacyModalOverlay) {
        privacyModalOverlay.addEventListener('click', closePrivacyModal);
    }

    // About Us modal close button
    const closeAboutUsButton = aboutUsModal ? aboutUsModal.querySelector('.close-about-us') : null;
    if (closeAboutUsButton) {
        closeAboutUsButton.addEventListener('click', closeAboutUsModal);
    }

    if (aboutUsModalOverlay) {
        aboutUsModalOverlay.addEventListener('click', closeAboutUsModal);
    }

    // Cart modal close button
    const closeCartButton = cartModal ? cartModal.querySelector('.close-cart') : null;
    if (closeCartButton) {
        closeCartButton.addEventListener('click', () => {
            if (isAnimating || !cartModal || !cartModalOverlay) return;
            isAnimating = true;

            cartModal.classList.remove('active');
            cartModalOverlay.classList.remove('active');
            document.body.style.overflow = 'hidden'; // Maintain mobile menu's overflow state

            setTimeout(() => {
                isAnimating = false;
            }, 400);
        });
    }

    if (cartModalOverlay) {
        cartModalOverlay.addEventListener('click', () => {
            if (isAnimating || !cartModal || !cartModalOverlay) return;
            isAnimating = true;

            cartModal.classList.remove('active');
            cartModalOverlay.classList.remove('active');
            document.body.style.overflow = 'hidden'; // Maintain mobile menu's overflow state

            setTimeout(() => {
                isAnimating = false;
            }, 400);
        });
    }
})();