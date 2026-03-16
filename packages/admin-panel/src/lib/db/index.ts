import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema';

// Create database directory if it doesn't exist
const dbPath = process.env.DATABASE_PATH || './data/admin.db';

// Initialize SQLite connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Export schema for use in queries
export { schema };

// Database connection helper
export function getDb() {
  return db;
}

// Close database connection
export function closeDb() {
  sqlite.close();
}
