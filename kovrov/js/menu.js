(function() {
    // DOM Elements for modals
    const privacyModal = document.getElementById('privacyModal');
    const privacyModalOverlay = document.getElementById('privacyModalOverlay');
    const aboutUsModal = document.getElementById('aboutUsModal');
    const aboutUsModalOverlay = document.getElementById('aboutUsModalOverlay');
    const cartModal = document.getElementById('cartModal');
    const cartModalOverlay = document.getElementById('cartModalOverlay');
    const promotionsModal = document.getElementById('promotionsModal');
    const promotionsModalOverlay = document.getElementById('promotionsModalOverlay');
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
            vkLink: 'https://vk.com/your_kovrov_vk_link',
            coords: [56.390669, 41.319566],
            mapCenter: [56.390669, 41.319566]
        },
        nnovgorod: {
            cityName: 'Нижний Новгород',
            address: 'Южное Шоссе 12д, Нижний Новгород',
            phone: '+7 (903) 060-86-66',
            vkLink: 'https://vk.com/your_nnovgorod_vk_link',
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

    // Scroll to first category
    async function scrollToFirstCategory() {
        try {
            const response = await fetch(`/api/${city}/categories`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            const categories = await response.json();
            if (categories.length > 0) {
                const firstCategory = categories[0];
                const categoryElement = document.querySelector(`[data-category="${firstCategory}"]`);
                if (categoryElement) {
                    const offsetTop = categoryElement.getBoundingClientRect().top + window.pageYOffset - 50;
                    smoothScrollTo(offsetTop, 500);
                } else {
                    smoothScrollTo(0, 500);
                }
            } else {
                smoothScrollTo(0, 500);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            smoothScrollTo(0, 500);
        }
    }

    // Load categories dynamically
    async function loadCategories() {
        try {
            const response = await fetch(`/api/${city}/categories`, { mode: 'cors' });
            if (!response.ok) throw new Error('Failed to fetch categories');
            const categories = await response.json();
            const categoryList = document.getElementById('categoryList');
            if (categoryList) {
                categoryList.innerHTML = '';
                categories.forEach(category => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = '#';
                    a.textContent = category;
                    a.dataset.category = category;
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        scrollToCategory(category);
                        closeMobileMenu();
                    });
                    li.appendChild(a);
                    categoryList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    // Scroll to specific category
    function scrollToCategory(category) {
        const sectionId = `category-${sanitizeClassName(category)}`;
        const section = document.getElementById(sectionId);
        if (section) {
            const headerHeight = document.querySelector('.header').offsetHeight || 48;
            const categoriesHeight = document.querySelector('.categories-container').offsetHeight || 40;
            const targetY = section.offsetTop - (headerHeight + categoriesHeight + 10);
            smoothScrollTo(targetY, 500);
        }
    }

    // Sanitize class name
    function sanitizeClassName(name) {
        if (typeof name !== 'string') return '';
        return name
            .toLowerCase()
            .replace(/[\s+&/\\#,+()$~%.'":*?<>{}]/g, '-')
            .replace(/-+/g, '-');
    }

    // Close mobile menu
    function closeMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        const overlay = document.getElementById('overlay');
        if (isAnimating || !mobileMenu || !overlay) return;
        isAnimating = true;
        mobileMenu.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            isAnimating = false;
        }, 300);
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
        document.body.style.overflow = '';

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

                    const placemark = new ymaps.Placemark(currentCityConfig.coords, {
                        balloonContent: currentCityConfig.address
                    }, {
                        preset: 'islands#redDotIcon'
                    });
                    aboutUsMap.geoObjects.add(placemark);
                    aboutUsMap.setCenter(currentCityConfig.coords, 16);

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
        document.body.style.overflow = '';

        setTimeout(() => {
            isAnimating = false;
        }, 400);
    }

    // Open promotions modal
    async function openPromotionsModal() {
        if (isAnimating || !promotionsModal || !promotionsModalOverlay) return;
        isAnimating = true;

        promotionsModal.classList.add('active');
        promotionsModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        try {
            const response = await fetch(`/api/${city}/promotions`, { mode: 'cors' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const promotions = await response.json();
            const promotionsGrid = promotionsModal.querySelector('.promotions-grid');
            if (promotionsGrid) {
                promotionsGrid.innerHTML = '';
                if (promotions.length === 0) {
                    promotionsGrid.innerHTML = '<p>Акции отсутствуют</p>';
                } else {
                    promotions.forEach(promo => {
                        const promoItem = document.createElement('div');
                        promoItem.className = 'promo-item';
                        promoItem.innerHTML = `
                            <img src="${promo.photo}" alt="Акция" class="promo-image">
                            <div class="promo-info-icon">
                                <img src="/${city}/photo/акции/информация.png" alt="Информация">
                            </div>
                        `;
                        promoItem.addEventListener('click', () => {
                            if (typeof window.openPromoModal === 'function') {
                                window.openPromoModal(promo);
                            }
                        });
                        promotionsGrid.appendChild(promoItem);
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching promotions:', error);
            const promotionsGrid = promotionsModal.querySelector('.promotions-grid');
            if (promotionsGrid) {
                promotionsGrid.innerHTML = '<p>Ошибка загрузки акций. Попробуйте позже.</p>';
            }
        }

        setTimeout(() => {
            isAnimating = false;
        }, 400);
    }

    // Close promotions modal
    function closePromotionsModal() {
        if (isAnimating || !promotionsModal || !promotionsModalOverlay) return;
        isAnimating = true;

        promotionsModal.classList.remove('active');
        promotionsModalOverlay.classList.remove('active');
        document.body.style.overflow = '';

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
                const categoryList = document.getElementById('categoryList');
                if (categoryList) {
                    categoryList.classList.toggle('open');
                }
                break;
            case 'Акции':
                openPromotionsModal();
                if (mobileMenuClose) mobileMenuClose.click();
                break;
            case 'Корзина':
                const cartSummaryMobile = document.getElementById('cartSummaryMobile');
                if (cartSummaryMobile) {
                    cartSummaryMobile.click();
                } else if (typeof window.openCartModal === 'function') {
                    window.openCartModal();
                }
                if (mobileMenuClose) mobileMenuClose.click();
                break;
            case 'Информация':
                openPrivacyModal();
                if (mobileMenuClose) mobileMenuClose.click();
                break;
            case 'О нас':
                openAboutUsModal();
                if (mobileMenuClose) mobileMenuClose.click();
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

    // Load categories when mobile menu opens
    document.getElementById('mobileMenuIcon').addEventListener('click', () => {
        loadCategories();
    });

    // Privacy modal close button
    const closePrivacyButton = privacyModal ? privacyModal.querySelector('.close-privacy') : null;
    if (closePrivacyButton) closePrivacyButton.addEventListener('click', closePrivacyModal);
    if (privacyModalOverlay) privacyModalOverlay.addEventListener('click', closePrivacyModal);

    // About Us modal close button
    const closeAboutUsButton = aboutUsModal ? aboutUsModal.querySelector('.close-about-us') : null;
    if (closeAboutUsButton) closeAboutUsButton.addEventListener('click', closeAboutUsModal);
    if (aboutUsModalOverlay) aboutUsModalOverlay.addEventListener('click', closeAboutUsModal);

    // Promotions modal close button
    const closePromotionsButton = promotionsModal ? promotionsModal.querySelector('.close-promotions') : null;
    if (closePromotionsButton) closePromotionsButton.addEventListener('click', closePromotionsModal);
    if (promotionsModalOverlay) promotionsModalOverlay.addEventListener('click', closePromotionsModal);

    // Cart modal close button
    const closeCartButton = cartModal ? cartModal.querySelector('.close-cart') : null;
    if (closeCartButton) {
        closeCartButton.addEventListener('click', () => {
            if (isAnimating || !cartModal || !cartModalOverlay) return;
            isAnimating = true;
            cartModal.classList.remove('active');
            cartModalOverlay.classList.remove('active');
            document.body.style.overflow = '';
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
            document.body.style.overflow = '';
            setTimeout(() => {
                isAnimating = false;
            }, 400);
        });
    }
})();