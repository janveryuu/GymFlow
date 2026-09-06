import { DatabaseSync } from 'node:sqlite';

/**
 * Normalizes parameters for node:sqlite DatabaseSync:
 * - Unwraps single array parameter: runAsync(sql, [a, b]) -> [a, b]
 * - Converts boolean true/false to 1/0
 * - Converts undefined to null
 */
function normalizeParams(params: any[]): any[] {
  const flattened = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
  return flattened.map((p) => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });
}

export class MockExpoSQLiteDatabase {
  private db: DatabaseSync;
  public databaseName: string;

  constructor(databaseName: string = 'gymflow.db') {
    this.databaseName = databaseName;
    this.db = new DatabaseSync(':memory:');
    // Enable foreign keys by default
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }

  async runAsync(
    source: string,
    ...params: any[]
  ): Promise<{ lastInsertRowId: number; changes: number }> {
    const norm = normalizeParams(params);
    const stmt = this.db.prepare(source);
    const result = stmt.run(...norm);
    return {
      lastInsertRowId: Number(result.lastInsertRowid),
      changes: Number(result.changes),
    };
  }

  async getFirstAsync<T>(source: string, ...params: any[]): Promise<T | null> {
    const norm = normalizeParams(params);
    const stmt = this.db.prepare(source);
    const row = stmt.get(...norm) as T | undefined;
    return row !== undefined ? row : null;
  }

  async getAllAsync<T>(source: string, ...params: any[]): Promise<T[]> {
    const norm = normalizeParams(params);
    const stmt = this.db.prepare(source);
    return stmt.all(...norm) as T[];
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    const spName = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.db.exec(`SAVEPOINT ${spName};`);
    try {
      await task();
      this.db.exec(`RELEASE ${spName};`);
    } catch (e) {
      try {
        this.db.exec(`ROLLBACK TO ${spName};`);
        this.db.exec(`RELEASE ${spName};`);
      } catch {
        // Ignore rollback failure if db closed
      }
      throw e;
    }
  }

  async closeAsync(): Promise<void> {
    try {
      this.db.close();
    } catch {
      // Ignore if already closed
    }
  }
}

const memoryDatabases = new Map<string, MockExpoSQLiteDatabase>();

export function getMockDatabase(name: string = 'gymflow.db'): MockExpoSQLiteDatabase {
  if (!memoryDatabases.has(name)) {
    memoryDatabases.set(name, new MockExpoSQLiteDatabase(name));
  }
  return memoryDatabases.get(name)!;
}

export function resetMockDatabases(): void {
  for (const db of memoryDatabases.values()) {
    try {
      db.closeAsync();
    } catch {
      // Ignore
    }
  }
  memoryDatabases.clear();
}
