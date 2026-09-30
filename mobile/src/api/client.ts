import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useDevMockStore } from '../store/devMockStore';

/**
 * Resolve the API base URL:
 * 1. Use `extra.apiBaseUrl` from app.json / app.config.js if available
 * 2. Fall back to the production placeholder (will be intercepted by MSW in dev)
 */
import { Platform } from 'react-native';

const resolveBaseUrl = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:8000`;
    }
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://127.0.0.1:8000';
};

const BASE_URL = resolveBaseUrl();
const AUTH_TOKEN_KEY = 'gymflow_auth_token';

/**
 * Centrally configured Axios client pinned to standard Fetch API adapter (Requirement R7).
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  adapter: 'fetch',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

// Request Interceptor
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      let secureToken: string | null = null;
      try {
        secureToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      } catch (err) {
        console.warn('[DEBUG SecureStore read error]', err);
      }
      const token = inMemoryToken ?? secureToken;
      console.log('[DEBUG client interceptor] inMemoryToken:', inMemoryToken, 'secureToken:', secureToken, 'for URL:', config.url);
      if (token) {
        if (typeof (config.headers as any).set === 'function') {
          (config.headers as any).set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      console.warn('[DEBUG client interceptor top-level err]', e);
    }

    // In DEV environment, check DevMockStore for error simulation and latency overrides
    try {
      const devState = useDevMockStore.getState();
      if (devState.forcedError && devState.forcedError !== 'none') {
        config.headers['x-simulate-error'] = devState.forcedError;
        config.headers['x-mock-status'] = devState.forcedError;
      }
      if (devState.latencyMode === 'instant') {
        config.headers['x-mock-delay'] = '0';
      }
    } catch {
      // DevStore not initialized or unavailable
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn(`[ApiClient 401] ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    }
    return Promise.reject(error);
  },
);
