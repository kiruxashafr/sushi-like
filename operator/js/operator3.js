document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements for Promotions
    const managePromotionsButton = document.getElementById('managePromotionsButton');
    const promotionsModal = document.getElementById('promotionsModal');
    const closePromotionsModal = document.getElementById('closePromotionsModal');
    const promotionsModalOverlay = document.getElementById('promotionsModalOverlay');
    const addPromotionForm = document.getElementById('addPromotionForm');
    const promotionsList = document.getElementById('promotionsList');

    // DOM Elements for Statistics
    const manageStatisticsButton = document.getElementById('manageStatisticsButton');
    const statisticsModal = document.getElementById('statisticsModal');
    const closeStatisticsModal = document.getElementById('closeStatisticsModal');
    const statisticsModalOverlay = document.getElementById('statisticsModalOverlay');
    const subcategoryButtons = document.querySelectorAll('.subcategory-button');
    const statsDateRangeInput = document.getElementById('statsDateRange');
    const showReportButton = document.getElementById('showReportButton');
    const reportResults = document.getElementById('reportResults');

    let currentSubcategory = 'finances'; // Default subcategory
    let currentCity = document.getElementById('citySelect').value;
    let statsDateRangePicker;

    // Initialize Flatpickr for statistics
    statsDateRangePicker = flatpickr(statsDateRangeInput, {
        mode: 'range',
        dateFormat: 'Y-m-d',
        locale: 'ru',
        allowInput: true,
        onClose: (selectedDates) => {
            // Do not fetch report on date selection
        }
    });

    // Function to toggle modal visibility
    function toggleModal(modal, overlay, show) {
        modal.classList.toggle('active', show);
        overlay.classList.toggle('active', show);
    }

    // Promotions Functionality
    managePromotionsButton.addEventListener('click', () => {
        toggleModal(promotionsModal, promotionsModalOverlay, true);
        fetchPromotions();
    });

    closePromotionsModal.addEventListener('click', () => {
        toggleModal(promotionsModal, promotionsModalOverlay, false);
    });

    promotionsModalOverlay.addEventListener('click', () => {
        toggleModal(promotionsModal, promotionsModalOverlay, false);
    });

    addPromotionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addPromotionForm);
        try {
            const response = await fetch(`/api/${currentCity}/promotions/add`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.result === 'success') {
                alert('Акция успешно добавлена.');
                addPromotionForm.reset();
                fetchPromotions();
            } else {
                alert('Ошибка при добавлении акции: ' + data.error);
            }
        } catch (error) {
            console.error('Error adding promotion:', error);
            alert('Ошибка при добавлении акции.');
        }
    });

    async function fetchPromotions() {
        try {
            const response = await fetch(`/api/${currentCity}/promotions`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const promotions = await response.json();
            renderPromotions(promotions);
        } catch (error) {
            console.error('Error fetching promotions:', error);
            promotionsList.innerHTML = '<p>Ошибка загрузки акций.</p>';
        }
    }

    function renderPromotions(promotions) {
        promotionsList.innerHTML = '';
        promotions.forEach(promo => {
            const promoItem = document.createElement('div');
            promoItem.className = 'promotion-item';
            promoItem.innerHTML = `
                <img src="${promo.photo}" alt="Акция" style="max-width: 100px;">
                <p>${promo.conditions}</p>
                <button class="delete-promotion-button" data-id="${promo.id}">Удалить</button>
            `;
            promotionsList.appendChild(promoItem);
        });

        // Add delete functionality
        promotionsList.querySelectorAll('.delete-promotion-button').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.dataset.id;
                if (confirm('Вы уверены, что хотите удалить эту акцию?')) {
                    try {
                        const response = await fetch(`/api/${currentCity}/promotions/delete`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id })
                        });
                        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                        fetchPromotions();
                    } catch (error) {
                        console.error('Error deleting promotion:', error);
                        alert('Ошибка при удалении акции.');
                    }
                }
            });
        });
    }

    // Statistics Functionality
    manageStatisticsButton.addEventListener('click', () => {
        toggleModal(statisticsModal, statisticsModalOverlay, true);
        // Clear report until "Показать" is clicked
        reportResults.innerHTML = '';
        // Set default date range (e.g., last 7 days)
        const today = new Date();
        const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        statsDateRangePicker.setDate([fromDate, today]);
    });

    closeStatisticsModal.addEventListener('click', () => {
        toggleModal(statisticsModal, statisticsModalOverlay, false);
    });

    statisticsModalOverlay.addEventListener('click', () => {
        toggleModal(statisticsModal, statisticsModalOverlay, false);
    });

    subcategoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            subcategoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentSubcategory = button.dataset.subcategory;
            reportResults.innerHTML = ''; // Clear previous results
        });
    });

    showReportButton.addEventListener('click', async () => {
        const [fromDate, toDate] = statsDateRangePicker.selectedDates.map(date => date.toISOString().split('T')[0]);
        if (!fromDate) {
            alert('Пожалуйста, выберите период или дату.');
            return;
        }
        const endDate = toDate || fromDate; // Use same date if only one is selected
        try {
            const response = await fetch(`/api/${currentCity}/orders/history?start_date=${fromDate}&end_date=${endDate}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const orders = await response.json();

            if (currentSubcategory === 'finances') {
                // Calculate financial metrics
                const totalOrders = orders.length;
                const totalValue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);

                // Calculate number of unique days in the date range
                const start = new Date(fromDate);
                const end = new Date(endDate);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // Include end date

                // Calculate averages
                const avgOrdersPerDay = totalOrders / days;
                const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

                // Render financial report
                reportResults.innerHTML = `
                    <h3>Общие показатели</h3>
                    <p>Суммарная стоимость заказов: ${totalValue.toFixed(2)} ₽</p>
                    <p>Общее количество заказов: ${totalOrders}</p>
                    <h3>Средние показатели</h3>
                    <p>Среднее количество заказов в день: ${avgOrdersPerDay.toFixed(2)}</p>
                    <p>Средняя стоимость заказа: ${avgOrderValue.toFixed(2)} ₽</p>
                `;
            } else if (currentSubcategory === 'products') {
                const productQuantities = {};
                orders.forEach(order => {
                    const products = order.product_names; // Enriched with product names
                    products.forEach(product => {
                        const name = product.name;
                        const quantity = product.quantity;
                        productQuantities[name] = (productQuantities[name] || 0) + quantity;
                    });
                });
                // Sort by quantity descending
                const sortedProducts = Object.entries(productQuantities).sort((a, b) => b[1] - a[1]);
                const html = sortedProducts.map(([name, quantity]) => `<p>${name}: ${quantity} шт.</p>`).join('');
                reportResults.innerHTML = html || '<p>Нет данных о продажах за этот период.</p>';
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            reportResults.innerHTML = '<p>Ошибка загрузки отчета.</p>';
        }
    });

    // Update currentCity when city selection changes
    document.getElementById('citySelect').addEventListener('change', (e) => {
        currentCity = e.target.value;
    });
});