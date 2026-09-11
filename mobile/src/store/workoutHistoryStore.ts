import { create } from 'zustand';

export interface WorkoutHistoryItem {
  id: string;
  workout_id: string;
  workout_title: string;
  completed_at: string;
  duration_seconds: number;
  calories_burned: number;
  exercises_completed: number;
  total_exercises: number;
  category?: string;
}

interface WorkoutHistoryState {
  history: WorkoutHistoryItem[];
  addHistoryEntry: (entry: WorkoutHistoryItem) => void;
  clearHistory: () => void;
}

const INITIAL_HISTORY: WorkoutHistoryItem[] = [
  {
    id: 'hist-pre-1',
    workout_id: 'custom-leg-day-power',
    workout_title: 'Leg Day Power',
    completed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    duration_seconds: 2700,
    calories_burned: 360,
    exercises_completed: 4,
    total_exercises: 4,
    category: 'Legs',
  },
  {
    id: 'hist-pre-2',
    workout_id: 'bench-press-routine',
    workout_title: 'Chest & Triceps Blitz',
    completed_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    duration_seconds: 2400,
    calories_burned: 310,
    exercises_completed: 5,
    total_exercises: 5,
    category: 'Chest',
  },
];

export const useWorkoutHistoryStore = create<WorkoutHistoryState>((set) => ({
  history: INITIAL_HISTORY,
  addHistoryEntry: (entry) =>
    set((state) => ({
      history: [entry, ...state.history],
    })),
  clearHistory: () => set({ history: [] }),
}));
