const mobileMenuIcon = document.getElementById('mobileMenuIcon');
const mobileMenu = document.getElementById('mobileMenu');
const overlay = document.getElementById('overlay');
const citySwitcher = document.getElementById('citySwitcher');
const cityButton = citySwitcher.querySelector('.city-button');
const cityModal = document.getElementById('cityModal');
const mobileSearchIcon = document.getElementById('mobileSearchIcon');
const mobileSearchBar = document.getElementById('mobileSearchBar');
const scheduleButton = document.getElementById('scheduleButton');
const scheduleModal = document.getElementById('scheduleModal');
const scheduleClose = document.getElementById('scheduleClose');
const currentSchedule = document.querySelector('.current-schedule');
const scheduleDay = document.querySelector('.schedule-day');
const scheduleTime = document.querySelector('.schedule-time');
const header = document.querySelector('.header');
const categoriesContainer = document.querySelector('.categories-container');

let isAnimating = false;
let lastScrollPosition = 0;
let isPageScrolling = false;

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

// Обновление текущего расписания
function updateSchedule() {
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

// Переключение мобильного меню
function toggleMobileMenu() {
    if (isAnimating) return;
    isAnimating = true;

    const isOpen = mobileMenu.classList.contains('open');
    if (!isOpen) {
        mobileMenu.classList.add('open');
        mobileMenuIcon.innerHTML = '✕';
        overlay.classList.add('active');
        mobileSearchBar.classList.remove('active');
        cityModal.classList.remove('active');
    } else {
        mobileMenu.classList.remove('open');
        mobileMenuIcon.innerHTML = '☰';
        overlay.classList.remove('active');
        scheduleModal.classList.remove('active');
    }

    setTimeout(() => {
        isAnimating = false;
    }, 300);
}

// Переключение мобильного поиска
function toggleMobileSearch() {
    if (isAnimating) return;
    isAnimating = true;

    const isOpen = mobileSearchBar.classList.contains('active');
    if (!isOpen) {
        mobileSearchBar.classList.add('active');
        overlay.classList.add('active');
        mobileMenu.classList.remove('open');
        mobileMenuIcon.innerHTML = '☰';
        cityModal.classList.remove('active');
        scheduleModal.classList.remove('active');
    } else {
        mobileSearchBar.classList.remove('active');
        overlay.classList.remove('active');
    }

    setTimeout(() => {
        isAnimating = false;
    }, 300);
}

// Переключение модального окна городов
function toggleCityModal(e) {
    e.stopPropagation();
    if (isAnimating) return;
    isAnimating = true;

    const isOpen = cityModal.classList.contains('active');
    if (!isOpen) {
        cityModal.classList.add('active');
        mobileMenu.classList.remove('open');
        mobileSearchBar.classList.remove('active');
        mobileMenuIcon.innerHTML = '☰';
        scheduleModal.classList.remove('active');
    } else {
        cityModal.classList.remove('active');
    }

    setTimeout(() => {
        isAnimating = false;
    }, 300);
}

// Переключение модального окна расписания
function toggleScheduleModal(e) {
    e.stopPropagation();
    if (isAnimating) return;
    isAnimating = true;

    const isOpen = scheduleModal.classList.contains('active');
    if (!isOpen) {
        scheduleModal.classList.add('active');
        overlay.classList.add('active');
        mobileSearchBar.classList.remove('active');
        cityModal.classList.remove('active');
    } else {
        scheduleModal.classList.remove('active');
        overlay.classList.remove('active');
    }

    setTimeout(() => {
        isAnimating = false;
    }, 300);
}

// Закрытие расписания
function closeScheduleModal() {
    if (isAnimating) return;
    isAnimating = true;
    scheduleModal.classList.remove('active');
    overlay.classList.remove('active');
    setTimeout(() => {
        isAnimating = false;
    }, 300);
}

// Закрытие всех модальных окон при клике вне их
function closeAllModals(e) {
    if (scheduleModal.classList.contains('active') && 
        !scheduleModal.contains(e.target) && 
        e.target !== scheduleButton) {
        closeScheduleModal();
        return;
    }

    if (mobileMenu.classList.contains('open') && 
        !mobileMenu.contains(e.target) && 
        e.target !== mobileMenuIcon) {
        if (isAnimating) return;
        isAnimating = true;
        mobileMenu.classList.remove('open');
        mobileMenuIcon.innerHTML = '☰';
        overlay.classList.remove('active');
        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }
    
    if (mobileSearchBar.classList.contains('active') && 
        !mobileSearchBar.contains(e.target) && 
        e.target !== mobileSearchIcon) {
        if (isAnimating) return;
        isAnimating = true;
        mobileSearchBar.classList.remove('active');
        overlay.classList.remove('active');
        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }
    
    if (cityModal.classList.contains('active') && 
        !citySwitcher.contains(e.target)) {
        if (isAnimating) return;
        isAnimating = true;
        cityModal.classList.remove('active');
        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }
}

// Управление видимостью хедера и позицией категорий
function handleHeaderVisibility() {
    if (isPageScrolling) {
        console.log('Skipping handleHeaderVisibility due to page scrolling');
        return;
    }

    const currentScrollPosition = window.pageYOffset;
    const headerHeight = header.offsetHeight || 60;

    console.log(`Scroll: ${currentScrollPosition}, Last: ${lastScrollPosition}, Header Height: ${headerHeight}, Header Hidden: ${header.classList.contains('hidden')}`);

    if (currentScrollPosition <= 50) {
        header.classList.remove('hidden');
        document.body.classList.remove('header-hidden');
        categoriesContainer.style.top = `${headerHeight}px`;
        console.log('Header shown (near top), categories top:', categoriesContainer.style.top);
    } else if (currentScrollPosition > lastScrollPosition && currentScrollPosition > 100) {
        header.classList.add('hidden');
        document.body.classList.add('header-hidden');
        categoriesContainer.style.top = '0px';
        console.log('Header hidden (scroll down), categories top:', categoriesContainer.style.top);
    } else if (currentScrollPosition < lastScrollPosition && currentScrollPosition > 50) {
        header.classList.remove('hidden');
        document.body.classList.remove('header-hidden');
        categoriesContainer.style.top = `${headerHeight}px`;
        console.log('Header shown (scroll up), categories top:', categoriesContainer.style.top);
    }
    
    lastScrollPosition = currentScrollPosition;
}

// Закрытие мобильного меню при свайпе влево
let touchStartX = 0;
document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const diffX = touchEndX - touchStartX;
    if (mobileMenu.classList.contains('open') && diffX < -50) {
        if (isAnimating) return;
        isAnimating = true;
        mobileMenu.classList.remove('open');
        mobileMenuIcon.innerHTML = '☰';
        overlay.classList.remove('active');
        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }
}, { passive: true });

