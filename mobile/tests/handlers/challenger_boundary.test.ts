import axios from 'axios';
import { apiClient } from '../../src/api/client';
import { handleSimulation } from '../../handlers/middleware';
import {
  state,
  resetState,
  seedSessions,
  seedProgress,
  seedProfile,
  seedPreferences,
} from '../../handlers/fixtures/seed';
import { useDevMockStore } from '../../src/store/devMockStore';

describe('Challenger 2 Empirical Verification: Error Simulation, Latency & State Reset', () => {
  const authHeaders = { Authorization: 'Bearer valid-member-token' };

  beforeEach(() => {
    resetState();
    useDevMockStore.getState().setForcedError('none');
    useDevMockStore.getState().setLatencyMode('realistic');
  });

  afterEach(() => {
    resetState();
    useDevMockStore.getState().setForcedError('none');
  });

  // =========================================================================
  // 1. ERROR SIMULATION HEADERS EMPIRICAL VERIFICATION
  // =========================================================================
  describe('1. Error Simulation Headers (x-simulate-error & x-mock-status)', () => {
    it('reliably triggers 401 Unauthorized across multiple endpoints', async () => {
      const endpoints = [
        { method: 'get', url: '/member/profile', data: undefined },
        { method: 'post', url: '/api/v1/auth/login', data: { email: 'jane.doe@example.com', password: 'Password123!' } },
        { method: 'get', url: '/member/workouts', data: undefined },
        { method: 'post', url: '/member/progress', data: { workout_id: 'w1', duration_seconds: 1800, calories_burned: 250 } },
        { method: 'get', url: '/member/sessions', data: undefined },
      ];

      for (const ep of endpoints) {
        try {
          if (ep.method === 'get') {
            await apiClient.get(ep.url, {
              headers: { ...authHeaders, 'x-simulate-error': '401' },
            });
          } else {
            await apiClient.post(ep.url, ep.data, {
              headers: { ...authHeaders, 'x-simulate-error': '401' },
            });
          }
          throw new Error(`Expected ${ep.url} to throw 401, but it succeeded`);
        } catch (err) {
          expect(axios.isAxiosError(err)).toBe(true);
          if (axios.isAxiosError(err)) {
            expect(err.response?.status).toBe(401);
            expect(err.response?.data).toEqual({ message: 'Unauthenticated.' });
          }
        }
      }
    });

    it('reliably triggers 404 Resource Not Found across endpoints', async () => {
      const endpoints = ['/member/profile', '/member/workouts', '/member/preferences'];

      for (const url of endpoints) {
        try {
          await apiClient.get(url, {
            headers: { ...authHeaders, 'x-simulate-error': '404' },
          });
          throw new Error(`Expected ${url} to throw 404, but it succeeded`);
        } catch (err) {
          expect(axios.isAxiosError(err)).toBe(true);
          if (axios.isAxiosError(err)) {
            expect(err.response?.status).toBe(404);
            expect(err.response?.data).toEqual({ message: 'Resource not found.' });
          }
        }
      }
    });

    it('reliably triggers 409 Conflict with SESSION_CANCELLED_BY_GYM shape', async () => {
      try {
        await apiClient.get('/member/workouts', {
          headers: { ...authHeaders, 'x-simulate-error': '409' },
        });
        throw new Error('Expected 409 error');
      } catch (err) {
        expect(axios.isAxiosError(err)).toBe(true);
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(409);
          expect(err.response?.data).toEqual({
            error: 'conflict',
            code: 'SESSION_CANCELLED_BY_GYM',
            reason: 'session_cancelled',
            message: 'This session has already been cancelled by the gym.',
          });
        }
      }
    });

    it('reliably triggers 422 Unprocessable Entity with simulated validation payload', async () => {
      // Even with valid login credentials, simulated 422 should preempt handler execution
      try {
        await apiClient.post(
          '/api/v1/auth/login',
          { email: 'jane.doe@example.com', password: 'Password123!' },
          { headers: { 'x-simulate-error': '422' } },
        );
        throw new Error('Expected 422 error');
      } catch (err) {
        expect(axios.isAxiosError(err)).toBe(true);
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(422);
          expect(err.response?.data).toEqual({
            message: 'The given data was invalid.',
            errors: { form: ['Simulated validation failure.'] },
          });
        }
      }
    });

    it('reliably triggers timeout network abort via x-simulate-error: timeout', async () => {
      const fastClient = axios.create({
        baseURL: 'https://api.gymflow.app',
        adapter: 'fetch',
        timeout: 500,
      });

      try {
        await fastClient.get('/member/profile', {
          headers: { ...authHeaders, 'x-simulate-error': 'timeout' },
        });
        throw new Error('Expected network timeout/abort');
      } catch (err) {
        expect(axios.isAxiosError(err)).toBe(true);
        if (axios.isAxiosError(err)) {
          // MSW HttpResponse.error() surfaces as network error
          expect(['ERR_NETWORK', 'ECONNABORTED', 'ERR_CANCELED', 'ETIMEDOUT', undefined]).toContain(
            err.code,
          );
        }
      }
    });

    it('reliably triggers 500 Internal Server Error', async () => {
      try {
        await apiClient.get('/member/sessions', {
          headers: { ...authHeaders, 'x-simulate-error': '500' },
        });
        throw new Error('Expected 500 error');
      } catch (err) {
        expect(axios.isAxiosError(err)).toBe(true);
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(500);
          expect(err.response?.data).toEqual({ message: 'Internal server error.' });
        }
      }
    });

    it('supports x-mock-status header as an alias for all error codes', async () => {
      const statuses = ['401', '404', '409', '422', '500'];
      for (const st of statuses) {
        try {
          await apiClient.get('/member/profile', {
            headers: { ...authHeaders, 'x-mock-status': st },
          });
          throw new Error(`Expected ${st} via x-mock-status`);
        } catch (err) {
          expect(axios.isAxiosError(err)).toBe(true);
          if (axios.isAxiosError(err)) {
            expect(err.response?.status).toBe(parseInt(st, 10));
          }
        }
      }
    });

    it('gives x-simulate-error precedence over x-mock-status if both are supplied', async () => {
      try {
        await apiClient.get('/member/profile', {
          headers: {
            ...authHeaders,
            'x-simulate-error': '409',
            'x-mock-status': '500',
          },
        });
        throw new Error('Expected 409 error');
      } catch (err) {
        expect(axios.isAxiosError(err)).toBe(true);
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(409);
        }
      }
    });

    it('safely ignores unhandled or unknown simulation values without crashing', async () => {
      const res = await apiClient.get('/member/profile', {
        headers: {
          ...authHeaders,
          'x-simulate-error': 'non-existent-code',
        },
      });
      expect(res.status).toBe(200);
      expect(res.data.name).toBe('Jane Doe');
    });

    it('integrates with DevMockStore: forcedError in Zustand store triggers error on apiClient', async () => {
      useDevMockStore.getState().setForcedError('401');
      try {
        await apiClient.get('/member/profile', { headers: authHeaders });
        throw new Error('Expected 401 via store');
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(401);
        }
      }

      useDevMockStore.getState().setForcedError('500');
      try {
        await apiClient.get('/member/profile', { headers: authHeaders });
        throw new Error('Expected 500 via store');
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(500);
        }
      }

      // Reset to none -> request proceeds normally
      useDevMockStore.getState().setForcedError('none');
      const res = await apiClient.get('/member/profile', { headers: authHeaders });
      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // 2. LATENCY HANDLING & TEST MODE BYPASS VERIFICATION
  // =========================================================================
  describe('2. Latency Handling (NODE_ENV=test bypass & x-mock-delay overrides)', () => {
    it('bypasses latency in test mode (NODE_ENV=test) by executing immediately', async () => {
      const start = Date.now();
      const iterations = 5;
      for (let i = 0; i < iterations; i++) {
        await apiClient.get('/member/workouts', { headers: authHeaders });
      }
      const elapsed = Date.now() - start;

      // In test mode, 5 calls with default 300-800ms latency would take 1500-4000ms.
      // Bypassed, they should execute under 200ms total.
      expect(elapsed).toBeLessThan(250);
    });

    it('enforces explicit latency override when x-mock-delay is provided', async () => {
      const delayMs = 120;
      const start = Date.now();
      const res = await apiClient.get('/member/profile', {
        headers: {
          ...authHeaders,
          'x-mock-delay': String(delayMs),
        },
      });
      const elapsed = Date.now() - start;

      expect(res.status).toBe(200);
      // Allow slight timing tolerance (e.g. >= 110ms)
      expect(elapsed).toBeGreaterThanOrEqual(110);
    });

    it('supports x-mock-delay: 0 for instant response (< 50ms)', async () => {
      const start = Date.now();
      const res = await apiClient.get('/member/profile', {
        headers: {
          ...authHeaders,
          'x-mock-delay': '0',
        },
      });
      const elapsed = Date.now() - start;

      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(60);
    });

    it('safely ignores invalid or negative x-mock-delay values without error or stalling', async () => {
      const invalidDelays = ['-100', 'invalid_string', ''];
      for (const val of invalidDelays) {
        const start = Date.now();
        const res = await apiClient.get('/member/profile', {
          headers: {
            ...authHeaders,
            'x-mock-delay': val,
          },
        });
        const elapsed = Date.now() - start;
        expect(res.status).toBe(200);
        expect(elapsed).toBeLessThan(100);
      }
    });

    it('empirically verifies handleSimulation direct middleware logic for non-test mode simulation', async () => {
      // Create a Request object without x-mock-delay
      const req = new Request('https://api.gymflow.app/member/profile');
      const response = await handleSimulation(req);
      // In Jest test environment (process.env.NODE_ENV === 'test'), handleSimulation returns null immediately
      expect(response).toBeNull();

      // Test with x-mock-delay
      const delayedReq = new Request('https://api.gymflow.app/member/profile', {
        headers: { 'x-mock-delay': '100' },
      });
      const t0 = Date.now();
      const delayedResp = await handleSimulation(delayedReq);
      const diff = Date.now() - t0;
      expect(delayedResp).toBeNull();
      expect(diff).toBeGreaterThanOrEqual(90);
    });
  });

  // =========================================================================
  // 3. STATE RESET (resetState) INTEGRITY & RESTORATION
  // =========================================================================
  describe('3. State Reset (resetState) Completeness & Idempotency', () => {
    it('completely restores sessions state after cancellation and mutations', async () => {
      // Verify initial pristine state
      const initialS1 = state.sessions.find((s) => s.id === 's1');
      expect(initialS1?.status).toBe('scheduled');
      expect(initialS1?.can_cancel).toBe(true);

      // Mutate: cancel s1
      const cancelRes = await apiClient.post(
        '/member/sessions/s1/cancel',
        {},
        { headers: authHeaders },
      );
      expect(cancelRes.status).toBe(200);
      const mutatedS1 = state.sessions.find((s) => s.id === 's1');
      expect(mutatedS1?.status).toBe('cancelled_by_member');
      expect(mutatedS1?.can_cancel).toBe(false);

      // Mutate: push synthetic session into state
      state.sessions.push({
        id: 's-synthetic',
        workout_id: null,
        title: 'Synthetic Test Session',
        trainer: null,
        location: 'Nowhere',
        starts_at: '2026-09-05T10:00:00Z',
        ends_at: '2026-09-05T11:00:00Z',
        status: 'scheduled',
        can_cancel: true,
        checked_in: false,
      });
      expect(state.sessions.length).toBe(seedSessions.length + 1);

      // Reset
      resetState();

      // Verify complete restoration
      expect(state.sessions.length).toBe(seedSessions.length);
      const restoredS1 = state.sessions.find((s) => s.id === 's1');
      expect(restoredS1?.status).toBe('scheduled');
      expect(restoredS1?.can_cancel).toBe(true);
      expect(state.sessions.some((s) => s.id === 's-synthetic')).toBe(false);
    });

    it('completely restores progress entries and clears additions', async () => {
      expect(state.progress.length).toBe(seedProgress.length);

      // Mutate: Submit progress entry
      const progressPayload = {
        workout_id: 'w1',
        started_at: '2026-09-05T08:00:00Z',
        completed_at: '2026-09-05T08:45:00Z',
        duration_seconds: 2700,
        calories_burned: 350,
        idempotency_key: 'idemp-progress-temp',
      };
      const res = await apiClient.post('/member/progress', progressPayload, {
        headers: authHeaders,
      });
      expect(res.status).toBe(201);
      expect(state.progress.length).toBe(seedProgress.length + 1);

      // Reset
      resetState();

      // Verify restoration
      expect(state.progress.length).toBe(seedProgress.length);
      expect(state.progress.some((p) => p.idempotency_key === 'idemp-progress-temp')).toBe(false);
    });

    it('clears idempotency map and restores normal submission behavior', async () => {
      const key = 'test-idemp-dedupe-key-999';
      const initialPayload = {
        workout_id: 'w1',
        duration_seconds: 1800,
        calories_burned: 200,
        idempotency_key: key,
      };

      // 1st submission -> 201 Created with calories_burned 200
      const res1 = await apiClient.post('/member/progress', initialPayload, { headers: authHeaders });
      expect(res1.status).toBe(201);
      expect(res1.data.calories_burned).toBe(200);
      expect(state.seenIdempotencyKeys.has(key)).toBe(true);

      // 2nd submission with same key but different payload -> 200 OK replay with original cached calories (200)
      const modifiedPayload = {
        ...initialPayload,
        calories_burned: 450,
      };
      const res2 = await apiClient.post('/member/progress', modifiedPayload, { headers: authHeaders });
      expect(res2.status).toBe(200);
      expect(res2.data.calories_burned).toBe(200);

      // Reset state
      resetState();

      // Verify idempotency cache is wiped
      expect(state.seenIdempotencyKeys.size).toBe(0);
      expect(state.seenIdempotencyKeys.has(key)).toBe(false);

      // 3rd submission with same key -> treated as new submission (201 Created) with new payload (450)
      const res3 = await apiClient.post('/member/progress', modifiedPayload, { headers: authHeaders });
      expect(res3.status).toBe(201);
      expect(res3.data.calories_burned).toBe(450);
    });

    it('clears attendance state and resets checked_in flags on sessions', async () => {
      // Check into session s1
      const res = await apiClient.post(
        '/member/attendance',
        { session_id: 's1', checked_in_at: '2026-09-05T06:35:00Z' },
        { headers: authHeaders },
      );
      expect(res.status).toBe(201);
      expect(state.attendance.length).toBe(1);
      const s1 = state.sessions.find((s) => s.id === 's1');
      expect(s1?.checked_in).toBe(true);

      // Reset state
      resetState();

      expect(state.attendance.length).toBe(0);
      const restoredS1 = state.sessions.find((s) => s.id === 's1');
      expect(restoredS1?.checked_in).toBe(false);
    });

    it('completely restores profile and preferences after mutations', async () => {
      // Mutate profile
      await apiClient.patch(
        '/member/profile',
        {
          name: 'Jane Mutated',
          phone: '+1 (555) 999-0000',
        },
        { headers: authHeaders },
      );
      state.profile.must_change_password = true;

      // Mutate preferences
      await apiClient.patch(
        '/member/preferences',
        {
          weekly_workout_goal: 7,
          workout_type: 'hiit',
          intensity: 'intense',
        },
        { headers: authHeaders },
      );

      expect(state.profile.name).toBe('Jane Mutated');
      expect(state.profile.phone).toBe('+1 (555) 999-0000');
      expect(state.profile.must_change_password).toBe(true);
      expect(state.preferences.weekly_workout_goal).toBe(7);
      expect(state.preferences.workout_type).toBe('hiit');

      // Reset
      resetState();

      // Verify profile restoration
      expect(state.profile.name).toBe(seedProfile.name);
      expect(state.profile.phone).toBe(seedProfile.phone);
      expect(state.profile.must_change_password).toBe(false);
      expect(state.profile.membership.tier).toBe(seedProfile.membership.tier);

      // Verify preferences restoration
      expect(state.preferences.weekly_workout_goal).toBe(seedPreferences.weekly_workout_goal);
      expect(state.preferences.workout_type).toBe(seedPreferences.workout_type);
      expect(state.preferences.intensity).toBe(seedPreferences.intensity);
    });

    it('guarantees resetState is strictly idempotent across consecutive invocations', () => {
      // Mutate
      state.profile.name = 'Dirty State';
      state.sessions = [];
      state.progress = [];
      state.attendance = [{ session_id: 'fake', checked_in_at: 'now' }];
      state.seenIdempotencyKeys.set('k', 123);

      // First reset
      resetState();
      expect(state.profile.name).toBe('Jane Doe');
      expect(state.sessions.length).toBe(seedSessions.length);
      expect(state.progress.length).toBe(seedProgress.length);
      expect(state.attendance.length).toBe(0);
      expect(state.seenIdempotencyKeys.size).toBe(0);

      // Consecutive second reset
      resetState();
      expect(state.profile.name).toBe('Jane Doe');
      expect(state.sessions.length).toBe(seedSessions.length);
      expect(state.progress.length).toBe(seedProgress.length);
      expect(state.attendance.length).toBe(0);
      expect(state.seenIdempotencyKeys.size).toBe(0);
    });

    it('preserves seed immutability when mutable state nested objects are updated', () => {
      resetState();

      // Mutate nested membership on state
      state.profile.membership.tier = 'Altered Diamond Tier';
      expect(seedProfile.membership.tier).toBe('Black Diamond All-Access');

      // Reset and verify seedProfile was unaffected
      resetState();
      expect(state.profile.membership.tier).toBe('Black Diamond All-Access');
      expect(seedProfile.membership.tier).toBe('Black Diamond All-Access');
    });

    it('isolates nested session.trainer across resets using deep cloning', () => {
      resetState();
      const originalTrainerName = seedSessions[0]!.trainer!.name;

      // Mutate nested trainer object on state.sessions[0]
      state.sessions[0]!.trainer!.name = 'Mutated Trainer';

      // Because seedSessions.map clones nested trainer, seed is preserved!
      expect(seedSessions[0]!.trainer!.name).toBe(originalTrainerName);

      // resetState restores original trainer name on state.sessions
      resetState();
      expect(state.sessions[0]!.trainer!.name).toBe(originalTrainerName);
    });
  });

  // =========================================================================
  // 4. ADVERSARIAL CROSS-CUTTING COMPOSITION (Error Simulation + Latency)
  // =========================================================================
  describe('4. Adversarial Cross-Cutting Composition Challenges', () => {
    it('applies x-mock-delay before returning simulated error responses', async () => {
      // When both x-mock-delay and x-simulate-error are provided, handleSimulation applies
      // latency delay before returning the simulated error response.
      const start = Date.now();
      try {
        await apiClient.get('/member/profile', {
          headers: {
            ...authHeaders,
            'x-simulate-error': '500',
            'x-mock-delay': '200',
          },
        });
        throw new Error('Expected 500 error');
      } catch (err) {
        const elapsed = Date.now() - start;
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(500);
        }
        // Because latency delay runs before simulation return, elapsed is >= 190ms.
        expect(elapsed).toBeGreaterThanOrEqual(190);
      }
    });
  });
});
