require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { submitOrderToFrontpad } = require('./frontpad');
const winston = require('winston');
const axios = require('axios');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console()
    ]
});

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://89.111.153.140',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

app.use('/kovrov', express.static(path.join(__dirname, 'kovrov')));
app.use('/nnovgorod', express.static(path.join(__dirname, 'nnovgorod')));
app.use('/operator', express.static(path.join(__dirname, 'operator')));
app.use('/city', express.static(path.join(__dirname, 'city')));

app.get('/favicon.ico', (req, res) => {
    logger.info('Favicon requested, sending 204');
    res.status(204).end();
});

app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, { timestamp: new Date().toISOString() });
    next();
});

function getMoscowTime() {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const moscowTime = new Date(utcTime + (3 * 3600000));
    const year = moscowTime.getFullYear();
    const month = String(moscowTime.getMonth() + 1).padStart(2, '0');
    const day = String(moscowTime.getDate()).padStart(2, '0');
    const hours = String(moscowTime.getHours()).padStart(2, '0');
    const minutes = String(moscowTime.getMinutes()).padStart(2, '0');
    const seconds = String(moscowTime.getSeconds()).padStart(2, '0');
    const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    logger.info('getMoscowTime called', { formattedTime });
    return formattedTime;
}

const dbKovrov = new sqlite3.Database(path.join(__dirname, 'shop_kovrov.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        logger.error('Database connection error for Kovrov', { error: err.message });
        return;
    }
    logger.info('Connected to the Kovrov database');
});

const dbNnovgorod = new sqlite3.Database(path.join(__dirname, 'shop_nnovgorod.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        logger.error('Database connection error for Nnovgorod', { error: err.message });
        return;
    }
    logger.info('Connected to the Nnovgorod database');
});

function getDb(city) {
    logger.info('Accessing database for city', { city });
    if (city === 'kovrov') return dbKovrov;
    if (city === 'nnovgorod') return dbNnovgorod;
    logger.error('Invalid city for database', { city });
    throw new Error('Invalid city');
}

function getFrontpadSecret(city) {
    if (city === 'nnovgorod') {
        if (!process.env.FRONTPAD_SECRET_NNOVGOROD) {
            logger.error('FRONTPAD_SECRET_NNOVGOROD not set in environment');
            return null;
        }
        return process.env.FRONTPAD_SECRET_NNOVGOROD;
    } else if (city === 'kovrov') {
        if (!process.env.FRONTPAD_SECRET_KOVROV) {
            logger.error('FRONTPAD_SECRET_KOVROV not set in environment');
            return null;
        }
        return process.env.FRONTPAD_SECRET_KOVROV;
    }
    logger.error('Invalid city for Frontpad secret', { city });
    return null;
}

[dbKovrov, dbNnovgorod].forEach(db => {
    db.serialize(() => {
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
            if (err) logger.error('Error creating products table', { error: err.message });
            else logger.info('Products table ready');
        });

        db.run(`CREATE TABLE IF NOT EXISTS promotions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo TEXT NOT NULL,
            conditions TEXT
        )`, (err) => {
            if (err) logger.error('Error creating promotions table', { error: err.message });
            else logger.info('Promotions table ready');
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
            promo_code TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            frontpad_order_id TEXT
        )`, (err) => {
            if (err) logger.error('Error creating orders table', { error: err.message });
            else logger.info('Orders table ready');
        });

 db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT,
    discount_percentage INTEGER,
    product_article TEXT,
    product_name TEXT,
    min_order_amount REAL,
    active INTEGER NOT NULL DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0
)`, (err) => {
    if (err) logger.error('Error creating promo_codes table', { error: err.message });
    else logger.info('Promo_codes table ready');
});
    });
});

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const city = req.params.city;
        let uploadPath;
        if (req.path.includes('/products/add')) {
            uploadPath = path.join(__dirname, city, 'photo', 'товары');
        } else if (req.path.includes('/promotions/add')) {
            uploadPath = path.join(__dirname, city, 'photo', 'promotions');
        } else {
            uploadPath = path.join(__dirname, 'uploads');
        }
        require('fs').mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = uuidv4() + ext;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image file'), false);
        }
    }
});

app.get('/', (req, res) => {
    logger.info('Serving city selection page');
    res.sendFile(path.join(__dirname, 'city', 'город.html'), (err) => {
        if (err) {
            logger.error('Error serving город.html', { error: err.message });
            res.status(404).json({ error: 'City selection page not found' });
        }
    });
});

