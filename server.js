
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

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

app.get('/favicon.ico', (req, res) => {
    console.log('Favicon requested, sending 204');
    res.status(204).end();
});

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
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
    console.log(`getMoscowTime called, returning: ${formattedTime}`);
    return formattedTime;
}

const dbKovrov = new sqlite3.Database(path.join(__dirname, 'shop_kovrov.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Database connection error for Kovrov:', err.message);
        return;
    }
    console.log('Connected to the Kovrov database.');
});

const dbNnovgorod = new sqlite3.Database(path.join(__dirname, 'shop_nnovgorod.db'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Database connection error for Nnovgorod:', err.message);
        return;
    }
    console.log('Connected to the Nnovgorod database.');
});

function getDb(city) {
    if (city === 'kovrov') {
        return dbKovrov;
    } else if (city === 'nnovgorod') {
        return dbNnovgorod;
    } else {
        throw new Error('Invalid city');
    }
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
            promo_code TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL
        )`, (err) => {
            if (err) console.error('Error creating orders table:', err.message);
            else console.log('Orders table ready.');
        });

        db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            discount_percentage INTEGER NOT NULL
        )`, (err) => {
            if (err) console.error('Error creating promo_codes table:', err.message);
            else console.log('Promo_codes table ready.');
        });
    });
});

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const city = req.params.city;
        const uploadPath = path.join(__dirname, city, 'photo', 'товары');
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
    console.log('Serving main page (Kovrov)');
    res.sendFile(path.join(__dirname, 'kovrov', 'Ковров.html'), (err) => {
        if (err) {
            console.error('Error serving Ковров.html:', err.message);
            res.status(404).json({ error: 'Main page not found' });
        }
    });
});

app.get('/kovrov', (req, res) => {
    console.log('Serving Kovrov page');
    res.sendFile(path.join(__dirname, 'kovrov', 'Ковров.html'), (err) => {
        if (err) {
            console.error('Error serving Ковров.html:', err.message);
            res.status(404).json({ error: 'Kovrov page not found' });
        }
    });
});

app.get('/nnovgorod', (req, res) => {
    console.log('Serving Nizhniy Novgorod page');
    res.sendFile(path.join(__dirname, 'nnovgorod', 'НижнийНовгород.html'), (err) => {
        if (err) {
            console.error('Error serving НижнийНовгород.html:', err.message);
            res.status(404).json({ error: 'Nizhniy Novgorod page not found' });
        }
    });
});

