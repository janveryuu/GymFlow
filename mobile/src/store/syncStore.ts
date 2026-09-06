import { create } from 'zustand';

export type SyncStateStatus = 'idle' | 'syncing' | 'paused' | 'error' | 'offline';

export interface RejectedBanner {
  queueId: string;
  sessionId?: string;
  sessionTitle?: string;
  reason: string;
  occurredAt: string;
}

export interface SyncStoreState {
  syncState: SyncStateStatus;
  pendingCount: number;
  rejectedCount: number;
  hasAmberWarning: boolean;
  has7DayWarning: boolean;
  activeBanner: string | null;
  rejectedBanners: RejectedBanner[];
  lastSyncAt: string | null;
  lastError: string | null;
  isOnline: boolean;

  // Actions
  setSyncState: (state: SyncStateStatus) => void;
  setPendingCount: (count: number) => void;
  incrementPending: () => void;
  decrementPending: () => void;
  setRejectedCount: (count: number) => void;
  setAmberWarning: (hasWarning: boolean) => void;
  setActiveBanner: (banner: string | null) => void;
  addRejectedBanner: (banner: RejectedBanner) => void;
  dismissBanner: (queueId?: string) => void;
  dismissRejectedItem: (queueId: string) => void;
  setIsOnline: (online: boolean) => void;
  setLastError: (error: string | null) => void;
  setLastSyncAt: (timestamp: string) => void;
  reset: () => void;
}

const initialState = {
  syncState: 'idle' as SyncStateStatus,
  pendingCount: 0,
  rejectedCount: 0,
  hasAmberWarning: false,
  has7DayWarning: false,
  activeBanner: null,
  rejectedBanners: [] as RejectedBanner[],
  lastSyncAt: null,
  lastError: null,
  isOnline: true,
};

export const useSyncStore = create<SyncStoreState>((set) => ({
  ...initialState,

  setSyncState: (state: SyncStateStatus) => {
    set({ syncState: state });
  },

  setPendingCount: (count: number) => {
    set({ pendingCount: Math.max(0, count) });
  },

  incrementPending: () => {
    set((state) => ({ pendingCount: state.pendingCount + 1 }));
  },

  decrementPending: () => {
    set((state) => ({ pendingCount: Math.max(0, state.pendingCount - 1) }));
  },

  setRejectedCount: (count: number) => {
    set({ rejectedCount: Math.max(0, count) });
  },

  setAmberWarning: (hasWarning: boolean) => {
    set({ hasAmberWarning: hasWarning, has7DayWarning: hasWarning });
  },

  setActiveBanner: (banner: string | null) => {
    set({ activeBanner: banner });
  },

  addRejectedBanner: (banner: RejectedBanner) => {
    set((state) => ({
      rejectedBanners: [...state.rejectedBanners.filter((b) => b.queueId !== banner.queueId), banner],
      activeBanner: banner.reason || 'Session was cancelled by the gym.',
      rejectedCount: state.rejectedCount + 1,
    }));
  },

  dismissBanner: (queueId?: string) => {
    set((state) => {
      if (!queueId) {
        return { activeBanner: null, rejectedBanners: [], rejectedCount: 0 };
      }
      const updated = state.rejectedBanners.filter((b) => b.queueId !== queueId);
      const lastBanner = updated.length > 0 ? updated[updated.length - 1] : undefined;
      return {
        rejectedBanners: updated,
        activeBanner: lastBanner ? lastBanner.reason : null,
      };
    });
  },

  dismissRejectedItem: (queueId: string) => {
    set((state) => {
      const updated = state.rejectedBanners.filter((b) => b.queueId !== queueId);
      const lastBanner = updated.length > 0 ? updated[updated.length - 1] : undefined;
      return {
        rejectedBanners: updated,
        activeBanner: lastBanner ? lastBanner.reason : null,
        rejectedCount: Math.max(0, state.rejectedCount - 1),
      };
    });
  },

  setIsOnline: (online: boolean) => {
    set((state) => ({
      isOnline: online,
      syncState: !online ? 'offline' : state.syncState === 'offline' ? 'idle' : state.syncState,
    }));
  },

  setLastError: (error: string | null) => {
    set({ lastError: error });
  },

  setLastSyncAt: (timestamp: string) => {
    set({ lastSyncAt: timestamp });
  },

  reset: () => {
    set({ ...initialState });
  },
}));

// Export alias for non-hook consumers
export const syncStore = useSyncStore;
