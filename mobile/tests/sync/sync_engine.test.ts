/**
 * SyncEngine Unit & Integration Tests.
 * Uses in-memory SQLite (via mockExpoSqlite) and mock HTTP clients.
 */

import { getMockDatabase, resetMockDatabases } from '../mocks/mockExpoSqlite';
import { setDatabaseInstanceForTest } from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrations';
import {
  SyncEngine,
  compareQueueItems,
  has7DayTtlExpired,
  ENTITY_PRIORITIES,
} from '../../src/sync/SyncEngine';
import { useSyncStore } from '../../src/store/syncStore';

// Helper to create a fresh in-memory DB with migrations applied
async function createTestDb() {
  resetMockDatabases();
  const db = getMockDatabase('sync_engine_test.db');
  setDatabaseInstanceForTest(db as any);
  await runMigrations(db as any);
  return db;
}

// Helper to create a mock HTTP client
function createMockClient(responses: { status: number; data?: any }[]) {
  let callIndex = 0;
  return {
    request: jest.fn(async () => {
      const resp = responses[callIndex] ?? { status: 200, data: {} };
      callIndex++;
      if (resp.status >= 400) {
        const err: any = new Error(`HTTP ${resp.status}`);
        err.response = { status: resp.status, data: resp.data ?? {} };
        throw err;
      }
      return { status: resp.status, data: resp.data ?? {} };
    }),
  };
}

// Helper to insert a queue item directly into the DB
async function insertQueueItem(db: any, overrides: Partial<{
  id: string;
  entity_type: string;
  action: string;
  endpoint: string;
  method: string;
  payload_json: string;
  idempotency_key: string | null;
  status: string;
  created_at: string;
}> = {}) {
  const id = overrides.id ?? `wq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await db.runAsync(
    `INSERT INTO WriteQueue (id, entity_type, action, endpoint, method, payload_json, idempotency_key, attempt_count, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      id,
      overrides.entity_type ?? 'attendance',
      overrides.action ?? 'create',
      overrides.endpoint ?? '/api/v1/member/attendance',
      overrides.method ?? 'POST',
      overrides.payload_json ?? '{"session_id":"sess-1"}',
      overrides.idempotency_key ?? null,
      overrides.status ?? 'pending',
      overrides.created_at ?? new Date().toISOString(),
    ]
  );
  return id;
}

