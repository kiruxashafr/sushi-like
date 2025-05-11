document.addEventListener('DOMContentLoaded', () => {
    const cityButton = document.querySelector('.city-button');
    const cityModalOverlay = document.getElementById('cityModalOverlay');
    const cityOptions = document.querySelectorAll('.city-option');
    let isAnimating = false;

    function showCityModal() {
        if (isAnimating || !cityModalOverlay) return;
        isAnimating = true;
        cityModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function hideCityModal() {
        if (isAnimating || !cityModalOverlay) return;
        isAnimating = true;
        cityModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    function selectCity(city) {
        const cityPath = city === 'kovrov' ? '/kovrov' : '/nnovgorod';
        window.location.href = cityPath;
    }

    if (cityButton) {
        cityButton.addEventListener('click', (e) => {
            e.preventDefault();
            showCityModal();
        });
    }

    cityOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedCity = option.dataset.city;
            selectCity(selectedCity);
        });
    });

    if (cityModalOverlay) {
        cityModalOverlay.addEventListener('click', (e) => {
            if (e.target === cityModalOverlay) {
                hideCityModal();
            }
        });
    }
});