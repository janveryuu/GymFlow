import { create } from 'zustand';

interface RecentWorkoutsState {
  recentIds: string[];
  addRecentId: (id: string) => void;
}

export const useRecentWorkoutsStore = create<RecentWorkoutsState>((set) => ({
  recentIds: [],
  addRecentId: (id: string) =>
    set((state) => {
      const filtered = state.recentIds.filter((item) => item !== id);
      return { recentIds: [id, ...filtered].slice(0, 8) };
    }),
}));
