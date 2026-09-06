/**
 * SQLite Local Cache & Persistence Engine for GymFlow Mobile E2E tests.
 * Implements tables: Workout, Session, ProgressEntry, Preferences, WriteQueue
 * following the exact expo-sqlite schemas defined in PROJECT.md and survey reports.
 */

import type {
  Workout,
  Session,
  ProgressEntry,
  Preferences,
  WriteQueueItem,
  QueueEntityType,
  QueueAction,
  QueueStatus,
} from './types.ts';

export class SQLiteStorageEngine {
  public workouts = new Map<string, Workout & { cached_at: string }>();
  public sessions = new Map<string, Session & { cached_at: string }>();
  public progressEntries = new Map<string, ProgressEntry>();
  public preferences: (Preferences & { id: string; updated_at: string }) | null = null;
  public writeQueue = new Map<string, WriteQueueItem>();

  public isCorrupted = false;

  public reset(): void {
    this.workouts.clear();
    this.sessions.clear();
    this.progressEntries.clear();
    this.preferences = null;
    this.writeQueue.clear();
    this.isCorrupted = false;
  }

  private checkHealth(): void {
    if (this.isCorrupted) {
      throw new Error('SQLiteDatabaseCorruptException: Database disk image is malformed');
    }
  }

  // ── Workout Cache Operations ──────────────────────────────────────────
  public async cacheWorkouts(items: Workout[]): Promise<void> {
    this.checkHealth();
    const now = new Date().toISOString();
    for (const item of items) {
      this.workouts.set(item.id, { ...item, cached_at: now });
    }
  }

  public async getCachedWorkouts(filter?: { category?: string; difficulty?: string }): Promise<Workout[]> {
    this.checkHealth();
    let result = Array.from(this.workouts.values());
    if (filter?.category && filter.category !== 'all') {
      result = result.filter((w) => w.category === filter.category || w.type === filter.category);
    }
    if (filter?.difficulty && filter.difficulty !== 'all') {
      result = result.filter((w) => w.difficulty === filter.difficulty);
    }
    return result;
  }

  public async getCachedWorkoutById(id: string): Promise<Workout | null> {
    this.checkHealth();
    return this.workouts.get(id) || null;
  }

  // ── Session Cache Operations ──────────────────────────────────────────
  public async cacheSessions(items: Session[]): Promise<void> {
    this.checkHealth();
    const now = new Date().toISOString();
    for (const item of items) {
      this.sessions.set(item.id, { ...item, cached_at: now });
    }
  }

  public async getCachedSessions(): Promise<Session[]> {
    this.checkHealth();
    return Array.from(this.sessions.values());
  }

  public async updateSessionStatus(
    sessionId: string,
    status: Session['status'],
    updates?: Partial<Session>
  ): Promise<void> {
    this.checkHealth();
    const s = this.sessions.get(sessionId);
    if (s) {
      s.status = status;
      if (updates) Object.assign(s, updates);
      this.sessions.set(sessionId, s);
    }
  }

  // ── ProgressEntry Local History Operations ────────────────────────────
  public async insertProgressEntry(entry: ProgressEntry): Promise<void> {
    this.checkHealth();
    this.progressEntries.set(entry.id, { ...entry });
  }

  public async getCachedProgressEntries(): Promise<ProgressEntry[]> {
    this.checkHealth();
    return Array.from(this.progressEntries.values());
  }

  // ── Preferences Operations ────────────────────────────────────────────
  public async savePreferences(prefs: Preferences): Promise<void> {
    this.checkHealth();
    this.preferences = {
      id: 'current_user',
      ...prefs,
      updated_at: new Date().toISOString(),
    };
  }

  public async getPreferences(): Promise<Preferences | null> {
    this.checkHealth();
    return this.preferences ? { ...this.preferences } : null;
  }

  // ── WriteQueue Subsystem Operations ───────────────────────────────────
  public async enqueue(item: {
    entity_type: QueueEntityType;
    action: QueueAction;
    endpoint: string;
    method: 'POST' | 'PATCH' | 'DELETE';
    payload: any;
    idempotency_key?: string;
    created_at?: string;
  }): Promise<WriteQueueItem> {
    this.checkHealth();
    const id = `wq_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const queueItem: WriteQueueItem = {
      id,
      entity_type: item.entity_type,
      action: item.action,
      endpoint: item.endpoint,
      method: item.method,
      payload: item.payload,
      idempotency_key: item.idempotency_key,
      created_at: item.created_at || new Date().toISOString(),
      retry_count: 0,
      status: 'pending',
      last_error: null,
    };
    this.writeQueue.set(id, queueItem);
    return queueItem;
  }

  public async getQueueItems(status?: QueueStatus): Promise<WriteQueueItem[]> {
    this.checkHealth();
    const items = Array.from(this.writeQueue.values());
    if (status) {
      return items.filter((i) => i.status === status);
    }
    return items;
  }

  public async updateQueueItem(id: string, updates: Partial<WriteQueueItem>): Promise<void> {
    this.checkHealth();
    const item = this.writeQueue.get(id);
    if (item) {
      Object.assign(item, updates);
      this.writeQueue.set(id, item);
    }
  }

  public async removeQueueItem(id: string): Promise<void> {
    this.checkHealth();
    this.writeQueue.delete(id);
  }

  /**
   * Checks if any pending item in the queue is older than 7 days (7 * 86400 * 1000 ms).
   */
  public has7DayTtlExpired(now: Date = new Date()): boolean {
    const TTL_MS = 7 * 24 * 60 * 60 * 1000;
    const nowTime = now.getTime();
    for (const item of this.writeQueue.values()) {
      if (item.status === 'pending') {
        const itemAge = nowTime - new Date(item.created_at).getTime();
        if (itemAge > TTL_MS) {
          return true;
        }
      }
    }
    return false;
  }
}
