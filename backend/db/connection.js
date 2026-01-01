import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let pool = null;

/**
 * Initialize PostgreSQL connection pool
 * @returns {pg.Pool} Database connection pool
 */
export const getPool = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
};

/**
 * Initialize database schema
 */
export const initSchema = async () => {
  const pool = getPool();
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(255) PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      content_key VARCHAR(500),
      last_saved_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);
  `;

  try {
    await pool.query(schemaSQL);
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Error initializing schema:', error);
    throw error;
  }
};

/**
 * Close database connection pool
 */
export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

