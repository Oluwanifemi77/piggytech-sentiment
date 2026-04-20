/**
 * lib/db.ts
 * Neon Postgres connection — works in both Vercel serverless and local dev.
 * Uses HTTP-based transport so no persistent connection pool needed.
 */
import { neon } from '@neondatabase/serverless';

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set. See .env.local.');
  }
  return neon(process.env.DATABASE_URL);
}
