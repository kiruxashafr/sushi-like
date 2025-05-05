document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    let promotionsLoaded = false;
    let initialProductsLoaded = false;
    let hasError = false;

    function checkInitialLoadComplete() {
        if (hasError) {
            // If there's an error, hide loader and show content
            hideLoader();
            return;
        }
        if (promotionsLoaded && initialProductsLoaded) {
            hideLoader();
        }
    }

    function hideLoader() {
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 300);
        }
    }

    window.addEventListener('promotionsLoaded', () => {
        promotionsLoaded = true;
        checkInitialLoadComplete();
    });

    window.addEventListener('initialProductsLoaded', () => {
        initialProductsLoaded = true;
        checkInitialLoadComplete();
    });

    window.addEventListener('promotionsError', () => {
        hasError = true;
        checkInitialLoadComplete();
    });

    window.addEventListener('productsError', () => {
        hasError = true;
        checkInitialLoadComplete();
    });

    // Fallback: hide loader after 10 seconds if something goes wrong
    setTimeout(() => {
        if (!promotionsLoaded || !initialProductsLoaded) {
            console.warn('Loader timeout: hiding loader due to incomplete loading');
            hideLoader();
        }
    }, 10000);

    // Prevent scrolling while loader is visible
    document.body.style.overflow = 'hidden';
});