describe('SyncEngine', () => {
  let db: ReturnType<typeof getMockDatabase>;

  beforeEach(async () => {
    db = await createTestDb();
    useSyncStore.getState().reset();
  });

  afterEach(() => {
    setDatabaseInstanceForTest(null);
  });

  // ── Pure utility tests ─────────────────────────────────────────────

  describe('compareQueueItems', () => {
    it('TC-SE-UTIL-01: sorts attendance before progress', () => {
      const attendance = {
        id: 'a', entity_type: 'attendance', action: 'create', endpoint: '', method: 'POST',
        payload: {}, created_at: '2026-01-01T00:00:00Z', retry_count: 0, attempt_count: 0, status: 'pending',
      };
      const progress = {
        id: 'b', entity_type: 'progress', action: 'create', endpoint: '', method: 'POST',
        payload: {}, created_at: '2026-01-01T00:00:00Z', retry_count: 0, attempt_count: 0, status: 'pending',
      };
      expect(compareQueueItems(attendance as any, progress as any)).toBeLessThan(0);
      expect(compareQueueItems(progress as any, attendance as any)).toBeGreaterThan(0);
    });

    it('TC-SE-UTIL-02: FIFO within same entity type', () => {
      const item1 = {
        id: 'a', entity_type: 'attendance', action: 'create', endpoint: '', method: 'POST',
        payload: {}, created_at: '2026-01-01T00:00:00Z', retry_count: 0, attempt_count: 0, status: 'pending',
      };
      const item2 = {
        id: 'b', entity_type: 'attendance', action: 'create', endpoint: '', method: 'POST',
        payload: {}, created_at: '2026-01-01T00:01:00Z', retry_count: 0, attempt_count: 0, status: 'pending',
      };
      expect(compareQueueItems(item1 as any, item2 as any)).toBeLessThan(0);
    });

    it('TC-SE-UTIL-03: ENTITY_PRIORITIES are correct', () => {
      expect(ENTITY_PRIORITIES.attendance).toBe(1);
      expect(ENTITY_PRIORITIES.progress).toBe(2);
      expect(ENTITY_PRIORITIES.preferences).toBe(3);
      expect(ENTITY_PRIORITIES.profile).toBe(3);
    });
  });

  describe('has7DayTtlExpired', () => {
    it('TC-SE-UTIL-04: returns false when all items are recent', () => {
      const items = [
        { status: 'pending', created_at: new Date().toISOString() },
        { status: 'pending', created_at: new Date(Date.now() - 1000).toISOString() },
      ] as any[];
      expect(has7DayTtlExpired(items)).toBe(false);
    });

    it('TC-SE-UTIL-05: returns true when any pending item is older than 7 days', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const items = [
        { status: 'pending', created_at: eightDaysAgo },
      ] as any[];
      expect(has7DayTtlExpired(items)).toBe(true);
    });

    it('TC-SE-UTIL-06: does not count rejected items for TTL', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const items = [
        { status: 'rejected', created_at: eightDaysAgo },
      ] as any[];
      expect(has7DayTtlExpired(items)).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('TC-SE-02a: retry_count=0 gives ~2000ms with deterministic jitter=0.5', () => {
      const delay = SyncEngine.calculateBackoffDelay(0, 0.5);
      expect(delay).toBe(2000); // base 2000, jitter factor = 1.0
    });

    it('TC-SE-02b: retry_count=3 gives ~16000ms with jitter=0.5', () => {
      const delay = SyncEngine.calculateBackoffDelay(3, 0.5);
      expect(delay).toBe(16000); // 2000 * 2^3 = 16000, factor=1.0
    });

    it('TC-SE-02c: caps at 300000ms', () => {
      const delay = SyncEngine.calculateBackoffDelay(100, 0.5);
      expect(delay).toBe(300000);
    });

    it('TC-SE-02d: applies ±20% jitter', () => {
      const minDelay = SyncEngine.calculateBackoffDelay(0, 0.0); // factor = 0.8
      const maxDelay = SyncEngine.calculateBackoffDelay(0, 1.0); // factor = 1.2
      expect(minDelay).toBe(Math.round(2000 * 0.8));
      expect(maxDelay).toBe(Math.round(2000 * 1.2));
    });
  });

  // ── SyncEngine integration tests (with in-memory SQLite) ────────────

  describe('drainQueue integration', () => {
    it('TC-SE-01: Priority ordering — attendance processed before progress', async () => {
      // Insert progress first (older timestamp), then attendance
      const progressId = await insertQueueItem(db, {
        entity_type: 'progress',
        created_at: new Date(Date.now() - 2000).toISOString(),
      });
      const attendanceId = await insertQueueItem(db, {
        entity_type: 'attendance',
        created_at: new Date(Date.now() - 1000).toISOString(),
      });

      const mockClient = createMockClient([
        { status: 201, data: { id: 'att-1' } },
        { status: 201, data: { id: 'prog-1' } },
      ]);
      const engine = new SyncEngine(mockClient, db as any);
      engine.setToken('test-token');

      const result = await engine.drainQueue();
      expect(result.processed).toBe(2);
      expect(engine.processedOrder[0]).toBe(attendanceId);
      expect(engine.processedOrder[1]).toBe(progressId);
    });

    it('TC-SE-03: 401 response — queue pauses without dropping items', async () => {
      const itemId = await insertQueueItem(db, { entity_type: 'attendance' });

      const mockClient = createMockClient([{ status: 401, data: { message: 'Unauthorized' } }]);
      const engine = new SyncEngine(mockClient, db as any);
      engine.setToken('test-token');

      const result = await engine.drainQueue();

      expect(result.paused).toBe(true);
      expect(engine.state).toBe('paused');
      expect(result.processed).toBe(0);

      // Item must still be in the queue
      const rows = await db.getAllAsync<any>('SELECT * FROM WriteQueue WHERE id = ?', [itemId]);
      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('pending'); // Reverted from in_flight
    });

    it('TC-SE-04: 409 response — item marked rejected, banner added, not deleted', async () => {
      const sessionId = 'sess-conflict-1';
      // Insert a session to update
      await db.runAsync(
        `INSERT OR REPLACE INTO Session (id, title, location, starts_at, ends_at, status, can_cancel, checked_in)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, 'Test Session', 'Studio A', '2026-09-06T10:00:00Z', '2026-09-06T11:00:00Z', 'scheduled', 1, 0]
      );

      const itemId = await insertQueueItem(db, {
        entity_type: 'attendance',
        payload_json: JSON.stringify({ session_id: sessionId }),
      });

      const mockClient = createMockClient([
        { status: 409, data: { message: 'Session cancelled by gym.' } },
      ]);
      const engine = new SyncEngine(mockClient, db as any);
      engine.setToken('test-token');

      const result = await engine.drainQueue();
      expect(result.rejected).toBe(1);
      expect(result.processed).toBe(0);

      // Item must NOT be deleted — must be marked rejected
      const rows = await db.getAllAsync<any>('SELECT * FROM WriteQueue WHERE id = ?', [itemId]);
      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('rejected');

      // Local session must be updated to cancelled_by_gym
      const sessionRows = await db.getAllAsync<any>('SELECT * FROM Session WHERE id = ?', [sessionId]);
      expect(sessionRows[0].status).toBe('cancelled_by_gym');
      expect(sessionRows[0].can_cancel).toBe(0);

      // Banner must have been set in store
      const storeState = useSyncStore.getState();
      expect(storeState.rejectedBanners.length).toBe(1);
    });

    it('TC-SE-05: Idempotency deduplication — same key enqueued twice, only one item', async () => {
      const engine = new SyncEngine({}, db as any);
      const key = 'idem-key-abc123';

      const item1 = await engine.enqueue({
        entity_type: 'attendance',
        endpoint: '/api/v1/member/attendance',
        method: 'POST',
        payload: { session_id: 'sess-1' },
        idempotency_key: key,
      });

      const item2 = await engine.enqueue({
        entity_type: 'attendance',
        endpoint: '/api/v1/member/attendance',
        method: 'POST',
        payload: { session_id: 'sess-1' },
        idempotency_key: key,
      });

      // Both should return the same item (deduped)
      expect(item1.id).toBe(item2.id);

      const rows = await db.getAllAsync<any>(
        'SELECT * FROM WriteQueue WHERE idempotency_key = ?',
        [key]
      );
      expect(rows.length).toBe(1);
    });

    it('TC-SE-06: 7-day TTL flag — item older than 7 days triggers amber warning', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const items = [
        {
          id: 'old-item', entity_type: 'attendance', action: 'create', endpoint: '',
          method: 'POST', payload: {}, created_at: eightDaysAgo, retry_count: 0,
          attempt_count: 0, status: 'pending',
        },
      ] as any[];
      expect(has7DayTtlExpired(items)).toBe(true);
    });

    it('TC-SE-07: Successful drain (201) — item deleted from queue, processedOrder contains ID', async () => {
      const itemId = await insertQueueItem(db, { entity_type: 'attendance' });

      const mockClient = createMockClient([{ status: 201, data: { id: 'att-1' } }]);
      const engine = new SyncEngine(mockClient, db as any);
      engine.setToken('test-token');

      const result = await engine.drainQueue();
      expect(result.processed).toBe(1);
      expect(engine.processedOrder).toContain(itemId);

      // Item must be DELETED from queue after success
      const rows = await db.getAllAsync<any>('SELECT * FROM WriteQueue WHERE id = ?', [itemId]);
      expect(rows.length).toBe(0);
    });

    it('TC-SE-08: Network failure — item stays pending, state becomes offline', async () => {
      const itemId = await insertQueueItem(db, { entity_type: 'attendance' });

      const networkErrorClient = {
        request: jest.fn().mockRejectedValue(new Error('Network request failed')),
      };
      const engine = new SyncEngine(networkErrorClient, db as any);
      engine.setToken('test-token');

      await engine.drainQueue();
      expect(engine.state).toBe('offline');

      // Item must still be in queue as pending
      const rows = await db.getAllAsync<any>('SELECT * FROM WriteQueue WHERE id = ?', [itemId]);
      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('pending');
      expect(rows[0].next_attempt_at).not.toBeNull();

      // Clean up timer
      engine.destroy();
    });

    it('TC-SE-09: getStatus updates syncStore with pending count and 7-day warning', async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      await insertQueueItem(db, { entity_type: 'attendance', created_at: eightDaysAgo });
      await insertQueueItem(db, { entity_type: 'progress' });

      const engine = new SyncEngine({}, db as any);
      const status = await engine.getStatus();

      expect(status.pending_count).toBe(2);
      expect(status.has_7day_warning).toBe(true);

      const storeState = useSyncStore.getState();
      expect(storeState.pendingCount).toBe(2);
      expect(storeState.hasAmberWarning).toBe(true);
    });

    it('TC-SE-10: setToken resumes paused queue', async () => {
      const engine = new SyncEngine({}, db as any);
      engine.state = 'paused';
      useSyncStore.getState().setSyncState('paused');

      // setToken should resume
      engine.setToken('new-token');
      expect(engine.state).toBe('idle');
      expect(useSyncStore.getState().syncState).toBe('idle');
    });

    it('TC-SE-11: handleNetworkChange offline sets state to offline', () => {
      const engine = new SyncEngine({}, db as any);
      engine.state = 'idle';

      engine.handleNetworkChange(false);
      expect(engine.state).toBe('offline');
      expect(useSyncStore.getState().isOnline).toBe(false);

      engine.destroy();
    });

    it('TC-SE-12: 200 response treated same as 201 (idempotency equivalence)', async () => {
      const itemId = await insertQueueItem(db, { entity_type: 'attendance' });

      const mockClient = createMockClient([{ status: 200, data: { id: 'att-existing' } }]);
      const engine = new SyncEngine(mockClient, db as any);
      engine.setToken('test-token');

      const result = await engine.drainQueue();
      expect(result.processed).toBe(1);

      // Item deleted after 200 just like 201
      const rows = await db.getAllAsync<any>('SELECT * FROM WriteQueue WHERE id = ?', [itemId]);
      expect(rows.length).toBe(0);
    });
  });
});
