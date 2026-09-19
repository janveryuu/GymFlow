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
export const SECURE_STORE_PROFILE_COMPLETED_KEY = 'gymflow_profile_completed_';
export const SECURE_STORE_FITNESS_GOAL_KEY = 'gymflow_fitness_goal_';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  isLoading: boolean;

  setAuth: (token: string, user: User, mustChangePassword?: boolean) => Promise<void>;
  updateUser: (partialUser: Partial<User>) => Promise<void>;
  setMustChangePassword: (mustChange: boolean) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
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

    let isCompleted = user.is_profile_completed;
    if (isCompleted === undefined) {
      try {
        const stored = await SecureStore.getItemAsync(`${SECURE_STORE_PROFILE_COMPLETED_KEY}${user.id}`);
        if (stored === 'true') {
          isCompleted = true;
        }
      } catch {
        // Ignore
      }
    }

    let fitnessGoal = user.fitness_goal;
    if (!fitnessGoal) {
      try {
        const storedGoal = await SecureStore.getItemAsync(`${SECURE_STORE_FITNESS_GOAL_KEY}${user.id}`);
        if (storedGoal) {
          fitnessGoal = storedGoal;
        }
      } catch {
        // Ignore
      }
    } else {
      try {
        await SecureStore.setItemAsync(`${SECURE_STORE_FITNESS_GOAL_KEY}${user.id}`, fitnessGoal);
      } catch {
        // Ignore
      }
    }

    const resolvedUser: User = {
      ...user,
      ...(isCompleted !== undefined ? { is_profile_completed: isCompleted } : {}),
      ...(fitnessGoal !== undefined ? { fitness_goal: fitnessGoal } : {}),
    };

    setAuthToken(token);
    set({
      token,
      user: resolvedUser,
      isAuthenticated: true,
      mustChangePassword,
      isLoading: false,
    });
  },

  updateUser: async (partialUser: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, ...partialUser };
    if (partialUser.is_profile_completed !== undefined) {
      try {
        await SecureStore.setItemAsync(
          `${SECURE_STORE_PROFILE_COMPLETED_KEY}${currentUser.id}`,
          String(partialUser.is_profile_completed)
        );
      } catch {
        // Ignore
      }
    }
    if (partialUser.fitness_goal) {
      try {
        await SecureStore.setItemAsync(
          `${SECURE_STORE_FITNESS_GOAL_KEY}${currentUser.id}`,
          partialUser.fitness_goal
        );
      } catch {
        // Ignore
      }
    }
    set({ user: updatedUser });
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
      const userId = await SecureStore.getItemAsync(SECURE_STORE_USER_ID_KEY);
      if (token) {
        setAuthToken(token);
        let isCompleted = false;
        let fitnessGoal: string | undefined = undefined;
        if (userId) {
          try {
            const stored = await SecureStore.getItemAsync(`${SECURE_STORE_PROFILE_COMPLETED_KEY}${userId}`);
            isCompleted = stored === 'true';
          } catch {
            // Ignore
          }
          try {
            const storedGoal = await SecureStore.getItemAsync(`${SECURE_STORE_FITNESS_GOAL_KEY}${userId}`);
            if (storedGoal) fitnessGoal = storedGoal;
          } catch {
            // Ignore
          }
        }
        set({
          token,
          user: get().user || (userId ? {
            id: Number(userId),
            name: 'Member',
            role: 'member',
            is_profile_completed: isCompleted,
            ...(fitnessGoal ? { fitness_goal: fitnessGoal } : {}),
          } : null),
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
