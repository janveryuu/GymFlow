import { apiClient } from '../../src/api/client';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { resetState, state, seedLogin } from '../../handlers/fixtures/seed';

describe('M1 Challenger 1: Concurrency, Idempotency, Auth & Boundary Stress Harness', () => {
  const authHeaders = { Authorization: 'Bearer valid-member-token' };

  beforeEach(() => {
    resetState();
  });

  // =========================================================================
  // 1. CONCURRENCY & IDEMPOTENCY DEDUPLICATION STRESS
  // =========================================================================
  describe('Concurrency & Idempotency Deduplication', () => {
    it('STRESS-1.1: 50 concurrent requests with identical idempotency_key must result in exactly 1 database write and consistent responses', async () => {
      const sharedKey = `stress-key-${Date.now()}-${Math.random()}`;
      const payload = {
        workout_id: 'w1',
        started_at: '2026-09-05T07:00:00Z',
        completed_at: '2026-09-05T07:45:00Z',
        duration_seconds: 2700,
        calories_burned: 350,
        heart_rate: null,
        idempotency_key: sharedKey,
      };

      const initialProgressCount = state.progress.length;
      const CONCURRENCY = 50;

      // Launch all 50 requests concurrently
      const promises = Array.from({ length: CONCURRENCY }, () =>
        apiClient.post('/member/progress', payload, { headers: authHeaders }),
      );

      const responses = await Promise.all(promises);

      // Verify all succeeded
      expect(responses).toHaveLength(CONCURRENCY);
      responses.forEach((res) => {
        expect([200, 201]).toContain(res.status);
      });

      // Status code distribution: exactly ONE must be 201 Created; all others 200 OK
      const createdResponses = responses.filter((r) => r.status === 201);
      const okResponses = responses.filter((r) => r.status === 200);

      // All responses must return the identical record ID
      const firstId = responses[0]!.data.id;
      responses.forEach((r) => {
        expect(r.data.id).toBe(firstId);
        expect(r.data.idempotency_key).toBe(sharedKey);
        expect(r.data.calories_burned).toBe(350);
      });

      // Database verification: exactly ONE entry was added to state.progress
      expect(state.progress.length).toBe(initialProgressCount + 1);
      expect(createdResponses.length).toBe(1);
      expect(okResponses.length).toBe(CONCURRENCY - 1);
    });

    it('STRESS-1.2: Concurrent requests with same idempotency key across varied simulated latency', async () => {
      const sharedKey = `stress-jitter-key-${Date.now()}`;
      const payload = {
        workout_id: 'w2',
        duration_seconds: 1800,
        calories_burned: 200,
        idempotency_key: sharedKey,
      };

      const initialCount = state.progress.length;
      // Stagger delays via x-mock-delay
      const delays = [10, 30, 5, 20, 15, 25, 0, 40];
      const promises = delays.map((d) =>
        apiClient.post('/member/progress', payload, {
          headers: { ...authHeaders, 'x-mock-delay': String(d) },
        }),
      );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(delays.length);

      // Verify only 1 progress item was saved
      expect(state.progress.length).toBe(initialCount + 1);

      // All responses should reference the exact same progress entry ID
      const targetId = state.seenIdempotencyKeys.get(sharedKey)?.id;
      expect(targetId).toBeDefined();
      responses.forEach((res) => {
        expect(res.data.id).toBe(targetId);
      });
    });

    it('STRESS-1.2b: Concurrent requests with identical non-zero latency (x-mock-delay: 50) testing simultaneous timer resolution', async () => {
      const sharedKey = `stress-simultaneous-timer-${Date.now()}`;
      const payload = {
        workout_id: 'w1',
        duration_seconds: 1500,
        calories_burned: 250,
        idempotency_key: sharedKey,
      };

      const initialCount = state.progress.length;
      const CONCURRENCY = 10;
      const promises = Array.from({ length: CONCURRENCY }, () =>
        apiClient.post('/member/progress', payload, {
          headers: { ...authHeaders, 'x-mock-delay': '50' },
        }),
      );

      const responses = await Promise.all(promises);
      const created201 = responses.filter((r) => r.status === 201);
      const ok200 = responses.filter((r) => r.status === 200);

      expect(state.progress.length).toBe(initialCount + 1);
      expect(created201.length).toBe(1);
      expect(ok200.length).toBe(CONCURRENCY - 1);
    });

    it('STRESS-1.3: POST /member/attendance concurrent requests deduplication and contract status code', async () => {
      const sharedKey = `att-concurrent-${Date.now()}`;
      const payload = {
        session_id: 's2',
        checked_in_at: '2026-09-05T17:00:00Z',
        idempotency_key: sharedKey,
      };

      const initialAttendanceCount = state.attendance.length;
      const CONCURRENCY = 20;

      const promises = Array.from({ length: CONCURRENCY }, () =>
        apiClient.post('/member/attendance', payload, { headers: authHeaders }),
      );

      const responses = await Promise.all(promises);

      // CONTRACT.md §4 line 289-298 states:
      // Initial: Response 201 Created
      // Idempotent Replay: Response 200 OK
      const created201 = responses.filter((r) => r.status === 201);
      const replay200 = responses.filter((r) => r.status === 200);

      // All responses return same attendance ID
      const expectedId = responses[0]!.data.id;
      responses.forEach((r) => {
        expect(r.data.id).toBe(expectedId);
      });

      // Attendance state check: should not push duplicate attendance records
      expect(state.attendance.length).toBe(initialAttendanceCount + 1);

      // Check CONTRACT compliance: initial must be 201
      expect(created201.length).toBe(1);
      expect(replay200.length).toBe(CONCURRENCY - 1);
    });

    it('STRESS-1.4: Different idempotency keys under high concurrency must NOT collide or lose entries', async () => {
      const CONCURRENCY = 25;
      const initialCount = state.progress.length;

      const promises = Array.from({ length: CONCURRENCY }, (_, i) =>
        apiClient.post(
          '/member/progress',
          {
            workout_id: 'w3',
            duration_seconds: 1000 + i,
            calories_burned: 100 + i,
            idempotency_key: `unique-key-${i}-${Date.now()}`,
          },
          { headers: authHeaders },
        ),
      );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(CONCURRENCY);
      responses.forEach((r) => {
        expect(r.status).toBe(201);
      });

      expect(state.progress.length).toBe(initialCount + CONCURRENCY);
      const uniqueIds = new Set(responses.map((r) => r.data.id));
      expect(uniqueIds.size).toBe(CONCURRENCY);
    });
  });

  // =========================================================================
  // 2. RAPID SEQUENTIAL LOGINS & TOKEN PERSISTENCE
  // =========================================================================
  describe('Rapid Sequential Logins & Auth Edge Cases', () => {
    it('AUTH-2.1: Rapid burst of 30 login requests with valid credentials', async () => {
      const loginPayload = {
        email: 'jane.doe@example.com',
        password: 'Password123!',
      };

      const promises = Array.from({ length: 30 }, () =>
        apiClient.post('/api/v1/auth/login', loginPayload),
      );

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(30);

      responses.forEach((r) => {
        expect(r.status).toBe(200);
        expect(r.data.token).toBe(seedLogin.token);
        expect(r.data.user.name).toBe('Jane Doe');
        expect(r.data.user.role).toBe('member');
      });
    });

    it('AUTH-2.2: Login with second valid credential in seed', async () => {
      const res = await apiClient.post('/api/v1/auth/login', {
        email: 'member@gymflow.test',
        password: 'TempPass!23',
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('token');
      expect(res.data).toHaveProperty('user');
    });

    it('AUTH-2.3: Alternating rapid logins with valid and invalid credentials', async () => {
      const burst = Array.from({ length: 20 }, (_, i) => {
        if (i % 2 === 0) {
          return apiClient.post('/api/v1/auth/login', {
            email: 'jane.doe@example.com',
            password: 'Password123!',
          });
        } else {
          return apiClient
            .post('/api/v1/auth/login', {
              email: 'jane.doe@example.com',
              password: 'WrongPassword!',
            })
            .catch((err) => err.response);
        }
      });

      const results = await Promise.all(burst);
      results.forEach((r, i) => {
        if (i % 2 === 0) {
          expect(r.status).toBe(200);
        } else {
          expect(r.status).toBe(401);
        }
      });
    });

    it('AUTH-2.4: Malformed and empty Authorization tokens', async () => {
      const badTokens = [
        'Bearer ',
        'Bearer   ',
        'Bearer expired-token',
        'Bearer expired-or-invalid-token',
        'Basic abcdef',
        'Token some-token',
        '',
      ];

      for (const tokenHeader of badTokens) {
        let status: number | undefined;
        try {
          const res = await apiClient.get('/member/profile', {
            headers: tokenHeader ? { Authorization: tokenHeader } : {},
          });
          status = res.status;
        } catch (err) {
          if (axios.isAxiosError(err)) {
            status = err.response?.status;
          }
        }
        expect(status).toBe(401);
      }
    });

    it('AUTH-2.5: Degenerate token inputs: "Bearer null", "Bearer undefined"', async () => {
      // Probing whether string "null" or "undefined" bypasses authentication
      const degenerateTokens = ['Bearer null', 'Bearer undefined'];

      for (const tokenHeader of degenerateTokens) {
        let status: number | undefined;
        try {
          const res = await apiClient.get('/member/profile', {
            headers: { Authorization: tokenHeader },
          });
          status = res.status;
        } catch (err) {
          if (axios.isAxiosError(err)) {
            status = err.response?.status;
          }
        }
        // Under strict contract, pseudo-tokens like "null" or "undefined" should be rejected with 401
        expect(status).toBe(401);
      }
    });

    it('AUTH-2.6: SecureStore token persistence: stored token must be auto-injected by apiClient', async () => {
      await SecureStore.setItemAsync('gymflow_auth_token', 'persisted-valid-token');

      let status: number | undefined;
      try {
        // Request without explicit Authorization header: should use stored token
        const res = await apiClient.get('/member/profile');
        status = res.status;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          status = err.response?.status;
        }
      }

      // Cleanup
      await SecureStore.deleteItemAsync('gymflow_auth_token');

      // In client.ts, "if (process.env.NODE_ENV !== 'test')" disables token injection during tests
      expect(status).toBe(200);
    });
  });

  // =========================================================================
  // 3. PARAMETER BOUNDARY VALIDATION
  // =========================================================================
  describe('Parameter Boundary Validation', () => {
    describe('PATCH /member/preferences weekly_workout_goal bounds', () => {
      it('BOUND-3.1: Valid boundaries: goal = 1 and goal = 7 should succeed', async () => {
        const res1 = await apiClient.patch(
          '/member/preferences',
          { weekly_workout_goal: 1 },
          { headers: authHeaders },
        );
        expect(res1.status).toBe(200);
        expect(res1.data.weekly_workout_goal).toBe(1);

        const res7 = await apiClient.patch(
          '/member/preferences',
          { weekly_workout_goal: 7 },
          { headers: authHeaders },
        );
        expect(res7.status).toBe(200);
        expect(res7.data.weekly_workout_goal).toBe(7);
      });

      it('BOUND-3.2: Invalid boundary: goal = 0 and goal = 8 should be rejected with 422', async () => {
        for (const invalidGoal of [0, 8, -1, 100]) {
          let status: number | undefined;
          try {
            await apiClient.patch(
              '/member/preferences',
              { weekly_workout_goal: invalidGoal },
              { headers: authHeaders },
            );
          } catch (err) {
            if (axios.isAxiosError(err)) {
              status = err.response?.status;
            }
          }
          expect(status).toBe(422);
        }
      });

      it('BOUND-3.3: Non-integer numeric goals (e.g. 3.5, 0.5) must be rejected with 422', async () => {
        // CONTRACT.md states: "weekly_workout_goal: Integer between 1 and 7."
        for (const floatGoal of [3.5, 1.2, 6.99]) {
          let status: number | undefined;
          try {
            await apiClient.patch(
              '/member/preferences',
              { weekly_workout_goal: floatGoal },
              { headers: authHeaders },
            );
          } catch (err) {
            if (axios.isAxiosError(err)) {
              status = err.response?.status;
            }
          }
          expect(status).toBe(422);
        }
      });

      it('BOUND-3.4: Special numeric values (NaN, null, string numbers) in weekly_workout_goal', async () => {
        const weirdGoals = [NaN, '5', null];
        for (const goal of weirdGoals) {
          let status: number | undefined;
          try {
            await apiClient.patch(
              '/member/preferences',
              { weekly_workout_goal: goal as any },
              { headers: authHeaders },
            );
          } catch (err) {
            if (axios.isAxiosError(err)) {
              status = err.response?.status;
            }
          }
          expect(status).toBe(422);
        }
      });
    });

    describe('Preferences workout_type & intensity enum boundary', () => {
      it('BOUND-3.5: Invalid workout_type should be rejected with 422', async () => {
        // CONTRACT.md §4: workout_type: "chest" | "back" | "leg" | "arm" | "full-body" | "hiit" | "strength"
        let status: number | undefined;
        try {
          await apiClient.patch(
            '/member/preferences',
            { workout_type: 'crossfit_extreme' },
            { headers: authHeaders },
          );
        } catch (err) {
          if (axios.isAxiosError(err)) {
            status = err.response?.status;
          }
        }
        expect(status).toBe(422);
      });

      it('BOUND-3.6: Invalid intensity should be rejected with 422', async () => {
        // CONTRACT.md §4: intensity: "light" | "moderate" | "intense"
        let status: number | undefined;
        try {
          await apiClient.patch(
            '/member/preferences',
            { intensity: 'ultra-insane' },
            { headers: authHeaders },
          );
        } catch (err) {
          if (axios.isAxiosError(err)) {
            status = err.response?.status;
          }
        }
        expect(status).toBe(422);
      });
    });

    describe('POST /api/v1/auth/change-password contract verification', () => {
      it('BOUND-3.7: Incorrect current_password must return 401 Unauthorized per CONTRACT.md §3 line 122', async () => {
        // CONTRACT.md §3 line 122:
        // Response 401 Unauthorized: Unauthenticated or incorrect current password ({ "message": "Unauthenticated." })
        let status: number | undefined;
        try {
          await apiClient.post(
            '/api/v1/auth/change-password',
            {
              current_password: 'WrongCurrentPassword999!',
              new_password: 'BrandNewValidPassword123!',
              new_password_confirmation: 'BrandNewValidPassword123!',
            },
            { headers: authHeaders },
          );
        } catch (err) {
          if (axios.isAxiosError(err)) {
            status = err.response?.status;
          }
        }
        expect(status).toBe(401);
      });
    });

    describe('POST /member/progress mandatory idempotency_key', () => {
      it('BOUND-3.8: Progress submission without idempotency_key should be rejected per CONTRACT.md §4 line 311', async () => {
        // CONTRACT.md §4 line 311: "Logs completed workout progress with mandatory idempotency key."
        let status: number | undefined;
        try {
          await apiClient.post(
            '/member/progress',
            {
              workout_id: 'w1',
              duration_seconds: 1200,
              calories_burned: 150,
              // missing idempotency_key
            },
            { headers: authHeaders },
          );
        } catch (err) {
          if (axios.isAxiosError(err)) {
            status = err.response?.status;
          }
        }
        expect(status).toBe(422);
      });
    });
  });
});
