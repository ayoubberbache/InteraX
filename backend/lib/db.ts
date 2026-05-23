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

/**
 * Detect potential SQL Injection in string parameters
 */
function detectSqlInjection(value: any): boolean {
  if (typeof value !== 'string') return false;
  
  const patterns = [
    /union\s+select/i,
    /insert\s+into/i,
    /select\s+.*\s+from/i,
    /delete\s+from/i,
    /drop\s+table/i,
    /update\s+.*\s+set/i,
    /or\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
    /and\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
    /--/,
    /\/\*/,
    /exec\s*\(/i,
    /xp_cmdshell/i
  ];
  
  return patterns.some(pattern => pattern.test(value));
}

/** Helper: run a query and return rows */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  if (params) {
    for (const param of params) {
      if (detectSqlInjection(param)) {
        throw new Error('Potential SQL Injection detected and blocked');
      }
    }
  }
  const result = await pool.query(text, params)
  return result.rows as T[]
}

/** Helper: run a query and return the first row or null */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  if (params) {
    for (const param of params) {
      if (detectSqlInjection(param)) {
        throw new Error('Potential SQL Injection detected and blocked');
      }
    }
  }
  const result = await pool.query(text, params)
  return (result.rows[0] as T) ?? null
}

/** Helper: run a query and return the row count */
export async function execute(text: string, params?: any[]): Promise<number> {
  if (params) {
    for (const param of params) {
      if (detectSqlInjection(param)) {
        throw new Error('Potential SQL Injection detected and blocked');
      }
    }
  }
  const result = await pool.query(text, params)
  return result.rowCount ?? 0
}

