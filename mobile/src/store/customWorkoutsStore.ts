import { create } from 'zustand';
import type { MergedWorkout } from '../types';

export interface CustomExerciseItem {
  id: string;
  title: string;
  slug?: string;
  category: string;
  equipment: string;
  difficulty: string;
  preferredSets: number;
  preferredReps: string;
  restTimeSeconds: number;
  tips: string;
  duration_minutes: number;
  calories: number;
}

export interface CustomRoutineWorkout extends MergedWorkout {
  isCustomRoutine: boolean;
  routineExercises: CustomExerciseItem[];
}

const DEFAULT_LEG_DAY_EXERCISES: CustomExerciseItem[] = [
  {
    id: 'ex-1',
    title: 'Barbell Back Squats',
    slug: 'barbell-squat',
    category: 'Legs',
    equipment: 'Barbell & Squat Rack',
    difficulty: 'Advanced',
    preferredSets: 4,
    preferredReps: '8 - 10 reps',
    restTimeSeconds: 90,
    tips: 'Maintain an upright chest and brace your abdominal wall. Descend until thighs are parallel with the floor.',
    duration_minutes: 15,
    calories: 120,
  },
  {
    id: 'ex-2',
    title: 'Leg Press Circuit',
    slug: 'leg-press',
    category: 'Legs',
    equipment: 'Leg Press Machine',
    difficulty: 'Intermediate',
    preferredSets: 4,
    preferredReps: '10 - 12 reps',
    restTimeSeconds: 60,
    tips: 'Do not lock out your knees at the top. Push through your mid-foot and heels for maximum quad activation.',
    duration_minutes: 12,
    calories: 95,
  },
  {
    id: 'ex-3',
    title: 'Romanian Deadlifts',
    slug: 'deadlift',
    category: 'Legs',
    equipment: 'Barbell or Dumbbells',
    difficulty: 'Intermediate',
    preferredSets: 3,
    preferredReps: '10 - 12 reps',
    restTimeSeconds: 60,
    tips: 'Hinge back at your hips with a slight bend in knees. Feel the deep stretch in your hamstrings before driving forward.',
    duration_minutes: 10,
    calories: 85,
  },
  {
    id: 'ex-4',
    title: 'Standing Calf Raises',
    slug: 'calf-raise',
    category: 'Legs',
    equipment: 'Calf Machine',
    difficulty: 'Beginner',
    preferredSets: 4,
    preferredReps: '15 reps',
    restTimeSeconds: 45,
    tips: 'Pause for 1 full second at the peak contraction, then control the 2-second descent for optimal calf stretch.',
    duration_minutes: 8,
    calories: 60,
  },
];

const INITIAL_CUSTOM_ROUTINES: CustomRoutineWorkout[] = [];

interface CustomWorkoutsState {
  customWorkouts: CustomRoutineWorkout[];
  addCustomWorkout: (workout: CustomRoutineWorkout) => void;
  removeCustomWorkout: (id: string) => void;
  getCustomWorkoutById: (id: string) => CustomRoutineWorkout | undefined;
}

export const useCustomWorkoutsStore = create<CustomWorkoutsState>((set, get) => ({
  customWorkouts: INITIAL_CUSTOM_ROUTINES,
  addCustomWorkout: (workout) =>
    set((state) => ({
      customWorkouts: [workout, ...state.customWorkouts.filter((w) => w.id !== workout.id)],
    })),
  removeCustomWorkout: (id) =>
    set((state) => ({
      customWorkouts: state.customWorkouts.filter((w) => w.id !== id),
    })),
  getCustomWorkoutById: (id: string) => {
    return get().customWorkouts.find((w) => w.id === id);
  },
}));
