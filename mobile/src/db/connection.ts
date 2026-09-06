import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const DB_NAME = 'gymflow.db';

/**
 * Retrieves or initializes the singleton database connection.
 * Applies foreign key constraints, WAL journaling, and executes idempotent migrations.
 */
export async function getDatabase(dbName: string = DB_NAME): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(dbName);

    // Enforce foreign key constraints
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // WAL mode for high concurrent read/write performance
    try {
      await db.execAsync('PRAGMA journal_mode = WAL;');
    } catch {
      // In-memory or some platforms might ignore WAL
    }

    // Execute idempotent migrations
    await runMigrations(db);

    dbInstance = db;
    return db;
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

/**
 * Closes the active database connection and resets the singleton instance.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.closeAsync();
    } catch {
      // Ignore if already closed
    }
    dbInstance = null;
  }
  initPromise = null;
}

/**
 * Closes and deletes the database file for full teardown / reset.
 */
export async function resetDatabase(dbName: string = DB_NAME): Promise<void> {
  await closeDatabase();
  try {
    await SQLite.deleteDatabaseAsync(dbName);
  } catch {
    // Ignore deletion errors if db didn't exist
  }
}

/**
 * Test Seam: allows tests to inject custom in-memory database instance.
 */
export function setDatabaseInstanceForTest(instance: SQLite.SQLiteDatabase | null): void {
  dbInstance = instance;
  initPromise = instance ? Promise.resolve(instance) : null;
}
