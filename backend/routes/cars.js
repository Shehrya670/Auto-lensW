const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { uploadCarImages, cloudinary, getPublicIdFromUrl } = require('../cloudinary');

const upload = uploadCarImages;

// ─── GET /api/cars — list with filters ───────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { make, model, minPrice, maxPrice, year, fuel_type, transmission, condition, sort } = req.query;

        let query = `
            SELECT c.*, u.name AS seller_name, u.email AS seller_email,
                   (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = true LIMIT 1) AS primary_image
            FROM cars c
            JOIN users u ON c.user_id = u.id
            WHERE c.status = $1
        `;
        const params = ['available'];
        let idx = 2;

        if (make)         { query += ` AND LOWER(c.make) = LOWER($${idx++})`;        params.push(make); }
        if (model)        { query += ` AND LOWER(c.model) = LOWER($${idx++})`;       params.push(model); }
        if (minPrice)     { query += ` AND c.price >= $${idx++}`;                    params.push(parseFloat(minPrice)); }
        if (maxPrice)     { query += ` AND c.price <= $${idx++}`;                    params.push(parseFloat(maxPrice)); }
        if (year)         { query += ` AND c.year = $${idx++}`;                      params.push(parseInt(year)); }
        if (fuel_type)    { query += ` AND c.fuel_type = $${idx++}`;                 params.push(fuel_type); }
        if (transmission) { query += ` AND c.transmission = $${idx++}`;              params.push(transmission); }
        if (condition)    { query += ` AND c.condition = $${idx++}`;                 params.push(condition); }

        const orderMap = {
            newest:    'c.created_at DESC',
            oldest:    'c.created_at ASC',
            price_asc: 'c.price ASC',
            price_desc:'c.price DESC',
            mileage:   'c.mileage ASC',
        };
        query += ` ORDER BY ${orderMap[sort] || 'c.created_at DESC'}`;

        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rows.length, cars: result.rows });
    } catch (err) {
        console.error('GET /api/cars error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── GET /api/cars/search — full-text search ─────────────────────────────────
router.get('/search', async (req, res) => {
    try {
        const { q, make, model, minYear, maxYear, minPrice, maxPrice, fuel_type, transmission, sort } = req.query;

        let query = `
            SELECT c.*, u.name AS seller_name,
                   (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = true LIMIT 1) AS primary_image
            FROM cars c
            JOIN users u ON c.user_id = u.id
            WHERE c.status = 'available'
        `;
        const params = [];
        let idx = 1;

        if (q) {
            query += ` AND (c.title ILIKE $${idx} OR c.description ILIKE $${idx} OR c.make ILIKE $${idx} OR c.model ILIKE $${idx})`;
            params.push(`%${q}%`);
            idx++;
        }
        if (make)         { query += ` AND LOWER(c.make) = LOWER($${idx++})`;  params.push(make); }
        if (model)        { query += ` AND LOWER(c.model) = LOWER($${idx++})`; params.push(model); }
        if (minYear)      { query += ` AND c.year >= $${idx++}`;               params.push(parseInt(minYear)); }
        if (maxYear)      { query += ` AND c.year <= $${idx++}`;               params.push(parseInt(maxYear)); }
        if (minPrice)     { query += ` AND c.price >= $${idx++}`;              params.push(parseFloat(minPrice)); }
        if (maxPrice)     { query += ` AND c.price <= $${idx++}`;              params.push(parseFloat(maxPrice)); }
        if (fuel_type)    { query += ` AND c.fuel_type = $${idx++}`;           params.push(fuel_type); }
        if (transmission) { query += ` AND c.transmission = $${idx++}`;        params.push(transmission); }

        const orderMap = {
            newest:    'c.created_at DESC',
            price_asc: 'c.price ASC',
            price_desc:'c.price DESC',
            mileage:   'c.mileage ASC',
        };
        query += ` ORDER BY ${orderMap[sort] || 'c.created_at DESC'} LIMIT 60`;

        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rows.length, results: result.rows });
    } catch (err) {
        console.error('GET /api/cars/search error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── GET /api/cars/:id — single car with images ───────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const carResult = await pool.query(
            `SELECT c.*, u.name AS seller_name, u.email AS seller_email,
                    u.phone AS seller_phone, u.user_type AS seller_type,
                    u.avatar_url AS seller_avatar, u.location AS seller_location
             FROM cars c
             JOIN users u ON c.user_id = u.id
             WHERE c.id = $1`,
            [id]
        );

        if (carResult.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Car not found' });

        const imagesResult = await pool.query(
            'SELECT * FROM car_images WHERE car_id = $1 ORDER BY is_primary DESC',
            [id]
        );

        // Increment view count (fire-and-forget)
        pool.query('UPDATE cars SET views = views + 1 WHERE id = $1', [id]).catch(() => {});

        const car = carResult.rows[0];
        car.images = imagesResult.rows;

        res.json({ success: true, car });
    } catch (err) {
        console.error('GET /api/cars/:id error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── POST /api/cars — create listing ─────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, make, model, year, price, mileage, fuel_type, transmission, color, description, condition } = req.body;

        if (!title || !make || !model || !year || !price)
            return res.status(400).json({ success: false, error: 'Please provide all required fields' });

        const result = await pool.query(
            `INSERT INTO cars (user_id, title, make, model, year, price, mileage,
             fuel_type, transmission, color, description, condition)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [req.user.id, title, make, model, year, price, mileage || null,
             fuel_type || null, transmission || null, color || null, description || null, condition || 'used']
        );

        res.status(201).json({ success: true, message: 'Listing created successfully', car: result.rows[0] });
    } catch (err) {
        console.error('POST /api/cars error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── POST /api/cars/:id/images — upload images ───────────────────────────────
router.post('/:id/images', authMiddleware, upload.array('images', 10), async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const car = await pool.query('SELECT user_id FROM cars WHERE id = $1', [id]);
        if (car.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Car not found' });
        if (car.rows[0].user_id !== req.user.id)
            return res.status(403).json({ success: false, error: 'Not authorized' });

        if (!req.files || req.files.length === 0)
            return res.status(400).json({ success: false, error: 'No images provided' });

        // Check if this car already has a primary image
        const existing = await pool.query(
            'SELECT COUNT(*) FROM car_images WHERE car_id = $1', [id]
        );
        const noneExist = parseInt(existing.rows[0].count) === 0;

        const inserted = [];
        for (let i = 0; i < req.files.length; i++) {
            const imageUrl = req.files[i].path; // Cloudinary URL
            const isPrimary = noneExist && i === 0;
            const row = await pool.query(
                'INSERT INTO car_images (car_id, image_url, is_primary) VALUES ($1,$2,$3) RETURNING *',
                [id, imageUrl, isPrimary]
            );
            inserted.push(row.rows[0]);
        }

        res.status(201).json({ success: true, images: inserted });
    } catch (err) {
        console.error('POST /api/cars/:id/images error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── PUT /api/cars/:id — update listing ──────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const carCheck = await pool.query('SELECT * FROM cars WHERE id = $1', [id]);
        if (carCheck.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Car not found' });

        const car = carCheck.rows[0];
        if (car.user_id !== req.user.id)
            return res.status(403).json({ success: false, error: 'Not authorized to update this listing' });

        const allowed = ['title','make','model','year','price','mileage','fuel_type','transmission','color','description','condition','status'];
        const fields = [];
        const values = [];
        let idx = 1;

        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                fields.push(`${key} = $${idx++}`);
                values.push(req.body[key]);
            }
        }

        if (fields.length === 0)
            return res.status(400).json({ success: false, error: 'No fields to update' });

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(
            `UPDATE cars SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        res.json({ success: true, message: 'Listing updated', car: result.rows[0] });
    } catch (err) {
        console.error('PUT /api/cars/:id error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── DELETE /api/cars/:id ─────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const carCheck = await pool.query('SELECT * FROM cars WHERE id = $1', [id]);
        if (carCheck.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Car not found' });

        if (carCheck.rows[0].user_id !== req.user.id)
            return res.status(403).json({ success: false, error: 'Not authorized' });

        // Delete images from Cloudinary
        const images = await pool.query('SELECT image_url FROM car_images WHERE car_id = $1', [id]);
        for (const img of images.rows) {
            const publicId = getPublicIdFromUrl(img.image_url);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId).catch(() => {});
            }
        }

        await pool.query('DELETE FROM cars WHERE id = $1', [id]);
        res.json({ success: true, message: 'Listing deleted' });
    } catch (err) {
        console.error('DELETE /api/cars/:id error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── GET /api/cars/user/mine — current user's listings ───────────────────────
router.get('/user/mine', authMiddleware, async (req, res) => {
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
        console.error('GET /api/cars/user/mine error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── GET /api/cars/recommendations — recent listings ────────────────────────
router.get('/recommendations', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, u.name AS seller_name,
                    (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = true LIMIT 1) AS primary_image
             FROM cars c
             JOIN users u ON c.user_id = u.id
             WHERE c.status = 'available'
             ORDER BY c.created_at DESC
             LIMIT 6`
        );
        res.json({ success: true, recommendations: result.rows });
    } catch (err) {
        console.error('GET /api/cars/recommendations error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

module.exports = router;
