document.addEventListener('DOMContentLoaded', () => {
    const categoriesContainer = document.querySelector('.categories');
    const productsContainer = document.querySelector('.products-container');
    const header = document.querySelector('.header');
    const categoriesContainerElement = document.querySelector('.categories-container');
    let isScrolling = false;
    let isPageScrolling = false;
    let isProgrammaticScrollUp = false;
    let scrollTimeout = null;
    let observer = null; // Для управления IntersectionObserver

    // Проверка DOM-элементов
    if (!categoriesContainer || !productsContainer || !header || !categoriesContainerElement) {
        console.error('Error: Missing required DOM elements', {
            categoriesContainer,
            productsContainer,
            header,
            categoriesContainerElement
        });
        return;
    }

    function sanitizeClassName(name) {
        if (typeof name !== 'string') {
            console.warn(`sanitizeClassName: Invalid category name: ${name}`);
            return '';
        }
        return name.toLowerCase().replace(/[\s+&/\\#,+()$~%.'":*?<>{}]/g, '-').replace(/-+/g, '-');
    }

    function debounceScrollToCenter(element) {
        if (!element) {
            console.warn('debounceScrollToCenter: Invalid element');
            return;
        }
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(() => {
            scrollToCenter(element);
        }, 500); // Увеличен дебаунсинг до 500 мс
    }

    function scrollToCenter(element) {
        if (isScrolling || !element) {
            console.log('scrollToCenter: Skipped', { isScrolling, element });
            return;
        }
        isScrolling = true;
        
        const container = categoriesContainer;
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        const scrollLeft = elementRect.left - containerRect.left + container.scrollLeft - (containerRect.width / 2) + (elementRect.width / 2);
        
        console.log(`Centering category: ${element.textContent}, ScrollLeft: ${scrollLeft}`);
        
        container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });
        
        setTimeout(() => {
            isScrolling = false;
        }, 2000); // Увеличен таймаут до 2000 мс
    }

    function setActiveCategory(element) {
        if (!element) {
            console.warn('setActiveCategory: Invalid element');
            return;
        }
        const activeCategory = categoriesContainer.querySelector('.category.active');
        if (activeCategory) activeCategory.classList.remove('active');
        element.classList.add('active');
        console.log(`Activated category: ${element.textContent}`);
    }

    function smoothScrollTo(targetY, duration) {
        const startY = window.pageYOffset;
        const diff = targetY - startY;
        let start;

        isProgrammaticScrollUp = diff < 0;
        isPageScrolling = true;
        console.log(`Starting smooth scroll to: ${targetY}, Duration: ${duration}, ScrollUp: ${isProgrammaticScrollUp}`);

        // Отключить IntersectionObserver во время прокрутки
        if (observer) {
            document.querySelectorAll('.category-section').forEach(section => {
                observer.unobserve(section);
            });
            console.log('IntersectionObserver disabled during smooth scroll');
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
                console.log(`Smooth scroll completed to: ${targetY}`);
                isPageScrolling = false;
                isProgrammaticScrollUp = false;

                // Восстановить IntersectionObserver
                if (observer) {
                    const sections = document.querySelectorAll('.category-section');
                    sections.forEach(section => {
                        observer.observe(section);
                    });
                    console.log('IntersectionObserver re-enabled');
                }
            }
        }

        requestAnimationFrame(step);
    }

    async function loadData() {
        try {
            console.log('Fetching categories and products...');
            const [categoriesResponse, productsResponse] = await Promise.all([
                fetch('http://localhost:3000/categories'),
                fetch('http://localhost:3000/products')
            ]);

            if (!categoriesResponse.ok || !productsResponse.ok) {
                throw new Error(`Fetch error: Categories status ${categoriesResponse.status}, Products status ${productsResponse.status}`);
            }

            const categories = await categoriesResponse.json();
            const products = await productsResponse.json();

            console.log('Raw server response:', { categories, products });

            if (!Array.isArray(categories) || !Array.isArray(products)) {
                throw new Error('Invalid data format: Categories or products not an array');
            }

            console.log('Loaded data:', { categories, products });
            renderCategories(categories);
            renderProducts(categories, products);
            setupIntersectionObserver(categories);
        } catch (error) {
            console.error('loadData Error:', error);
            categoriesContainer.innerHTML = '<p>Ошибка загрузки категорий</p>';
            productsContainer.innerHTML = '<p>Ошибка загрузки товаров</p>';
        }
    }

    function renderCategories(categories) {
        if (!categoriesContainer) {
            console.error('renderCategories: categoriesContainer is null');
            return;
        }
        if (!Array.isArray(categories)) {
            console.error('renderCategories: Categories is not an array', categories);
            categoriesContainer.innerHTML = '<p>Ошибка: категории не загружены</p>';
            return;
        }

        console.log('Rendering categories:', categories);
        categoriesContainer.innerHTML = '';

        categories.forEach(category => {
            if (!category || typeof category !== 'string') {
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
                    const headerHeight = header.offsetHeight || 60;
                    const categoriesHeight = categoriesContainerElement.offsetHeight || 50;
                    const scrollPosition = section.offsetTop - (headerHeight + categoriesHeight);
                    
                    console.log(`Scrolling to section: ${sectionId}, Position: ${scrollPosition}, Header: ${headerHeight}, Categories: ${categoriesHeight}`);
                    
                    smoothScrollTo(scrollPosition, 800);
                    
                    setActiveCategory(categoryElement);
                    setTimeout(() => {
                        debounceScrollToCenter(categoryElement);
                    }, 850);
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
                debounceScrollToCenter(firstCategory);
            } else {
                console.warn('No categories rendered');
            }
        } else {
            console.warn('Categories array is empty');
        }
    }

    function renderProducts(categories, products) {
        if (!productsContainer) {
            console.error('renderProducts: productsContainer is null');
            return;
        }
        productsContainer.innerHTML = '';
        console.log('Rendering products for categories:', categories);
        categories.forEach(category => {
            if (!category || typeof category !== 'string') {
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
            console.log(`Products for category ${category}:`, categoryProducts.length);
            categoryProducts.forEach(product => {
                if (!product || !product.name) {
                    console.warn('Skipping invalid product:', product);
                    return;
                }
                const productElement = document.createElement('div');
                productElement.className = 'product';
                productElement.innerHTML = `
                    <img src="${product.photo || 'photo/placeholder.jpg'}" alt="${product.name}">
                    <div class="product-info">
                        <div class="product-weight-quantity">
                            ${product.weight ? `<span>${product.weight} г</span>` : ''}
                            ${product.quantity ? `<span>${product.quantity} шт.</span>` : ''}
                        </div>
                        <h3>${product.name}</h3>
                        <p class="product-composition">${product.composition || ''}</p>
                        <div class="product-price-cart">
                            <span class="product-price">${product.price} ₽</span>
                            <button class="add-to-cart">В корзину</button>
                        </div>
                    </div>
                `;
                grid.appendChild(productElement);
            });
            
            section.appendChild(grid);
            productsContainer.appendChild(section);
        });
        console.log('Products rendered, sections created:', document.querySelectorAll('.category-section').length);
    }

    function setupIntersectionObserver(categories) {
        observer = new IntersectionObserver((entries) => {
            if (isPageScrolling) {
                console.log('IntersectionObserver: Skipped due to programmatic scroll');
                return;
            }
            entries.forEach(entry => {
                console.log(`Intersection: Section ${entry.target.id}, Ratio: ${entry.intersectionRatio}, IsIntersecting: ${entry.isIntersecting}`);
                if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                    const categoryId = entry.target.id.replace('category-', '');
                    const category = categories.find(c => sanitizeClassName(c) === categoryId);
                    const categoryElement = document.querySelector(`.category[data-category="${category}"]`);
                    if (categoryElement) {
                        console.log(`Intersection: Activating category ${category}, ID: ${categoryId}, Ratio: ${entry.intersectionRatio}`);
                        setActiveCategory(categoryElement);
                        debounceScrollToCenter(categoryElement);
                    } else {
                        console.warn(`Category element not found for ${category}, ID: ${categoryId}`);
                    }
                }
            });
        }, {
            threshold: [0.5], // Точный триггер на 50%
            rootMargin: '-80px 0px -80px 0px' // Учтена высота хедера (~60px) и категорий (~50px)
        });

        const sections = document.querySelectorAll('.category-section');
        if (sections.length === 0) {
            console.warn('No category sections found for IntersectionObserver');
        } else {
            console.log(`Observing ${sections.length} category sections`);
        }
        sections.forEach(section => {
            observer.observe(section);
        });
    }

    window.addEventListener('resize', () => {
        const activeCategory = document.querySelector('.category.active');
        if (activeCategory) debounceScrollToCenter(activeCategory);
    });

    document.addEventListener('wheel', (e) => {
        if (e.deltaX !== 0 && !e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    window.isProgrammaticScrollUp = () => isProgrammaticScrollUp;

    loadData();
});