import { getMockDatabase, resetMockDatabases } from '../../../tests/mocks/mockExpoSqlite';
import { setDatabaseInstanceForTest } from '../../db/connection';
import { runMigrations } from '../../db/migrations';
import { SyncRepository } from '../SyncRepository';
import { mergeWorkouts, filterMergedCatalog } from '../workoutMerge';
import type { Workout } from '../../types';

describe('Catalog Search & Favorite SQLite Persistence', () => {
  let db: any;
  let repo: SyncRepository;

  beforeEach(async () => {
    resetMockDatabases();
    db = getMockDatabase('catalog_test.db');
    setDatabaseInstanceForTest(db as any);
    await runMigrations(db as any);

    const mockHttp = {
      get: jest.fn().mockRejectedValue(new Error('Network offline')),
      post: jest.fn().mockResolvedValue({ data: { success: true } }),
      patch: jest.fn().mockResolvedValue({ data: {} }),
    } as any;

    repo = new SyncRepository({ db: db as any, httpClient: mockHttp });
  });

  it('searches for exercises across equipment and primary muscles', () => {
    const rawWorkouts: Workout[] = [
      {
        id: 'w1',
        title: 'Barbell Flat Bench Press',
        category: 'chest',
        difficulty: 'intermediate',
        source: 'program',
        duration_minutes: 45,
        calories: 300,
        sets: 4,
        reps: 10,
        image_url: 'https://example.com/bench.png',
        description: 'Pectoral builder',
        completion_percentage: 0,
      },
    ];

    const catalog = mergeWorkouts(rawWorkouts);

    // Search by equipment
    const dumbbellExercises = filterMergedCatalog(catalog, { query: 'dumbbell' });
    expect(dumbbellExercises.length).toBeGreaterThan(0);
    for (const item of dumbbellExercises) {
      const match =
        item.title.toLowerCase().includes('dumbbell') ||
        item.equipment.toLowerCase().includes('dumbbell');
      expect(match).toBe(true);
    }

    // Search by muscle
    const bicepExercises = filterMergedCatalog(catalog, { query: 'bicep' });
    expect(bicepExercises.length).toBeGreaterThan(0);
  });

  it('persists favorite workout toggle in SQLite and retrieves saved workouts', async () => {
    // Seed a workout in the database
    await db.runAsync(
      `INSERT INTO Workout (id, title, category, difficulty, duration_minutes, calories, description, image_url, sets_reps, is_featured, source, sets, reps, completion_percentage, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['w1', 'Bench Press', 'chest', 'intermediate', 45, 320, 'Desc', 'http://img', '4x10', 1, 'trainer', 4, 10, 0, 0]
    );

    // Toggle favorite to true
    const isFavNow = await repo.toggleFavoriteWorkout('w1');
    expect(isFavNow).toBe(true);

    let favs = await repo.getFavoriteWorkouts();
    expect(favs.length).toBe(1);
    expect(favs[0]?.id).toBe('w1');
    expect(favs[0]?.is_favorite).toBe(true);

    // Toggle favorite back to false
    const isFavAfterToggle = await repo.toggleFavoriteWorkout('w1');
    expect(isFavAfterToggle).toBe(false);

    favs = await repo.getFavoriteWorkouts();
    expect(favs.length).toBe(0);
  });

  it('retrieves synthesized guide workouts by ID when guide- prefix is requested', async () => {
    const workout = await repo.getWorkoutById('guide-pull-up');
    expect(workout).toBeDefined();
    expect(workout?.id).toBe('guide-pull-up');
    expect(workout?.title).toBe('Pull-up');
    expect(workout?.calories).toBeGreaterThan(0);
  });
});
