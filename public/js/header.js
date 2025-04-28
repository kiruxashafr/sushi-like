(function() {
    const mobileMenuIcon = document.getElementById('mobileMenuIcon');
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('overlay');
    const modalOverlay = document.getElementById('modalOverlay');
    const citySwitcher = document.getElementById('citySwitcher');
    const cityButton = citySwitcher ? citySwitcher.querySelector('.city-button') : null;
    const cityModal = document.getElementById('cityModal');
    const mobileSearchIcon = document.getElementById('mobileSearchIcon');
    const mobileSearchBar = document.getElementById('mobileSearchBar');
    const mobileSearchInput = document.querySelector('.mobile-search-input');
    const mobileSearchClose = document.querySelector('.mobile-search-close');
    const scheduleButton = document.getElementById('scheduleButton');
    const scheduleModal = document.getElementById('scheduleModal');
    const scheduleClose = document.getElementById('scheduleClose');
    const currentSchedule = document.querySelector('.current-schedule');
    const scheduleDay = document.querySelector('.schedule-day');
    const scheduleTime = document.querySelector('.schedule-time');
    const header = document.querySelector('.header');
    const categoriesContainerElement = document.querySelector('.categories-container');
    const scrollToTop = document.createElement('button');

    let isAnimating = false;
    let lastScrollPosition = 0;
    let isPageScrolling = false;

    // Initialize scroll-to-top button
    scrollToTop.className = 'scroll-to-top';
    document.body.appendChild(scrollToTop);
    scrollToTop.addEventListener('click', () => {
        smoothScrollTo(0, 500);
    });

    // Smooth scroll function with reduced duration
    function smoothScrollTo(targetY, duration = 500) {
        const startY = window.pageYOffset;
        const diff = targetY - startY;
        let start;

        isPageScrolling = true;

        function step(timestamp) {
            if (!start) start = timestamp;
            const time = timestamp - start;
            const percent = Math.min(time / duration, 1);
            const easing = percent * percent * (3 - 2 * percent);
            window.scrollTo(0, startY + diff * easing);
            if (time < duration) {
                requestAnimationFrame(step);
            } else {
                isPageScrolling = false;
                if (targetY === 0 && header && window.innerWidth > 768) {
                    header.classList.remove('hidden');
                    document.body.classList.remove('header-hidden');
                }
            }
        }

        requestAnimationFrame(step);
    }

    // Расписание работы
    const schedule = [
        { day: 'ПН', time: '10:00–22:30', isOpen: true },
        { day: 'ВТ', time: '10:00–22:30', isOpen: true },
        { day: 'СР', time: '10:00–22:30', isOpen: true },
        { day: 'ЧТ', time: '10:00–22:30', isOpen: true },
        { day: 'ПТ', time: '10:00–22:30', isOpen: true },
        { day: 'СБ', time: '10:00–22:30', isOpen: true },
        { day: 'ВС', time: '10:00–22:30', isOpen: true }
    ];

    function updateSchedule() {
        if (!scheduleDay || !scheduleTime || !currentSchedule) {
            console.error('Schedule elements missing:', { scheduleDay, scheduleTime, currentSchedule });
            return;
        }

        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        
        const todaySchedule = schedule[currentDay === 0 ? 6 : currentDay - 1];
        const [openTime, closeTime] = todaySchedule.time.split('–');
        const [openHour, openMinute] = openTime.split(':').map(Number);
        const [closeHour, closeMinute] = closeTime.split(':').map(Number);
        
        const isOpenNow = (currentHour > openHour || (currentHour === openHour && currentMinutes >= openMinute)) && 
                         (currentHour < closeHour || (currentHour === closeHour && currentMinutes <= closeMinute));
        
        scheduleDay.textContent = todaySchedule.day;
        scheduleTime.textContent = todaySchedule.time;
        
        if (isOpenNow) {
            currentSchedule.classList.remove('closed');
        } else {
            currentSchedule.classList.add('closed');
        }
        
        const scheduleItems = document.querySelectorAll('.schedule-item');
        scheduleItems.forEach((item, index) => {
            item.classList.remove('current-day', 'closed');
            if (index === (currentDay === 0 ? 6 : currentDay - 1)) {
                item.classList.add('current-day');
                if (!isOpenNow) {
                    item.classList.add('closed');
                }
            }
        });
    }

    function toggleMobileMenu() {
        if (isAnimating || !mobileMenu || !mobileMenuIcon || !overlay) return;
        isAnimating = true;

        const isOpen = mobileMenu.classList.contains('open');
        if (!isOpen) {
            mobileMenu.classList.add('open');
            mobileMenuIcon.innerHTML = '✕';
            overlay.classList.add('active');
            if (mobileSearchBar) mobileSearchBar.classList.remove('active');
            mobileMenuIcon.classList.remove('hidden');
            if (cityModal) cityModal.classList.remove('active');
            if (scheduleModal) scheduleModal.classList.remove('active');
            if (modalOverlay) modalOverlay.classList.remove('active');
        } else {
            mobileMenu.classList.remove('open');
            mobileMenuIcon.innerHTML = '☰';
            overlay.classList.remove('active');
            if (scheduleModal) scheduleModal.classList.remove('active');
            if (modalOverlay) modalOverlay.classList.remove('active');
        }

        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function toggleMobileSearch() {
        if (isAnimating || !mobileSearchBar || !overlay || !mobileMenuIcon) return;
        isAnimating = true;

        const isOpen = mobileSearchBar.classList.contains('active');
        if (!isOpen) {
            mobileSearchBar.classList.add('active');
            overlay.classList.add('active');
            if (mobileMenu) mobileMenu.classList.remove('open');
            mobileMenuIcon.innerHTML = '☰';
            mobileMenuIcon.classList.add('hidden');
            if (cityModal) cityModal.classList.remove('active');
            if (scheduleModal) scheduleModal.classList.remove('active');
            if (modalOverlay) modalOverlay.classList.remove('active');
            if (mobileSearchInput) mobileSearchInput.focus();
        } else {
            mobileSearchBar.classList.remove('active');
            overlay.classList.remove('active');
            mobileMenuIcon.classList.remove('hidden');
            if (mobileSearchInput) mobileSearchInput.value = '';
        }

        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function closeMobileSearch() {
        if (isAnimating || !mobileSearchBar || !overlay || !mobileMenuIcon) return;
        isAnimating = true;

        mobileSearchBar.classList.remove('active');
        overlay.classList.remove('active');
        mobileMenuIcon.classList.remove('hidden');
        if (mobileSearchInput) mobileSearchInput.value = '';

        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function toggleCityModal(e) {
        e.stopPropagation();
        if (isAnimating || !cityModal || !mobileMenuIcon) return;
        isAnimating = true;

        const isOpen = cityModal.classList.contains('active');
        if (!isOpen) {
            cityModal.classList.add('active');
            if (mobileMenu) mobileMenu.classList.remove('open');
            if (mobileSearchBar) mobileSearchBar.classList.remove('active');
            mobileMenuIcon.innerHTML = '☰';
            mobileMenuIcon.classList.remove('hidden');
            if (scheduleModal) scheduleModal.classList.remove('active');
            if (modalOverlay) modalOverlay.classList.remove('active');
        } else {
            cityModal.classList.remove('active');
        }

        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function toggleScheduleModal(e) {
        e.stopPropagation();
        if (isAnimating || !scheduleModal || !modalOverlay) return;
        isAnimating = true;

        const isOpen = scheduleModal.classList.contains('active');
        if (!isOpen) {
            // Close mobile menu if open
            if (mobileMenu && mobileMenu.classList.contains('open')) {
                mobileMenu.classList.remove('open');
                mobileMenuIcon.innerHTML = '☰';
                overlay.classList.remove('active');
            }
            scheduleModal.classList.add('active');
            modalOverlay.classList.add('active');
            if (mobileSearchBar) mobileSearchBar.classList.remove('active');
            if (mobileMenuIcon) mobileMenuIcon.classList.remove('hidden');
            if (cityModal) cityModal.classList.remove('active');
            // Add event listeners for hide button and arrow placeholder
            const hideButton = scheduleModal.querySelector('.schedule-hide-button');
            const arrowPlaceholder = scheduleModal.querySelector('.schedule-arrow-placeholder');
            if (hideButton) {
                hideButton.addEventListener('click', closeScheduleModal);
            }
            if (arrowPlaceholder) {
                arrowPlaceholder.addEventListener('click', closeScheduleModal);
            }
        } else {
            closeScheduleModal();
        }

        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function closeScheduleModal() {
        if (isAnimating || !scheduleModal || !modalOverlay) return;
        isAnimating = true;
        scheduleModal.classList.remove('active');
        modalOverlay.classList.remove('active');
        // Reopen mobile menu
        if (mobileMenu && mobileMenuIcon && overlay) {
            mobileMenu.classList.add('open');
            mobileMenuIcon.innerHTML = '✕';
            overlay.classList.add('active');
        }
        // Remove event listeners
        const hideButton = scheduleModal.querySelector('.schedule-hide-button');
        const arrowPlaceholder = scheduleModal.querySelector('.schedule-arrow-placeholder');
        if (hideButton) {
            hideButton.removeEventListener('click', closeScheduleModal);
        }
        if (arrowPlaceholder) {
            arrowPlaceholder.removeEventListener('click', closeScheduleModal);
        }
        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function closeAllModals(e) {
        // Handle schedule modal click outside
        if (scheduleModal && scheduleModal.classList.contains('active') && 
            !scheduleModal.contains(e.target) && 
            e.target !== scheduleButton) {
            closeScheduleModal();
            return;
        }

        // Handle mobile menu
        if (mobileMenu && mobileMenu.classList.contains('open') && 
            !mobileMenu.contains(e.target) && 
            e.target !== mobileMenuIcon) {
            if (isAnimating) return;
            isAnimating = true;
            mobileMenu.classList.remove('open');
            if (mobileMenuIcon) mobileMenuIcon.innerHTML = '☰';
            if (overlay) overlay.classList.remove('active');
            setTimeout(() => {
                isAnimating = false;
            }, 300);
        }
        
        // Handle mobile search
        if (mobileSearchBar && mobileSearchBar.classList.contains('active') && 
            !mobileSearchBar.contains(e.target) && 
            e.target !== mobileSearchIcon && 
            e.target !== mobileSearchClose) {
            if (isAnimating) return;
            isAnimating = true;
            mobileSearchBar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            if (mobileMenuIcon) mobileMenuIcon.classList.remove('hidden');
            if (mobileSearchInput) mobileSearchInput.value = '';
            setTimeout(() => {
                isAnimating = false;
            }, 300);
        }
        
        // Handle city modal
        if (cityModal && cityModal.classList.contains('active') && 
            !citySwitcher.contains(e.target)) {
            if (isAnimating) return;
            isAnimating = true;
            cityModal.classList.remove('active');
            setTimeout(() => {
                isAnimating = false;
            }, 300);
        }
    }

    function handleHeaderVisibility() {
        if (isPageScrolling || !header || !categoriesContainerElement) return;

        const currentScrollPosition = window.pageYOffset;
        const headerHeight = header.offsetHeight || 48;
        const isMobile = window.innerWidth <= 768;

        if (isMobile && cityButton) {
            if (currentScrollPosition <= 50) {
                cityButton.innerHTML = 'Ковров <span class="chevron-down">⌵</span>';
                cityButton.classList.remove('brand');
            } else {
                cityButton.innerHTML = 'СушиЛайк Ковров';
                cityButton.classList.add('brand');
                if (cityModal) cityModal.classList.remove('active');
            }
        }

        // Scroll-to-top visibility in all modes
        if (currentScrollPosition > 100) {
            scrollToTop.classList.add('visible');
        } else {
            scrollToTop.classList.remove('visible');
        }

        if (isMobile) {
            header.classList.remove('hidden');
            document.body.classList.remove('header-hidden');
        } else {
            if (currentScrollPosition <= 50) {
                header.classList.remove('hidden');
                document.body.classList.remove('header-hidden');
            } else if (currentScrollPosition > lastScrollPosition && currentScrollPosition > 100) {
                header.classList.add('hidden');
                document.body.classList.add('header-hidden');
            } else if (currentScrollPosition < lastScrollPosition && currentScrollPosition > 50) {
                header.classList.remove('hidden');
                document.body.classList.remove('header-hidden');
            }
        }
        
        lastScrollPosition = currentScrollPosition;
    }

    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        if (mobileMenu && mobileMenu.classList.contains('open') && diffX < -50) {
            if (isAnimating) return;
            isAnimating = true;
            mobileMenu.classList.remove('open');
            if (mobileMenuIcon) mobileMenuIcon.innerHTML = '☰';
            if (overlay) overlay.classList.remove('active');
            setTimeout(() => {
                isAnimating = false;
            }, 300);
        }
    }, { passive: true });

    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
        if (scheduleModal && scheduleModal.classList.contains('active')) {
            touchStartY = e.changedTouches[0].screenY;
        }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (scheduleModal && scheduleModal.classList.contains('active')) {
            const touchEndY = e.changedTouches[0].screenY;
            const diffY = touchEndY - touchStartY;
            if (diffY > 50) {
                closeScheduleModal();
            }
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mobileMenu && mobileMenu.classList.contains('open')) {
            if (isAnimating) return;
            isAnimating = true;
            mobileMenu.classList.remove('open');
            if (mobileMenuIcon) {
                mobileMenuIcon.innerHTML = '☰';
                mobileMenuIcon.classList.remove('hidden');
            }
            if (overlay) overlay.classList.remove('active');
            if (mobileSearchBar) mobileSearchBar.classList.remove('active');
            if (cityModal) cityModal.classList.remove('active');
            if (scheduleModal) scheduleModal.classList.remove('active');
            if (modalOverlay) modalOverlay.classList.remove('active');
            setTimeout(() => {
                isAnimating = false;
            }, 300);
        }
    });

    // Event listeners
    if (mobileMenuIcon) mobileMenuIcon.addEventListener('click', toggleMobileMenu);
    if (mobileSearchIcon) mobileSearchIcon.addEventListener('click', toggleMobileSearch);
    if (mobileSearchClose) mobileSearchClose.addEventListener('click', closeMobileSearch);
    if (cityButton) {
        cityButton.addEventListener('click', (e) => {
            if (!cityButton.classList.contains('brand')) {
                toggleCityModal(e);
            }
        });
    }
    if (scheduleButton) scheduleButton.addEventListener('click', toggleScheduleModal);
    if (scheduleClose) scheduleClose.addEventListener('click', closeScheduleModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeAllModals);
    document.addEventListener('click', closeAllModals);

    window.removeEventListener('scroll', handleHeaderVisibility);
    window.addEventListener('scroll', handleHeaderVisibility);

    try {
        updateSchedule();
        setInterval(updateSchedule, 60000);
    } catch (error) {
        console.error('Error initializing schedule:', error);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const categoriesContainer = document.querySelector('.categories');
        const productsContainer = document.querySelector('.products-container');
        const header = document.querySelector('.header');
        const categoriesContainerElement = document.querySelector('.categories-container');

        let observer = null;
        let lastObserverTrigger = 0;

        if (!categoriesContainer || !productsContainer || !header || !categoriesContainerElement) {
            console.error('Required elements missing for categories/products');
            return;
        }

        function sanitizeClassName(name) {
            if (typeof name !== 'string') return '';
            return name.toLowerCase()
                .replace(/[\s+&/\\#,+()$~%.'":*?<>{}]/g, '-')
                .replace(/-+/g, '-');
        }

        function scrollToCenter(element) {
            if (!element) return;

            if (window.centeringAnimationFrame) {
                cancelAnimationFrame(window.centeringAnimationFrame);
            }

            window.getComputedStyle(categoriesContainer).offsetWidth;

            const containerRect = categoriesContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const startScroll = categoriesContainer.scrollLeft;
            const targetScroll = elementRect.left - containerRect.left + startScroll - (containerRect.width / 2) + (elementRect.width / 2);
            const duration = 500;
            let start;

            function step(timestamp) {
                if (!start) start = timestamp;
                const time = timestamp - start;
                const percent = Math.min(time / duration, 1);
                const easing = percent * percent * (3 - 2 * percent);
                const newScroll = startScroll + (targetScroll - startScroll) * easing;

                categoriesContainer.scrollLeft = newScroll;

                if (time < duration) {
                    window.centeringAnimationFrame = requestAnimationFrame(step);
                }
            }

            window.centeringAnimationFrame = requestAnimationFrame(step);
        }

        function setActiveCategory(element) {
            if (!element) return;
            const activeCategory = categoriesContainer.querySelector('.category.active');
            if (activeCategory) activeCategory.classList.remove('active');
            element.classList.add('active');
            scrollToCenter(element);
        }

        async function loadData() {
            try {
                const [categoriesResponse, productsResponse] = await Promise.all([
                    fetch('http://localhost:3000/categories'),
                    fetch('http://localhost:3000/products')
                ]);

                if (!categoriesResponse.ok || !productsResponse.ok) {
                    throw new Error('Fetch error');
                }

                const categories = await categoriesResponse.json();
                const products = await productsResponse.json();

                if (!Array.isArray(categories) || !Array.isArray(products)) {
                    throw new Error('Invalid data format');
                }

                renderCategories(categories);
                renderProducts(categories, products);
                setupIntersectionObserver(categories);
            } catch (error) {
                categoriesContainer.innerHTML = '<p>Ошибка загрузки категорий</p>';
                productsContainer.innerHTML = '<p>Ошибка загрузки товаров</p>';
                console.error('Error loading data:', error);
            }
        }

        function renderCategories(categories) {
            if (!Array.isArray(categories)) {
                categoriesContainer.innerHTML = '<p>Ошибка: категории не загружены</p>';
                return;
            }

            categoriesContainer.innerHTML = '';

            categories.forEach(category => {
                if (typeof category !== 'string' || !category) return;

                const categoryElement = document.createElement('div');
                categoryElement.classList.add('category');
                categoryElement.textContent = category;
                categoryElement.dataset.category = category;

                categoryElement.addEventListener('click', () => {
                    const sectionId = `category-${sanitizeClassName(category)}`;
                    const section = document.getElementById(sectionId);
                    if (section) {
                        const headerHeight = header.offsetHeight || 48;
                        const categoriesHeight = categoriesContainerElement.offsetHeight || 40;
                        let scrollPosition = section.offsetTop - categoriesHeight - 20;

                        smoothScrollTo(scrollPosition, 500);
                    }
                });

                categoriesContainer.appendChild(categoryElement);
            });

            if (categories.length > 0) {
                const firstCategory = categoriesContainer.querySelector('.category');
                if (firstCategory) {
                    setActiveCategory(firstCategory);
                }
            }
        }

        function renderProducts(categories, products) {
            productsContainer.innerHTML = '';

            categories.forEach(category => {
                if (typeof category !== 'string' || !category) return;

                const section = document.createElement('div');
                section.id = `category-${sanitizeClassName(category)}`;
                section.className = 'category-section';

                const header = document.createElement('h2');
                header.className = 'category-header';
                header.textContent = category;
                section.appendChild(header);

                const grid = document.createElement('div');
                grid.className = 'products-grid';

                const categoryProducts = products.filter(p => p.category === category);

                categoryProducts.forEach(product => {
                    if (!product || !product.name) return;

                    const productElement = document.createElement('div');
                    productElement.className = 'product';
                    productElement.dataset.productId = product.id; // Add product ID
                    productElement.innerHTML = `
                        <img src="${product.photo || 'photo/placeholder.jpg'}" alt="${product.name}">
                        ${product.quantity ? `<div class="quantity-badge">${product.quantity} шт.</div>` : ''}
                        <div class="product-info">
                            <div class="product-weight-quantity">
                                ${product.weight ? `<span>${product.weight} г</span>` : ''}
                            </div>
                            <h3>${product.name}</h3>
                            <p class="product-composition">${product.composition || ''}</p>
                            <div class="product-price-cart">
                                <button class="product-action-button">
                                    <span>${product.price} ₽</span>
                                    <img src="photo/карточки/добавить.png" alt="Add" class="plus-icon">
                                </button>
                            </div>
                        </div>
                    `;
                    grid.appendChild(productElement);
                });

                section.appendChild(grid);
                productsContainer.appendChild(section);
            });
        }

        function setupIntersectionObserver(categories) {
            const isMobile = window.innerWidth <= 768;
            const headerHeight = header.offsetHeight || 48;
            const categoriesHeight = categoriesContainerElement.offsetHeight || 40;
            const rootMarginTop = isMobile ? `-${headerHeight + categoriesHeight + 20}px` : '-100px';

            observer = new IntersectionObserver(
                (entries) => {
                    if (isPageScrolling) return;
                    const now = performance.now();
                    if (now - lastObserverTrigger < 50) return;
                    lastObserverTrigger = now;

                    let maxRatio = 0;
                    let mostVisibleEntry = null;

                    entries.forEach(entry => {
                        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                            maxRatio = entry.intersectionRatio;
                            mostVisibleEntry = entry;
                        }
                    });

                    if (mostVisibleEntry) {
                        const categoryId = mostVisibleEntry.target.id.replace('category-', '');
                        const category = categories.find(c => sanitizeClassName(c) === categoryId);
                        const categoryElement = document.querySelector(`.category[data-category="${category}"]`);
                        if (categoryElement) {
                            setActiveCategory(categoryElement);
                        }
                    } else if (!isMobile && window.pageYOffset < categoriesContainerElement.offsetTop) {
                        const firstCategory = document.querySelector('.category');
                        if (firstCategory) {
                            setActiveCategory(firstCategory);
                        }
                    }
                },
                {
                    threshold: isMobile ? [0.2, 0.4, 0.6] : [0.3, 0.5, 0.7],
                    rootMargin: `${rootMarginTop} 0px -100px 0px`
                }
            );

            const sections = document.querySelectorAll('.category-section');
            sections.forEach(section => observer.observe(section));

            window.addEventListener('resize', () => {
                const newIsMobile = window.innerWidth <= 768;
                const newHeaderHeight = header.offsetHeight || 48;
                const newCategoriesHeight = categoriesContainerElement.offsetHeight || 40;
                const newRootMarginTop = newIsMobile ? `-${newHeaderHeight + newCategoriesHeight + 20}px` : '-100px';

                observer.disconnect();
                observer = new IntersectionObserver(
                    (entries) => {
                        if (isPageScrolling) return;
                        const now = performance.now();
                        if (now - lastObserverTrigger < 50) return;
                        lastObserverTrigger = now;

                        let maxRatio = 0;
                        let mostVisibleEntry = null;

                        entries.forEach(entry => {
                            if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                                maxRatio = entry.intersectionRatio;
                                mostVisibleEntry = entry;
                            }
                        });

                        if (mostVisibleEntry) {
                            const categoryId = mostVisibleEntry.target.id.replace('category-', '');
                            const category = categories.find(c => sanitizeClassName(c) === categoryId);
                            const categoryElement = document.querySelector(`.category[data-category="${category}"]`);
                            if (categoryElement) {
                                setActiveCategory(categoryElement);
                            }
                        } else if (!newIsMobile && window.pageYOffset < categoriesContainerElement.offsetTop) {
                            const firstCategory = document.querySelector('.category');
                            if (firstCategory) {
                                setActiveCategory(firstCategory);
                            }
                        }
                    },
                    {
                        threshold: newIsMobile ? [0.2, 0.4, 0.6] : [0.3, 0.5, 0.7],
                        rootMargin: `${newRootMarginTop} 0px -100px 0px`
                    }
                );

                sections.forEach(section => observer.observe(section));
            });
        }

        loadData();
    });
})();