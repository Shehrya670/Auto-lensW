const cors = require('cors');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const app = express();
const pool = require('./db');

dotenv.config();

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3001',
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// ─── Body parsing & static files ─────────────────────────────────────────────
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ─── Test DB connection ───────────────────────────────────────────────────────
pool.connect((err, client, release) => {
    if (err) return console.error('❌ DB connection error:', err.stack);
    console.log('✅ Connected to PostgreSQL database');
    release();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
const { authMiddleware } = require('./middleware/auth');
app.use('/api/cars', require('./routes/cars'));
app.use('/api/favorites', require('./routes/favorites'));

    // Keep /api/user/cars and /api/search as aliases for backwards-compatibility
    app.get('/api/user/cars', authMiddleware, async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT c.*,
                        (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = true LIMIT 1) AS primary_image
                 FROM cars c
                 WHERE c.user_id = $1
                 ORDER BY c.created_at DESC`,
                [req.user.id]
            );
            res.json({ success: true, count: result.rows.length, cars: result.rows });
        } catch (err) {
            console.error('GET /api/user/cars error:', err.message);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    app.get('/api/search', async (req, res) => {
        try {
            const { q, make, model, minYear, maxYear, minPrice, maxPrice, fuel_type, transmission } = req.query;
            let query = `
                SELECT c.*, u.name AS seller_name,
                       (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = true LIMIT 1) AS primary_image
                FROM cars c JOIN users u ON c.user_id = u.id
                WHERE c.status = 'available'
            `;
            const params = [];
            let idx = 1;

            if (q) { query += ` AND (c.title ILIKE $${idx} OR c.make ILIKE $${idx} OR c.model ILIKE $${idx})`; params.push(`%${q}%`); idx++; }
            if (make) { query += ` AND LOWER(c.make) = LOWER($${idx++})`; params.push(make); }
            if (model) { query += ` AND LOWER(c.model) = LOWER($${idx++})`; params.push(model); }
            if (minYear) { query += ` AND c.year >= $${idx++}`; params.push(parseInt(minYear)); }
            if (maxYear) { query += ` AND c.year <= $${idx++}`; params.push(parseInt(maxYear)); }
            if (minPrice) { query += ` AND c.price >= $${idx++}`; params.push(parseFloat(minPrice)); }
            if (maxPrice) { query += ` AND c.price <= $${idx++}`; params.push(parseFloat(maxPrice)); }
            if (fuel_type) { query += ` AND c.fuel_type = $${idx++}`; params.push(fuel_type); }
            if (transmission) { query += ` AND c.transmission = $${idx++}`; params.push(transmission); }

            query += ' ORDER BY c.created_at DESC LIMIT 60';

            const result = await pool.query(query, params);
            res.json({ success: true, count: result.rows.length, results: result.rows });
        } catch (err) {
            console.error('GET /api/search error:', err.message);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

    app.get('/api/recommendations', async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT c.*, u.name AS seller_name,
                        (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = true LIMIT 1) AS primary_image
                 FROM cars c JOIN users u ON c.user_id = u.id
                 WHERE c.status = 'available'
                 ORDER BY c.created_at DESC LIMIT 6`
            );
            res.json({ success: true, recommendations: result.rows });
        } catch (err) {
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        message: 'Welcome to Auto Lens API',
        version: '2.0.0',
        status: 'running',
        endpoints: { auth: '/api/auth', cars: '/api/cars', favorites: '/api/favorites', search: '/api/search' },
    });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Global error:', err.stack);
    res.status(500).json({ success: false, message: err.message || 'Something went wrong' });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
}

module.exports = app;