app.get('/kovrov', (req, res) => {
    logger.info('Serving Kovrov page');
    res.sendFile(path.join(__dirname, 'kovrov', 'Ковров.html'), (err) => {
        if (err) {
            logger.error('Error serving Ковров.html', { error: err.message });
            res.status(404).json({ error: 'Kovrov page not found' });
        }
    });
});

app.get('/nnovgorod', (req, res) => {
    logger.info('Serving Nizhniy Novgorod page');
    res.sendFile(path.join(__dirname, 'nnovgorod', 'НижнийНовгород.html'), (err) => {
        if (err) {
            logger.error('Error serving НижнийНовгород.html', { error: err.message });
            res.status(404).json({ error: 'Nizhniy Novgorod page not found' });
        }
    });
});

app.get('/operator', (req, res) => {
    logger.info('Serving Operator page');
    res.sendFile(path.join(__dirname, 'operator', 'operator.html'), (err) => {
        if (err) {
            logger.error('Error serving operator.html', { error: err.message });
            res.status(404).json({ error: 'Operator page not found' });
        }
    });
});

app.get('/api/:city/categories', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT DISTINCT category, MIN(order_priority) as order_priority FROM products WHERE available = 1 GROUP BY category ORDER BY order_priority ASC, category ASC', [], (err, rows) => {
            if (err) {
                logger.error(`Error fetching categories for ${city}`, { error: err.message });
                res.status(500).json({ error: 'Database error fetching categories' });
                return;
            }
            const categories = rows.map(row => row.category);
            logger.info(`Categories sent for ${city}`, { count: categories.length, categories });
            res.json(categories);
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/products', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM products WHERE available = 1 ORDER BY category, order_priority, id', [], (err, rows) => {
            if (err) {
                logger.error(`Error fetching products for ${city}`, { error: err.message });
                res.status(500).json({ error: 'Database error fetching products' });
                return;
            }
            res.json(rows);
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/products/all', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM products ORDER BY category, name', [], (err, rows) => {
            if (err) {
                logger.error(`Error fetching all products for ${city}`, { error: err.message });
                res.status(500).json({ error: 'Database error fetching all products' });
                return;
            }
            res.json(rows);
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/promotions', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM promotions ORDER BY id', [], (err, rows) => {
            if (err) {
                logger.error(`Error fetching promotions for ${city}`, { error: err.message });
                res.status(500).json({ error: 'Database error fetching promotions' });
                return;
            }
            logger.info(`Promotions sent for ${city}`, { count: rows.length });
            res.json(rows);
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/promotions/add', upload.single('photo'), (req, res) => {
    const city = req.params.city;
    const description = req.body.description;
    const photo = req.file ? `/${city}/photo/promotions/${req.file.filename}` : null;
    if (!description || !photo) {
        res.status(400).json({ result: 'error', error: 'Missing required fields' });
        return;
    }
    try {
        const db = getDb(city);
        db.run('INSERT INTO promotions (photo, conditions) VALUES (?, ?)', [photo, description], function(err) {
            if (err) {
                logger.error(`Error adding promotion for ${city}`, { error: err.message });
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            logger.info(`Promotion added for ${city}`, { id: this.lastID });
            res.json({ result: 'success', promotion_id: this.lastID });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/promotions/delete', (req, res) => {
    const city = req.params.city;
    const { id } = req.body;
    if (!id) {
        res.status(400).json({ result: 'error', error: 'Promotion ID is required' });
        return;
    }
    try {
        const db = getDb(city);
        db.run('DELETE FROM promotions WHERE id = ?', [id], function(err) {
            if (err) {
                logger.error(`Error deleting promotion for ${city}`, { error: err.message });
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Promotion not found' });
                return;
            }
            logger.info(`Promotion deleted for ${city}`, { id });
            res.json({ result: 'success' });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/product-prices', (req, res) => {
    const city = req.params.city;
    const articles = req.body.articles || [];
    if (!Array.isArray(articles) || articles.length === 0) {
        logger.warn('Received empty or invalid articles array');
        res.json({});
        return;
    }
    try {
        const db = getDb(city);
        const placeholders = articles.map(() => '?').join(',');
        db.all(`SELECT article, price FROM products WHERE article IN (${placeholders}) AND available = 1`, articles, (err, rows) => {
            if (err) {
                logger.error(`Error fetching product prices for ${city}`, { error: err.message });
                res.status(500).json({ error: 'Database error fetching product prices' });
                return;
            }
            const priceMap = rows.reduce((map, row) => {
                map[row.article] = row.price;
                return map;
            }, {});
            res.json(priceMap);
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/promo-code/validate', (req, res) => {
    const city = req.params.city;
    const { code } = req.body;
    if (!code) {
        res.status(400).json({ result: 'error', error: 'Promo code is required' });
        return;
    }
    try {
        const db = getDb(city);
        db.get('SELECT * FROM promo_codes WHERE code = ?', [code], (err, row) => {
            if (err) {
                logger.error(`Error validating promo code for ${city}`, { error: err.message });
                res.status(500).json({ result: 'error', error: 'Database error validating promo code' });
                return;
            }
            if (!row) {
                res.json({ result: 'error', error: 'Извините, такого промокода не существует' });
                return;
            }
            logger.info(`Promo code validated for ${city}`, { code, type: row.type });
            if (row.type === 'discount') {
                res.json({ result: 'success', type: 'discount', discount_percentage: row.discount_percentage });
            } else if (row.type === 'product') {
                res.json({
                    result: 'success',
                    type: 'product',
                    product_article: row.product_article,
                    product_name: row.product_name,
                    min_order_amount: row.min_order_amount
                });
            } else {
                res.json({ result: 'error', error: 'Неизвестный тип промокода' });
            }
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/certificate/validate', async (req, res) => {
    const city = req.params.city;
    const { certificate } = req.body;
    if (!certificate) {
        res.status(400).json({ result: 'error', error: 'Certificate code is required' });
        return;
    }
    try {
        const frontpadSecret = getFrontpadSecret(city);
        if (!frontpadSecret) {
            res.status(500).json({ result: 'error', error: 'Frontpad secret not configured' });
            return;
        }
        const response = await axios.post('https://app.frontpad.ru/api/index.php?get_certificate', {
            secret: frontpadSecret,
            certificate: certificate
        }, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: [(data) => {
                return Object.entries(data)
                    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                    .join('&');
            }],
        });
        const result = response.data;
        if (result.result === 'success') {
            if (result.sale) {
                res.json({ result: 'success', sale: result.sale });
            } else {
                res.json({ result: 'error', error: 'Certificate is not for discount' });
            }
        } else {
            res.json({ result: 'error', error: result.error || 'Invalid certificate' });
        }
    } catch (error) {
        logger.error(`Error validating certificate for ${city}`, { error: error.message });
        res.status(500).json({ result: 'error', error: 'Failed to validate certificate' });
    }
});

app.get('/api/:city/promo-codes', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM promo_codes ORDER BY id', [], (err, rows) => {
            if (err) {
                logger.error(`Error fetching promo codes for ${city}`, { error: err.message });
                res.status(500).json({ error: 'Database error fetching promo codes' });
                return;
            }
            logger.info(`Promo codes sent for ${city}`, { count: rows.length });
            res.json(rows);
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/promo-codes/add', (req, res) => {
    const city = req.params.city;
    const { code, type, discount_percentage, product_article, product_name, min_order_amount, start_date, end_date, max_uses } = req.body;

    try {
        const db = getDb(city);
        const sql = `INSERT INTO promo_codes (
            code, type, discount_percentage, product_article, product_name, min_order_amount, start_date, end_date, max_uses
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            code || null,
            type || null,
            discount_percentage || null,
            product_article || null,
            product_name || null,
            min_order_amount || null,
            start_date || null,
            end_date || null,
            max_uses || null
        ];
        db.run(sql, params, function(err) {
            if (err) {
                logger.error(`Error adding promo code for ${city}`, { error: err.message });
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            logger.info(`Promo code added for ${city}`, { id: this.lastID });
            res.json({ result: 'success', promo_id: this.lastID });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});



app.post('/api/:city/promo-code/toggle-active', (req, res) => {
    const city = req.params.city;
    const { id, active } = req.body;
    if (!id || typeof active !== 'boolean') {
        res.status(400).json({ result: 'error', error: 'Invalid input' });
        return;
    }
    try {
        const db = getDb(city);
        db.run('UPDATE promo_codes SET active = ? WHERE id = ?', [active ? 1 : 0, id], function(err) {
            if (err) {
                logger.error(`Error toggling promo code active state for ${city}`, { error: err.message });
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Promo code not found' });
                return;
            }
            logger.info(`Promo code active state updated for ${city}`, { id, active });
            res.json({ result: 'success' });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/promo-codes/delete', (req, res) => {
    const city = req.params.city;
    const { id } = req.body;
    if (!id) {
        res.status(400).json({ result: 'error', error: 'Promo code ID is required' });
        return;
    }
    try {
        const db = getDb(city);
        db.run('DELETE FROM promo_codes WHERE id = ?', [id], function(err) {
            if (err) {
                logger.error(`Error deleting promo code for ${city}`, { error: err.message });
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Promo code not found' });
                return;
            }
            logger.info(`Promo code deleted for ${city}`, { id });
            res.json({ result: 'success' });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/orders/delete', (req, res) => {
    const city = req.params.city;
    const { id } = req.body;
    if (!id) {
        res.status(400).json({ result: 'error', error: 'Order ID is required' });
        return;
    }
    try {
        const db = getDb(city);
        db.run('DELETE FROM orders WHERE id = ?', [id], function(err) {
            if (err) {
                logger.error(`Error deleting order for ${city}`, { error: err.message });
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Order not found' });
                return;
            }
            logger.info(`Order deleted for ${city}`, { id });
            res.json({ result: 'success' });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/submit-order', async (req, res) => {
    try {
        const city = req.params.city;
        const orderData = req.body;
        logger.info('Received order data for submission', { city, body: orderData });

        if (!['kovrov', 'nnovgorod'].includes(city)) {
            logger.error('Invalid city parameter', { city });
            return res.status(400).json({ result: 'error', error: 'Invalid city' });
        }

        if (!orderData.customer_name || !orderData.phone_number || !orderData.delivery_type || !orderData.payment_method || !orderData.delivery_time || !orderData.products) {
            logger.error('Invalid order data: missing required fields', { orderData });
            return res.status(400).json({ result: 'error', error: 'Missing required fields' });
        }
        if (orderData.promo_code) {
        const db = getDb(city);
        await new Promise((resolve, reject) => {
            db.run('UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code = ?', [orderData.promo_code], function(err) {
                if (err) {
                    logger.error(`Error updating promo code usage for ${city}`, { error: err.message });
                    reject(err);
                } else {
                    logger.info(`Promo code usage updated for ${city}`, { code: orderData.promo_code });
                    resolve();
                }
            });
        });
    }

        let products;
        try {
            products = Array.isArray(orderData.products) ? orderData.products : JSON.parse(orderData.products);
            if (!Array.isArray(products)) throw new Error('Products is not an array');
            if (products.length === 0 || !products.every(p => p.article && typeof p.quantity === 'number' && p.quantity > 0)) {
                throw new Error('Invalid products: each product must have an article and a positive quantity');
            }
        } catch (e) {
            logger.error('Invalid products data', { products: orderData.products, error: e.message });
            return res.status(400).json({ result: 'error', error: 'Invalid products data' });
        }
        const productsJson = JSON.stringify(products);

        const createdAt = getMoscowTime();
        logger.info(`Preparing to insert order for ${city}`, { createdAt });

        const sql = `INSERT INTO orders (
            customer_name, phone_number, delivery_type, address, payment_method, delivery_time, comments, utensils_count, products, promo_code, status, created_at, frontpad_order_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const MAX_RETRIES = 3;
        const RETRY_DELAY = 2000;

        async function submitOrderWithRetry(attempt = 1) {
            try {
                logger.info(`Attempt ${attempt} to submit order for ${city}`);
                const frontpadResult = await submitOrderToFrontpad({ ...orderData, city }, dbNnovgorod, dbKovrov);
                logger.info('Frontpad submission result', { frontpadResult });

                const db = getDb(city);
                if (!db) {
                    logger.error(`No database available for ${city}`);
                    return res.status(500).json({ result: 'error', error: 'Database not available for this city' });
                }

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
                    orderData.discount_type === 'certificate' ? orderData.discount_code : orderData.promo_code || null,
                    orderData.status || 'pending',
                    createdAt,
                    frontpadResult.frontpad_order_id || null
                ];

                logger.info('Inserting order into database', { city, params });

                if (!frontpadResult.success || !frontpadResult.frontpad_order_id) {
                    logger.warn(`Frontpad submission failed for ${city}, storing locally`, { error: frontpadResult.error, warnings: frontpadResult.warnings });
                    db.run(sql, params, function(err) {
                        if (err) {
                            logger.error(`Database error inserting order for ${city}`, { error: err.message, stack: err.stack, params });
                            return res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                        }
                        logger.info(`Order inserted locally for ${city}`, { id: this.lastID, frontpad_order_id: null });
                        res.json({
                            result: 'success',
                            order_id: this.lastID,
                            frontpad_order_id: null,
                            warning: 'Stored locally due to Frontpad failure',
                            frontpad_error: frontpadResult.error,
                            frontpad_warnings: frontpadResult.warnings
                        });
                    });
                    return;
                }

                db.run(sql, params, function(err) {
                    if (err) {
                        logger.error(`Database error inserting order for ${city}`, { error: err.message, stack: err.stack, params });
                        return res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                    }
                    logger.info(`Order inserted for ${city}`, {
                        id: this.lastID,
                        frontpad_order_id: frontpadResult.frontpad_order_id || 'none'
                    });
                    db.get('SELECT created_at, frontpad_order_id FROM orders WHERE id = ?', [this.lastID], (err, row) => {
                        if (err) {
                            logger.error(`Error verifying inserted order for ${city}`, { error: err.message });
                        } else {
                            logger.info(`Verified inserted order for ${city}`, { id: this.lastID, created_at: row.created_at, frontpad_order_id: row.frontpad_order_id });
                        }
                    });

                    res.json({
                        result: 'success',
                        order_id: this.lastID,
                        frontpad_order_id: frontpadResult.frontpad_order_id,
                        order_number: frontpadResult.order_number
                    });
                });
            } catch (error) {
                if (attempt < MAX_RETRIES) {
                    logger.info(`Retrying order submission for ${city}`, { attempt: attempt + 1 });
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                    return submitOrderWithRetry(attempt + 1);
                }
                logger.error(`Failed to submit order for ${city} after ${MAX_RETRIES} attempts`, {
                    error: error.message,
                    stack: error.stack,
                    orderData
                });
                const db = getDb(city);
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
                    orderData.discount_type === 'certificate' ? orderData.discount_code : orderData.promo_code || null,
                    orderData.status || 'pending',
                    createdAt,
                    null
                ];
                logger.info('Inserting order into database (fallback)', { city, params });
                db.run(sql, params, function(err) {
                    if (err) {
                        logger.error(`Database error inserting order for ${city} (fallback)`, { error: err.message, stack: err.stack, params });
                        return res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                    }
                    logger.info(`Order inserted locally for ${city} after retry failure`, { id: this.lastID });
                    res.json({
                        result: 'success',
                        order_id: this.lastID,
                        frontpad_order_id: null,
                        warning: 'Stored locally due to Frontpad failure'
                    });
                });
            }
        }

        await submitOrderWithRetry();
    } catch (error) {
        logger.error(`Internal server error for ${city}/submit-order`, { error: error.message, stack: error.stack, body: req.body });
        res.status(500).json({ result: 'error', error: `Internal server error: ${error.message}` });
    }
});

app.get('/api/:city/orders/current', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM orders WHERE status = "pending" ORDER BY created_at DESC', [], (err, rows) => {
            if (err) {
                logger.error(`Error fetching current orders for ${city}`, { error: err.message });
                res.status(500).json({ error: 'Database error fetching current orders' });
                return;
            }
            logger.info(`Current orders sent for ${city}`, { count: rows.length });
            res.json(rows);
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/orders/new', (req, res) => {
    const city = req.params.city;
    const lastId = parseInt(req.query.last_id) || 0;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM orders WHERE id > ? ORDER BY created_at DESC', [lastId], (err, rows) => {
            if (err) {
                logger.error(`Error fetching new orders for ${city}`, { error: err.message });
                res.status(500).json({ error: 'Database error fetching new orders' });
                return;
            }
            logger.info(`New orders sent for ${city}`, { count: rows.length });
            res.json(rows);
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/orders/history', async (req, res) => {
    const city = req.params.city;
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;

    if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        logger.warn(`Invalid or missing date parameters for ${city}`, { startDate, endDate });
        res.status(400).json({ error: 'Invalid or missing start_date or end_date parameters' });
        return;
    }

    try {
        const db = getDb(city);
        db.all('SELECT * FROM orders WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC', [`${startDate}_unspecified_time`, `${endDate} 23:59:59`], async (err, orders) => {
            if (err) {
                logger.error(`Error fetching order history for ${city}`, { error: err.message });
                res.status(500).json({ error: 'Database error fetching order history' });
                return;
            }

            const enrichedOrders = await Promise.all(orders.map(async (order) => {
                let totalPrice = 0;
                let discountedPrice = null;
                let discountPercentage = 0;

                let products;
                try {
                    products = JSON.parse(order.products);
                    if (!Array.isArray(products)) throw new Error('Products is not an array');
                } catch (e) {
                    logger.error(`Invalid products data for order ${order.id}`, { error: e.message });
                    return { ...order, total_price: 0, discounted_price: null, product_names: [] };
                }

                const articles = products.map(p => p.article);
                const placeholders = articles.map(() => '?').join(',');
                const productRows = await new Promise((resolve, reject) => {
                    db.all(`SELECT article, price, name FROM products WHERE article IN (${placeholders})`, articles, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                const productMap = productRows.reduce((map, row) => {
                    map[row.article] = { price: row.price, name: row.name };
                    return map;
                }, {});

                totalPrice = products.reduce((sum, product) => {
                    const price = productMap[product.article]?.price || 0;
                    return sum + (price * product.quantity);
                }, 0);

                if (order.promo_code) {
                    const promoRow = await new Promise((resolve, reject) => {
                        db.get('SELECT type, discount_percentage FROM promo_codes WHERE code = ?', [order.promo_code], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });

                    if (promoRow && promoRow.type === 'discount') {
                        discountPercentage = promoRow.discount_percentage;
                        discountedPrice = totalPrice * (1 - discountPercentage / 100);
                    }
                }

                const productNames = products.map(p => ({
                    name: productMap[p.article]?.name || p.article,
                    quantity: p.quantity
                }));

                return {
                    ...order,
                    total_price: totalPrice,
                    discounted_price: discountedPrice,
                    discount_percentage: discountPercentage,
                    product_names: productNames
                };
            }));

            logger.info(`Order history sent for ${city}`, { count: enrichedOrders.length, startDate, endDate });
            res.json(enrichedOrders);
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/categories/priorities', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT DISTINCT category, MIN(order_priority) as order_priority FROM products WHERE available = 1 GROUP BY category ORDER BY order_priority ASC, category ASC', [], (err, rows) => {
            if (err) {
                logger.error(`Error fetching category priorities for ${city}`, { error: err.message });
                res.status(500).json({ error: 'Database error fetching category priorities' });
                return;
            }
            logger.info(`Category priorities sent for ${city}`, { count: rows.length });
            res.json(rows);
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/categories/priorities', (req, res) => {
    const city = req.params.city;
    const priorities = req.body;
    if (!Array.isArray(priorities) || priorities.length === 0) {
        logger.error('Invalid priorities data', { priorities });
        res.status(400).json({ error: 'Invalid priorities data' });
        return;
    }

    try {
        const db = getDb(city);
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            const stmt = db.prepare('UPDATE products SET order_priority = ? WHERE category = ?');
            let errorOccurred = false;

            priorities.forEach(({ category, order_priority }) => {
                stmt.run(order_priority, category, (err) => {
                    if (err) {
                        logger.error(`Error updating priority for category ${category} in ${city}`, { error: err.message });
                        errorOccurred = true;
                    }
                });
            });

            stmt.finalize((err) => {
                if (err || errorOccurred) {
                    logger.error('Error during priority update', { error: err ? err.message : 'Update errors' });
                    db.run('ROLLBACK');
                    res.status(500).json({ error: 'Database error updating priorities' });
                    return;
                }
                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                        logger.error(`Error committing transaction for ${city}`, { error: commitErr.message });
                        res.status(500).json({ error: 'Database error committing priorities' });
                        return;
                    }
                    logger.info(`Category priorities updated for ${city}`, { priorities });
                    res.json({ result: 'success' });
                });
            });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/products/toggle-availability', (req, res) => {
    const city = req.params.city;
    const { id, available } = req.body;
    if (!id || typeof available !== 'boolean') {
        res.status(400).json({ result: 'error', error: 'Product ID and availability status are required' });
        return;
    }
    try {
        const db = getDb(city);
        db.run('UPDATE products SET available = ? WHERE id = ?', [available ? 1 : 0, id], function(err) {
            if (err) {
                logger.error(`Error updating product availability for ${city}`, { error: err.message });
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Product not found' });
                return;
            }
            logger.info(`Product availability updated for ${city}`, { id, available });
            res.json({ result: 'success' });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/products/update-price', (req, res) => {
    const city = req.params.city;
    const { id, price } = req.body;
    if (!id || typeof price !== 'number' || price <= 0) {
        res.status(400).json({ result: 'error', error: 'Invalid product ID or price' });
        return;
    }
    try {
        const db = getDb(city);
        db.run('UPDATE products SET price = ? WHERE id = ?', [price, id], function(err) {
            if (err) {
                logger.error(`Error updating product price for ${city}`, { error: err.message });
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Product not found' });
                return;
            }
            logger.info(`Product price updated for ${city}`, { id, price });
            res.json({ result: 'success' });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/products/add', (req, res) => {
    upload.single('productPhoto')(req, res, async function(err) {
        if (err) {
            logger.error('Upload error', { error: err.message });
            res.status(400).json({ result: 'error', error: err.message });
            return;
        }
        const city = req.params.city;
        try {
            const db = getDb(city);
            const article = req.body.productArticle;
            const name = req.body.productName;
            const description = req.body.productDescription;
            const category = req.body.productCategory;
            const quantity = req.body.productQuantity ? parseInt(req.body.productQuantity) : null;
            const weight = req.body.productWeight ? parseInt(req.body.productWeight) : null;
            const price = parseFloat(req.body.productPrice);
            const available = req.body.productAvailable === 'on' ? 1 : 0;
            const photo = req.file ? `/${city}/photo/товары/${req.file.filename}` : null;

            if (!article || !name || !price || !category || !photo) {
                res.status(400).json({ result: 'error', error: 'Missing required fields' });
                return;
            }

            const categoryPriority = await new Promise((resolve, reject) => {
                db.get('SELECT MIN(order_priority) as order_priority FROM products WHERE category = ?', [category], (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.order_priority : 999);
                });
            });

            db.run('INSERT INTO products (article, name, photo, price, weight, quantity, composition, category, available, order_priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [article, name, photo, price, weight, quantity, description, category, available, categoryPriority], function(err) {
                    if (err) {
                        logger.error(`Error adding product for ${city}`, { error: err.message });
                        res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                        return;
                    }
                    logger.info(`Product added for ${city}`, { id: this.lastID, article });
                    res.json({ result: 'success', product_id: this.lastID });
                });
        } catch (error) {
            logger.error(`Error adding product for ${city}`, { error: error.message });
            res.status(400).json({ error: error.message });
        }
    });
});

app.post('/api/:city/products/delete', (req, res) => {
    const city = req.params.city;
    const { id } = req.body;
    if (!id) {
        res.status(400).json({ result: 'error', error: 'Product ID is required' });
        return;
    }
    try {
        const db = getDb(city);
        db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
            if (err) {
                logger.error(`Error deleting product for ${city}`, { error: err.message });
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Product not found' });
                return;
            }
            logger.info(`Product deleted for ${city}`, { id });
            res.json({ result: 'success' });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.get('/debug/db/:city', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.get('SELECT 1', (err) => {
            if (err) {
                logger.error('Database connection error', { error: err.message, city });
                return res.status(500).json({ result: 'error', error: err.message });
            }
            logger.info('Database connection successful', { city });
            res.json({ result: 'success', message: `Database connection for ${city} is working` });
        });
    } catch (error) {
        logger.error(`Invalid city: ${city}`, { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

app.get('/debug/env', (req, res) => {
    logger.info('Checking environment variables');
    res.json({
        FRONTPAD_SECRET_NNOVGOROD: process.env.FRONTPAD_SECRET_NNOVGOROD ? 'Set' : 'Not set',
        FRONTPAD_SECRET_KOVROV: process.env.FRONTPAD_SECRET_KOVROV ? 'Set' : 'Not set'
    });
});

app.use((req, res) => {
    logger.error(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Not Found' });
});

app.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Closing server and databases');
    dbKovrov.close((err) => {
        if (err) logger.error('Error closing Kovrov database', { error: err.message });
        else logger.info('Kovrov database closed');
    });
    dbNnovgorod.close((err) => {
        if (err) logger.error('Error closing Nnovgorod database', { error: err.message });
        else logger.info('Nnovgorod database closed');
        process.exit(0);
    });
});