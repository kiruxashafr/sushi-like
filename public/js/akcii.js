document.addEventListener('DOMContentLoaded', () => {
    const promoImagesContainer = document.querySelector('.promo-images');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    let promotions = [];
    let currentIndex = 0;
    let autoSlideInterval = null;
    let visibleImages = window.innerWidth >= 768 ? 3 : 2;
    let isLoading = false;
    let isSliding = false;

    function loadImageWithTimeout(url, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timer = setTimeout(() => {
                img.onload = img.onerror = null;
                reject(new Error(`Timeout loading image: ${url}`));
            }, timeout);

            img.onload = () => {
                clearTimeout(timer);
                resolve(img);
            };
            img.onerror = () => {
                clearTimeout(timer);
                reject(new Error(`Failed to load image: ${url}`));
            };
            img.src = url;
        });
    }

    async function fetchPromotions() {
        try {
            const response = await fetch('http://localhost:3000/promotions');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Fetch promotions error:', error);
            throw error;
        }
    }

    async function loadPromotions() {
        if (isLoading) return;
        isLoading = true;

        try {
            promotions = await fetchPromotions();

            if (!promotions || promotions.length === 0) {
                throw new Error('No promotions available');
            }

            await preloadPromoImages();
            initCarousel();
            startAutoSlide();
        } catch (error) {
            console.error('Promotions loading failed:', error);
            showError('Ошибка загрузки акций');
        } finally {
            isLoading = false;
        }
    }

    async function preloadPromoImages() {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000;

        for (const promo of promotions) {
            let retries = MAX_RETRIES;
            let success = false;

            while (retries > 0 && !success) {
                try {
                    await loadImageWithTimeout(promo.photo);
                    success = true;
                } catch (error) {
                    retries--;
                    console.warn(`Retrying image ${promo.photo}, attempts left: ${retries}`);
                    if (retries > 0) await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }

            if (!success) {
                console.error(`Failed to load image after ${MAX_RETRIES} attempts: ${promo.photo}`);
                promo.photo = 'photo/placeholder.jpg';
            }
        }
    }

    function showError(message) {
        promoImagesContainer.innerHTML = `
            <div class="promo-error">
                <p>${message}</p>
                <button class="retry-button">Попробовать снова</button>
            </div>
        `;

        const retryButton = document.querySelector('.retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', loadPromotions);
        }
    }

    function initCarousel() {
        promoImagesContainer.innerHTML = '';
        const gap = window.innerWidth >= 768 ? 10 : 8;
        const imageWidth = `calc(${(100 / visibleImages)}% - ${(gap * (visibleImages - 1)) / visibleImages}px)`;

        const items = [...promotions, ...promotions.slice(0, visibleImages)];

        items.forEach((promo, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'promo-image';
            imgContainer.style.flex = `0 0 ${imageWidth}`;
            imgContainer.style.width = imageWidth;
            imgContainer.dataset.index = index % promotions.length;

            const img = document.createElement('img');
            img.src = promo.photo;
            img.alt = `Акция ${index + 1}`;
            img.loading = 'eager';
            img.style.objectFit = 'contain';
            img.style.width = '100%';
            img.style.height = '100%';

            img.onerror = () => {
                img.src = 'photo/placeholder.jpg';
                img.alt = 'Изображение не загрузилось';
            };

            const infoIcon = document.createElement('div');
            infoIcon.className = 'promo-info-icon'; /* New class for promotions */
            infoIcon.innerHTML = `<img src="photo/акции/информация.png" alt="Информация">`;

            const conditionsStrip = document.createElement('div');
            conditionsStrip.className = 'conditions-strip';
            conditionsStrip.textContent = 'Условия акции';

            imgContainer.appendChild(img);
            imgContainer.appendChild(infoIcon);
            imgContainer.appendChild(conditionsStrip);
            promoImagesContainer.appendChild(imgContainer);

            imgContainer.addEventListener('click', () => openModal(promo));
        });

        updateCarousel(true);
    }

    function openModal(promo) {
        let overlay = document.querySelector('.promo-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'promo-modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.classList.add('active');

        let modal = document.querySelector('.promo-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'promo-modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-close">✕</div>
            <div class="modal-content">
                <img src="${promo.photo}" alt="Акция" class="modal-image">
                <p class="modal-conditions">${promo.conditions || 'Условия акции не указаны'}</p>
            </div>
        `;

        modal.classList.add('active');

        const closeButton = modal.querySelector('.modal-close');
        closeButton.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        overlay.addEventListener('click', closeModal);
    }

    function closeModal() {
        const modal = document.querySelector('.promo-modal');
        const overlay = document.querySelector('.promo-modal-overlay');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 400); /* Match transition duration */
        }
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 400);
        }
    }

    function updateCarousel(initial = false) {
        if (isSliding && !initial) return;
        isSliding = true;

        const imageWidthPercent = 100 / visibleImages;
        let offset = -currentIndex * imageWidthPercent;
        promoImagesContainer.style.transition = initial ? 'none' : 'transform 0.6s ease-in-out';
        promoImagesContainer.style.transform = `translateX(${offset}%)`;

        if (currentIndex >= promotions.length) {
            setTimeout(() => {
                promoImagesContainer.style.transition = 'none';
                currentIndex = currentIndex % promotions.length;
                offset = -currentIndex * imageWidthPercent;
                promoImagesContainer.style.transform = `translateX(${offset}%)`;
                promoImagesContainer.offsetHeight;
                isSliding = false;
            }, 600);
        } else {
            setTimeout(() => {
                isSliding = false;
            }, 600);
        }
    }

    function shiftCarousel(direction) {
        if (isSliding) return;
        currentIndex = currentIndex + direction;
        if (currentIndex < 0) {
            currentIndex = promotions.length - 1;
        }
        updateCarousel();
    }

    function startAutoSlide() {
        clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(() => {
            if (!isSliding) {
                shiftCarousel(1);
            }
        }, 5000);
    }

    prevButton.addEventListener('click', () => {
        clearInterval(autoSlideInterval);
        shiftCarousel(-1);
        startAutoSlide();
    });

    nextButton.addEventListener('click', () => {
        clearInterval(autoSlideInterval);
        shiftCarousel(1);
        startAutoSlide();
    });

    let touchStartX = 0;
    let lastTouchTime = 0;
    promoImagesContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        clearInterval(autoSlideInterval);
    }, { passive: true });

    promoImagesContainer.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchEndX - touchStartX;
        const now = Date.now();
        if (Math.abs(diffX) > 50 && now - lastTouchTime > 300) {
            shiftCarousel(diffX > 0 ? -1 : 1);
            lastTouchTime = now;
        }
        startAutoSlide();
    }, { passive: true });

    promoImagesContainer.addEventListener('mouseenter', () => {
        clearInterval(autoSlideInterval);
    });

    promoImagesContainer.addEventListener('mouseleave', () => {
        startAutoSlide();
    });

    window.addEventListener('resize', () => {
        const newVisibleImages = window.innerWidth >= 768 ? 3 : 2;
        if (newVisibleImages !== visibleImages) {
            visibleImages = newVisibleImages;
            currentIndex = 0;
            initCarousel();
            startAutoSlide();
        }
    });

    loadPromotions();
});