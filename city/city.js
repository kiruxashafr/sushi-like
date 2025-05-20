document.addEventListener('DOMContentLoaded', () => {
    const cityOptions = document.querySelectorAll('.city-option');

    function selectCity(city) {
        const cityPath = city === 'kovrov' ? '/kovrov' : '/nnovgorod';
        window.location.href = cityPath;
    }

    cityOptions.forEach(option => {
        option.addEventListener('click', () => {
            const selectedCity = option.dataset.city;
            selectCity(selectedCity);
        });
    });
});