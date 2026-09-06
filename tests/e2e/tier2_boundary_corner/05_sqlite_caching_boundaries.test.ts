import test from 'node:test';
import assert from 'node:assert/strict';
import { SQLiteStorageEngine } from '../harness/sqlite-storage.ts';

test('B5.1: Querying empty SQLite cache returns empty array without throwing', async () => {
  const db = new SQLiteStorageEngine();
  const workouts = await db.getCachedWorkouts();
  const sessions = await db.getCachedSessions();
  const progress = await db.getCachedProgressEntries();

  assert.deepEqual(workouts, []);
  assert.deepEqual(sessions, []);
  assert.deepEqual(progress, []);
});

test('B5.2: Special characters and apostrophes in workout descriptions are preserved', async () => {
  const db = new SQLiteStorageEngine();
  const desc = "Marcus's extreme & high-intensity workout: 4 sets of 10-12 reps \"until failure\"!";
  await db.cacheWorkouts([
    {
      id: 'wk_test_special',
      title: "Marcus's Bench",
      category: 'chest',
      difficulty: 'intermediate',
      source: 'trainer',
      duration_minutes: 45,
      calories: 300,
      description: desc,
    },
  ]);

  const cached = await db.getCachedWorkoutById('wk_test_special');
  assert.equal(cached?.description, desc);
});

test('B5.3: Database corruption simulation throws expected SQLiteDatabaseCorruptException', async () => {
  const db = new SQLiteStorageEngine();
  db.isCorrupted = true;

  await assert.rejects(async () => {
    await db.getCachedWorkouts();
  }, /SQLiteDatabaseCorruptException/);
});

test('B5.4: Cache update overwrites existing record with updated fields cleanly', async () => {
  const db = new SQLiteStorageEngine();
  await db.cacheWorkouts([
    {
      id: 'wk_overwrite_1',
      title: 'Initial Title',
      category: 'chest',
      difficulty: 'beginner',
      source: 'program',
      duration_minutes: 30,
      calories: 200,
      description: 'Initial',
      completion_percentage: 20,
    },
  ]);

  await db.cacheWorkouts([
    {
      id: 'wk_overwrite_1',
      title: 'Updated Title',
      category: 'chest',
      difficulty: 'intermediate',
      source: 'program',
      duration_minutes: 45,
      calories: 350,
      description: 'Updated',
      completion_percentage: 100,
    },
  ]);

  const cached = await db.getCachedWorkoutById('wk_overwrite_1');
  assert.equal(cached?.title, 'Updated Title');
  assert.equal(cached?.completion_percentage, 100);
});

test('B5.5: Batch caching 100 workout items executes without storage limit error', async () => {
  const db = new SQLiteStorageEngine();
  const batch = Array.from({ length: 100 }, (_, i) => ({
    id: `wk_batch_${i}`,
    title: `Workout ${i}`,
    category: 'chest' as const,
    difficulty: 'intermediate' as const,
    source: 'program',
    duration_minutes: 40,
    calories: 300,
    description: `Batch item ${i}`,
  }));

  await db.cacheWorkouts(batch);
  const cached = await db.getCachedWorkouts();
  assert.equal(cached.length, 100);
});
