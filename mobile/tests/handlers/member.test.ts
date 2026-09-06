import { apiClient } from '../../src/api/client';
import axios from 'axios';
import { resetState, state } from '../../handlers/fixtures/seed';

describe('Member MSW Handlers', () => {
  const authHeaders = { Authorization: 'Bearer valid-member-token' };

  beforeEach(() => {
    resetState();
  });

  describe('GET /member/profile', () => {
    it('returns 200 OK with full profile shape including must_change_password and membership', async () => {
      const res = await apiClient.get('/member/profile', { headers: authHeaders });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('id');
      expect(res.data).toHaveProperty('name');
      expect(res.data).toHaveProperty('must_change_password');
      expect(res.data).toHaveProperty('membership');
      expect(res.data.membership).toHaveProperty('status', 'active');
      expect(res.data.membership).toHaveProperty('tier');
    });

    it('returns 401 when Authorization header is omitted', async () => {
      expect.assertions(1);
      try {
        await apiClient.get('/member/profile');
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(401);
        }
      }
    });
  });

  describe('PATCH /member/profile', () => {
    it('updates member contact info and photo url', async () => {
      const updateData = {
        name: 'Jane Updated',
        phone: '+1 (555) 000-1122',
        photo_url: 'https://images.unsplash.com/photo-updated',
      };

      const res = await apiClient.patch('/member/profile', updateData, { headers: authHeaders });
      expect(res.status).toBe(200);
      expect(res.data.name).toBe('Jane Updated');
      expect(res.data.phone).toBe('+1 (555) 000-1122');
      expect(res.data.photo_url).toBe('https://images.unsplash.com/photo-updated');
    });

    it('returns 422 if phone format or photo url is invalid', async () => {
      expect.assertions(2);
      try {
        await apiClient.patch(
          '/member/profile',
          { photo_url: 'not-a-valid-url' },
          { headers: authHeaders },
        );
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(422);
          expect(err.response?.data.errors).toHaveProperty('photo_url');
        }
      }
    });
  });

  describe('PATCH /member/preferences', () => {
    it('updates workout_type, intensity, and weekly_workout_goal', async () => {
      const res = await apiClient.patch(
        '/member/preferences',
        { workout_type: 'hiit', intensity: 'intense', weekly_workout_goal: 5 },
        { headers: authHeaders },
      );
      expect(res.status).toBe(200);
      expect(res.data.weekly_workout_goal).toBe(5);
      expect(res.data.workout_type).toBe('hiit');
      expect(res.data.intensity).toBe('intense');
    });

    it('returns 422 if weekly_workout_goal is outside 1..7 bounds', async () => {
      expect.assertions(2);
      try {
        await apiClient.patch(
          '/member/preferences',
          { weekly_workout_goal: 10 },
          { headers: authHeaders },
        );
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(422);
          expect(err.response?.data.errors).toHaveProperty('weekly_workout_goal');
        }
      }
    });
  });

  describe('GET /member/workouts', () => {
    it('returns workout catalog array with all required fields', async () => {
      const res = await apiClient.get('/member/workouts', { headers: authHeaders });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeGreaterThan(0);

      const workout = res.data.data[0];
      expect(workout).toHaveProperty('id');
      expect(workout).toHaveProperty('title');
      expect(workout).toHaveProperty('category');
      expect(workout).toHaveProperty('difficulty');
      expect(workout).toHaveProperty('duration_minutes');
      expect(workout).toHaveProperty('calories');
      expect(workout).toHaveProperty('reps_sets');
      expect(workout).toHaveProperty('image_url');
    });

    it('filters catalog by category query parameter', async () => {
      const res = await apiClient.get('/member/workouts?category=chest', { headers: authHeaders });
      expect(res.status).toBe(200);
      res.data.data.forEach((w: { category: string }) => {
        expect(w.category).toBe('chest');
      });
    });

    it('returns workout detail for specific id', async () => {
      const res = await apiClient.get('/member/workouts/w1', { headers: authHeaders });
      expect(res.status).toBe(200);
      expect(res.data.id).toBe('w1');
      expect(res.data.title).toBe('Bench Press Power');
    });

    it('returns 404 for unknown workout id', async () => {
      expect.assertions(1);
      try {
        await apiClient.get('/member/workouts/non_existent_id', { headers: authHeaders });
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(404);
        }
      }
    });
  });

  describe('Sessions and Cancellation', () => {
    it('returns upcoming and past member sessions', async () => {
      const res = await apiClient.get('/member/sessions', { headers: authHeaders });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeGreaterThan(0);
      expect(res.data.data[0]).toHaveProperty('id');
      expect(res.data.data[0]).toHaveProperty('title');
      expect(res.data.data[0]).toHaveProperty('starts_at');
      expect(res.data.data[0]).toHaveProperty('status');
    });

    it('returns 200 OK when cancelling a session', async () => {
      const res = await apiClient.post(
        '/member/sessions/s1/cancel',
        { reason: 'Schedule conflict' },
        { headers: authHeaders },
      );
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('cancelled_by_member');
    });

    it('returns 409 Conflict when attempting to cancel a session already cancelled by the gym', async () => {
      expect.assertions(3);
      try {
        await apiClient.post(
          '/member/sessions/sess_yoga_204/cancel',
          {},
          { headers: authHeaders },
        );
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(409);
          expect(err.response?.data.code).toBe('SESSION_CANCELLED_BY_GYM');
          expect(err.response?.data.message).toContain('already been cancelled by the gym');
        }
      }
    });
  });

  describe('Attendance Logging', () => {
    it('logs attendance successfully', async () => {
      const res = await apiClient.post(
        '/member/attendance',
        { session_id: 's1', checked_in_at: new Date().toISOString() },
        { headers: authHeaders },
      );
      expect([200, 201]).toContain(res.status);
      expect(res.data.status).toBe('confirmed');
      expect(res.data.session_id).toBe('s1');
    });

    it('returns 409 Conflict if session was already cancelled by the gym', async () => {
      expect.assertions(2);
      try {
        await apiClient.post(
          '/member/attendance',
          { session_id: 'sess_yoga_204', checked_in_at: new Date().toISOString() },
          { headers: authHeaders },
        );
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(409);
          expect(err.response?.data.code).toBe('SESSION_CANCELLED_BY_GYM');
        }
      }
    });

    it('returns 422 Unprocessable Entity if session_id is missing', async () => {
      expect.assertions(1);
      try {
        await apiClient.post(
          '/member/attendance',
          { checked_in_at: new Date().toISOString() },
          { headers: authHeaders },
        );
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(422);
        }
      }
    });
  });

  describe('Progress & Idempotency Deduplication', () => {
    it('returns 201 and records progress on valid submission', async () => {
      const payload = {
        workout_id: 'w1',
        started_at: '2026-09-05T07:30:00Z',
        completed_at: '2026-09-05T08:20:00Z',
        duration_seconds: 3000,
        calories_burned: 480,
        heart_rate: null,
        idempotency_key: `test-key-${Date.now()}`,
      };

      const res = await apiClient.post('/member/progress', payload, { headers: authHeaders });
      expect([200, 201]).toContain(res.status);
      expect(res.data).toHaveProperty('id');
      expect(res.data.workout_id).toBe('w1');
      expect(res.data.calories_burned).toBe(480);
      expect(res.data.heart_rate).toBeNull();
    });

    it('returns 422 if duration_seconds or calories_burned is negative', async () => {
      expect.assertions(1);
      try {
        await apiClient.post(
          '/member/progress',
          {
            workout_id: 'w1',
            duration_seconds: -100,
            calories_burned: -50,
            idempotency_key: 'test-bad-key',
          },
          { headers: authHeaders },
        );
      } catch (err) {
        if (axios.isAxiosError(err)) {
          expect(err.response?.status).toBe(422);
        }
      }
    });

    it('deduplicates submissions with identical idempotency_key returning 200 OK and no extra records', async () => {
      const sharedKey = `idempotency-dedupe-${Date.now()}`;
      const payload = {
        workout_id: 'w2',
        started_at: '2026-09-05T09:00:00Z',
        completed_at: '2026-09-05T10:00:00Z',
        duration_seconds: 3600,
        calories_burned: 620,
        idempotency_key: sharedKey,
      };

      const countBefore = state.progress.length;

      // First submission
      const firstRes = await apiClient.post('/member/progress', payload, { headers: authHeaders });
      expect(firstRes.status).toBe(201);
      const originalRecordId = firstRes.data.id;
      expect(state.progress.length).toBe(countBefore + 1);

      // Duplicate submission with identical key
      const secondRes = await apiClient.post('/member/progress', payload, { headers: authHeaders });
      expect(secondRes.status).toBe(200);
      expect(secondRes.data.id).toBe(originalRecordId);
      expect(secondRes.data.idempotency_key).toBe(sharedKey);

      // Verify no duplicate record was created in state
      expect(state.progress.length).toBe(countBefore + 1);
    });

    it('returns progress stats and Victory Native chart data series', async () => {
      const res = await apiClient.get('/member/progress?period=week', { headers: authHeaders });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('period', 'week');
      expect(res.data).toHaveProperty('total_workouts');
      expect(res.data).toHaveProperty('total_calories');
      expect(res.data).toHaveProperty('chart_data');
      expect(Array.isArray(res.data.chart_data)).toBe(true);

      const dataPoint = res.data.chart_data[0];
      expect(dataPoint).toHaveProperty('label');
      expect(dataPoint).toHaveProperty('calories');
      expect(dataPoint).toHaveProperty('duration_minutes');
      expect(dataPoint).toHaveProperty('date');

      // Requirement R4: average_heart_rate must be null (UI renders "—")
      expect(res.data.average_heart_rate).toBeNull();
    });

    it('supports period query parameters: week, month, year, all', async () => {
      for (const period of ['week', 'month', 'year', 'all']) {
        const res = await apiClient.get(`/member/progress?period=${period}`, { headers: authHeaders });
        expect(res.status).toBe(200);
        expect(res.data.period).toBe(period);
      }
    });
  });
});
