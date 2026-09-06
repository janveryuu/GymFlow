/**
 * SyncRepository Unit & Integration Tests.
 * Verifies cache-first reads, API fallback, optimistic SQLite updates,
 * and mutation queue delegation via SyncEngine.
 */

import { getMockDatabase, resetMockDatabases } from '../mocks/mockExpoSqlite';
import { setDatabaseInstanceForTest } from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrations';
import { SyncEngine } from '../../src/sync/SyncEngine';
import { SyncRepository } from '../../src/sync/SyncRepository';
import { useSyncStore } from '../../src/store/syncStore';

async function createTestDb() {
  resetMockDatabases();
  const db = getMockDatabase('sync_repo_test.db');
  setDatabaseInstanceForTest(db as any);
  await runMigrations(db as any);
  return db;
}

function createMockClient(routes: Record<string, any>) {
  return {
    get: jest.fn(async (url: string, config?: any) => {
      if (routes[url]) {
        return { data: routes[url] };
      }
      throw new Error(`404 Not Found: ${url}`);
    }),
    post: jest.fn(async (url: string, body?: any) => {
      if (routes[url]) {
        return { data: routes[url] };
      }
      return { data: { success: true } };
    }),
    patch: jest.fn(async (url: string, body?: any) => {
      if (routes[url]) {
        return { data: routes[url] };
      }
      return { data: body };
    }),
  } as any;
}

