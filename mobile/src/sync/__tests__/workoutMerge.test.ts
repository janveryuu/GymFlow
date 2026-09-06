import {
  mergeWorkouts,
  filterMergedCatalog,
  mapMuscleToCategory,
} from '../workoutMerge';
import type { Workout } from '../../types';

describe('Workout Merge & Domain Modeling Layer', () => {
  const mockMswWorkouts: Workout[] = [
    {
      id: 'w1',
      title: 'Bench Press Power',
      category: 'chest',
      difficulty: 'intermediate',
      source: 'trainer',
      duration_minutes: 45,
      calories: 320,
      sets: 4,
      reps: 10,
      image_url: 'https://example.com/bench.jpg',
      description: 'Barbell bench progression.',
      completion_percentage: 100,
    },
    {
      id: 'w8',
      title: 'Squat Strength Ladder',
      category: 'leg',
      difficulty: 'advanced',
      source: 'program',
      duration_minutes: 50,
      calories: 450,
      sets: 5,
      reps: 5,
      image_url: 'https://example.com/squat.jpg',
      description: 'Heavy back squats.',
      completion_percentage: 10,
    },
  ];

  it('correctly maps muscle groups to GymFlow categories', () => {
    expect(mapMuscleToCategory('Chest')).toBe('chest');
    expect(mapMuscleToCategory('Pectoralis Major')).toBe('chest');
    expect(mapMuscleToCategory('Lats')).toBe('back');
    expect(mapMuscleToCategory('Quadriceps')).toBe('leg');
    expect(mapMuscleToCategory('Biceps')).toBe('arm');
    expect(mapMuscleToCategory('Abs')).toBe('full-body');
  });

  it('merges MSW workouts into the 302-exercise catalog by slug', () => {
    const merged = mergeWorkouts(mockMswWorkouts);
    expect(merged.length).toBeGreaterThanOrEqual(302);

    // Bench press should have merged MSW metadata
    const bench = merged.find((w) => w.slug === 'bench-press');
    expect(bench).toBeDefined();
    expect(bench?.title).toBe('Bench Press Power');
    expect(bench?.calories).toBe(320);
    expect(bench?.duration_minutes).toBe(45);
    expect(bench?.source).toBe('trainer');
    expect(bench?.primaryMuscle).toBe('Chest');
  });

  it('synthesizes consistent gym metadata for un-seeded guide exercises', () => {
    const merged = mergeWorkouts(mockMswWorkouts);
    const pushup = merged.find((w) => w.slug === 'push-up');
    expect(pushup).toBeDefined();
    expect(pushup?.id).toBe('guide-push-up');
    expect(pushup?.source).toBe('guide');
    expect(pushup?.calories).toBeGreaterThan(0);
    expect(pushup?.duration_minutes).toBeGreaterThan(0);
    expect(pushup?.sets).toBeGreaterThan(0);
    expect(pushup?.reps).toBeGreaterThan(0);
  });

  it('filters by category accurately', () => {
    const merged = mergeWorkouts(mockMswWorkouts);
    const chestWorkouts = filterMergedCatalog(merged, { category: 'chest' });
    expect(chestWorkouts.length).toBeGreaterThan(0);
    for (const w of chestWorkouts) {
      expect(w.category).toBe('chest');
    }
  });

  it('searches by keyword using workout-guide query tokens', () => {
    const merged = mergeWorkouts(mockMswWorkouts);
    const results = filterMergedCatalog(merged, { query: 'bench' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((w) => w.slug === 'bench-press')).toBe(true);
  });

  it('filters by difficulty and favorites correctly', () => {
    const first = mockMswWorkouts[0]!;
    const second = mockMswWorkouts[1]!;
    const merged = mergeWorkouts([
      { ...first, is_favorite: true },
      second,
    ]);

    const favorites = filterMergedCatalog(merged, { favoritesOnly: true });
    expect(favorites.length).toBe(1);
    expect(favorites[0]?.slug).toBe('bench-press');
  });
});
