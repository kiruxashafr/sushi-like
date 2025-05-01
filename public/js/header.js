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
})();