import { useDevMockStore } from '../store/devMockStore';
import { server } from '@handlers/server';

/**
 * Initializes the MSW mock API layer in React Native runtime.
 * Strictly gated behind __DEV__.
 */
export async function initMocks(): Promise<void> {
  if (!__DEV__) {
    return;
  }

  const isMockEnabled = useDevMockStore.getState().isMockEnabled;
  if (!isMockEnabled) {
    console.log('[MSW] In-app mock mode is DISABLED. Using live network.');
    return;
  }

  console.log('[MSW] Initializing In-App Mock API layer...');
  try {
    server.listen({
      onUnhandledRequest: 'bypass',
    });
    console.log('[MSW] Mock API layer active and intercepting requests.');
  } catch (error) {
    console.error('[MSW] Failed to start MSW server in React Native:', error);
  }
}
