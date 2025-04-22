document.addEventListener('DOMContentLoaded', () => {
    const promoImagesContainer = document.querySelector('.promo-images');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    let promotions = [];
    let currentIndex = 0;
    let autoSlideInterval = null;
    let isLoading = false;
    let isSliding = false;
    let userInteracted = false;
    let touchStartX = 0;
    let lastTouchTime = 0;

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
        const MAX_RETRIES = 5;
        const RETRY_DELAY = 1000;
        const promises = promotions.map(async (promo) => {
            let retries = MAX_RETRIES;
            let success = false;
            while (retries > 0 && !success) {
                try {
                    await loadImageWithTimeout(promo.photo, 5000);
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
        });
        await Promise.all(promises);
    }

    function showError(message) {
        promoImagesContainer.innerHTML = `
            <div class="promo-error">
                <p>${message}</p>
                <button class="retry-button">Попробовать снова</button>
            </div>
        `;
        const retryButton = document.querySelector('.retry-button');
        if (retryButton) retryButton.addEventListener('click', loadPromotions);
    }

    function initCarousel() {
        if (!promotions.length) return;
        promoImagesContainer.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'promo-image';
            const img = document.createElement('img');
            img.alt = 'Акция';
            img.loading = 'eager';
            img.onerror = () => {
                img.src = 'photo/placeholder.jpg';
                img.alt = 'Изображение не загрузилось';
            };
            const infoIcon = document.createElement('div');
            infoIcon.className = 'promo-info-icon';
            infoIcon.innerHTML = `<img src="photo/акции/информация.png" alt="Информация">`;
            imgContainer.appendChild(img);
            imgContainer.appendChild(infoIcon);
            promoImagesContainer.appendChild(imgContainer);
            imgContainer.addEventListener('click', () => {
                const index = parseInt(imgContainer.dataset.index, 10);
                if (promotions[index]) {
                    openModal(promotions[index]);
                    userInteracted = true;
                    stopAutoSlide();
                } else {
                    console.error('No promotion data for index:', index);
                }
            });
        }
        updateImages();
        resetCarousel();
        const centralImage = promoImagesContainer.querySelectorAll('.promo-image')[2];
        if (centralImage) centralImage.classList.add('central');
    }

    function getImageDimensions() {
        const isSmallScreen = window.innerWidth <= 480;
        const isMobile = window.innerWidth < 768;
        const imageWidth = isSmallScreen ? 254 : isMobile ? 269 : 375;
        const gap = isMobile ? 4 : 10;
        return { imageWidth, gap };
    }

    function updateImages() {
        const N = promotions.length;
        const indices = [
            (currentIndex - 2 + N) % N,
            (currentIndex - 1 + N) % N,
            currentIndex,
            (currentIndex + 1) % N,
            (currentIndex + 2) % N
        ];
        const images = promoImagesContainer.querySelectorAll('.promo-image');
        images.forEach((image, i) => {
            image.dataset.index = indices[i];
            image.querySelector('img').src = promotions[indices[i]].photo;
        });
    }

    function resetCarousel() {
        const { imageWidth, gap } = getImageDimensions();
        const containerWidth = promoImagesContainer.parentElement.offsetWidth;
        const centralImageOffset = 2 * (imageWidth + gap);
        const offset = (containerWidth - imageWidth) / 2 - centralImageOffset;
        promoImagesContainer.style.transition = 'none';
        promoImagesContainer.style.transform = `translateX(${offset}px)`;
    }

    function shiftCarousel(direction) {
        if (isSliding) return;
        isSliding = true;

        promoImagesContainer.querySelectorAll('.promo-image').forEach(image => {
            image.classList.remove('central');
        });

        const { imageWidth, gap } = getImageDimensions();
        const slideDistance = direction * (imageWidth + gap);
        const currentTransform = parseFloat(promoImagesContainer.style.transform.replace('translateX(', '').replace('px)', '')) || 0;

        promoImagesContainer.style.transition = 'transform 0.6s ease-in-out';
        promoImagesContainer.style.transform = `translateX(${currentTransform - slideDistance}px)`;

        const N = promotions.length;
        if (direction === 1) {
            currentIndex = (currentIndex + 1) % N;
        } else {
            currentIndex = (currentIndex - 1 + N) % N;
        }

        const transitionEndHandler = () => {
            promoImagesContainer.style.transition = 'none';
            updateImages();
            resetCarousel();
            const centralImage = promoImagesContainer.querySelectorAll('.promo-image')[2];
            if (centralImage) centralImage.classList.add('central');
            isSliding = false;
            promoImagesContainer.removeEventListener('transitionend', transitionEndHandler);
        };

        promoImagesContainer.addEventListener('transitionend', transitionEndHandler);

        setTimeout(() => {
            if (isSliding) {
                promoImagesContainer.style.transition = 'none';
                updateImages();
                resetCarousel();
                const centralImage = promoImagesContainer.querySelectorAll('.promo-image')[2];
                if (centralImage) centralImage.classList.add('central');
                isSliding = false;
                promoImagesContainer.removeEventListener('transitionend', transitionEndHandler);
            }
        }, 700);
    }

    function openModal(promo) {
        if (!promo) {
            console.error('No promo data provided to openModal');
            return;
        }

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

        const isMobile = window.innerWidth < 768;
        modal.innerHTML = `
            ${isMobile ? '<div class="modal-arrow-placeholder"></div>' : ''}
            <div class="modal-content">
                <img src="${promo.photo}" alt="Акция" class="modal-image">
                <p class="modal-conditions">${promo.conditions || 'Условия акции не указаны'}</p>
                ${isMobile ? '<button class="modal-hide-button">Скрыть</button>' : ''}
                ${!isMobile ? '<div class="modal-close">✕</div>' : ''}
            </div>
        `;
        modal.classList.add('active');

        if (!isMobile) {
            modal.style.display = 'block';
            modal.style.opacity = '1';
            modal.style.transform = 'translate(-50%, -50%)';
        }

        const hideButton = modal.querySelector('.modal-hide-button');
        const arrowPlaceholder = modal.querySelector('.modal-arrow-placeholder');
        const closeButton = modal.querySelector('.modal-close');

        if (isMobile && hideButton) {
            hideButton.addEventListener('click', closeModal);
        }
        if (isMobile && arrowPlaceholder) {
            arrowPlaceholder.addEventListener('click', closeModal);
        }
        if (!isMobile && closeButton) {
            closeButton.addEventListener('click', closeModal);
        }

        const overlayClickHandler = (e) => {
            if (e.target === overlay) closeModal();
        };
        overlay.addEventListener('click', overlayClickHandler);

        modal.addEventListener('click', (e) => e.stopPropagation());

        const cleanup = () => {
            if (hideButton) hideButton.removeEventListener('click', closeModal);
            if (arrowPlaceholder) arrowPlaceholder.removeEventListener('click', closeModal);
            if (closeButton) closeButton.removeEventListener('click', closeModal);
            overlay.removeEventListener('click', overlayClickHandler);
        };

        const originalCloseModal = closeModal;
        closeModal = () => {
            cleanup();
            originalCloseModal();
        };
    }

    function closeModal() {
        const modal = document.querySelector('.promo-modal');
        const overlay = document.querySelector('.promo-modal-overlay');
        const isMobile = window.innerWidth < 768;

        if (modal) {
            modal.style.transition = isMobile ? 'transform 0.4s ease-in' : 'opacity 0.3s ease-in, transform 0.3s ease-in';
            if (isMobile) {
                modal.style.transform = 'translateY(100%)';
            } else {
                modal.style.opacity = '0';
                modal.style.transform = 'translate(-50%, -50%) scale(0.8)';
            }
            setTimeout(() => modal.remove(), 400);
        }
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 400);
        }
    }

    function startAutoSlide() {
        if (userInteracted) return;
        clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(() => {
            if (!isSliding) {
                shiftCarousel(1);
            }
        }, 5000);
    }

    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
        autoSlideInterval = null;
    }

    prevButton.addEventListener('click', () => {
        userInteracted = true;
        stopAutoSlide();
        shiftCarousel(-1);
    });

    nextButton.addEventListener('click', () => {
        userInteracted = true;
        stopAutoSlide();
        shiftCarousel(1);
    });

    promoImagesContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        userInteracted = true;
        stopAutoSlide();
    }, { passive: true });

    promoImagesContainer.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchEndX - touchStartX;
        const now = Date.now();
        if (Math.abs(diffX) > 50 && now - lastTouchTime > 400) {
            shiftCarousel(diffX > 0 ? -1 : 1);
            lastTouchTime = now;
        }
    }, { passive: true });

    promoImagesContainer.addEventListener('mouseenter', () => {
        stopAutoSlide();
    });

    promoImagesContainer.addEventListener('mouseleave', () => {
        if (!userInteracted) startAutoSlide();
    });

    window.addEventListener('resize', () => {
        updateImages();
        resetCarousel();
        const centralImage = promoImagesContainer.querySelectorAll('.promo-image')[2];
        if (centralImage) {
            promoImagesContainer.querySelectorAll('.promo-image').forEach(image => image.classList.remove('central'));
            centralImage.classList.add('central');
        }
    });

    loadPromotions();
});