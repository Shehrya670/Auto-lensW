const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');

// Multer config for avatar uploads
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'public', 'uploads')),
    filename: (req, file, cb) => cb(null, `avatar-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`)
});
const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif/;
        const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype.split('/')[1]);
        cb(ok ? null : new Error('Only image files are allowed'), ok);
    }
});

const { authMiddleware } = require('../middleware/auth');

// @route   POST api/auth/signup
// @desc    Register a user
// @access  Public
router.post('/signup', [
    // Validation rules
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('email').isEmail().withMessage('Please include a valid email').normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage('Password must contain at least one letter and one number'),
    // Accept any locale for phone numbers to support international formats
    body('phone').optional().isMobilePhone('any').withMessage('Please enter a valid phone number'),
    body('user_type').isIn(['buyer', 'seller', 'dealer']).withMessage('Invalid user type')
], async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { name, email, password, phone, user_type } = req.body;

    try {
        // Check if user already exists
        const userExists = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user into database
        const newUser = await pool.query(
            `INSERT INTO users (name, email, password, phone, user_type) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, name, email, phone, user_type, created_at`,
            [name, email, hashedPassword, phone || null, user_type || 'buyer']
        );

        const user = newUser.rows[0];

        // Create JWT payload
        const payload = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                user_type: user.user_type
            }
        };

        // Sign token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE },
            (err, token) => {
                if (err) throw err;
                res.status(201).json({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        user_type: user.user_type
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
    body('email').isEmail().withMessage('Please include a valid email').normalizeEmail(),
    body('password').exists().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { email, password } = req.body;

    try {
        // Check if user exists
        const userResult = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = userResult.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Create JWT payload
        const payload = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                user_type: user.user_type
            }
        };

        // Sign token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE },
            (err, token) => {
                if (err) throw err;
                res.json({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        user_type: user.user_type,
                        avatar_url: user.avatar_url,
                        location: user.location
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userResult = await pool.query(
            'SELECT id, name, email, phone, user_type, avatar_url, location, bio, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: userResult.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT api/auth/me
// @desc    Update current user's profile
// @access  Private
router.put(
    '/me',
    authMiddleware,
    [
        body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
        body('phone').optional().isMobilePhone('any').withMessage('Please enter a valid phone number'),
        body('avatar_url').optional().trim(),
        body('location').optional().trim().isLength({ max: 100 }).withMessage('Location is too long'),
        body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio is too long'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }

        const { name, phone, avatar_url, location, bio } = req.body;

        try {
            const updateFields = [];
            const values = [];
            let i = 1;

            if (name !== undefined) {
                updateFields.push(`name = $${i++}`);
                values.push(name);
            }
            if (phone !== undefined) {
                updateFields.push(`phone = $${i++}`);
                values.push(phone || null);
            }
            if (avatar_url !== undefined) {
                updateFields.push(`avatar_url = $${i++}`);
                values.push(avatar_url || null);
            }
            if (location !== undefined) {
                updateFields.push(`location = $${i++}`);
                values.push(location || null);
            }
            if (bio !== undefined) {
                updateFields.push(`bio = $${i++}`);
                values.push(bio || null);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No fields to update',
                });
            }

            values.push(req.user.id);
            const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${i} RETURNING id, name, email, phone, user_type, avatar_url, location, bio, created_at`;
            const result = await pool.query(query, values);

            res.json({
                success: true,
                user: result.rows[0],
            });
        } catch (err) {
            console.error(err.message);
            res.status(500).json({
                success: false,
                message: 'Server error',
            });
        }
    }
);

// @route   POST api/auth/avatar
// @desc    Upload profile avatar image
// @access  Private
router.post('/avatar', authMiddleware, (req, res) => {
    avatarUpload.single('avatar')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        try {
            const avatarUrl = `/uploads/${req.file.filename}`;

            // Delete old avatar file if it exists
            const oldUser = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [req.user.id]);
            if (oldUser.rows[0]?.avatar_url && oldUser.rows[0].avatar_url.startsWith('/uploads/avatar-')) {
                const oldPath = path.join(__dirname, '..', 'public', oldUser.rows[0].avatar_url);
                fs.unlink(oldPath, () => { });
            }

            const result = await pool.query(
                'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, name, email, phone, user_type, avatar_url, location, bio, created_at',
                [avatarUrl, req.user.id]
            );
            res.json({ success: true, user: result.rows[0] });
        } catch (e) {
            console.error(e.message);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });
});

// @route   POST api/auth/logout
// @desc    Logout user (client-side; no server state)
// @access  Public
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;