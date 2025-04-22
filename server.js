const express = require('express');
   const sqlite3 = require('sqlite3').verbose();
   const path = require('path');
   const helmet = require('helmet');
   const compression = require('compression');
   const rateLimit = require('express-rate-limit');
   const cors = require('cors');
   const fs = require('fs');
   const https = require('https');
   const app = express();
   const port = process.env.PORT || 3000;

   // Конфигурация окружения
   require('dotenv').config();

   // Настройка лимитера запросов
   const limiter = rateLimit({
       windowMs: 15 * 60 * 1000, // 15 минут
       max: 100 // Лимит запросов для каждого IP
   });

   // Подключение к базе данных
   const dbPath = process.env.DB_PATH || './shop.db';
   const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
       if (err) {
           console.error('Database connection error:', err.message);
           process.exit(1);
       }
       console.log('Connected to the shop database.');
   });

   // Инициализация базы данных
   function initializeDatabase() {
       const initQueries = [
           `CREATE TABLE IF NOT EXISTS products (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               name TEXT NOT NULL,
               photo TEXT,
               price REAL NOT NULL,
               weight INTEGER,
               quantity INTEGER,
               composition TEXT,
               category TEXT NOT NULL,
               available BOOLEAN NOT NULL DEFAULT 1
           )`,
           `CREATE TABLE IF NOT EXISTS promotions (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               photo TEXT NOT NULL,
               conditions TEXT,
               is_active BOOLEAN NOT NULL DEFAULT 1
           )`
       ];

       initQueries.forEach((query, index) => {
           db.run(query, (err) => {
               if (err) {
                   console.error(`Error initializing database (query ${index + 1}):`, err.message);
               } else {
                   console.log(`Database initialization query ${index + 1} completed.`);
               }
           });
       });
   }

   // Middleware
   app.use(helmet()); // Безопасность HTTP-заголовков
   app.use(compression()); // Сжатие ответов
   app.use(limiter); // Ограничение запросов
   app.use(cors({
       origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
   })); // CORS
   app.use(express.json());
   app.use(express.urlencoded({ extended: true }));
   app.use(express.static(path.join(__dirname, 'public'), {
       maxAge: '1d',
       setHeaders: (res, path) => {
           if (path.endsWith('.html')) {
               res.setHeader('Cache-Control', 'no-cache');
           }
       }
   }));

   // API Routes
   const apiRouter = express.Router();

   // Получение категорий
   apiRouter.get('/categories', (req, res) => {
       db.all('SELECT DISTINCT category FROM products WHERE available = 1 ORDER BY category', [], (err, rows) => {
           if (err) {
               console.error('Error fetching categories:', err.message);
               return res.status(500).json({ error: err.message });
           }
           const categories = rows.map(row => row.category);
           console.log('Categories sent:', categories);
           res.json(categories);
       });
   });

   // Получение товаров
   apiRouter.get('/products', (req, res) => {
       const query = req.query.category 
           ? 'SELECT * FROM products WHERE category = ? AND available = 1 ORDER BY id'
           : 'SELECT * FROM products WHERE available = 1 ORDER BY category, id';
       const params = req.query.category ? [req.query.category] : [];

       db.all(query, params, (err, rows) => {
           if (err) {
               console.error('Error fetching products:', err.message);
               return res.status(500).json({ error: err.message });
           }
           console.log('Products sent:', rows.length, 'items');
           res.json(rows);
       });
   });

   // Получение акций
   apiRouter.get('/promotions', (req, res) => {
       db.all('SELECT * FROM promotions WHERE is_active = 1 ORDER BY id', [], (err, rows) => {
           if (err) {
               console.error('Error fetching promotions:', err.message);
               return res.status(500).json({ error: err.message });
           }
           console.log('Promotions sent:', rows.length, 'items');
           res.json(rows);
       });
   });

   // Debug эндпоинт для проверки базы данных
   apiRouter.get('/debug/db', (req, res) => {
       db.all('SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY category', [], (err, rows) => {
           if (err) {
               console.error('Error debugging database:', err.message);
               return res.status(500).json({ error: err.message });
           }
           console.log('Debug database content:', rows);
           res.json(rows);
       });
   });

   // Debug эндпоинт для проверки всех товаров
   apiRouter.get('/debug/products', (req, res) => {
       db.all('SELECT id, name, category, price FROM products ORDER BY category, id', [], (err, rows) => {
           if (err) {
               console.error('Error fetching all products:', err.message);
               return res.status(500).json({ error: err.message });
           }
           console.log('All products:', rows);
           res.json(rows);
       });
   });

   // Debug эндпоинт для проверки всех акций
   apiRouter.get('/debug/promotions', (req, res) => {
       db.all('SELECT id, photo, conditions FROM promotions ORDER BY id', [], (err, rows) => {
           if (err) {
               console.error('Error fetching all promotions:', err.message);
               return res.status(500).json({ error: err.message });
           }
           console.log('All promotions:', rows);
           res.json(rows);
       });
   });

   // Подключение API роутера
   app.use('/api', apiRouter);

   // Статические файлы и SPA роутинг
   app.get('*', (req, res) => {
       res.sendFile(path.join(__dirname, 'public', 'главная.html'));
   });

   // Обработка ошибок
   app.use((err, req, res, next) => {
       console.error('Server error:', err.stack);
       res.status(500).json({ error: 'Something went wrong!' });
   });

   // Запуск сервера
   if (process.env.NODE_ENV === 'production') {
       const sslOptions = {
           key: fs.readFileSync(process.env.SSL_KEY_PATH || './ssl/private.key'),
           cert: fs.readFileSync(process.env.SSL_CERT_PATH || './ssl/certificate.crt')
       };

       https.createServer(sslOptions, app).listen(port, () => {
           console.log(`HTTPS Server running on port ${port}`);
           initializeDatabase();
       });
   } else {
       app.listen(port, () => {
           console.log(`HTTP Server running on port ${port}`);
           initializeDatabase();
       });
   }