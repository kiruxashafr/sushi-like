(function() {
    // Determine city from URL
    const city = window.location.pathname.includes('/nnovgorod') ? 'nnovgorod' : 'kovrov';

    const mobileMenuIcon = document.getElementById('mobileMenuIcon');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const overlay = document.getElementById('overlay');
    const modalOverlay = document.getElementById('modalOverlay');
    const citySwitcher = document.getElementById('citySwitcher');
    const cityButton = citySwitcher ? citySwitcher.querySelector('.city-button') : null;
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

    // Smooth scroll function
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

    // Schedule data
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
        if (isAnimating || !mobileMenu || !overlay) return;
        isAnimating = true;

        const isOpen = mobileMenu.classList.contains('open');
        if (!isOpen) {
            mobileMenu.classList.add('open');
            overlay.classList.add('active');
            if (mobileSearchBar) mobileSearchBar.classList.remove('active');
            if (scheduleModal) scheduleModal.classList.remove('active');
            if (modalOverlay) modalOverlay.classList.remove('active');
            document.body.style.overflow = 'hidden';
        }

        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function closeMobileMenu() {
        if (isAnimating || !mobileMenu || !overlay) return;
        isAnimating = true;

        mobileMenu.classList.remove('open');
        overlay.classList.remove('active');
        if (scheduleModal) scheduleModal.classList.remove('active');
        if (modalOverlay) modalOverlay.classList.remove('active');
        document.body.style.overflow = '';

        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function toggleMobileSearch() {
        if (isAnimating || !mobileSearchBar || !mobileMenuIcon) return;
        isAnimating = true;

        mobileSearchBar.classList.add('active');
        mobileMenuIcon.classList.add('hidden');
        if (mobileMenu) mobileMenu.classList.remove('open');
        if (scheduleModal) scheduleModal.classList.remove('active');
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (mobileSearchInput) mobileSearchInput.focus();
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function closeMobileSearch() {
        if (isAnimating || !mobileSearchBar || !mobileMenuIcon) return;
        isAnimating = true;

        mobileSearchBar.classList.remove('active');
        mobileMenuIcon.classList.remove('hidden');
        if (mobileSearchInput) mobileSearchInput.value = '';
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';

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
            if (mobileMenu && mobileMenu.classList.contains('open')) {
                mobileMenu.classList.remove('open');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
            scheduleModal.classList.add('active');
            modalOverlay.classList.add('active');
            if (mobileSearchBar) mobileSearchBar.classList.remove('active');
            if (mobileMenuIcon) mobileMenuIcon.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            const hideButton = scheduleModal.querySelector('.schedule-hide-button');
            const arrowPlaceholder = scheduleModal.querySelector('.schedule-arrow-placeholder');
            if (hideButton) hideButton.addEventListener('click', closeScheduleModal);
            if (arrowPlaceholder) arrowPlaceholder.addEventListener('click', closeScheduleModal);
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
        if (mobileMenu && mobileMenuIcon && overlay) {
            mobileMenu.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        const hideButton = scheduleModal.querySelector('.schedule-hide-button');
        const arrowPlaceholder = scheduleModal.querySelector('.schedule-arrow-placeholder');
        if (hideButton) hideButton.removeEventListener('click', closeScheduleModal);
        if (arrowPlaceholder) arrowPlaceholder.removeEventListener('click', closeScheduleModal);
        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function closeAllModals(e) {
        if (scheduleModal && scheduleModal.classList.contains('active') && 
            !scheduleModal.contains(e.target) && 
            e.target !== scheduleButton) {
            closeScheduleModal();
            return;
        }

        if (mobileMenu && mobileMenu.classList.contains('open') && 
            !mobileMenu.contains(e.target) && 
            e.target !== mobileMenuIcon && 
            e.target !== mobileMenuClose) {
            e.preventDefault();
            e.stopPropagation();
            if (isAnimating) return;
            closeMobileMenu();
        }
    }

    function handleHeaderVisibility() {
        if (isPageScrolling || !header || !categoriesContainerElement) return;

        const currentScrollPosition = window.pageYOffset;
        const headerHeight = header.offsetHeight || 48;
        const isMobile = window.innerWidth <= 768;

        if (isMobile && cityButton) {
            if (currentScrollPosition <= 50) {
                cityButton.innerHTML = city === 'nnovgorod' ? 'Нижний Новгород <span class="chevron-down">⌵</span>' : 'Ковров <span class="chevron-down">⌵</span>';
                cityButton.classList.remove('brand');
            } else {
                cityButton.innerHTML = city === 'nnovgorod' ? 'Суши Лайк Нижний Новгород' : 'Суши Лайк Ковров';
                cityButton.classList.add('brand');
            }
        }

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
            closeMobileMenu();
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
            closeMobileMenu();
            if (mobileMenuIcon) mobileMenuIcon.classList.remove('hidden');
            if (mobileSearchBar) mobileSearchBar.classList.remove('active');
            if (scheduleModal) scheduleModal.classList.remove('active');
            if (modalOverlay) modalOverlay.classList.remove('active');
        }
    });

    // Event listeners
    if (mobileMenuIcon) mobileMenuIcon.addEventListener('click', toggleMobileMenu);
    if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMobileMenu);
    if (mobileSearchIcon) mobileSearchIcon.addEventListener('click', toggleMobileSearch);
    if (mobileSearchClose) mobileSearchClose.addEventListener('click', closeMobileSearch);
    if (scheduleButton) scheduleButton.addEventListener('click', toggleScheduleModal);
    if (scheduleClose) scheduleClose.addEventListener('click', closeScheduleModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeAllModals);
    if (overlay) overlay.addEventListener('click', closeAllModals);

    window.removeEventListener('scroll', handleHeaderVisibility);
    window.addEventListener('scroll', handleHeaderVisibility);

    try {
        updateSchedule();
        setInterval(updateSchedule, 60000);
    } catch (error) {
        console.error('Error initializing schedule:', error);
    }
})();