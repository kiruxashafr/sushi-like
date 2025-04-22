document.addEventListener('DOMContentLoaded', () => {
    const switcherContainer = document.querySelector('.switcher-container');
    const deliveryMode = document.querySelector('.mode.delivery');
    const pickupMode = document.querySelector('.mode.pickup');

    if (switcherContainer && deliveryMode && pickupMode) {
        deliveryMode.addEventListener('click', () => {
            switcherContainer.classList.remove('pickup-selected');
            switcherContainer.classList.add('delivery-selected');
        });

        pickupMode.addEventListener('click', () => {
            switcherContainer.classList.remove('delivery-selected');
            switcherContainer.classList.add('pickup-selected');
        });
    }
});