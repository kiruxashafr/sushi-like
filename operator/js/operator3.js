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
    const allTimeReportButton = document.getElementById('allTimeReportButton');
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
        defaultDate: [getTodayDate(), getTodayDate()], // Default to today
        onClose: (selectedDates) => {
            // Do not fetch report on date selection
        }
    });

    // Function to get today's date in 'YYYY-MM-DD' format
    function getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

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
            const imageSrc = `/${currentCity}/${promo.photo}`;
            promoItem.innerHTML = `
                <img src="${imageSrc}" alt="Акция" style="max-width: 100px;" onerror="this.src='/${currentCity}/photo/placeholder.jpg'; this.alt='Изображение не загрузилось';">
                <p>${promo.conditions}</p>
                <button class="delete-promotion-button" data-id="${promo.id}">Удалить</button>
            `;
            promotionsList.appendChild(promoItem);
        });

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
        reportResults.innerHTML = '';
        const today = getTodayDate();
        statsDateRangePicker.setDate([today, today]);
        fetchReport(today, today); // Fetch today's report on open
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
            const [fromDate, toDate] = statsDateRangePicker.selectedDates.map(date => date.toISOString().split('T')[0]);
            if (fromDate) {
                fetchReport(fromDate, toDate || fromDate);
            }
        });
    });

    async function fetchReport(startDate, endDate) {
        try {
            endDate = endDate || startDate; // Use startDate if endDate is not provided
            let url = `/api/${currentCity}/orders/history?start_date=${startDate}&end_date=${endDate}`;
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const orders = await response.json();

            if (currentSubcategory === 'finances') {
                const totalOrders = orders.length;
                const totalValue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);

                let days = 1;
                if (startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // Include end date
                }

                const avgOrdersPerDay = totalOrders / days;
                const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;

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
                    const products = order.product_names || [];
                    products.forEach(product => {
                        const name = product.name;
                        const quantity = product.quantity;
                        productQuantities[name] = (productQuantities[name] || 0) + quantity;
                    });
                });
                const sortedProducts = Object.entries(productQuantities).sort((a, b) => b[1] - a[1]);
                const html = sortedProducts.map(([name, quantity]) => `<p>${name}: ${quantity} шт.</p>`).join('');
                reportResults.innerHTML = html || '<p>Нет данных о продажах за этот период.</p>';
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            reportResults.innerHTML = `<p>Ошибка загрузки отчета: ${error.message}</p>`;
        }
    }

    showReportButton.addEventListener('click', async () => {
        const [fromDate, toDate] = statsDateRangePicker.selectedDates.map(date => date.toISOString().split('T')[0]);
        if (!fromDate) {
            alert('Пожалуйста, выберите период или дату.');
            return;
        }
        await fetchReport(fromDate, toDate || fromDate);
    });

    allTimeReportButton.addEventListener('click', async () => {
        const startDate = '2025-01-01';
        const endDate = getTodayDate();
        statsDateRangePicker.setDate([startDate, endDate]);
        statsDateRangeInput.value = `${startDate} до ${endDate}`;
        await fetchReport(startDate, endDate);
    });

    // Update currentCity when city selection changes
    document.getElementById('citySelect').addEventListener('change', (e) => {
        currentCity = e.target.value;
    });
});