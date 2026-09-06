import { useAuthStore, SECURE_STORE_TOKEN_KEY, SECURE_STORE_USER_ID_KEY } from '../../src/store/authStore';
import * as SecureStore from 'expo-secure-store';

describe('AuthStore', () => {
  beforeEach(async () => {
    await useAuthStore.getState().logout();
  });

  it('initializes in unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('sets auth state and persists token into SecureStore', async () => {
    const mockUser = {
      id: 1,
      name: 'Jane Doe',
      role: 'member' as const,
      email: 'jane.doe@example.com',
    };

    await useAuthStore.getState().setAuth('mock_token_123', mockUser, false);

    const state = useAuthStore.getState();
    expect(state.token).toBe('mock_token_123');
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.mustChangePassword).toBe(false);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      SECURE_STORE_TOKEN_KEY,
      'mock_token_123'
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      SECURE_STORE_USER_ID_KEY,
      '1'
    );
  });

  it('tracks forced password reset requirement', async () => {
    const mockUser = {
      id: 2,
      name: 'New Member',
      role: 'member' as const,
    };

    await useAuthStore.getState().setAuth('temp_token_456', mockUser, true);

    expect(useAuthStore.getState().mustChangePassword).toBe(true);

    useAuthStore.getState().setMustChangePassword(false);
    expect(useAuthStore.getState().mustChangePassword).toBe(false);
  });

  it('clears state and SecureStore on logout', async () => {
    await useAuthStore.getState().setAuth(
      'token_to_clear',
      { id: 3, name: 'User', role: 'member' },
      false
    );

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(SECURE_STORE_TOKEN_KEY);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(SECURE_STORE_USER_ID_KEY);
  });
});
