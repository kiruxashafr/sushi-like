document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const searchInput = document.querySelector('.search-input');
    const mobileSearchInput = document.querySelector('.mobile-search-input');
    const searchIcon = document.querySelector('.search-icon');
    const mobileSearchIcon = document.querySelector('.mobile-search-icon .mobile-search-img');
    const mobileSearchBar = document.getElementById('mobileSearchBar');
    const mobileSearchClose = document.querySelector('.mobile-search-close');
    const overlay = document.getElementById('overlay');
    let searchResultsContainer = null;

    // Create search results container
    function createSearchResultsContainer(inputElement) {
        if (searchResultsContainer) return;

        searchResultsContainer = document.createElement('div');
        searchResultsContainer.className = 'search-results';
        const inputRect = inputElement.getBoundingClientRect();
        const isMobile = inputElement.classList.contains('mobile-search-input');

        searchResultsContainer.style.cssText = `
            position: absolute;
            top: ${isMobile ? 48 + inputRect.height + window.scrollY : inputRect.bottom + window.scrollY}px;
            left: ${isMobile ? 15 : inputRect.left}px;
            width: ${isMobile ? window.innerWidth - 30 : inputRect.width}px;
            background: #FFFFFF;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 10px;
            z-index: 1201;
            display: none;
            max-height: 300px;
            overflow-y: auto;
            font-family: 'Benzin-Regular', Arial, sans-serif;
        `;
        document.body.appendChild(searchResultsContainer);
    }

    // Remove search results container
    function removeSearchResultsContainer() {
        if (searchResultsContainer) {
            searchResultsContainer.remove();
            searchResultsContainer = null;
        }
    }

    // Show suggestions without scrolling
    function showSuggestions(query, inputElement) {
        removeSearchResultsContainer();
        if (!query.trim() || !window.products) return;

        const sanitizedQuery = query.toLowerCase().trim();
        const matchingProducts = window.products.filter(product =>
            product?.name?.toLowerCase().includes(sanitizedQuery) ||
            product?.composition?.toLowerCase().includes(sanitizedQuery)
        );

        createSearchResultsContainer(inputElement);
        if (matchingProducts.length === 0) {
            searchResultsContainer.innerHTML = `
                <p style="font-size: 14px; color部分

            color: #777;
            text-align: center;
            margin: 10px 0;">
                Товары не найдены.
            </p>
            `;
            searchResultsContainer.style.display = 'block';
            return;
        }

        searchResultsContainer.innerHTML = matchingProducts.map(product => `
            <div class="search-result-item" data-product-id="${product.id}" style="
                padding: 8px;
                border-bottom: 1px solid rgba(0,0,0,0.1);
                cursor: pointer;
                font-size: 14px;
                color: #000000;
            ">
                ${product.name}
            </div>
        `).join('');
        searchResultsContainer.style.display = 'block';

        // Add click handlers for suggestion items
        searchResultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const productId = item.dataset.productId;
                executeSearch(productId);
                removeSearchResultsContainer();
                if (mobileSearchInput && mobileSearchBar?.classList.contains('active')) {
                    closeMobileSearch();
                }
            });
        });
    }

    // Execute search and scroll to product
    function executeSearch(productId) {
        const productElement = document.querySelector(`.product[data-product-id="${productId}"]`);
        if (!productElement) return;

        const section = productElement.closest('.category-section');
        if (section) {
            const productRect = productElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const targetY = window.scrollY + productRect.top - (windowHeight / 2) + (productRect.height / 2);

            window.scrollTo({ top: targetY, behavior: 'smooth' });

            // Highlight product
            productElement.style.transition = 'background-color 0.3s ease';
            productElement.style.backgroundColor = '#E8E8E8';
            setTimeout(() => {
                productElement.style.backgroundColor = '#F0F0F0';
            }, 1000);
        }
    }

    // Handle input and suggestions
    function handleInput(inputElement) {
        inputElement.addEventListener('input', () => {
            const query = inputElement.value;
            if (query.trim()) {
                showSuggestions(query, inputElement);
            } else {
                removeSearchResultsContainer();
            }
        });

        inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && inputElement.value.trim()) {
                const matchingProducts = window.products?.filter(product =>
                    product?.name?.toLowerCase().includes(inputElement.value.toLowerCase().trim()) ||
                    product?.composition?.toLowerCase().includes(inputElement.value.toLowerCase().trim())
                ) || [];
                if (matchingProducts.length > 0) {
                    executeSearch(matchingProducts[0].id);
                    removeSearchResultsContainer();
                    if (inputElement === mobileSearchInput && mobileSearchBar?.classList.contains('active')) {
                        closeMobileSearch();
                    }
                }
            }
        });
    }

    // Desktop search
    if (searchInput) {
        handleInput(searchInput);
        if (searchIcon) {
            searchIcon.addEventListener('click', () => {
                const query = searchInput.value;
                if (query.trim()) {
                    const matchingProducts = window.products?.filter(product =>
                        product?.name?.toLowerCase().includes(query.toLowerCase().trim()) ||
                        product?.composition?.toLowerCase().includes(query.toLowerCase().trim())
                    ) || [];
                    if (matchingProducts.length > 0) {
                        executeSearch(matchingProducts[0].id);
                        removeSearchResultsContainer();
                    }
                }
            });
        }
    }

    // Mobile search
    if (mobileSearchInput) {
        handleInput(mobileSearchInput);
        if (mobileSearchIcon) {
            mobileSearchIcon.addEventListener('click', () => {
                if (mobileSearchBar?.classList.contains('active')) {
                    const query = mobileSearchInput.value;
                    if (query.trim()) {
                        const matchingProducts = window.products?.filter(product =>
                            product?.name?.toLowerCase().includes(query.toLowerCase().trim()) ||
                            product?.composition?.toLowerCase().includes(query.toLowerCase().trim())
                        ) || [];
                        if (matchingProducts.length > 0) {
                            executeSearch(matchingProducts[0].id);
                            removeSearchResultsContainer();
                            closeMobileSearch();
                        }
                    }
                }
            });
        }
    }

    // Mobile search close
    if (mobileSearchClose) {
        mobileSearchClose.addEventListener('click', () => {
            removeSearchResultsContainer();
            if (mobileSearchInput) mobileSearchInput.value = '';
            closeMobileSearch();
        });
    }

    // Close suggestions on outside click (desktop only)
    document.addEventListener('click', (e) => {
        if (!searchResultsContainer || searchResultsContainer.style.display !== 'block') return;
        if (!searchResultsContainer.contains(e.target) &&
            e.target !== searchInput &&
            e.target !== searchIcon &&
            !mobileSearchBar?.contains(e.target)) {
            removeSearchResultsContainer();
            if (searchInput) searchInput.value = '';
        }
    });

    // Adjust position on resize
    window.addEventListener('resize', () => {
        if (searchResultsContainer && searchResultsContainer.style.display === 'block') {
            removeSearchResultsContainer();
            const activeInput = document.activeElement === searchInput ? searchInput : mobileSearchInput;
            if (activeInput?.value.trim()) {
                showSuggestions(activeInput.value, activeInput);
            }
        }
    });

    // Expose closeMobileSearch for header.js
    window.closeMobileSearch = function() {
        if (mobileSearchBar && mobileSearchBar.classList.contains('active')) {
            mobileSearchBar.classList.remove('active');
            if (document.querySelector('.mobile-menu-icon')) {
                document.querySelector('.mobile-menu-icon').classList.remove('hidden');
            }
            if (mobileSearchInput) mobileSearchInput.value = '';
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    };
});