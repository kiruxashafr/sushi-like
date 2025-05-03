const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'http://89.111.153.140',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'), (err) => {
        if (err) {
            console.warn('Favicon not found, sending 204');
            res.status(204).end();
        }
    });
});

// Подключение к базе данных
const db = new sqlite3.Database(path.join(__dirname, 'shop.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
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
    available BOOLEAN NOT NULL,
    order_priority INTEGER DEFAULT 999
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
    utensils_count INTEGER,
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
    db.all('SELECT DISTINCT category, MIN(order_priority) as order_priority FROM products GROUP BY category ORDER BY order_priority ASC, category ASC', [], (err, rows) => {
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
    db.all('SELECT * FROM products ORDER BY category, order_priority, id', [], (err, rows) => {
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
    if (!orderData.customer_name || !orderData.phone_number || !orderData.delivery_type || !orderData.payment_method || !orderData.delivery_time || !orderData.products) {
        console.error('Invalid order data:', orderData);
        res.status(400).json({ result: 'error', error: 'Missing required fields' });
        return;
    }

    let products;
    try {
        products = Array.isArray(orderData.products) ? orderData.products : JSON.parse(orderData.products);
        if (!Array.isArray(products)) throw new Error('Products is not an array');
        if (products.length === 0 || !products.every(p => p.article && typeof p.quantity === 'number')) {
            throw new Error('Invalid products: each product must have an article and quantity');
        }
    } catch (e) {
        console.error('Invalid products data:', orderData.products, e);
        res.status(400).json({ result: 'error', error: 'Invalid products data' });
        return;
    }
    const productsJson = JSON.stringify(products);

    const sql = `INSERT INTO orders (
        customer_name, phone_number, delivery_type, address, payment_method, delivery_time, comments, utensils_count, products, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        orderData.customer_name,
        orderData.phone_number,
        orderData.delivery_type,
        orderData.address || null,
        orderData.payment_method,
        orderData.delivery_time,
        orderData.comments || null,
        orderData.utensils_count || 0,
        productsJson,
        orderData.status || 'pending'
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

// Получение категорий с приоритетами
app.get('/categories/priorities', (req, res) => {
    db.all('SELECT DISTINCT category, MIN(order_priority) as order_priority FROM products GROUP BY category ORDER BY order_priority ASC, category ASC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching category priorities:', err.message);
            res.status(500).json({ error: 'Database error fetching category priorities' });
            return;
        }
        console.log(`Category priorities sent: ${rows.length} items`, rows);
        res.json(rows);
    });
});

// Обновление приоритетов категорий
app.post('/categories/priorities', (req, res) => {
    const priorities = req.body;
    if (!Array.isArray(priorities) || priorities.length === 0) {
        console.error('Invalid priorities data:', priorities);
        res.status(400).json({ error: 'Invalid priorities data' });
        return;
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('UPDATE products SET order_priority = ? WHERE category = ?');
        let errorOccurred = false;

        priorities.forEach(({ category, order_priority }) => {
            stmt.run(order_priority, category, (err) => {
                if (err) {
                    console.error(`Error updating priority for category ${category}:`, err.message);
                    errorOccurred = true;
                }
            });
        });

        stmt.finalize((err) => {
            if (err || errorOccurred) {
                console.error('Error during priority update:', err ? err.message : 'Update errors');
                db.run('ROLLBACK');
                res.status(500).json({ error: 'Database error updating priorities' });
                return;
            }
            db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                    console.error('Error committing transaction:', commitErr.message);
                    res.status(500).json({ error: 'Database error committing priorities' });
                    return;
                }
                console.log('Category priorities updated:', priorities);
                res.json({ result: 'success' });
            });
        });
    });
});

// Обработка 404
app.use((req, res) => {
    console.error(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Not Found' });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Завершение работы
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server and database...');
    db.close((err) => {
        if (err) console.error('Error closing database:', err.message);
        else console.log('Database closed.');
        process.exit(0);
    });
});