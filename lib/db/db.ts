import { Pool } from 'pg';
import { resolveDatabaseUrl } from '@/lib/db/database-url';

// Database connection pool - using an object wrapper to avoid ESM/Turbopack issues
const poolState: { pool: Pool | null } = {
  pool: null,
};

/** Get or create a PostgreSQL connection pool Uses singleton pattern to reuse connections*/
export function getPool(): Pool {
  if (!poolState.pool) {
    const connectionString = resolveDatabaseUrl();
    if (connectionString) {
      poolState.pool = new Pool({
        connectionString,
        ssl:
          process.env.DB_SSL === 'true' || connectionString.includes('neon.tech')
            ? { rejectUnauthorized: false }
            : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      poolState.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'gms',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '1234',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      });
    }

    // Handle pool errors
    poolState.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return poolState.pool;
}

/** Execute a query and return the result*/
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows;
}

/** Execute a query and return a single row*/
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Check if database connection is healthy Returns true if connection is successful, false otherwise*/
export async function checkConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    console.log("Database connection is healthy.");
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/** Close the database connection pool Useful for cleanup in tests or shutdown procedures*/
export async function closePool(): Promise<void> {
  if (poolState.pool) {
    await poolState.pool.end();
    poolState.pool = null;
  }
}