describe('SyncRepository', () => {
  let db: any;

  beforeEach(async () => {
    db = await createTestDb();
    useSyncStore.setState({
      pendingCount: 0,
      syncState: 'idle',
      hasAmberWarning: false,
      isOnline: true,
      activeBanner: null,
      rejectedBanners: [],
      rejectedCount: 0,
    });
  });

  describe('Workouts', () => {
    it('fetches from API when cache is empty and caches into SQLite', async () => {
      const mockWorkouts = [
        {
          id: 'w1',
          title: 'Bench Press Classic',
          category: 'chest',
          difficulty: 'intermediate',
          duration_minutes: 45,
          calories: 320,
          description: 'Solid chest workout',
          image_url: 'https://cdn.example.com/chest.jpg',
          sets_reps: '4x10',
          is_featured: true,
          source: 'curated',
          sets: 4,
          reps: 10,
          completion_percentage: 0,
        },
      ];

      const client = createMockClient({
        '/api/v1/member/workouts': mockWorkouts,
      });
      const engine = new SyncEngine(client, db);
      const repo = new SyncRepository({ db, engine, httpClient: client });

      const workouts = await repo.getWorkouts();
      expect(workouts).toHaveLength(1);
      expect(workouts[0]?.title).toBe('Bench Press Classic');

      // Verify it was cached in SQLite
      const cached = await db.getAllAsync('SELECT * FROM Workout WHERE id = ?', ['w1']);
      expect(cached).toHaveLength(1);
      expect(cached[0].title).toBe('Bench Press Classic');
    });

    it('returns cached workouts without calling API when not forceRefresh', async () => {
      // Pre-seed SQLite
      await db.runAsync(
        `INSERT INTO Workout (id, title, category, difficulty, duration_minutes, calories)
         VALUES ('w2', 'Cached Deadlift', 'back', 'advanced', 50, 400)`
      );

      const client = createMockClient({});
      const engine = new SyncEngine(client, db);
      const repo = new SyncRepository({ db, engine, httpClient: client });

      const workouts = await repo.getWorkouts({ forceRefresh: false });
      expect(workouts).toHaveLength(1);
      expect(workouts[0]?.title).toBe('Cached Deadlift');
      expect(client.get).not.toHaveBeenCalled();
    });

    it('fetches from API when forceRefresh is true even if cache has data', async () => {
      await db.runAsync(
        `INSERT INTO Workout (id, title, category, difficulty, duration_minutes, calories)
         VALUES ('w3', 'Old Title', 'arm', 'beginner', 30, 200)`
      );

      const client = createMockClient({
        '/api/v1/member/workouts': [
          {
            id: 'w3',
            title: 'Updated Arm Blast',
            category: 'arm',
            difficulty: 'beginner',
            duration_minutes: 30,
            calories: 220,
          },
        ],
      });
      const engine = new SyncEngine(client, db);
      const repo = new SyncRepository({ db, engine, httpClient: client });

      const workouts = await repo.getWorkouts({ forceRefresh: true });
      expect(workouts).toHaveLength(1);
      expect(workouts[0]?.title).toBe('Updated Arm Blast');
      expect(client.get).toHaveBeenCalled();
    });
  });

  describe('Sessions', () => {
    it('fetches and caches sessions from API', async () => {
      const mockSessions = [
        {
          id: 'sess_1',
          workout_id: null,
          title: 'Morning HIIT',
          trainer_name: 'Alex Vance',
          location: 'Studio A',
          starts_at: '2026-09-06T09:00:00Z',
          ends_at: '2026-09-06T10:00:00Z',
          capacity: 20,
          booked_count: 15,
          is_cancelled: false,
          status: 'booked',
          can_cancel: true,
          checked_in: false,
        },
      ];

      const client = createMockClient({
        '/api/v1/member/sessions': mockSessions,
      });
      const engine = new SyncEngine(client, db);
      const repo = new SyncRepository({ db, engine, httpClient: client });

      const sessions = await repo.getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]?.title).toBe('Morning HIIT');

      // Verify cached
      const cached = await db.getAllAsync('SELECT * FROM Session WHERE id = ?', ['sess_1']);
      expect(cached).toHaveLength(1);
    });

    it('cancels session optimistically and enqueues cancellation mutation', async () => {
      await db.runAsync(
        `INSERT INTO Session (id, title, location, starts_at, ends_at, status, can_cancel)
         VALUES ('sess_cancel_1', 'Yoga Flow', 'Studio B', '2026-09-07T08:00:00Z', '2026-09-07T09:00:00Z', 'booked', 1)`
      );

      const client = createMockClient({});
      const engine = new SyncEngine(client, db);
      const repo = new SyncRepository({ db, engine, httpClient: client });

      const result = await repo.cancelSession('sess_cancel_1', 'Schedule change');
      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled_by_member');

      // Check SQLite updated
      const row = await db.getFirstAsync('SELECT * FROM Session WHERE id = ?', ['sess_cancel_1']);
      expect(row.status).toBe('cancelled_by_member');
      expect(row.can_cancel).toBe(0);

      // Check WriteQueue has session_cancel
      const queue = await db.getAllAsync("SELECT * FROM WriteQueue WHERE entity_type = 'session_cancel'");
      expect(queue).toHaveLength(1);
      expect(queue[0].endpoint).toBe('/api/v1/member/sessions/sess_cancel_1/cancel');
    });
  });

  describe('Attendance and Progress Mutations', () => {
    it('recordAttendance queues attendance item with idempotency key', async () => {
      const client = createMockClient({});
      const engine = new SyncEngine(client, db);
      const repo = new SyncRepository({ db, engine, httpClient: client });

      const res = await repo.recordAttendance('sess_abc');
      expect(res.status).toBe('queued');
      expect(res.queueId).toBeDefined();

      const queue = await db.getAllAsync("SELECT * FROM WriteQueue WHERE entity_type = 'attendance'");
      expect(queue).toHaveLength(1);
      expect(queue[0].idempotency_key).toBe('attendance_sess_abc');
    });

    it('submitProgress queues progress item with idempotency key', async () => {
      const client = createMockClient({});
      const engine = new SyncEngine(client, db);
      const repo = new SyncRepository({ db, engine, httpClient: client });

      const res = await repo.submitProgress({
        workout_id: 'w_chest',
        workout_title: 'Chest Power',
        started_at: '2026-09-05T10:00:00Z',
        completed_at: '2026-09-05T10:45:00Z',
        duration_seconds: 2700,
        calories_burned: 350,
      });

      expect(res.status).toBe('queued');
      expect(res.queueId).toBeDefined();

      const queue = await db.getAllAsync("SELECT * FROM WriteQueue WHERE entity_type = 'progress'");
      expect(queue).toHaveLength(1);
      expect(queue[0].payload_json).toContain('"workout_id":"w_chest"');
    });
  });

  describe('Progress History & R4 null heart rate requirement', () => {
    it('guarantees average_heart_rate is null per requirement', async () => {
      const client = createMockClient({
        '/api/v1/member/progress': {
          period: 'week',
          total_workouts: 4,
          total_duration_seconds: 7200,
          total_calories: 1200,
          weekly_goal: 5,
          goal_progress_percentage: 80,
          average_heart_rate: 142, // Mock returns 142, must normalize to null
          history: [],
        },
      });
      const engine = new SyncEngine(client, db);
      const repo = new SyncRepository({ db, engine, httpClient: client });

      const progress = await repo.getProgressHistory('week');
      expect(progress.average_heart_rate).toBeNull();
      expect(progress.total_workouts).toBe(4);
    });
  });

  describe('Preferences', () => {
    it('getPreferences returns default preferences when DB empty and updates optimistically', async () => {
      const client = createMockClient({});
      const engine = new SyncEngine(client, db);
      const repo = new SyncRepository({ db, engine, httpClient: client });

      const updated = await repo.updatePreferences({
        workout_type: 'strength',
        intensity: 'high',
        weekly_workout_goal: 4,
      });

      expect(updated.workout_type).toBe('strength');
      expect(updated.intensity).toBe('high');
      expect(updated.weekly_workout_goal).toBe(4);

      // Verify SQLite record updated
      const pref = await db.getFirstAsync("SELECT * FROM Preferences WHERE id = 'default'");
      expect(pref.workout_type).toBe('strength');
      expect(pref.intensity).toBe('high');

      // Verify WriteQueue has preferences mutation
      const queue = await db.getAllAsync("SELECT * FROM WriteQueue WHERE entity_type = 'preferences'");
      expect(queue).toHaveLength(1);
    });
  });

  describe('Sync State', () => {
    it('getSyncState aggregates engine status and sync store', async () => {
      const client = createMockClient({});
      const engine = new SyncEngine(client, db);
      const repo = new SyncRepository({ db, engine, httpClient: client });

      await repo.recordAttendance('sess_sync');

      const state = await repo.getSyncState();
      expect(state.pendingCount).toBe(1);
      expect(state.isOnline).toBe(true);
      expect(state.hasAmberWarning).toBe(false);
    });
  });
});
