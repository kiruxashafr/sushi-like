document.addEventListener('DOMContentLoaded', () => {
    const categoriesContainer = document.querySelector('.categories');
    const productsContainer = document.querySelector('.products-container');
    const header = document.querySelector('.header');
    const categoriesContainerElement = document.querySelector('.categories-container');

    let isPageScrolling = false;
    let originalCategoriesTop = 0;
    let categoriesPlaceholder = null;
    let categories = [];
    let scrollTimeout = null;

    if (!categoriesContainer || !productsContainer || !header || !categoriesContainerElement) {
        console.error('Required DOM elements missing:', { categoriesContainer, productsContainer, header, categoriesContainerElement });
        window.dispatchEvent(new CustomEvent('productsError'));
        return;
    }

    // Обновление начальной позиции контейнера категорий
    function updateOriginalCategoriesTop() {
        const rect = categoriesContainerElement.getBoundingClientRect();
        originalCategoriesTop = rect.top + window.pageYOffset;
    }
    updateOriginalCategoriesTop();

    // Создание заполнителя для фиксированной позиции
    function createPlaceholder() {
        if (!categoriesPlaceholder) {
            categoriesPlaceholder = document.createElement('div');
            categoriesPlaceholder.className = 'categories-placeholder';
            categoriesPlaceholder.style.height = `${categoriesContainerElement.offsetHeight}px`;
            categoriesContainerElement.parentNode.insertBefore(categoriesPlaceholder, categoriesContainerElement);
        }
    }

    // Удаление заполнителя
    function removePlaceholder() {
        if (categoriesPlaceholder && categoriesPlaceholder.parentNode) {
            categoriesPlaceholder.parentNode.removeChild(categoriesPlaceholder);
            categoriesPlaceholder = null;
        }
    }

    // Очистка имени категории для классов/ID
    function sanitizeClassName(name) {
        if (typeof name !== 'string') return '';
        return name
            .toLowerCase()
            .replace(/[\s+&/\\#,+()$~%.'":*?<>{}]/g, '-')
            .replace(/-+/g, '-');
    }

    // Установка активной категории
    function setActiveCategory(category) {
        if (!category) return;
        const activeCategory = categoriesContainer.querySelector('.category.active');
        if (activeCategory) activeCategory.classList.remove('active');
        const categoryElement = document.querySelector(`.category[data-category="${category}"]`);
        if (categoryElement) {
            categoryElement.classList.add('active');
            const containerRect = categoriesContainer.getBoundingClientRect();
            const elementRect = categoryElement.getBoundingClientRect();
            if (elementRect.left < containerRect.left || elementRect.right > containerRect.right) {
                categoryElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            }
        }
    }

    // Плавная прокрутка к категории
    function scrollToCategory(category) {
        const sectionId = `category-${sanitizeClassName(category)}`;
        const section = document.getElementById(sectionId);
        if (!section) return;

        isPageScrolling = true;
        setActiveCategory(category); // Устанавливаем активную категорию сразу при клике
        const headerHeight = header.offsetHeight || 48;
        const categoriesHeight = categoriesContainerElement.offsetHeight || 40;
        const targetY = section.offsetTop - (headerHeight + categoriesHeight + 10);
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Для мобильных устройств используем window.scrollTo
            window.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });
        } else {
            // Для десктопа используем requestAnimationFrame для плавной прокрутки
            const startY = window.pageYOffset;
            const distance = targetY - startY;
            const duration = 500; // Длительность анимации в миллисекундах
            let startTime = null;

            function scrollStep(timestamp) {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);
                const ease = progress * (2 - progress); // Ease-in-out функция
                window.scrollTo(0, startY + distance * ease);
                if (progress < 1) {
                    requestAnimationFrame(scrollStep);
                }
            }

            requestAnimationFrame(scrollStep);
        }

        // Симуляция события окончания прокрутки
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isPageScrolling = false;
            setActiveCategory(category); // Подтверждаем активную категорию после прокрутки
        }, 600); // Таймаут для учета инерционной прокрутки на мобильных
    }

    // Обновление активной категории на основе наиболее видимой секции
    function updateActiveCategory() {
        if (isPageScrolling) return;

        let maxVisibleHeight = 0;
        let activeSection = null;

        document.querySelectorAll('.category-section').forEach(section => {
            const rect = section.getBoundingClientRect();
            const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
            if (visibleHeight > maxVisibleHeight) {
                maxVisibleHeight = visibleHeight;
                activeSection = section;
            }
        });

        if (activeSection) {
            const categoryId = activeSection.id.replace('category-', '');
            const category = categories.find(c => sanitizeClassName(c) === categoryId);
            if (category) {
                setActiveCategory(category);
            }
        }
    }

    // Форматирование состава для отображения
    function formatComposition(composition) {
        if (!composition) return '';
        return composition
            .replace(/\\n/g, '<br>')
            .replace(/(\r\n|\n|\r)/g, '<br>');
    }

    // Получение категорий
    async function fetchCategories() {
        try {
            const response = await fetch('/categories', { mode: 'cors' });
            if (! response.ok) throw new Error(`Categories fetch error: ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Invalid categories format');
            return data;
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    // Получение продуктов
    async function fetchProducts() {
        try {
            const response = await fetch('/products', { mode: 'cors' });
            if (!response.ok) throw new Error(`Products fetch error: ${response.status}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Invalid products format');
            return data;
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

    // Загрузка данных
    async function loadData() {
        try {
            const [fetchedCategories, products] = await Promise.all([fetchCategories(), fetchProducts()]);
            console.log('Categories loaded:', fetchedCategories);
            console.log('Products loaded:', products);

            categories = fetchedCategories;
            window.products = products;
            renderCategories(categories);

            // Render only the first category's products initially
            if (categories.length > 0) {
                renderInitialProducts(categories[0], products);
            }

            // Notify loader that initial products are loaded
            window.dispatchEvent(new CustomEvent('initialProductsLoaded'));

            // Load remaining products in the background
            setTimeout(() => {
                renderRemainingProducts(categories, products);
                updateActiveCategory();
            }, 100);
        } catch (error) {
            console.error('Error loading data:', error);
            categoriesContainer.innerHTML = '<p>Не удалось загрузить категории.</p>';
            productsContainer.innerHTML = '<p>Не удалось загрузить товары.</p>';
            window.dispatchEvent(new CustomEvent('productsError'));
        }
    }

    // Рендеринг категорий
    function renderCategories(categories) {
        if (!Array.isArray(categories)) {
            categoriesContainer.innerHTML = '<p>Ошибка: категории не загружены</p>';
            return;
        }

        categoriesContainer.innerHTML = '';

        categories.forEach(category => {
            if (typeof category !== 'string' || !category) return;

            const categoryElement = document.createElement('div');
            categoryElement.classList.add('category');
            categoryElement.textContent = category;
            categoryElement.dataset.category = category;

            categoryElement.addEventListener('click', () => {
                scrollToCategory(category);
            });

            categoriesContainer.appendChild(categoryElement);
        });
    }

    // Рендеринг начальных продуктов (только первая категория)
    function renderInitialProducts(category, products) {
        const section = document.createElement('div');
        section.id = `category-${sanitizeClassName(category)}`;
        section.className = 'category-section';

        const header = document.createElement('h2');
        header.className = 'category-header';
        header.textContent = category;
        section.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'products-grid';

        const categoryProducts = products.filter(p => p.category === category);

        categoryProducts.forEach(product => {
            if (!product || !product.name) return;

            const productElement = document.createElement('div');
            productElement.className = 'product';
            productElement.dataset.productId = product.id;
            productElement.innerHTML = `
                <img src="${product.photo || 'photo/placeholder.jpg'}" alt="${product.name}">
                ${product.quantity ? `<div class="quantity-badge">${product.quantity} шт.</div>` : ''}
                <div class="product-info">
                    <div class="product-weight-quantity">
                        ${product.weight ? `<span>${product.weight} г</span>` : ''}
                    </div>
                    <h3>${product.name}</h3>
                    <p class="product-composition">${formatComposition(product.composition)}</p>
                    <div class="product-price-cart">
                        <button class="product-action-button">
                            <span>${product.price} ₽</span>
                            <img src="photo/карточки/добавить.png" alt="Add" class="plus-icon">
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(productElement);
        });

        section.appendChild(grid);
        productsContainer.appendChild(section);
    }

    // Рендеринг остальных продуктов
    function renderRemainingProducts(categories, products) {
        categories.slice(1).forEach(category => {
            if (typeof category !== 'string' || !category) return;

            const section = document.createElement('div');
            section.id = `category-${sanitizeClassName(category)}`;
            section.className = 'category-section';

            const header = document.createElement('h2');
            header.className = 'category-header';
            header.textContent = category;
            section.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'products-grid';

            const categoryProducts = products.filter(p => p.category === category);

            categoryProducts.forEach(product => {
                if (!product || !product.name) return;

                const productElement = document.createElement('div');
                productElement.className = 'product';
                productElement.dataset.productId = product.id;
                productElement.innerHTML = `
                    <img src="${product.photo || 'photo/placeholder.jpg'}" alt="${product.name}">
                    ${product.quantity ? `<div class="quantity-badge">${product.quantity} шт.</div>` : ''}
                    <div class="product-info">
                        <div class="product-weight-quantity">
                            ${product.weight ? `<span>${product.weight} г</span>` : ''}
                        </div>
                        <h3>${product.name}</h3>
                        <p class="product-composition">${formatComposition(product.composition)}</p>
                        <div class="product-price-cart">
                            <button class="product-action-button">
                                <span>${product.price} ₽</span>
                                <img src="photo/карточки/добавить.png" alt="Add" class="plus-icon">
                            </button>
                        </div>
                    </div>
                `;
                grid.appendChild(productElement);
            });

            section.appendChild(grid);
            productsContainer.appendChild(section);
        });
    }

    // Обработка прокрутки для фиксирования и активной категории
    window.addEventListener('scroll', () => {
        const headerHeight = header.offsetHeight || 48;
        const isMobile = window.innerWidth <= 768;
        const fixPoint = isMobile ? originalCategoriesTop - headerHeight : originalCategoriesTop;

        if (window.pageYOffset >= fixPoint) {
            if (!categoriesContainerElement.classList.contains('fixed')) {
                createPlaceholder();
                categoriesContainerElement.classList.add('fixed');
                categoriesContainerElement.style.position = 'fixed';
                categoriesContainerElement.style.top = isMobile ? `${headerHeight}px` : (header.classList.contains('hidden') ? '0px' : `${headerHeight}px`);
                categoriesContainerElement.style.left = isMobile ? '0' : '50%';
                categoriesContainerElement.style.transform = isMobile ? 'none' : 'translateX(-50%)';
                categoriesContainerElement.style.width = isMobile ? '100%' : '1160px';
                categoriesContainerElement.style.zIndex = '900';
            } else {
                categoriesContainerElement.style.top = isMobile ? `${headerHeight}px` : (header.classList.contains('hidden') ? '0px' : `${headerHeight}px`);
            }
        } else if (categoriesContainerElement.classList.contains('fixed')) {
            categoriesContainerElement.classList.remove('fixed');
            categoriesContainerElement.style.position = '';
            categoriesContainerElement.style.top = '';
            categoriesContainerElement.style.left = '';
            categoriesContainerElement.style.transform = '';
            categoriesContainerElement.style.width = '';
            categoriesContainerElement.style.zIndex = '';
            removePlaceholder();
        }

        if (!isPageScrolling) {
            updateActiveCategory();
        }
    });

    // Обработка изменения размера окна
    window.addEventListener('resize', () => {
        updateOriginalCategoriesTop();
        if (categoriesPlaceholder) {
            categoriesPlaceholder.style.height = `${categoriesContainerElement.offsetHeight}px`;
        }
        if (!isPageScrolling) {
            updateActiveCategory();
        }
    });

    // Предотвращение горизонтальной прокрутки колесом
    document.addEventListener('wheel', (e) => {
        if (e.deltaX !== 0 && !e.ctrlKey) e.preventDefault();
    }, { passive: false });

    // Обработка пользовательского события
    document.addEventListener('categoryOrderUpdated', loadData);

    // Начальная загрузка
    loadData();
});