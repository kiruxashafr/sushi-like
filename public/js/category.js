document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const categoriesContainer = document.querySelector('.categories');
    const productsContainer = document.querySelector('.products-container');
    const header = document.querySelector('.header');
    const categoriesContainerElement = document.querySelector('.categories-container');

    // State Variables
    let isScrolling = false;
    let isPageScrolling = false;
    let isProgrammaticScrollUp = false;
    let observer = null;

    // Validate DOM Elements
    if (!categoriesContainer || !productsContainer || !header || !categoriesContainerElement) {
        console.error('Missing required DOM elements', {
            categoriesContainer,
            productsContainer,
            header,
            categoriesContainerElement
        });
        return;
    }

    /**
     * Sanitizes a category name to create a valid CSS class or ID
     * @param {string} name - Category name
     * @returns {string} Sanitized name
     */
    function sanitizeClassName(name) {
        if (typeof name !== 'string') {
            console.warn('sanitizeClassName: Invalid category name:', name);
            return '';
        }
        return name.toLowerCase()
            .replace(/[\s+&/\\#,+()$~%.'":*?<>{}]/g, '-')
            .replace(/-+/g, '-');
    }

    /**
     * Scrolls the categories container to center the specified element
     * @param {HTMLElement} element - Category button element
     */
    function scrollToCenter(element) {
        if (isScrolling || !element) {
            return;
        }
        isScrolling = true;

        const containerRect = categoriesContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollLeft = elementRect.left - containerRect.left + categoriesContainer.scrollLeft - (containerRect.width / 2) + (elementRect.width / 2);

        categoriesContainer.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });

        setTimeout(() => {
            isScrolling = false;
        }, 300); // Matches smooth scroll duration
    }

    /**
     * Sets the active category button
     * @param {HTMLElement} element - Category button element
     */
    function setActiveCategory(element) {
        if (!element) {
            console.warn('setActiveCategory: Invalid element');
            return;
        }
        const activeCategory = categoriesContainer.querySelector('.category.active');
        if (activeCategory) activeCategory.classList.remove('active');
        element.classList.add('active');
        scrollToCenter(element); // Center immediately
    }

    /**
     * Smoothly scrolls to a target Y position
     * @param {number} targetY - Target scroll position
     * @param {number} duration - Scroll duration in ms
     */
    function smoothScrollTo(targetY, duration) {
        const startY = window.pageYOffset;
        const diff = targetY - startY;
        let start;

        isProgrammaticScrollUp = diff < 0;
        isPageScrolling = true;

        if (observer) {
            document.querySelectorAll('.category-section').forEach(section => observer.unobserve(section));
        }

        if (window.innerWidth > 768) {
            header.classList.add('hidden');
            document.body.classList.add('header-hidden');
            categoriesContainerElement.style.top = '0px';
        }

        function step(timestamp) {
            if (!start) start = timestamp;
            const time = timestamp - start;
            const percent = Math.min(time / duration, 1);
            const easing = percent * percent * (3 - 2 * percent);
            window.scrollTo(0, startY + diff * easing);
            if (time < duration) {
                requestAnimationFrame(step);
            } else {
                isPageScrolling = false;
                isProgrammaticScrollUp = false;

                if (observer) {
                    document.querySelectorAll('.category-section').forEach(section => observer.observe(section));
                }
            }
        }

        requestAnimationFrame(step);
    }

    /**
     * Fetches categories and products from API
     */
    async function loadData() {
        try {
            const [categoriesResponse, productsResponse] = await Promise.all([
                fetch('http://localhost:3000/categories'),
                fetch('http://localhost:3000/products')
            ]);

            if (!categoriesResponse.ok || !productsResponse.ok) {
                throw new Error(`Fetch error: Categories status ${categoriesResponse.status}, Products status ${productsResponse.status}`);
            }

            const categories = await categoriesResponse.json();
            const products = await productsResponse.json();

            if (!Array.isArray(categories) || !Array.isArray(products)) {
                throw new Error('Invalid data format: Categories or products not an array');
            }

            renderCategories(categories);
            renderProducts(categories, products);
            setupIntersectionObserver(categories);
        } catch (error) {
            console.error('loadData Error:', error);
            categoriesContainer.innerHTML = '<p>Ошибка загрузки категорий</p>';
            productsContainer.innerHTML = '<p>Ошибка загрузки товаров</p>';
        }
    }

    /**
     * Renders category buttons
     * @param {string[]} categories - Array of category names
     */
    function renderCategories(categories) {
        if (!Array.isArray(categories)) {
            console.error('renderCategories: Categories is not an array', categories);
            categoriesContainer.innerHTML = '<p>Ошибка: категории не загружены</p>';
            return;
        }

        categoriesContainer.innerHTML = '';

        categories.forEach(category => {
            if (typeof category !== 'string' || !category) {
                console.warn('Skipping invalid category:', category);
                return;
            }

            const categoryElement = document.createElement('div');
            categoryElement.classList.add('category');
            categoryElement.textContent = category;
            categoryElement.dataset.category = category;

            categoryElement.addEventListener('click', () => {
                const sectionId = `category-${sanitizeClassName(category)}`;
                const section = document.getElementById(sectionId);
                if (section) {
                    const headerHeight = header.offsetHeight || 48;
                    const categoriesHeight = categoriesContainerElement.offsetHeight || 40;
                    const scrollPosition = section.offsetTop - (headerHeight + categoriesHeight);

                    smoothScrollTo(scrollPosition, 800);
                    setActiveCategory(categoryElement); // Center immediately
                } else {
                    console.warn(`Section not found: ${sectionId}`);
                }
            });

            categoriesContainer.appendChild(categoryElement);
        });

        if (categories.length > 0) {
            const firstCategory = categoriesContainer.querySelector('.category');
            if (firstCategory) {
                setActiveCategory(firstCategory);
            }
        } else {
            console.warn('No categories to render');
        }
    }

    /**
     * Renders product sections for each category
     * @param {string[]} categories - Array of category names
     * @param {Object[]} products - Array of product objects
     */
    function renderProducts(categories, products) {
        productsContainer.innerHTML = '';

        categories.forEach(category => {
            if (typeof category !== 'string' || !category) {
                console.warn('Skipping invalid category in renderProducts:', category);
                return;
            }

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
                if (!product || !product.name) {
                    console.warn('Skipping invalid product:', product);
                    return;
                }

                const productElement = document.createElement('div');
                productElement.className = 'product';
                productElement.innerHTML = `
                    <img src="${product.photo || 'photo/placeholder.jpg'}" alt="${product.name}">
                    ${product.quantity ? `<div class="quantity-badge">${product.quantity} шт.</div>` : ''}
                    <div class="product-info">
                        <div class="product-weight-quantity">
                            ${product.weight ? `<span>${product.weight} г</span>` : ''}
                        </div>
                        <h3>${product.name}</h3>
                        <p class="product-composition">${product.composition || ''}</p>
                        <div class="product-price-cart">
                            <button class="product-action-button">
                                <span>${product.price} ₽</span>
                                <span class="plus-icon">+</span>
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

    /**
     * Sets up IntersectionObserver to highlight active category on scroll
     * @param {string[]} categories - Array of category names
     */
    function setupIntersectionObserver(categories) {
        const isMobile = window.innerWidth <= 768;
        const headerHeight = header.offsetHeight || 48;
        const categoriesHeight = categoriesContainerElement.offsetHeight || 40;
        const rootMarginTop = isMobile ? `-${headerHeight + categoriesHeight + 20}px` : '-100px';

        observer = new IntersectionObserver(
            (entries) => {
                if (isPageScrolling) {
                    return;
                }
                let maxRatio = 0;
                let mostVisibleEntry = null;

                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                        maxRatio = entry.intersectionRatio;
                        mostVisibleEntry = entry;
                    }
                });

                if (mostVisibleEntry) {
                    const categoryId = mostVisibleEntry.target.id.replace('category-', '');
                    const category = categories.find(c => sanitizeClassName(c) === categoryId);
                    const categoryElement = document.querySelector(`.category[data-category="${category}"]`);
                    if (categoryElement) {
                        setActiveCategory(categoryElement);
                    } else {
                        console.warn(`Category element not found for ${category}, ID: ${categoryId}`);
                    }
                } else if (!isMobile && window.pageYOffset < 100) {
                    // Fallback: Highlight first category if near top in desktop
                    const firstCategory = document.querySelector('.category');
                    if (firstCategory) {
                        setActiveCategory(firstCategory);
                    }
                }
            },
            {
                threshold: isMobile ? [0.2, 0.4, 0.6] : [0.3, 0.5, 0.7],
                rootMargin: `${rootMarginTop} 0px -100px 0px`
            }
        );

        const sections = document.querySelectorAll('.category-section');
        if (sections.length === 0) {
            console.warn('No category sections found for IntersectionObserver');
        }
        sections.forEach(section => observer.observe(section));

        // Reconfigure observer on resize
        window.addEventListener('resize', () => {
            const newIsMobile = window.innerWidth <= 768;
            const newHeaderHeight = header.offsetHeight || 48;
            const newCategoriesHeight = categoriesContainerElement.offsetHeight || 40;
            const newRootMarginTop = newIsMobile ? `-${newHeaderHeight + newCategoriesHeight + 20}px` : '-100px';

            observer.disconnect();
            observer = new IntersectionObserver(
                (entries) => {
                    if (isPageScrolling) {
                        return;
                    }
                    let maxRatio = 0;
                    let mostVisibleEntry = null;

                    entries.forEach(entry => {
                        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
                            maxRatio = entry.intersectionRatio;
                            mostVisibleEntry = entry;
                        }
                    });

                    if (mostVisibleEntry) {
                        const categoryId = mostVisibleEntry.target.id.replace('category-', '');
                        const category = categories.find(c => sanitizeClassName(c) === categoryId);
                        const categoryElement = document.querySelector(`.category[data-category="${category}"]`);
                        if (categoryElement) {
                            setActiveCategory(categoryElement);
                        } else {
                            console.warn(`Category element not found for ${category}, ID: ${categoryId}`);
                        }
                    } else if (!newIsMobile && window.pageYOffset < 100) {
                        // Fallback: Highlight first category if near top in desktop
                        const firstCategory = document.querySelector('.category');
                        if (firstCategory) {
                            setActiveCategory(firstCategory);
                        }
                    }
                },
                {
                    threshold: newIsMobile ? [0.2, 0.4, 0.6] : [0.3, 0.5, 0.7],
                    rootMargin: `${newRootMarginTop} 0px -100px 0px`
                }
            );

            sections.forEach(section => observer.observe(section));
        });
    }

    // Handle resize to re-center active category
    window.addEventListener('resize', () => {
        const activeCategory = document.querySelector('.category.active');
        if (activeCategory) scrollToCenter(activeCategory);
    });

    // Prevent horizontal scroll on wheel
    document.addEventListener('wheel', (e) => {
        if (e.deltaX !== 0 && !e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // Expose isProgrammaticScrollUp for external use
    window.isProgrammaticScrollUp = () => isProgrammaticScrollUp;

    // Initialize
    loadData();
});