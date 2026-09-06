import { apiClient } from '../../src/api/client';
import axios from 'axios';

describe('MSW Global Error Scenarios & Network Timeouts', () => {
  const authHeaders = { Authorization: 'Bearer valid-member-token' };

  it('handles 401 token expiry error when Bearer token is expired', async () => {
    expect.assertions(1);
    try {
      await apiClient.get('/member/profile', {
        headers: { Authorization: 'Bearer expired-token' },
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        expect(err.response?.status).toBe(401);
      }
    }
  });

  it('handles 422 validation error with structured errors map', async () => {
    expect.assertions(2);
    try {
      await apiClient.patch(
        '/member/preferences',
        { weekly_workout_goal: 99 },
        { headers: authHeaders },
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        expect(err.response?.status).toBe(422);
        expect(err.response?.data).toHaveProperty('errors');
      }
    }
  });

  it('handles forced 409 error via x-simulate-error header', async () => {
    expect.assertions(2);
    try {
      await apiClient.get('/member/workouts', {
        headers: {
          ...authHeaders,
          'x-simulate-error': '409',
        },
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        expect(err.response?.status).toBe(409);
        expect(err.response?.data.code).toBe('SESSION_CANCELLED_BY_GYM');
      }
    }
  });

  it('handles simulated network timeout via x-simulate-error: timeout', async () => {
    expect.assertions(1);

    const fastTimeoutClient = axios.create({
      baseURL: 'https://api.gymflow.app',
      adapter: 'fetch',
      timeout: 1000,
    });

    try {
      await fastTimeoutClient.get('/member/profile', {
        headers: {
          ...authHeaders,
          'x-simulate-error': 'timeout',
        },
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        expect(['ERR_NETWORK', 'ECONNABORTED', 'ERR_CANCELED', 'ETIMEDOUT', undefined]).toContain(
          err.code,
        );
      }
    }
  });

  it('propagates 500 server error safely when forced via x-mock-status header', async () => {
    expect.assertions(1);
    try {
      await apiClient.get('/member/workouts', {
        headers: {
          ...authHeaders,
          'x-mock-status': '500',
        },
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        expect(err.response?.status).toBe(500);
      }
    }
  });
});
