const mobileMenuIcon = document.getElementById('mobileMenuIcon');
const mobileMenu = document.getElementById('mobileMenu');
const overlay = document.getElementById('overlay');
const citySwitcher = document.getElementById('citySwitcher');
const cityButton = citySwitcher.querySelector('.city-button');
const cityModal = document.getElementById('cityModal');
const mobileSearchIcon = document.getElementById('mobileSearchIcon');
const mobileSearchBar = document.getElementById('mobileSearchBar');
let isAnimating = false;

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
    } else {
        cityModal.classList.remove('active');
    }

    setTimeout(() => {
        isAnimating = false;
    }, 300);
}

// Закрытие всех модальных окон при клике вне их
function closeAllModals(e) {
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

// Закрытие меню при свайпе влево
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

// Обработчики событий
mobileMenuIcon.addEventListener('click', toggleMobileMenu);
mobileSearchIcon.addEventListener('click', toggleMobileSearch);
cityButton.addEventListener('click', toggleCityModal);
document.addEventListener('click', closeAllModals);