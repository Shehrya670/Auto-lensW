/**
 * Shared PostgreSQL connection pool.
 * Import this singleton instead of creating a new Pool in each file.
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'auto_lens',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT) || 5432,
});

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
