/**
 * Shared PostgreSQL connection pool.
 * Import this singleton instead of creating a new Pool in each file.
 */
const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const connectionTimeoutMillis = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10);
const idleTimeoutMillis = parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10);
const max = parseInt(process.env.DB_MAX_POOL_SIZE || '10', 10);

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'false' ? false : (isProduction ? { rejectUnauthorized: false } : false),
        connectionTimeoutMillis,
        idleTimeoutMillis,
        max,
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'auto_lens',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis,
        idleTimeoutMillis,
        max,
      };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