app.get('/operator', (req, res) => {
    console.log('Serving Operator page');
    res.sendFile(path.join(__dirname, 'operator', 'operator.html'), (err) => {
        if (err) {
            console.error('Error serving operator.html:', err.message);
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
                console.error(`Error fetching categories for ${city}:`, err.message);
                res.status(500).json({ error: 'Database error fetching categories' });
                return;
            }
            const categories = rows.map(row => row.category);
            console.log(`Categories sent for ${city}: ${categories.length} items`, categories);
            res.json(categories);
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/products', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM products WHERE available = 1 ORDER BY category, order_priority, id', [], (err, rows) => {
            if (err) {
                console.error(`Error fetching products for ${city}:`, err.message);
                res.status(500).json({ error: 'Database error fetching products' });
                return;
            }
            console.log(`Products sent for ${city}: ${rows.length} items`);
            res.json(rows);
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/products/all', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM products ORDER BY category, name', [], (err, rows) => {
            if (err) {
                console.error(`Error fetching all products for ${city}:`, err.message);
                res.status(500).json({ error: 'Database error fetching all products' });
                return;
            }
            console.log(`All products sent for ${city}: ${rows.length} items`);
            res.json(rows);
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/promotions', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM promotions ORDER BY id', [], (err, rows) => {
            if (err) {
                console.error(`Error fetching promotions for ${city}:`, err.message);
                res.status(500).json({ error: 'Database error fetching promotions' });
                return;
            }
            console.log(`Promotions sent for ${city}: ${rows.length} items`);
            res.json(rows);
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/product-prices', (req, res) => {
    const city = req.params.city;
    const articles = req.body.articles || [];
    if (!Array.isArray(articles) || articles.length === 0) {
        console.warn('Received empty or invalid articles array');
        res.json({});
        return;
    }
    try {
        const db = getDb(city);
        const placeholders = articles.map(() => '?').join(',');
        db.all(`SELECT article, price FROM products WHERE article IN (${placeholders}) AND available = 1`, articles, (err, rows) => {
            if (err) {
                console.error(`Error fetching product prices for ${city}:`, err.message);
                res.status(500).json({ error: 'Database error fetching product prices' });
                return;
            }
            const priceMap = rows.reduce((map, row) => {
                map[row.article] = row.price;
                return map;
            }, {});
            console.log(`Product prices sent for ${city} for ${articles.length} articles`);
            res.json(priceMap);
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
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
        db.get('SELECT code, discount_percentage FROM promo_codes WHERE code = ?', [code], (err, row) => {
            if (err) {
                console.error(`Error validating promo code for ${city}:`, err.message);
                res.status(500).json({ result: 'error', error: 'Database error validating promo code' });
            }
            if (!row) {
                res.json({ result: 'error', error: 'Promo code does not exist' });
                return;
            }
            console.log(`Promo code validated for ${city}: ${code}, discount: ${row.discount_percentage}%`);
            res.json({ result: 'success', discount_percentage: row.discount_percentage });
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/promo-codes', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM promo_codes ORDER BY id', [], (err, rows) => {
            if (err) {
                console.error(`Error fetching promo codes for ${city}:`, err.message);
                res.status(500).json({ error: 'Database error fetching promo codes' });
                return;
            }
            console.log(`Promo codes sent for ${city}: ${rows.length} items`);
            res.json(rows);
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/promo-codes/add', (req, res) => {
    const city = req.params.city;
    const { code, discount_percentage } = req.body;
    if (!code || !discount_percentage || isNaN(discount_percentage) || discount_percentage <= 0 || discount_percentage > 100) {
        res.status(400).json({ result: 'error', error: 'Invalid promo code or discount percentage' });
        return;
    }
    try {
        const db = getDb(city);
        db.run('INSERT INTO promo_codes (code, discount_percentage) VALUES (?, ?)', [code, discount_percentage], function(err) {
            if (err) {
                console.error(`Error adding promo code for ${city}:`, err.message);
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            console.log(`Promo code added for ${city} with ID: ${this.lastID}`);
            res.json({ result: 'success', promo_id: this.lastID });
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
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
                console.error(`Error deleting promo code for ${city}:`, err.message);
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Promo code not found' });
                return;
            }
            console.log(`Promo code deleted for ${city} with ID: ${id}`);
            res.json({ result: 'success' });
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/submit-order', (req, res) => {
    const city = req.params.city;
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

    const createdAt = getMoscowTime();
    console.log(`Inserting order for ${city} with created_at: ${createdAt}`);

    const sql = `INSERT INTO orders (
        customer_name, phone_number, delivery_type, address, payment_method, delivery_time, comments, utensils_count, products, promo_code, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
        orderData.promo_code || null,
        orderData.status || 'pending',
        createdAt
    ];

    try {
        const db = getDb(city);
        db.run(sql, params, function(err) {
            if (err) {
                console.error(`Error inserting order for ${city}:`, err.message);
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            console.log(`Order inserted for ${city} with ID: ${this.lastID}, created_at: ${createdAt}`);
            db.get('SELECT created_at FROM orders WHERE id = ?', [this.lastID], (err, row) => {
                if (err) {
                    console.error(`Error verifying inserted order for ${city}:`, err.message);
                } else {
                    console.log(`Verified inserted order for ${city} ID: ${this.lastID}, created_at: ${row.created_at}`);
                }
            });
            res.json({ result: 'success', order_id: this.lastID });
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/orders/current', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM orders WHERE status = "pending" ORDER BY created_at DESC', [], (err, rows) => {
            if (err) {
                console.error(`Error fetching current orders for ${city}:`, err.message);
                res.status(500).json({ error: 'Database error fetching current orders' });
                return;
            }
            console.log(`Current orders sent for ${city}: ${rows.length} items`);
            res.json(rows);
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
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
                console.error(`Error fetching new orders for ${city}:`, err.message);
                res.status(500).json({ error: 'Database error fetching new orders' });
                return;
            }
            console.log(`New orders sent for ${city}: ${rows.length} items`);
            res.json(rows);
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/orders/history', async (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT * FROM orders ORDER BY created_at DESC', [], async (err, orders) => {
            if (err) {
                console.error(`Error fetching order history for ${city}:`, err.message);
                res.status(500).json({ error: 'Database error fetching order history' });
                return;
            }

            orders.forEach(order => {
                console.log(`Order ID: ${order.id}, Raw created_at: ${order.created_at}`);
            });

            const enrichedOrders = await Promise.all(orders.map(async (order) => {
                let totalPrice = 0;
                let discountedPrice = null;
                let discountPercentage = 0;

                let products;
                try {
                    products = JSON.parse(order.products);
                    if (!Array.isArray(products)) throw new Error('Products is not an array');
                } catch (e) {
                    console.error(`Invalid products data for order ${order.id}:`, e);
                    return { ...order, total_price: 0, discounted_price: null };
                }

                const articles = products.map(p => p.article);
                const placeholders = articles.map(() => '?').join(',');
                const priceRows = await new Promise((resolve, reject) => {
                    db.all(`SELECT article, price FROM products WHERE article IN (${placeholders}) AND available = 1`, articles, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                const priceMap = priceRows.reduce((map, row) => {
                    map[row.article] = row.price;
                    return map;
                }, {});

                totalPrice = products.reduce((sum, product) => {
                    const price = priceMap[product.article] || 0;
                    return sum + (price * product.quantity);
                }, 0);

                if (order.promo_code) {
                    const promoRow = await new Promise((resolve, reject) => {
                        db.get('SELECT discount_percentage FROM promo_codes WHERE code = ?', [order.promo_code], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });

                    if (promoRow) {
                        discountPercentage = promoRow.discount_percentage;
                        discountedPrice = totalPrice * (1 - discountPercentage / 100);
                    }
                }

                return {
                    ...order,
                    total_price: totalPrice,
                    discounted_price: discountedPrice,
                    discount_percentage: discountPercentage
                };
            }));

            console.log(`Order history sent for ${city}: ${enrichedOrders.length} items`);
            res.json(enrichedOrders);
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/:city/categories/priorities', (req, res) => {
    const city = req.params.city;
    try {
        const db = getDb(city);
        db.all('SELECT DISTINCT category, MIN(order_priority) as order_priority FROM products WHERE available = 1 GROUP BY category ORDER BY order_priority ASC, category ASC', [], (err, rows) => {
            if (err) {
                console.error(`Error fetching category priorities for ${city}:`, err.message);
                res.status(500).json({ error: 'Database error fetching category priorities' });
                return;
            }
            console.log(`Category priorities sent for ${city}: ${rows.length} items`, rows);
            res.json(rows);
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/categories/priorities', (req, res) => {
    const city = req.params.city;
    const priorities = req.body;
    if (!Array.isArray(priorities) || priorities.length === 0) {
        console.error('Invalid priorities data:', priorities);
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
                        console.error(`Error updating priority for category ${category} in ${city}:`, err.message);
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
                        console.error(`Error committing transaction for ${city}:`, commitErr.message);
                        res.status(500).json({ error: 'Database error committing priorities' });
                        return;
                    }
                    console.log(`Category priorities updated for ${city}:`, priorities);
                    res.json({ result: 'success' });
                });
            });
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
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
                console.error(`Error updating product availability for ${city}:`, err.message);
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Product not found' });
                return;
            }
            console.log(`Product availability updated for ${city}, ID: ${id}, available: ${available}`);
            res.json({ result: 'success' });
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
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
                console.error(`Error updating product price for ${city}:`, err.message);
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Product not found' });
                return;
            }
            console.log(`Product price updated for ${city}, ID: ${id}, new price: ${price}`);
            res.json({ result: 'success' });
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/:city/products/add', (req, res) => {
    upload.single('productPhoto')(req, res, function(err) {
        if (err) {
            console.error('Upload error:', err.message);
            res.status(400).json({ result: 'error', error: err.message });
            return;
        }
        const city = req.params.city;
        try {
            const db = getDb(city);
            const name = req.body.productName;
            const description = req.body.productDescription;
            const category = req.body.productCategory;
            const quantity = req.body.productQuantity ? parseInt(req.body.productQuantity) : null;
            const weight = req.body.productWeight ? parseInt(req.body.productWeight) : null;
            const price = parseFloat(req.body.productPrice);
            const available = req.body.productAvailable === 'on' ? 1 : 0;
            const photo = req.file ? `/${city}/photo/товары/${req.file.filename}` : null;
            if (!name || !price || !category || !photo) {
                res.status(400).json({ result: 'error', error: 'Missing required fields' });
                return;
            }
            db.run('INSERT INTO products (name, photo, price, weight, quantity, composition, category, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [name, photo, price, weight, quantity, description, category, available], function(err) {
                    if (err) {
                        console.error(`Error adding product for ${city}:`, err.message);
                        res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                        return;
                    }
                    const id = this.lastID;
                    const article = `product-${id}`;
                    db.run('UPDATE products SET article = ? WHERE id = ?', [article, id], (updateErr) => {
                        if (updateErr) {
                            console.error(`Error updating article for product ${id} in ${city}:`, updateErr.message);
                            res.status(500).json({ result: 'error', error: `Database error: ${updateErr.message}` });
                            return;
                        }
                        console.log(`Product added for ${city} with ID: ${id}, article: ${article}`);
                        res.json({ result: 'success', product_id: id });
                    });
                });
        } catch (error) {
            console.error(`Invalid city: ${city}`, error.message);
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
                console.error(`Error deleting product for ${city}:`, err.message);
                res.status(500).json({ result: 'error', error: `Database error: ${err.message}` });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ result: 'error', error: 'Product not found' });
                return;
            }
            console.log(`Product deleted for ${city} with ID: ${id}`);
            res.json({ result: 'success' });
        });
    } catch (error) {
        console.error(`Invalid city: ${city}`, error.message);
        res.status(400).json({ error: error.message });
    }
});

app.use((req, res) => {
    console.error(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Not Found' });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server and databases...');
    dbKovrov.close((err) => {
        if (err) console.error('Error closing Kovrov database:', err.message);
        else console.log('Kovrov database closed.');
    });
    dbNnovgorod.close((err) => {
        if (err) console.error('Error closing Nnovgorod database:', err.message);
        else console.log('Nnovgorod database closed.');
        process.exit(0);
    });
});
