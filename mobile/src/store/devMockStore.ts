import { create } from 'zustand';
import { resetState } from '@handlers/fixtures/seed';

export type ForcedErrorType = 'none' | '401' | '404' | '409' | '422' | 'timeout' | '500';

export interface DevMockState {
  isMockEnabled: boolean;
  latencyMode: 'realistic' | 'instant';
  forcedError: ForcedErrorType;
  setMockEnabled: (enabled: boolean) => void;
  setLatencyMode: (mode: 'realistic' | 'instant') => void;
  setForcedError: (error: ForcedErrorType) => void;
  resetMockData: () => void;
}

export const useDevMockStore = create<DevMockState>((set) => ({
  isMockEnabled: true,
  latencyMode: 'realistic',
  forcedError: 'none',

  setMockEnabled: (enabled: boolean) => {
    set({ isMockEnabled: enabled });
  },

  setLatencyMode: (mode: 'realistic' | 'instant') => {
    set({ latencyMode: mode });
  },

  setForcedError: (error: ForcedErrorType) => {
    set({ forcedError: error });
  },

  resetMockData: () => {
    resetState();
  },
}));
