const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Log all incoming requests for debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Подключение к базе данных
const db = new sqlite3.Database('./shop.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        return;
    }
    console.log('Connected to the shop database.');
});

// Создание таблиц
db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article TEXT UNIQUE,
    name TEXT NOT NULL,
    photo TEXT,
    photo_fallback TEXT,
    price REAL NOT NULL,
    weight INTEGER,
    quantity INTEGER,
    composition TEXT,
    category TEXT NOT NULL,
    available BOOLEAN NOT NULL
)`, (err) => {
    if (err) console.error('Error creating products table:', err.message);
    else console.log('Products table ready.');
});

db.run(`CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo TEXT NOT NULL,
    conditions TEXT
)`, (err) => {
    if (err) console.error('Error creating promotions table:', err.message);
    else console.log('Promotions table ready.');
});

db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    delivery_type TEXT NOT NULL,
    address TEXT,
    payment_method TEXT NOT NULL,
    delivery_time TEXT NOT NULL,
    comments TEXT,
    products TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
    if (err) console.error('Error creating orders table:', err.message);
    else console.log('Orders table ready.');
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'главная.html'));
});

// Получение категорий
app.get('/categories', (req, res) => {
    db.all('SELECT DISTINCT category FROM products ORDER BY category', [], (err, rows) => {
        if (err) {
            console.error('Error fetching categories:', err.message);
            res.status(500).json({ error: 'Database error fetching categories' });
            return;
        }
        const categories = rows.map(row => row.category);
        console.log(`Categories sent: ${categories.length} items`, categories);
        res.json(categories);
    });
});

// Получение всех товаров
app.get('/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY category, id', [], (err, rows) => {
        if (err) {
            console.error('Error fetching products:', err.message);
            res.status(500).json({ error: 'Database error fetching products' });
            return;
        }
        console.log(`Products sent: ${rows.length} items`);
        res.json(rows);
    });
});

// Получение всех акций
app.get('/promotions', (req, res) => {
    db.all('SELECT * FROM promotions ORDER BY id', [], (err, rows) => {
        if (err) {
            console.error('Error fetching promotions:', err.message);
            res.status(500).json({ error: 'Database error fetching promotions' });
            return;
        }
        console.log(`Promotions sent: ${rows.length} items`);
        res.json(rows);
    });
});

// Получение цен товаров по артикулам
app.post('/product-prices', (req, res) => {
    const articles = req.body.articles || [];
    if (!Array.isArray(articles) || articles.length === 0) {
        console.warn('Received empty or invalid articles array');
        res.json({});
        return;
    }
    const placeholders = articles.map(() => '?').join(',');
    db.all(`SELECT article, price FROM products WHERE article IN (${placeholders})`, articles, (err, rows) => {
        if (err) {
            console.error('Error fetching product prices:', err.message);
            res.status(500).json({ error: 'Database error fetching product prices' });
            return;
        }
        const priceMap = rows.reduce((map, row) => {
            map[row.article] = row.price;
            return map;
        }, {});
        console.log(`Product prices sent for ${articles.length} articles`);
        res.json(priceMap);
    });
});

// Эндпоинт для отправки заказа
app.post('/submit-order', (req, res) => {
    const orderData = req.body;
    if (!orderData.customer_name || !orderData.phone_number || !orderData.delivery_type || !orderData.payment_method || !orderData.delivery_time || !orderData.products || !Array.isArray(orderData.products)) {
        console.error('Invalid order data:', orderData);
        res.status(400).json({ result: 'error', error: 'Missing or invalid required fields' });
        return;
    }
    const productsJson = JSON.stringify(orderData.products);

    const sql = `INSERT INTO orders (
        customer_name, phone_number, delivery_type, address, payment_method, delivery_time, comments, products
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        orderData.customer_name,
        orderData.phone_number,
        orderData.delivery_type,
        orderData.address || null,
        orderData.payment_method,
        orderData.delivery_time,
        orderData.comments || null,
        productsJson
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error inserting order:', err.message);
            res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
            return;
        }
        console.log(`Order inserted with ID: ${this.lastID}`);
        res.json({ result: 'success', order_id: this.lastID });
    });
});

// Получение текущих заказов
app.get('/orders/current', (req, res) => {
    db.all('SELECT * FROM orders WHERE status = "pending" ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching current orders:', err.message);
            res.status(500).json({ error: 'Database error fetching current orders' });
            return;
        }
        console.log(`Current orders sent: ${rows.length} items`);
        res.json(rows);
    });
});

// Получение истории заказов
app.get('/orders/history', (req, res) => {
    db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching order history:', err.message);
            res.status(500).json({ error: 'Database error fetching order history' });
            return;
        }
        console.log(`Order history sent: ${rows.length} items`);
        res.json(rows);
    });
});

// Catch-all for 404 errors
app.use((req, res) => {
    console.error(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Not Found' });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server and database...');
    db.close((err) => {
        if (err) console.error('Error closing database:', err.message);
        else console.log('Database closed.');
        process.exit(0);
    });
});