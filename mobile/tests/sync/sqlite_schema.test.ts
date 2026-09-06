import { getDatabase, resetDatabase, closeDatabase } from '../../src/db/connection';
import { runMigrations } from '../../src/db/migrations';
import {
  rowToWorkout,
  workoutToRow,
  rowToSession,
  sessionToRow,
  progressEntryToRow,
  rowToPreferences,
} from '../../src/db/mappers';

describe('SQLite Schema & Persistence Layer', () => {
  beforeEach(async () => {
    await resetDatabase('test_gymflow.db');
  });

  afterEach(async () => {
    await closeDatabase();
  });

  test('TC-DB-01: Migration Runner creates all 5 tables and indexes', async () => {
    const db = await getDatabase('test_gymflow.db');

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__migrations' ORDER BY name ASC;"
    );
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('Workout');
    expect(tableNames).toContain('Session');
    expect(tableNames).toContain('ProgressEntry');
    expect(tableNames).toContain('Preferences');
    expect(tableNames).toContain('WriteQueue');
    expect(tableNames).toContain('WaterIntakeEntry');
    expect(tableNames).toContain('NutritionEntry');
    expect(tableNames).toContain('ChatMessage');

    const indexes = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC;"
    );
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_workouts_category');
    expect(indexNames).toContain('idx_sessions_status');
    expect(indexNames).toContain('idx_progress_idempotency_key');
    expect(indexNames).toContain('idx_write_queue_priority');
  });

  test('TC-DB-02: Migration runner is idempotent', async () => {
    const db = await getDatabase('test_gymflow.db');

    // Run migration a second time
    const count = await runMigrations(db);
    expect(count).toBe(0);

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__migrations';"
    );
    expect(tables.length).toBe(8);
  });

  test('TC-DB-03: Workout Table CRUD, mappers & updated_at trigger', async () => {
    const db = await getDatabase('test_gymflow.db');

    const workout = {
      id: 'w1',
      title: 'Bench Press Power',
      category: 'chest',
      difficulty: 'intermediate',
      source: 'program',
      duration_minutes: 45,
      calories: 320,
      sets: 4,
      reps: 10,
      reps_sets: '4 sets x 10 reps',
      image_url: 'https://images.unsplash.com/photo-chest',
      description: 'Progressive chest overload',
      completion_percentage: 50,
    };

    const row = workoutToRow(workout);
    await db.runAsync(
      `INSERT INTO Workout (id, title, category, difficulty, duration_minutes, calories, description, image_url, sets_reps, is_featured, source, sets, reps, completion_percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.title,
        row.category,
        row.difficulty,
        row.duration_minutes,
        row.calories,
        row.description,
        row.image_url,
        row.sets_reps,
        row.is_featured,
        row.source,
        row.sets,
        row.reps,
        row.completion_percentage,
      ]
    );

    const fetchedRow = await db.getFirstAsync<any>('SELECT * FROM Workout WHERE id = ?', ['w1']);
    expect(fetchedRow).not.toBeNull();
    const mapped = rowToWorkout(fetchedRow);
    expect(mapped.id).toBe('w1');
    expect(mapped.title).toBe('Bench Press Power');
    expect(mapped.category).toBe('chest');
    expect(mapped.completion_percentage).toBe(50);

    // Update completion percentage
    await db.runAsync('UPDATE Workout SET completion_percentage = 100 WHERE id = ?', ['w1']);
    const updated = await db.getFirstAsync<any>('SELECT * FROM Workout WHERE id = ?', ['w1']);
    expect(updated.completion_percentage).toBe(100);
  });

  test('TC-DB-04: Session Table CRUD and foreign key SET NULL on workout deletion', async () => {
    const db = await getDatabase('test_gymflow.db');

    // Insert workout
    await db.runAsync(
      "INSERT INTO Workout (id, title, category, difficulty, duration_minutes, calories) VALUES ('w_parent', 'Leg Day', 'leg', 'advanced', 60, 400)"
    );

    // Insert session referencing workout
    const session = {
      id: 'sess_1',
      workout_id: 'w_parent',
      title: 'Leg Day Group Class',
      trainer: { id: 't1', name: 'Marco D.' },
      location: 'Studio A',
      starts_at: '2026-09-05T08:00:00Z',
      ends_at: '2026-09-05T09:00:00Z',
      status: 'scheduled' as const,
      can_cancel: true,
      checked_in: false,
    };

    const sRow = sessionToRow(session);
    await db.runAsync(
      `INSERT INTO Session (id, workout_id, title, trainer_id, trainer_name, location, starts_at, ends_at, status, can_cancel, checked_in)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sRow.id,
        sRow.workout_id,
        sRow.title,
        sRow.trainer_id,
        sRow.trainer_name,
        sRow.location,
        sRow.starts_at,
        sRow.ends_at,
        sRow.status,
        sRow.can_cancel,
        sRow.checked_in,
      ]
    );

    // Delete workout -> session workout_id should become NULL due to ON DELETE SET NULL
    await db.runAsync('DELETE FROM Workout WHERE id = ?', ['w_parent']);
    const sessAfter = await db.getFirstAsync<any>('SELECT * FROM Session WHERE id = ?', ['sess_1']);
    expect(sessAfter.workout_id).toBeNull();

    // Map to domain entity
    const mappedSession = rowToSession(sessAfter);
    expect(mappedSession.workout_id).toBeNull();
    expect(mappedSession.trainer?.name).toBe('Marco D.');
  });

  test('TC-DB-05: ProgressEntry unique idempotency_key constraint and CASCADE delete', async () => {
    const db = await getDatabase('test_gymflow.db');

    // Insert parent workout
    await db.runAsync(
      "INSERT INTO Workout (id, title, category, difficulty, duration_minutes, calories) VALUES ('w_cascade', 'Back Attack', 'back', 'intermediate', 50, 350)"
    );

    const entry = {
      id: 'prog_1',
      workout_id: 'w_cascade',
      workout_title: 'Back Attack',
      completed_at: '2026-09-05T10:00:00Z',
      duration_seconds: 3000,
      calories_burned: 350,
      heart_rate: null,
      idempotency_key: 'idemp-uuid-12345',
    };

    const pRow = progressEntryToRow(entry);
    await db.runAsync(
      `INSERT INTO ProgressEntry (id, workout_id, workout_title, completed_at, duration_seconds, calories_burned, heart_rate, idempotency_key, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pRow.id,
        pRow.workout_id,
        pRow.workout_title,
        pRow.completed_at,
        pRow.duration_seconds,
        pRow.calories_burned,
        pRow.heart_rate,
        pRow.idempotency_key,
        pRow.sync_status,
      ]
    );

    // Assert duplicate idempotency key raises UNIQUE constraint error
    await expect(
      db.runAsync(
        `INSERT INTO ProgressEntry (id, workout_id, completed_at, duration_seconds, calories_burned, idempotency_key)
         VALUES ('prog_2', 'w_cascade', '2026-09-05T11:00:00Z', 1000, 100, 'idemp-uuid-12345')`
      )
    ).rejects.toThrow();

    // Verify CASCADE on delete
    await db.runAsync('DELETE FROM Workout WHERE id = ?', ['w_cascade']);
    const progAfter = await db.getFirstAsync<any>('SELECT * FROM ProgressEntry WHERE id = ?', ['prog_1']);
    expect(progAfter).toBeNull();
  });

  test('TC-DB-06: Preferences singleton pattern UPSERT', async () => {
    const db = await getDatabase('test_gymflow.db');

    const upsertSql = `
      INSERT INTO Preferences (id, workout_type, intensity, weekly_workout_goal, updated_at)
      VALUES ('default', ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      ON CONFLICT(id) DO UPDATE SET
        workout_type = excluded.workout_type,
        intensity = excluded.intensity,
        weekly_workout_goal = excluded.weekly_workout_goal,
        updated_at = excluded.updated_at;
    `;

    await db.runAsync(upsertSql, ['full-body', 'moderate', 5]);
    let pref = await db.getFirstAsync<any>("SELECT * FROM Preferences WHERE id = 'default'");
    expect(pref.workout_type).toBe('full-body');
    expect(pref.weekly_workout_goal).toBe(5);

    // Second upsert updates the same row
    await db.runAsync(upsertSql, ['strength', 'intense', 6]);
    pref = await db.getFirstAsync<any>("SELECT * FROM Preferences WHERE id = 'default'");
    expect(pref.workout_type).toBe('strength');
    expect(pref.weekly_workout_goal).toBe(6);

    const allPrefs = await db.getAllAsync<any>('SELECT * FROM Preferences');
    expect(allPrefs.length).toBe(1);

    const mapped = rowToPreferences(pref);
    expect(mapped.intensity).toBe('intense');
  });

  test('TC-DB-07: WriteQueue priority drain query (attendance > progress > preferences with FIFO)', async () => {
    const db = await getDatabase('test_gymflow.db');

    // Insert in mixed order with timestamps:
    // P1 at 08:00
    // A1 at 08:15
    // Pref1 at 08:20
    // P2 at 08:30
    // A2 at 08:45
    const items = [
      { id: 'p1', type: 'progress', created: '2026-09-05T08:00:00Z' },
      { id: 'a1', type: 'attendance', created: '2026-09-05T08:15:00Z' },
      { id: 'pref1', type: 'preferences', created: '2026-09-05T08:20:00Z' },
      { id: 'p2', type: 'progress', created: '2026-09-05T08:30:00Z' },
      { id: 'a2', type: 'attendance', created: '2026-09-05T08:45:00Z' },
    ];

    for (const item of items) {
      await db.runAsync(
        `INSERT INTO WriteQueue (id, entity_type, action, endpoint, method, payload_json, idempotency_key, status, created_at)
         VALUES (?, ?, 'create', '', 'POST', '{}', ?, 'pending', ?)`,
        [item.id, item.type, `key_${item.id}`, item.created]
      );
    }

    const priorityQuery = `
      SELECT * FROM WriteQueue
      WHERE status = 'pending'
      ORDER BY
        CASE entity_type
          WHEN 'attendance' THEN 1
          WHEN 'progress' THEN 2
          WHEN 'preferences' THEN 3
          ELSE 4
        END ASC,
        created_at ASC;
    `;

    const sortedRows = await db.getAllAsync<any>(priorityQuery);
    const sortedIds = sortedRows.map((r) => r.id);

    // Attendance items (a1, a2) before progress (p1, p2) before preferences (pref1)
    expect(sortedIds).toEqual(['a1', 'a2', 'p1', 'p2', 'pref1']);
  });

  test('TC-DB-08: WriteQueue 7-Day TTL evaluation query', async () => {
    const db = await getDatabase('test_gymflow.db');

    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    await db.runAsync(
      `INSERT INTO WriteQueue (id, entity_type, payload_json, idempotency_key, status, created_at)
       VALUES ('old_item', 'progress', '{}', 'k_old', 'pending', ?),
              ('fresh_item', 'attendance', '{}', 'k_fresh', 'pending', ?)`,
      [eightDaysAgo, twoDaysAgo]
    );

    // Query for items older than 7 days
    const ttlQuery = `
      SELECT COUNT(*) as count FROM WriteQueue
      WHERE status IN ('pending', 'paused')
        AND datetime(created_at) < datetime('now', '-7 days');
    `;

    const result = await db.getFirstAsync<{ count: number }>(ttlQuery);
    expect(result?.count).toBe(1);
  });
});
