import { Pool } from 'pg'

/**
 * PostgreSQL Connection Pool (Singleton)
 * Uses DATABASE_URL from .env.local
 */
const globalForDb = globalThis as unknown as { pool: Pool | undefined }

export const pool: Pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ WARNING: DATABASE_URL is not set in environment variables!');
}

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool
}

/** Helper: run a query and return rows */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params)
  return result.rows as T[]
}

/** Helper: run a query and return the first row or null */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await pool.query(text, params)
  return (result.rows[0] as T) ?? null
}

/** Helper: run a query and return the row count */
export async function execute(text: string, params?: any[]): Promise<number> {
  const result = await pool.query(text, params)
  return result.rowCount ?? 0
}
