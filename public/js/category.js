document.addEventListener('DOMContentLoaded', () => {
    const categoriesContainer = document.querySelector('.categories');
    const productsContainer = document.querySelector('.products-container');
    const header = document.querySelector('.header');
    const categoriesContainerElement = document.querySelector('.categories-container');
    const promotionsContainer = document.querySelector('.promotions-container');
    const deliverySection = document.querySelector('.delivery-section');

    let isPageScrolling = false;
    let observer = null;
    let lastObserverTrigger = 0;

    if (!categoriesContainer || !productsContainer || !header || !categoriesContainerElement) {
        return;
    }

    function sanitizeClassName(name) {
        if (typeof name !== 'string') return '';
        return name.toLowerCase()
            .replace(/[\s+&/\\#,+()$~%.'":*?<>{}]/g, '-')
            .replace(/-+/g, '-');
    }

    function scrollToCenter(element) {
        if (!element) return;

        if (window.centeringAnimationFrame) {
            cancelAnimationFrame(window.centeringAnimationFrame);
        }

        window.getComputedStyle(categoriesContainer).offsetWidth;

        const containerRect = categoriesContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const startScroll = categoriesContainer.scrollLeft;
        const targetScroll = elementRect.left - containerRect.left + startScroll - (containerRect.width / 2) + (elementRect.width / 2);
        const duration = 800;
        let start;

        function step(timestamp) {
            if (!start) start = timestamp;
            const time = timestamp - start;
            const percent = Math.min(time / duration, 1);
            const easing = percent * percent * (3 - 2 * percent);
            const newScroll = startScroll + (targetScroll - startScroll) * easing;

            categoriesContainer.scrollLeft = newScroll;

            if (time < duration) {
                window.centeringAnimationFrame = requestAnimationFrame(step);
            }
        }

        window.centeringAnimationFrame = requestAnimationFrame(step);
    }

    function setActiveCategory(element) {
        if (!element) return;
        const activeCategory = categoriesContainer.querySelector('.category.active');
        if (activeCategory) activeCategory.classList.remove('active');
        element.classList.add('active');
        scrollToCenter(element);
    }

    function smoothScrollTo(targetY, duration, categoryElement) {
        const startY = window.pageYOffset;
        const diff = targetY - startY;
        let start;

        isPageScrolling = true;

        if (observer) {
            document.querySelectorAll('.category-section').forEach(section => observer.unobserve(section));
        }

        if (window.innerWidth > 768) {
            header.classList.add('hidden');
            document.body.classList.add('header-hidden');
            categoriesContainerElement.classList.add('fixed');
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

                if (observer) {
                    document.querySelectorAll('.category-section').forEach(section => observer.observe(section));
                }
            }
        }

        if (categoryElement) {
            setActiveCategory(categoryElement);
        }
        requestAnimationFrame(step);
    }

    async function loadData() {
        try {
            const [categoriesResponse, productsResponse] = await Promise.all([
                fetch('http://localhost:3000/categories'),
                fetch('http://localhost:3000/products')
            ]);

            if (!categoriesResponse.ok || !productsResponse.ok) {
                throw new Error('Fetch error');
            }

            const categories = await categoriesResponse.json();
            const products = await productsResponse.json();

            if (!Array.isArray(categories) || !Array.isArray(products)) {
                throw new Error('Invalid data format');
            }

            renderCategories(categories);
            renderProducts(categories, products);
            setupIntersectionObserver(categories);
        } catch (error) {
            categoriesContainer.innerHTML = '<p>Ошибка загрузки категорий</p>';
            productsContainer.innerHTML = '<p>Ошибка загрузки товаров</p>';
        }
    }

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
                const sectionId = `category-${sanitizeClassName(category)}`;
                const section = document.getElementById(sectionId);
                if (section) {
                    const headerHeight = header.offsetHeight || 48;
                    const categoriesHeight = categoriesContainerElement.offsetHeight || 40;
                    let scrollPosition = section.offsetTop - (headerHeight + categoriesHeight);
                    const currentPosition = window.pageYOffset;

                    if (window.innerWidth > 768) {
                        if (currentPosition > scrollPosition) {
                            scrollPosition -= 10; // Offset for scrolling up
                        } else {
                            scrollPosition += 60; // Offset for scrolling down
                        }
                    }

                    smoothScrollTo(scrollPosition, 800, categoryElement);
                }
            });

            categoriesContainer.appendChild(categoryElement);
        });

        if (categories.length > 0) {
            const firstCategory = categoriesContainer.querySelector('.category');
            if (firstCategory) {
                setActiveCategory(firstCategory);
            }
        }
    }

    function renderProducts(categories, products) {
        productsContainer.innerHTML = '';

        categories.forEach(category => {
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
        const rootMarginTop = isMobile ? `-${headerHeight + categoriesHeight + 20}px` : '-100px';

        observer = new IntersectionObserver(
            (entries) => {
                if (isPageScrolling) return;
                const now = performance.now();
                if (now - lastObserverTrigger < 50) return;
                lastObserverTrigger = now;

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
                    }
                } else if (!isMobile && window.pageYOffset < categoriesContainerElement.offsetTop) {
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
        sections.forEach(section => observer.observe(section));

        window.addEventListener('resize', () => {
            const newIsMobile = window.innerWidth <= 768;
            const newHeaderHeight = header.offsetHeight || 48;
            const newCategoriesHeight = categoriesContainerElement.offsetHeight || 40;
            const newRootMarginTop = newIsMobile ? `-${newHeaderHeight + newCategoriesHeight + 20}px` : '-100px';

            observer.disconnect();
            observer = new IntersectionObserver(
                (entries) => {
                    if (isPageScrolling) return;
                    const now = performance.now();
                    if (now - lastObserverTrigger < 50) returnA
                    if (now - lastObserverTrigger < 50) return;
                    lastObserverTrigger = now;

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
                        }
                    } else if (!newIsMobile && window.pageYOffset < categoriesContainerElement.offsetTop) {
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

    window.addEventListener('scroll', () => {
        if (categoriesContainerElement.offsetTop <= window.pageYOffset) {
            categoriesContainerElement.classList.add('fixed');
        } else {
            categoriesContainerElement.classList.remove('fixed');
        }
    });

    window.addEventListener('resize', () => {
        const activeCategory = document.querySelector('.category.active');
        if (activeCategory) scrollToCenter(activeCategory);
    });

    document.addEventListener('wheel', (e) => {
        if (e.deltaX !== 0 && !e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    loadData();
});