
document.addEventListener('DOMContentLoaded', () => {
    const managePricesButton = document.getElementById('managePricesButton');
    const pricesModal = document.getElementById('pricesModal');
    const closePricesModal = document.getElementById('closePricesModal');
    const pricesModalOverlay = document.getElementById('pricesModalOverlay');
    const pricesList = document.getElementById('pricesList');
    const manageProductsButton = document.getElementById('manageProductsButton');
    const productsModal = document.getElementById('productsModal');
    const closeProductsModal = document.getElementById('closeProductsModal');
    const productsModalOverlay = document.getElementById('productsModalOverlay');
    const productsList = document.getElementById('productsList');

    let currentCity = document.getElementById('citySelect').value;

    // Toggle modal visibility
    function toggleModal(modal, overlay, show) {
        modal.classList.toggle('active', show);
        overlay.classList.toggle('active', show);
    }

    // Event listeners for price management
    managePricesButton.addEventListener('click', () => {
        toggleModal(pricesModal, pricesModalOverlay, true);
        fetchProductsForPrices();
    });

    closePricesModal.addEventListener('click', () => {
        toggleModal(pricesModal, pricesModalOverlay, false);
    });

    pricesModalOverlay.addEventListener('click', () => {
        toggleModal(pricesModal, pricesModalOverlay, false);
    });

    // Event listeners for product management
    manageProductsButton.addEventListener('click', () => {
        toggleModal(productsModal, productsModalOverlay, true);
        fetchProductsForManagement();
    });

    closeProductsModal.addEventListener('click', () => {
        toggleModal(productsModal, productsModalOverlay, false);
    });

    productsModalOverlay.addEventListener('click', () => {
        toggleModal(productsModal, productsModalOverlay, false);
    });

    // Update city when selection changes
    document.getElementById('citySelect').addEventListener('change', (e) => {
        currentCity = e.target.value;
    });

    // Fetch products for price management
    async function fetchProductsForPrices() {
        try {
            const response = await fetch(`/api/${currentCity}/products/all`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const products = await response.json();
            renderPrices(products);
        } catch (error) {
            console.error('Error fetching products for prices:', error);
            pricesList.innerHTML = '<p>Ошибка загрузки товаров.</p>';
        }
    }

    // Render products for price management
    function renderPrices(products) {
        pricesList.innerHTML = '';
        const categories = [...new Set(products.map(p => p.category))].sort();
        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <div class="category-header">
                    <span>${category}</span>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="product-list" style="display: none;">
                    ${products
                        .filter(p => p.category === category)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(product => `
                            <div class="product-item">
                                <span class="product-name">${product.name}</span>
                                <div>
                                    <input type="number" step="0.01" class="new-price-input" data-id="${product.id}" value="${product.price.toFixed(2)}">
                                    <button class="update-price-button">Изменить</button>
                                </div>
                            </div>
                        `).join('')}
                </div>
            `;
            pricesList.appendChild(categoryItem);
        });

        // Add event listeners for category toggle
        pricesList.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const productList = header.nextElementSibling;
                const toggleIcon = header.querySelector('.toggle-icon');
                if (productList.style.display === 'none') {
                    productList.style.display = 'block';
                    toggleIcon.textContent = '▲';
                    productList.style.maxHeight = '0px';
                    productList.style.opacity = '0';
                    setTimeout(() => {
                        productList.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
                        productList.style.maxHeight = `${productList.scrollHeight}px`;
                        productList.style.opacity = '1';
                    }, 10);
                } else {
                    productList.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
                    productList.style.maxHeight = '0px';
                    productList.style.opacity = '0';
                    setTimeout(() => {
                        productList.style.display = 'none';
                        toggleIcon.textContent = '▼';
                    }, 300);
                }
            });
        });

        // Add event listeners for price updates
        pricesList.querySelectorAll('.update-price-button').forEach(button => {
            button.addEventListener('click', async () => {
                const input = button.previousElementSibling;
                const id = input.dataset.id;
                const newPrice = parseFloat(input.value);
                if (isNaN(newPrice) || newPrice <= 0) {
                    alert('Введите корректную цену.');
                    return;
                }
                try {
                    const response = await fetch(`/api/${currentCity}/products/update-price`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, price: newPrice })
                    });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    input.value = newPrice.toFixed(2);
                    alert('Цена успешно обновлена.');
                } catch (error) {
                    console.error('Error updating price:', error);
                    alert('Ошибка при обновлении цены.');
                }
            });
        });
    }

    // Fetch products for management
    async function fetchProductsForManagement() {
        try {
            const response = await fetch(`/api/${currentCity}/products/all`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const products = await response.json();
            renderProducts(products);
        } catch (error) {
            console.error('Error fetching products for management:', error);
            productsList.innerHTML = '<p>Ошибка загрузки товаров.</p>';
        }
    }

    // Render products for management
    function renderProducts(products) {
        productsList.innerHTML = '';
        const categories = [...new Set(products.map(p => p.category))].sort();
        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <div class="category-header">
                    <span>${category}</span>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="product-list" style="display: none;">
                    ${products
                        .filter(p => p.category === category)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(product => `
                            <div class="product-item">
                                <span class="product-name">${product.name}</span>
                                <button class="toggle-availability-button ${product.available ? 'available' : 'unavailable'}" data-id="${product.id}">
                                    ${product.available ? 'Доступен' : 'Недоступен'}
                                </button>
                            </div>
                        `).join('')}
                </div>
            `;
            productsList.appendChild(categoryItem);
        });

        // Add event listeners for category toggle
        productsList.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const productList = header.nextElementSibling;
                const toggleIcon = header.querySelector('.toggle-icon');
                if (productList.style.display === 'none') {
                    productList.style.display = 'block';
                    toggleIcon.textContent = '▲';
                    productList.style.maxHeight = '0px';
                    productList.style.opacity = '0';
                    setTimeout(() => {
                        productList.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
                        productList.style.maxHeight = `${productList.scrollHeight}px`;
                        productList.style.opacity = '1';
                    }, 10);
                } else {
                    productList.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
                    productList.style.maxHeight = '0px';
                    productList.style.opacity = '0';
                    setTimeout(() => {
                        productList.style.display = 'none';
                        toggleIcon.textContent = '▼';
                    }, 300);
                }
            });
        });

        // Add event listeners for availability toggling
        productsList.querySelectorAll('.toggle-availability-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                const isAvailable = button.classList.contains('available');
                try {
                    const response = await fetch(`/api/${currentCity}/products/toggle-availability`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, available: !isAvailable })
                    });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    button.classList.toggle('available');
                    button.classList.toggle('unavailable');
                    button.textContent = isAvailable ? 'Недоступен' : 'Доступен';
                    alert('Статус доступности обновлен.');
                } catch (error) {
                    console.error('Error toggling availability:', error);
                    alert('Ошибка при обновлении статуса доступности.');
                }
            });
        });
    }

    // Add/Remove Products Modal
    const manageAddRemoveProductsButton = document.getElementById('manageAddRemoveProductsButton');
    const addRemoveProductsModal = document.getElementById('addRemoveProductsModal');
    const closeAddRemoveProductsModal = document.getElementById('closeAddRemoveProductsModal');
    const addRemoveProductsModalOverlay = document.getElementById('addRemoveProductsModalOverlay');
    const addProductTab = document.getElementById('addProductTab');
    const removeProductTab = document.getElementById('removeProductTab');
    const addProductForm = document.getElementById('addProductForm');
    const productCategorySelect = document.getElementById('productCategory');
    const removeProductsList = document.getElementById('removeProductsList');
    const tabButtons = document.querySelectorAll('.tab-button');

    function switchTab(tab) {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelector(`.tab-button[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}ProductTab`).classList.add('active');
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            switchTab(tab);
            if (tab === 'remove') {
                fetchProductsForRemoval();
            }
        });
    });

    async function fetchCategoriesForAddProduct() {
        try {
            const response = await fetch(`/api/${currentCity}/categories/priorities`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const categories = await response.json();
            productCategorySelect.innerHTML = '';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.category;
                option.textContent = cat.category;
                productCategorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching categories for add product:', error);
            productCategorySelect.innerHTML = '<option>Ошибка загрузки категорий</option>';
        }
    }

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addProductForm);
        try {
            const response = await fetch(`/api/${currentCity}/products/add`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.result === 'success') {
                alert('Товар успешно добавлен.');
                addProductForm.reset();
            } else {
                alert('Ошибка при добавлении товара: ' + data.error);
            }
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Ошибка при добавлении товара.');
        }
    });

    async function fetchProductsForRemoval() {
        try {
            const response = await fetch(`/api/${currentCity}/products/all`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const products = await response.json();
            renderProductsForRemoval(products);
        } catch (error) {
            console.error('Error fetching products for removal:', error);
            removeProductsList.innerHTML = '<p>Ошибка загрузки товаров.</p>';
        }
    }

    function renderProductsForRemoval(products) {
        removeProductsList.innerHTML = '';
        const categories = [...new Set(products.map(p => p.category))].sort();
        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <div class="category-header">
                    <span>${category}</span>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="product-list" style="display: none;">
                    ${products
                        .filter(p => p.category === category)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(product => `
                            <div class="product-item">
                                <span class="product-name">${product.name}</span>
                                <button class="delete-product-button" data-id="${product.id}">Удалить</button>
                            </div>
                        `).join('')}
                </div>
            `;
            removeProductsList.appendChild(categoryItem);
        });

        // Add event listeners for category toggle
        removeProductsList.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const productList = header.nextElementSibling;
                const toggleIcon = header.querySelector('.toggle-icon');
                if (productList.style.display === 'none') {
                    productList.style.display = 'block';
                    toggleIcon.textContent = '▲';
                } else {
                    productList.style.display = 'none';
                    toggleIcon.textContent = '▼';
                }
            });
        });

        // Add event listeners for delete buttons
        removeProductsList.querySelectorAll('.delete-product-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                if (confirm('Вы уверены, что хотите удалить этот товар?')) {
                    try {
                        const response = await fetch(`/api/${currentCity}/products/delete`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id })
                        });
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        alert('Товар успешно удален.');
                        fetchProductsForRemoval();
                    } catch (error) {
                        console.error('Error deleting product:', error);
                        alert('Ошибка при удалении товара.');
                    }
                }
            });
        });
    }

    manageAddRemoveProductsButton.addEventListener('click', () => {
        toggleModal(addRemoveProductsModal, addRemoveProductsModalOverlay, true);
        fetchCategoriesForAddProduct();
        switchTab('add');
    });

    closeAddRemoveProductsModal.addEventListener('click', () => {
        toggleModal(addRemoveProductsModal, addRemoveProductsModalOverlay, false);
    });

    addRemoveProductsModalOverlay.addEventListener('click', () => {
        toggleModal(addRemoveProductsModal, addRemoveProductsModalOverlay, false);
    });
});
