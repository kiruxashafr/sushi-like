(function() {
    // Only initialize on mobile devices
    if (window.innerWidth >= 768) return;

    // DOM Elements for modals
    const privacyModal = document.getElementById('privacyModal');
    const privacyModalOverlay = document.getElementById('privacyModalOverlay');
    const contactsModal = document.getElementById('contactsModal');
    const contactsModalOverlay = document.getElementById('contactsModalOverlay');
    const cartModal = document.getElementById('cartModal');
    const cartModalOverlay = document.getElementById('cartModalOverlay');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const menuItems = document.querySelectorAll('#mobileMenu ul li a');

    let isAnimating = false;

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

    // Open contacts modal
    function openContactsModal() {
        if (isAnimating || !contactsModal || !contactsModalOverlay) return;
        isAnimating = true;

        contactsModal.classList.add('active');
        contactsModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            isAnimating = false;
        }, 400);
    }

    // Close contacts modal
    function closeContactsModal() {
        if (isAnimating || !contactsModal || !contactsModalOverlay) return;
        isAnimating = true;

        contactsModal.classList.remove('active');
        contactsModalOverlay.classList.remove('active');
        document.body.style.overflow = 'hidden'; // Maintain mobile menu's overflow state

        setTimeout(() => {
            isAnimating = false;
        }, 400);
    }

    // Open cart modal
    function openCartModal() {
        if (isAnimating || !cartModal || !cartModalOverlay) return;
        isAnimating = true;

        cartModal.classList.add('active');
        cartModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
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
            case 'Контакты':
                openContactsModal();
                break;
        }
    }

    // Event listeners for menu items
    menuItems.forEach(item => {
        const menuText = item.textContent.trim();
        if (['Меню', 'Акции', 'Корзина', 'Информация', 'Контакты'].includes(menuText)) {
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

    // Contacts modal close button
    const closeContactsButton = contactsModal ? contactsModal.querySelector('.close-contacts') : null;
    if (closeContactsButton) {
        closeContactsButton.addEventListener('click', closeContactsModal);
    }

    if (contactsModalOverlay) {
        contactsModalOverlay.addEventListener('click', closeContactsModal);
    }

    // Cart modal close button (assuming similar structure)
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