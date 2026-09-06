import {
  exercises as rawExercises,
  searchExercises,
  type Exercise,
} from '@bryllim/workout-guide';
import type { MergedWorkout, Workout } from '../types';

export { getExercise } from '@bryllim/workout-guide';

/**
 * Curated mapping from MSW workout IDs to @bryllim/workout-guide slugs.
 */
export const MSW_SLUG_MAP: Record<string, string> = {
  w1: 'bench-press',
  w2: 'lat-pulldown',
  w3: 'leg-press',
  w4: 'bicep-curl',
  w5: 'burpee',
  w6: 'incline-bench-press',
  w7: 'deadlift',
  w8: 'squat',
};

/**
 * Maps an exercise's primary muscle to GymFlow's category system.
 */
export function mapMuscleToCategory(muscle: string): 'chest' | 'back' | 'leg' | 'arm' | 'full-body' {
  const m = muscle.toLowerCase();
  if (m.includes('chest') || m.includes('pectoral')) return 'chest';
  if (m.includes('back') || m.includes('lat') || m.includes('trap') || m.includes('rhomboid')) return 'back';
  if (m.includes('quad') || m.includes('hamstring') || m.includes('calf') || m.includes('glute') || m.includes('leg')) return 'leg';
  if (m.includes('bicep') || m.includes('tricep') || m.includes('forearm') || m.includes('arm')) return 'arm';
  return 'full-body';
}

/**
 * Deterministically synthesizes workout parameters (duration, calories, difficulty)
 * for a workout-guide exercise when gym metadata is not present in MSW.
 */
export function synthesizeWorkoutFromExercise(exercise: Exercise): MergedWorkout {
  const category = mapMuscleToCategory(exercise.primaryMuscle);
  const eq = exercise.equipment.toLowerCase();

  let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';
  if (exercise.isStretch || eq.includes('bodyweight') || eq.includes('band')) {
    difficulty = 'beginner';
  } else if (eq.includes('barbell') || exercise.exerciseType === 'weight_reps') {
    difficulty = 'advanced';
  }

  // Deterministic seed for calories and duration based on slug char codes
  const seed = exercise.slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const duration = 20 + (seed % 26); // 20 - 45 mins
  const calories = Math.round(duration * (5.5 + (seed % 4))); // 140 - 380 kcal
  const sets = 3 + (seed % 3); // 3 - 5 sets
  const reps = 8 + (seed % 7); // 8 - 14 reps

  return {
    id: `guide-${exercise.slug}`,
    slug: exercise.slug,
    exerciseId: exercise.id,
    title: exercise.name,
    category,
    difficulty,
    source: 'guide',
    duration_minutes: duration,
    calories,
    sets,
    reps,
    sets_reps: `${sets} sets x ${reps} reps`,
    reps_sets: `${sets} sets x ${reps} reps`,
    image_url: `https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/${exercise.slug}/frame-1.png`,
    description: `Targeted ${exercise.primaryMuscle.toLowerCase()} training with ${exercise.equipment.toLowerCase()}. Includes secondary focus on ${exercise.secondaryMuscles.join(', ') || 'stabilizers'}.`,
    completion_percentage: 0,
    primaryMuscle: exercise.primaryMuscle,
    secondaryMuscles: exercise.secondaryMuscles,
    equipment: exercise.equipment,
    exerciseType: exercise.exerciseType,
    isStretch: exercise.isStretch,
    is_favorite: false,
  };
}

/**
 * Merges MSW gym workouts with the 302 exercises from @bryllim/workout-guide.
 * MSW data takes precedence for duration/calories/sets/reps when matched by slug.
 */
export function mergeWorkouts(
  mswWorkouts: Workout[],
  guideExercises: Exercise[] = rawExercises
): MergedWorkout[] {
  const mswBySlug = new Map<string, Workout>();
  const mswById = new Map<string, Workout>();

  for (const w of mswWorkouts) {
    mswById.set(w.id, w);
    const slug = w.slug || MSW_SLUG_MAP[w.id];
    if (slug) {
      mswBySlug.set(slug, { ...w, slug });
    }
  }

  const merged: MergedWorkout[] = [];
  const processedSlugs = new Set<string>();

  // Process all @bryllim/workout-guide exercises
  for (const ex of guideExercises) {
    processedSlugs.add(ex.slug);
    const msw = mswBySlug.get(ex.slug);

    if (msw) {
      merged.push({
        ...msw,
        id: msw.id,
        slug: ex.slug,
        exerciseId: ex.id,
        title: msw.title || ex.name,
        category: (msw.category as any) || mapMuscleToCategory(ex.primaryMuscle),
        difficulty: (msw.difficulty as any) || 'intermediate',
        duration_minutes: msw.duration_minutes || 45,
        calories: msw.calories || 320,
        sets: msw.sets || 4,
        reps: msw.reps || 10,
        sets_reps: msw.sets_reps || msw.reps_sets || '4 sets x 10 reps',
        reps_sets: msw.reps_sets || msw.sets_reps || '4 sets x 10 reps',
        image_url: msw.image_url || `https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/${ex.slug}/frame-1.png`,
        description: msw.description || `Targeted ${ex.primaryMuscle} workout.`,
        completion_percentage: msw.completion_percentage ?? 0,
        primaryMuscle: ex.primaryMuscle,
        secondaryMuscles: ex.secondaryMuscles,
        equipment: ex.equipment,
        exerciseType: ex.exerciseType,
        isStretch: ex.isStretch,
        is_favorite: Boolean(msw.is_favorite),
      });
    } else {
      merged.push(synthesizeWorkoutFromExercise(ex));
    }
  }

  // Include any custom MSW workouts that didn't match a guide slug
  for (const msw of mswWorkouts) {
    const slug = msw.slug || MSW_SLUG_MAP[msw.id];
    if (!slug || !processedSlugs.has(slug)) {
      merged.unshift({
        ...msw,
        slug: slug || 'general-fitness',
        primaryMuscle: msw.category,
        secondaryMuscles: [],
        equipment: 'Gym Equipment',
        exerciseType: 'weight_reps',
        is_favorite: Boolean(msw.is_favorite),
      });
    }
  }

  return merged;
}

/**
 * Filter and search helper for the merged catalog.
 */
export function filterMergedCatalog(
  all: MergedWorkout[],
  options: {
    category?: string;
    query?: string;
    favoritesOnly?: boolean;
    difficulty?: string;
  } = {}
): MergedWorkout[] {
  const { category, query, favoritesOnly, difficulty } = options;

  let results = all;

  if (favoritesOnly) {
    results = results.filter((w) => w.is_favorite);
  }

  if (category && category !== 'all') {
    results = results.filter((w) => w.category === category);
  }

  if (difficulty && difficulty !== 'all') {
    results = results.filter((w) => w.difficulty === difficulty);
  }

  if (query && query.trim()) {
    // Utilize workout-guide's native search tokens
    const matchedSlugs = new Set(
      searchExercises(query).map((e) => e.slug)
    );
    const qLower = query.toLowerCase().trim();

    results = results.filter((w) => {
      return (
        matchedSlugs.has(w.slug) ||
        w.title.toLowerCase().includes(qLower) ||
        w.category.toLowerCase().includes(qLower) ||
        w.equipment.toLowerCase().includes(qLower) ||
        w.primaryMuscle.toLowerCase().includes(qLower)
      );
    });
  }

  return results;
}
