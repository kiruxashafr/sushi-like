(function() {
    // Only initialize on desktop
    if (window.innerWidth <= 768) return;

    const city = window.location.pathname.includes('/nnovgorod') ? 'nnovgorod' : 'kovrov';
    const cartIconPath = `/${city}/photo/header/корзина.png`;

    // Create cart button
    const cartButton = document.createElement('button');
    cartButton.className = 'desktop-cart-button';
    cartButton.innerHTML = `<img src="${cartIconPath}" alt="Cart">`;
    document.body.appendChild(cartButton);

    // Create menu button
    const menuButton = document.createElement('button');
    menuButton.className = 'desktop-menu-button';
    menuButton.innerHTML = `<span class="hamburger"></span>`; // Placeholder for CSS hamburger icon
    document.body.appendChild(menuButton);

    // Event listener for cart button
    cartButton.addEventListener('click', () => {
        const cartElement = document.querySelector('.cart');
        if (cartElement) {
            cartElement.dispatchEvent(new Event('click', { bubbles: true }));
        } else {
            console.error('Cart element (.cart) not found');
        }
    });

    // Event listener for menu button
    menuButton.addEventListener('click', () => {
        const mobileMenu = document.getElementById('mobileMenu');
        const overlay = document.getElementById('overlay');
        if (mobileMenu && overlay) {
            mobileMenu.classList.add('active-desktop');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });

    // Handle closing the menu with close button
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', () => {
            const mobileMenu = document.getElementById('mobileMenu');
            const overlay = document.getElementById('overlay');
            if (mobileMenu && overlay) {
                mobileMenu.classList.remove('active-desktop');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // Handle overlay click to close menu
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            const mobileMenu = document.getElementById('mobileMenu');
            if (mobileMenu) {
                mobileMenu.classList.remove('active-desktop');
            }
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
})();