// Закрытие расписания при свайпе вниз
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
    if (scheduleModal.classList.contains('active')) {
        touchStartY = e.changedTouches[0].screenY;
    }
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (scheduleModal.classList.contains('active')) {
        const touchEndY = e.changedTouches[0].screenY;
        const diffY = touchEndY - touchStartY;
        if (diffY > 50) {
            closeScheduleModal();
        }
    }
}, { passive: true });

// Закрытие мобильного меню при увеличении размера экрана
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && mobileMenu.classList.contains('open')) {
        if (isAnimating) return;
        isAnimating = true;
        mobileMenu.classList.remove('open');
        mobileMenuIcon.innerHTML = '☰';
        overlay.classList.remove('active');
        mobileSearchBar.classList.remove('active');
        cityModal.classList.remove('active');
        scheduleModal.classList.remove('active');
        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }
    // Обновление позиции категорий при изменении размера хедера
    const headerHeight = header.offsetHeight || 60;
    if (!header.classList.contains('hidden')) {
        categoriesContainer.style.top = `${headerHeight}px`;
    }
});

// Инициализация
updateSchedule();
 inden: 0
mobileMenuIcon.addEventListener('click', toggleMobileMenu);
mobileSearchIcon.addEventListener('click', toggleMobileSearch);
cityButton.addEventListener('click', toggleCityModal);
scheduleButton.addEventListener('click', toggleScheduleModal);
scheduleClose.addEventListener('click', closeScheduleModal);
document.addEventListener('click', closeAllModals);

// Очистка предыдущих слушателей прокрутки
window.removeEventListener('scroll', handleHeaderVisibility);
window.addEventListener('scroll', handleHeaderVisibility);

// Установка начальной позиции категорий
const headerHeight = header.offsetHeight || 60;
categoriesContainer.style.top = `${headerHeight}px`;
console.log('Initial categories top:', categoriesContainer.style.top, 'Header height:', headerHeight);

// Обновление расписания каждую минуту
setInterval(updateSchedule, 60000);