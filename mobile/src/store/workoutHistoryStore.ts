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

const INITIAL_HISTORY: WorkoutHistoryItem[] = [];

export const useWorkoutHistoryStore = create<WorkoutHistoryState>((set) => ({
  history: INITIAL_HISTORY,
  addHistoryEntry: (entry) =>
    set((state) => ({
      history: [entry, ...state.history],
    })),
  clearHistory: () => set({ history: [] }),
}));
