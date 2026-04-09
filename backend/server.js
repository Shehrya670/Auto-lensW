const cors = require('cors');
const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const pool = require('./db');

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not set; auth endpoints will fail.');
}

if (isProduction) {
    app.set('trust proxy', 1);
}

const parseOrigins = () => {
    const envOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    const devOrigins = ['http://localhost:3000', 'http://localhost:3001'];
    return [...new Set([...envOrigins, ...(isProduction ? [] : devOrigins)])];
};

const allowedOrigins = parseOrigins();

app.use(helmet());
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

app.use('/api/auth', require('./routes/auth'));
const { authMiddleware } = require('./middleware/auth');
app.use('/api/cars', require('./routes/cars'));
app.use('/api/favorites', require('./routes/favorites'));

// Keep legacy aliases for backwards compatibility
app.get('/api/user/cars', authMiddleware, async (req, res, next) => {
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
        next(err);
    }
});

app.get('/api/search', async (req, res, next) => {
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

        if (q) {
            query += ` AND (c.title ILIKE $${idx} OR c.make ILIKE $${idx} OR c.model ILIKE $${idx})`;
            params.push(`%${q}%`);
            idx++;
        }
        if (make) { query += ` AND LOWER(c.make) = LOWER($${idx++})`; params.push(make); }
        if (model) { query += ` AND LOWER(c.model) = LOWER($${idx++})`; params.push(model); }
        if (minYear) { query += ` AND c.year >= $${idx++}`; params.push(parseInt(minYear, 10)); }
        if (maxYear) { query += ` AND c.year <= $${idx++}`; params.push(parseInt(maxYear, 10)); }
        if (minPrice) { query += ` AND c.price >= $${idx++}`; params.push(parseFloat(minPrice)); }
        if (maxPrice) { query += ` AND c.price <= $${idx++}`; params.push(parseFloat(maxPrice)); }
        if (fuel_type) { query += ` AND c.fuel_type = $${idx++}`; params.push(fuel_type); }
        if (transmission) { query += ` AND c.transmission = $${idx++}`; params.push(transmission); }

        query += ' ORDER BY c.created_at DESC LIMIT 60';

        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rows.length, results: result.rows });
    } catch (err) {
        next(err);
    }
});

app.get('/api/recommendations', async (_req, res, next) => {
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
        next(err);
    }
});

app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', service: 'auto-lens-backend' });
});

app.get('/readyz', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ready' });
    } catch (err) {
        res.status(503).json({ status: 'not_ready', message: 'Database unavailable' });
    }
});

app.get('/', (_req, res) => {
    res.json({
        message: 'Welcome to Auto Lens API',
        version: '2.1.0',
        status: 'running',
        endpoints: {
            auth: '/api/auth',
            cars: '/api/cars',
            favorites: '/api/favorites',
            search: '/api/search',
            health: '/healthz',
            ready: '/readyz',
        },
    });
});

app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, _req, res, _next) => {
    console.error('Global error:', err && err.stack ? err.stack : err);
    if (err && err.message === 'Not allowed by CORS') {
        return res.status(403).json({ success: false, error: 'CORS origin blocked' });
    }
    return res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
        if (allowedOrigins.length > 0) {
            console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
        }
    });
}

module.exports = app;