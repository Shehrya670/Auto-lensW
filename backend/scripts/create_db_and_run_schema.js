const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const config = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
};

const targetDb = process.env.DB_NAME || 'auto_lens';

async function run() {
  // connect to default 'postgres' database to create target db
  const client = new Client({ ...config, database: 'postgres' });
  try {
    console.log('Attempting to connect to Postgres with config:', { user: config.user, host: config.host, port: config.port });
    await client.connect();
    console.log('Connected to postgres as admin');

    // check if database exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [targetDb]);
    if (res.rowCount === 0) {
      console.log(`Database ${targetDb} does not exist — creating...`);
      await client.query(`CREATE DATABASE ${targetDb}`);
      console.log(`Created database ${targetDb}`);
    } else {
      console.log(`Database ${targetDb} already exists`);
    }
  } catch (err) {
    console.error('Error creating/checking database:', err && err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  // look for SQL schema files in repo root and backend/sql
  const candidates = [
    path.resolve(__dirname, '..', 'schema.sql'),
    path.resolve(__dirname, '..', 'sql', 'schema.sql'),
    path.resolve(__dirname, '..', 'db', 'schema.sql'),
    path.resolve(__dirname, '..', '..', 'Auto-Lens.session.sql')
  ];

  const found = candidates.filter(f => fs.existsSync(f));
  if (found.length === 0) {
    console.log('No schema SQL file found in expected locations:', candidates.join(', '));
    console.log('If you have a schema file, place it at one of the candidate paths or provide its path.');
    return;
  }

  // run each schema file against the new database
  const schemaPath = found[0];
  console.log('Using schema file:', schemaPath);
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const dbClient = new Client({ ...config, database: targetDb });
  try {
    await dbClient.connect();
    console.log(`Connected to ${targetDb} — running schema...`);
    await dbClient.query(sql);
    console.log('Schema executed successfully');
  } catch (err) {
    console.error('Error running schema:', err && err.message);
    console.error(err && err.stack);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

run();
