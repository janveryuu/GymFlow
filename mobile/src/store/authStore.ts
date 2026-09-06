/**
 * Auth Store for GymFlow Mobile.
 * Manages token persistence via expo-secure-store and active session state.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setAuthToken } from '../api/client';
import type { User } from '../types';

export const SECURE_STORE_TOKEN_KEY = 'gymflow_auth_token';
export const SECURE_STORE_USER_ID_KEY = 'gymflow_user_id';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  isLoading: boolean;

  setAuth: (token: string, user: User, mustChangePassword?: boolean) => Promise<void>;
  setMustChangePassword: (mustChange: boolean) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  mustChangePassword: false,
  isLoading: true,

  setAuth: async (token: string, user: User, mustChangePassword: boolean = false) => {
    try {
      await SecureStore.setItemAsync(SECURE_STORE_TOKEN_KEY, token);
      await SecureStore.setItemAsync(SECURE_STORE_USER_ID_KEY, String(user.id));
    } catch {
      // In non-supported environments, ignore
    }
    setAuthToken(token);
    set({
      token,
      user,
      isAuthenticated: true,
      mustChangePassword,
      isLoading: false,
    });
  },

  setMustChangePassword: (mustChange: boolean) => {
    set({ mustChangePassword: mustChange });
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_TOKEN_KEY);
      await SecureStore.deleteItemAsync(SECURE_STORE_USER_ID_KEY);
    } catch {
      // Ignore
    }
    setAuthToken(null);
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      mustChangePassword: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(SECURE_STORE_TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        set({
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch {
      // Ignore
    }
    set({
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
