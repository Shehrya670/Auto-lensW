const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// ─── GET /api/favorites — list user's saved cars ──────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, u.name AS seller_name,
                    (SELECT image_url FROM car_images WHERE car_id = c.id AND is_primary = true LIMIT 1) AS primary_image,
                    uf.created_at AS saved_at
             FROM user_favorites uf
             JOIN cars c ON uf.car_id = c.id
             JOIN users u ON c.user_id = u.id
             WHERE uf.user_id = $1
             ORDER BY uf.created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, count: result.rows.length, favorites: result.rows });
    } catch (err) {
        console.error('GET /api/favorites error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── GET /api/favorites/ids — just the car IDs user favorited ────────────────
router.get('/ids', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT car_id FROM user_favorites WHERE user_id = $1',
            [req.user.id]
        );
        const ids = result.rows.map(r => r.car_id);
        res.json({ success: true, ids });
    } catch (err) {
        console.error('GET /api/favorites/ids error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── POST /api/favorites/:carId — save a car ─────────────────────────────────
router.post('/:carId', authMiddleware, async (req, res) => {
    try {
        const { carId } = req.params;

        // Verify car exists
        const car = await pool.query('SELECT id FROM cars WHERE id = $1', [carId]);
        if (car.rows.length === 0)
            return res.status(404).json({ success: false, error: 'Car not found' });

        await pool.query(
            'INSERT INTO user_favorites (user_id, car_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.user.id, carId]
        );

        res.status(201).json({ success: true, message: 'Car saved to favorites' });
    } catch (err) {
        console.error('POST /api/favorites/:carId error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ─── DELETE /api/favorites/:carId — remove a car ─────────────────────────────
router.delete('/:carId', authMiddleware, async (req, res) => {
    try {
        const { carId } = req.params;

        await pool.query(
            'DELETE FROM user_favorites WHERE user_id = $1 AND car_id = $2',
            [req.user.id, carId]
        );

        res.json({ success: true, message: 'Removed from favorites' });
    } catch (err) {
        console.error('DELETE /api/favorites/:carId error:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

module.exports = router;
