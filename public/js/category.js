document.addEventListener('DOMContentLoaded', () => {
    const categoriesContainer = document.querySelector('.categories');
    const productsContainer = document.querySelector('.products-container');
    const header = document.querySelector('.header');
    const categoriesContainerElement = document.querySelector('.categories-container');

    let isPageScrolling = false;
    let observer = null;
    let lastObserverTrigger = 0;
    let originalCategoriesTop = 0;
    let categoriesPlaceholder = null;

    if (!categoriesContainer || !productsContainer || !header || !categoriesContainerElement) {
        console.error('Required DOM elements missing:', { categoriesContainer, productsContainer, header, categoriesContainerElement });
        return;
    }

    function updateOriginalCategoriesTop() {
        const headerHeight = header.offsetHeight || 48;
        const rect = categoriesContainerElement.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        originalCategoriesTop = isMobile
            ? rect.top + window.pageYOffset - headerHeight
            : rect.top + window.pageYOffset;
    }
    updateOriginalCategoriesTop();

    function createPlaceholder() {
        if (!categoriesPlaceholder) {
            categoriesPlaceholder = document.createElement('div');
            categoriesPlaceholder.className = 'categories-placeholder';
            categoriesPlaceholder.style.height = `${categoriesContainerElement.offsetHeight}px`;
            categoriesContainerElement.parentNode.insertBefore(categoriesPlaceholder, categoriesContainerElement);
        }
    }

    function removePlaceholder() {
        if (categoriesPlaceholder && categoriesPlaceholder.parentNode) {
            categoriesPlaceholder.parentNode.removeChild(categoriesPlaceholder);
            categoriesPlaceholder = null;
        }
    }

    function sanitizeClassName(name) {
        if (typeof name !== 'string') return '';
        return name
            .toLowerCase()
            .replace(/[\s+&/\\#,+()$~%.'":*?<>{}]/g, '-')
            .replace(/-+/g, '-');
    }

    function setActiveCategory(element) {
        if (!element) return;
        const activeCategory = categoriesContainer.querySelector('.category.active');
        if (activeCategory) activeCategory.classList.remove('active');
        element.classList.add('active');
    }

    function smoothScrollTo(targetY, duration, categoryElement) {
        const startY = window.pageYOffset;
        const diff = targetY - startY;
        let start;
        isPageScrolling = true;

        if (observer) {
            document.querySelectorAll('.category-section').forEach((section) => observer.unobserve(section));
        }

        const isMobile = window.innerWidth <= 768;
        const headerHeight = header.offsetHeight || 48;

        createPlaceholder();
        categoriesContainerElement.classList.add('fixed');
        categoriesContainerElement.style.top = isMobile ? `${headerHeight}px` : (header.classList.contains('hidden') ? '0px' : `${headerHeight}px`);

        function step(timestamp) {
            if (!start) start = timestamp;
            const time = timestamp - start;
            const percent = Math.min(time / duration, 1);
            const easing = 1 - Math.pow(1 - percent, 3); // Cubic ease-out
            window.scrollTo(0, startY + diff * easing);
            if (time < duration) {
                requestAnimationFrame(step);
            } else {
                isPageScrolling = false;
                if (observer) {
                    document.querySelectorAll('.category-section').forEach((section) => observer.observe(section));
                }
            }
        }

        requestAnimationFrame(step);
    }

    function formatComposition(composition) {
        if (!composition) return '';
        return composition
            .replace(/\\n/g, '<br>')
            .replace(/(\r\n|\n|\r)/g, '<br>');
    }

    async function fetchCategories() {
        try {
            const response = await fetch('/categories', { mode: 'cors' });
            if (!response.ok) throw new Error(`Categories fetch error: ${response.status}`);
            const categories = await response.json();
            if (!Array.isArray(categories)) throw new Error('Invalid categories format');
            return categories;
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    async function loadData() {
        try {
            const productsResponse = await fetch('/products', { mode: 'cors' });
            if (!productsResponse.ok) throw new Error(`Products fetch error: ${productsResponse.status}`);
            const products = await productsResponse.json();
            if (!Array.isArray(products)) throw new Error('Invalid products format');

            const categories = await fetchCategories();
            console.log('Categories loaded:', categories);
            console.log('Products loaded:', products);

            window.products = products;
            renderCategories(categories);
            renderProducts(categories, products);
            setupIntersectionObserver(categories);
        } catch (error) {
            console.error('Error loading data:', error);
            categoriesContainer.innerHTML = '<p>Не удалось загрузить категории.</p>';
            productsContainer.innerHTML = '<p>Не удалось загрузить товары.</p>';
        }
    }

    function renderCategories(categories) {
        if (!Array.isArray(categories)) {
            categoriesContainer.innerHTML = '<p>Ошибка: категории не загружены</p>';
            return;
        }

        categoriesContainer.innerHTML = '';

        categories.forEach((category) => {
            if (typeof category !== 'string' || !category) return;

            const categoryElement = document.createElement('div');
            categoryElement.classList.add('category');
            categoryElement.textContent = category;
            categoryElement.dataset.category = category;

            categoryElement.addEventListener('click', () => {
                setActiveCategory(categoryElement); // Set active immediately on click
                const sectionId = `category-${sanitizeClassName(category)}`;
                const section = document.getElementById(sectionId);
                if (section) {
                    const headerHeight = header.offsetHeight || 48;
                    const categoriesHeight = categoriesContainerElement.offsetHeight || 40;
                    let scrollPosition = section.offsetTop - (headerHeight + categoriesHeight);
                    const currentPosition = window.pageYOffset;

                    if (window.innerWidth > 768) {
                        scrollPosition += currentPosition > scrollPosition ? -10 : 60;
                    }

                    smoothScrollTo(scrollPosition, 300, categoryElement);
                }
            });

            categoriesContainer.appendChild(categoryElement);
        });

        const firstCategory = categoriesContainer.querySelector('.category');
        if (firstCategory) setActiveCategory(firstCategory);
    }

    function renderProducts(categories, products) {
        productsContainer.innerHTML = '';

        categories.forEach((category) => {
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

            const categoryProducts = products.filter((p) => p.category === category);

            categoryProducts.forEach((product) => {
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

    function setupIntersectionObserver(categories) {
        const isMobile = window.innerWidth <= 768;
        const headerHeight = header.offsetHeight || 48;
        const categoriesHeight = categoriesContainerElement.offsetHeight || 40;
        const rootMarginTop = isMobile ? `-${headerHeight + categoriesHeight + 10}px` : '-100px';

        observer = new IntersectionObserver(
            (entries) => {
                if (isPageScrolling) return;
                const now = performance.now();
                if (now - lastObserverTrigger < 50) return;
                lastObserverTrigger = now;

                let maxRatio = 0;
                let mostVisibleEntry = null;

                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                        maxRatio = entry.intersectionRatio;
                        mostVisibleEntry = entry;
                    }
                });

                if (mostVisibleEntry) {
                    const categoryId = mostVisibleEntry.target.id.replace('category-', '');
                    const category = categories.find((c) => sanitizeClassName(c) === categoryId);
                    const categoryElement = document.querySelector(`.category[data-category="${category}"]`);
                    if (categoryElement) setActiveCategory(categoryElement);
                } else if (!isMobile && window.pageYOffset < originalCategoriesTop) {
                    const firstCategory = document.querySelector('.category');
                    if (firstCategory) setActiveCategory(firstCategory);
                }
            },
            {
                threshold: isMobile ? [0.2, 0.4, 0.6, 0.8] : [0.3, 0.5, 0.7, 0.9],
                rootMargin: `${rootMarginTop} 0px -50px 0px`,
            }
        );

        document.querySelectorAll('.category-section').forEach((section) => observer.observe(section));

        window.addEventListener('resize', () => {
            const newIsMobile = window.innerWidth <= 768;
            const newHeaderHeight = header.offsetHeight || 48;
            const newCategoriesHeight = categoriesContainerElement.offsetHeight || 40;
            const newRootMarginTop = newIsMobile ? `-${newHeaderHeight + newCategoriesHeight + 10}px` : '-100px';

            observer.disconnect();
            observer = new IntersectionObserver(
                (entries) => {
                    if (isPageScrolling) return;
                    const now = performance.now();
                    if (now - lastObserverTrigger < 50) return;
                    lastObserverTrigger = now;

                    let maxRatio = 0;
                    let mostVisibleEntry = null;

                    entries.forEach((entry) => {
                        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                            maxRatio = entry.intersectionRatio;
                            mostVisibleEntry = entry;
                        }
                    });

                    if (mostVisibleEntry) {
                        const categoryId = mostVisibleEntry.target.id.replace('category-', '');
                        const category = categories.find((c) => sanitizeClassName(c) === categoryId);
                        const categoryElement = document.querySelector(`.category[data-category="${category}"]`);
                        if (categoryElement) setActiveCategory(categoryElement);
                    } else if (!newIsMobile && window.pageYOffset < originalCategoriesTop) {
                        const firstCategory = document.querySelector('.category');
                        if (firstCategory) setActiveCategory(firstCategory);
                    }
                },
                {
                    threshold: newIsMobile ? [0.2, 0.4, 0.6, 0.8] : [0.3, 0.5, 0.7, 0.9],
                    rootMargin: `${newRootMarginTop} 0px -50px 0px`,
                }
            );

            document.querySelectorAll('.category-section').forEach((section) => observer.observe(section));
            updateOriginalCategoriesTop();

            if (categoriesPlaceholder) {
                categoriesPlaceholder.style.height = `${categoriesContainerElement.offsetHeight}px`;
            }
        });
    }

    function refreshCategories() {
        loadData();
    }

    window.addEventListener('scroll', () => {
        const isMobile = window.innerWidth <= 768;
        const headerHeight = header.offsetHeight || 48;

        if (window.pageYOffset >= originalCategoriesTop) {
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
    });

    window.addEventListener('resize', () => {
        updateOriginalCategoriesTop();
        if (categoriesPlaceholder) {
            categoriesPlaceholder.style.height = `${categoriesContainerElement.offsetHeight}px`;
        }
    });

    document.addEventListener('wheel', (e) => {
        if (e.deltaX !== 0 && !e.ctrlKey) e.preventDefault();
    }, { passive: false });

    document.addEventListener('categoryOrderUpdated', refreshCategories);

    loadData();
});