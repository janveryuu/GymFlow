import type { SQLiteDatabase } from 'expo-sqlite';
import { 
  FULL_SCHEMA_DDL, 
  CREATE_WATER_INTAKE_TABLE, 
  CREATE_NUTRITION_TABLE, 
  CREATE_CHAT_MESSAGE_TABLE 
} from './schema';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
  down?: (db: SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'v1_initial_schema',
    up: async (db: SQLiteDatabase) => {
      await db.execAsync(FULL_SCHEMA_DDL);
    },
  },
  {
    version: 2,
    name: 'v2_add_slug_and_favorites_to_workout',
    up: async (db: SQLiteDatabase) => {
      try {
        await db.execAsync('ALTER TABLE Workout ADD COLUMN slug TEXT;');
      } catch {
        // Column may already exist
      }
      try {
        await db.execAsync('ALTER TABLE Workout ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;');
      } catch {
        // Column may already exist
      }
    },
  },
  {
    version: 3,
    name: 'v3_add_nutrition_water_chat_and_preferences',
    up: async (db: SQLiteDatabase) => {
      await db.execAsync(CREATE_WATER_INTAKE_TABLE);
      await db.execAsync(CREATE_NUTRITION_TABLE);
      await db.execAsync(CREATE_CHAT_MESSAGE_TABLE);
      try {
        await db.execAsync('ALTER TABLE Preferences ADD COLUMN weight_kg REAL;');
      } catch {}
      try {
        await db.execAsync('ALTER TABLE Preferences ADD COLUMN daily_nutrition_target_calories INTEGER;');
      } catch {}
    },
  },
];

/**
 * Migration runner ensuring idempotent schema setup.
 * Tracks applied migrations in the `__migrations` table.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<number> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
  `);

  const appliedRows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM __migrations ORDER BY version ASC'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  let appliedCount = 0;

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      await db.withTransactionAsync(async () => {
        await migration.up(db);
        await db.runAsync(
          'INSERT INTO __migrations (version, name) VALUES (?, ?)',
          [migration.version, migration.name]
        );
      });
      appliedCount++;
    }
  }

  return appliedCount;
}
