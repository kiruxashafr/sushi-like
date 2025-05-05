document.addEventListener('DOMContentLoaded', () => {
    // Determine city from URL
    const city = window.location.pathname.includes('/nnovgorod') ? 'nnovgorod' : 'kovrov';

    const productModal = document.getElementById('productModal');
    const closeButton = productModal.querySelector('.close-button');
    const productsContainer = document.querySelector('.products-container');
    let currentProductId;
    let quantity = 1;

    // Функция для обработки переносов строк
    function formatComposition(composition) {
        if (!composition) return 'Нет описания';
        // Log raw composition for debugging
        console.log('Raw composition:', composition);
        // Handle escaped and actual newlines
        return composition
            .replace(/\\n/g, '<br>') // Handle escaped \n
            .replace(/(\r\n|\n|\r)/g, '<br>'); // Handle actual newlines
    }

    function openProductModal(productId) {
        const product = window.products.find(p => p.id == productId);
        if (!product) return;

        currentProductId = productId;
        quantity = 1; // Всегда начинаем с количества 1

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
        document.body.style.overflow = 'hidden'; // Блокируем скролл
    }

    function closeProductModal() {
        productModal.classList.remove('active');
        document.body.style.overflow = ''; // Разблокируем скролл
    }

    // Обработчик клика на карточку товара
    productsContainer.addEventListener('click', (e) => {
        const productElement = e.target.closest('.product');
        if (!productElement || e.target.closest('.product-action-button') || e.target.closest('.product-price-cart')) {
            return; // Игнорируем клик на кнопку добавления или весь блок product-price-cart
        }

        const productId = productElement.dataset.productId;
        if (productId) {
            openProductModal(productId);
        }
    });

    // Закрытие модального окна
    closeButton.addEventListener('click', closeProductModal);

    // Закрытие при клике на фон (только десктоп)
    productModal.addEventListener('click', (e) => {
        if (window.innerWidth > 767 && e.target === productModal) {
            closeProductModal();
        }
    });

    // Уменьшение количества
    productModal.querySelector('.minus').addEventListener('click', () => {
        if (quantity > 1) {
            quantity--;
            productModal.querySelector('.quantity').textContent = quantity;
        }
    });

    // Увеличение количества
    productModal.querySelector('.plus').addEventListener('click', () => {
        quantity++;
        productModal.querySelector('.quantity').textContent = quantity;
    });

    // Добавление в корзину
    productModal.querySelector('.add-to-cart-button').addEventListener('click', () => {
        addToCart(currentProductId, quantity);
        closeProductModal();
    });

    function addToCart(productId, qty) {
        // Используем глобальную корзину
        const cart = window.cart || { items: {}, total: 0 };
        if (!cart.items[productId]) {
            cart.items[productId] = qty;
        } else {
            cart.items[productId] += qty;
        }
        window.cart = cart;

        // Вызываем функции обновления из cart.js
        if (window.updateCartTotal) window.updateCartTotal();
        if (window.updateProductButton) window.updateProductButton(productId);
        if (window.updateCartSummary) window.updateCartSummary();

        console.log(`Добавлено ${qty} шт. товара с ID ${productId} в корзину`);
    }

    // Существующий обработчик для кнопок .add-to-cart (если они есть)
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', () => {
            console.log('Товар добавлен в корзину');
        });
    });
});