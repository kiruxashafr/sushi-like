document.addEventListener('DOMContentLoaded', () => {
    const city = window.location.pathname.includes('/nnovgorod') ? 'nnovgorod' : 'kovrov';
    const productModal = document.getElementById('productModal');
    const closeButton = productModal.querySelector('.close-button');
    const productsContainer = document.querySelector('.products-container');
    let currentProductId;
    let quantity = 1;

    function formatComposition(composition) {
        if (!composition) return 'Нет описания';
        return composition
            .replace(/\\n/g, '<br>')
            .replace(/(\r\n|\n|\r)/g, '<br>');
    }

    function openProductModal(productId) {
        const product = window.products.find(p => p.id == productId);
        if (!product) return;

        currentProductId = productId;
        quantity = 1;

        const productImage = productModal.querySelector('.product-image');
        const productName = productModal.querySelector('.product-name');
        const productPrice = productModal.querySelector('.product-price');
        const productQuantityWeight = productModal.querySelector('.product-quantity-weight');
        const productDescription = productModal.querySelector('.product-description');
        const quantitySpan = productModal.querySelector('.quantity');

        productImage.style.backgroundImage = `url(${product.photo || `/${city}/photo/placeholder.jpg`})`;
        productName.textContent = product.name;
        productPrice.textContent = `${Math.floor(product.price)} ₽`;
        productQuantityWeight.textContent = `${product.quantity ? product.quantity + ' шт.' : ''}${product.weight ? ' • ' + product.weight + ' г' : ''}`;
        productDescription.innerHTML = formatComposition(product.composition);
        quantitySpan.textContent = quantity;

        productModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeProductModal() {
        productModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    productsContainer.addEventListener('click', (e) => {
        const productElement = e.target.closest('.product');
        if (!productElement || e.target.closest('.product-action-button') || e.target.closest('.product-price-cart')) return;
        const productId = productElement.dataset.productId;
        if (productId) openProductModal(productId);
    });

    closeButton.addEventListener('click', closeProductModal);

    productModal.addEventListener('click', (e) => {
        if (window.innerWidth > 767 && e.target === productModal) closeProductModal();
    });

    productModal.querySelector('.minus').addEventListener('click', () => {
        if (quantity > 1) {
            quantity--;
            productModal.querySelector('.quantity').textContent = quantity;
        }
    });

    productModal.querySelector('.plus').addEventListener('click', () => {
        quantity++;
        productModal.querySelector('.quantity').textContent = quantity;
    });

    function addToCart(productId, qty) {
        // Инициализация window.cart с полной структурой, если она отсутствует
        if (!window.cart) {
            window.cart = {
                items: {},
                total: 0,
                discount: 0,
                totalAfterDiscount: 0,
                appliedDiscount: null
            };
        }
    
        // Обновление количества товара в корзине
        if (!window.cart.items[productId]) {
            window.cart.items[productId] = qty;
        } else {
            window.cart.items[productId] += qty;
        }
    
        // Если доступна функция updateCartTotal из cart.js, используем её
        if (window.updateCartTotal) {
            window.updateCartTotal(); // Она пересчитает total и сохранит в localStorage
        } else {
            // Резервный вариант: пересчитываем total вручную и сохраняем
            const product = window.products.find(p => p.id == productId);
            if (product) {
                window.cart.total += product.price * qty;
            }
            localStorage.setItem('sushi_like_cart', JSON.stringify(window.cart));
        }
    
        // Обновление UI, если функции доступны
        if (window.updateProductButton) window.updateProductButton(productId);
        if (window.updateCartSummary) window.updateCartSummary();
    }
});