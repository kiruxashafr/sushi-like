const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3000;

// Подключение к базе данных
const db = new sqlite3.Database('./shop.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        return;
    }
    console.log('Connected to the shop database.');
});

// Создание таблицы товаров
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
    if (err) {
        console.error('Error creating products table:', err.message);
    } else {
        console.log('Products table ready.');
    }
});

// Создание таблицы акций
db.run(`CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo TEXT NOT NULL,
    conditions TEXT
)`, (err) => {
    if (err) {
        console.error('Error creating promotions table:', err.message);
    } else {
        console.log('Promotions table ready.');
    }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'главная.html'));
});

// Получение категорий
app.get('/categories', (req, res) => {
    db.all('SELECT DISTINCT category FROM products ORDER BY category', [], (err, rows) => {
        if (err) {
            console.error('Error fetching categories:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        const categories = rows.map(row => row.category);
        console.log('Categories sent:', categories);
        res.json(categories);
    });
});

// Получение всех товаров
app.get('/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY category, id', [], (err, rows) => {
        if (err) {
            console.error('Error fetching products:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Products sent:', rows.length, 'items');
        res.json(rows);
    });
});

// Получение всех акций
app.get('/promotions', (req, res) => {
    db.all('SELECT * FROM promotions ORDER BY id', [], (err, rows) => {
        if (err) {
            console.error('Error fetching promotions:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Promotions sent:', rows.length, 'items');
        res.json(rows);
    });
});

// Debug эндпоинт для проверки базы данных
app.get('/debug/db', (err, res) => {
    db.all('SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY category', [], (err, rows) => {
        if (err) {
            console.error('Error debugging database:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Debug database content:', rows);
        res.json(rows);
    });
});

// Новый эндпоинт для проверки всех товаров
app.get('/debug/products', (req, res) => {
    db.all('SELECT id, article, name, category, price FROM products ORDER BY category, id', [], (err, rows) => {
        if (err) {
            console.error('Error fetching all products:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('All products:', rows);
        res.json(rows);
    });
});

// Новый эндпоинт для проверки всех акций
app.get('/debug/promotions', (req, res) => {
    db.all('SELECT id, photo, conditions FROM promotions ORDER BY id', [], (err, rows) => {
        if (err) {
            console.error('Error fetching all promotions:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('All promotions:', rows);
        res.json(rows);
    });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});