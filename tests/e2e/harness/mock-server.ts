/**
 * MSW-identical mock API server oracle for GymFlow Mobile E2E tests.
 * Implements confirmed byte-for-byte login contract, 10 proposed endpoints,
 * latency simulation (300-800ms), idempotency deduplication, and error injection.
 */

import type {
  User,
  LoginResponse,
  MemberProfile,
  Preferences,
  Workout,
  Session,
  AttendanceRecord,
  ProgressEntry,
  ProgressSummary,
  ChartDataPoint,
} from './types.ts';

export interface HttpResponse<T = any> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  latencyMs: number;
}

export class MockServer {
  public simulatedLatencyMin = 300;
  public simulatedLatencyMax = 800;
  public enableSimulatedDelay = false; // Fast execution in unit/e2e tests by default
  public networkConnected = true;

  // Injected fault overrides
  private forcedStatusByEndpoint = new Map<string, { status: number; body?: any }>();
  private timeoutEndpoints = new Set<string>();

  // In-memory database state
  public credentials = {
    email: 'member@gymflow.test',
    password: 'TempPass!23',
  };

  public altCredentials = {
    email: 'jane.doe@example.com',
    password: 'Password123!',
  };

  public profile: MemberProfile = {
    id: 1,
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1 (555) 234-5678',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    must_change_password: false,
    membership: {
      id: 'mem_tier_elite_01',
      tier: 'Black Diamond All-Access',
      status: 'active',
      member_since: '2024-01-15T00:00:00Z',
      valid_until: '2027-01-15T23:59:59Z',
    },
    preferences: {
      workout_type: 'strength',
      intensity: 'high',
      weekly_workout_goal: 4,
    },
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2026-09-01T12:00:00Z',
  };

  public preferences: Preferences = {
    workout_type: 'strength',
    intensity: 'high',
    weekly_workout_goal: 4,
    updated_at: '2026-09-01T12:00:00Z',
  };

  public workouts: Workout[] = [
    {
      id: 'wk_chest_01',
      title: 'Barbell Bench & Upper Hypertrophy',
      category: 'chest',
      type: 'chest',
      difficulty: 'intermediate',
      source: 'GymFlow Master Trainer Marcus',
      duration_minutes: 50,
      calories: 480,
      reps_sets: '4 sets x 8-12 reps',
      sets: 4,
      reps: 10,
      description: 'Progressive overload focused bench press paired with incline dumbbell flyes.',
      media_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b',
      image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b',
      completion_percentage: 100,
      exercises_count: 6,
      updated_at: '2026-08-20T10:00:00Z',
    },
    {
      id: 'wk_back_01',
      title: 'Deadlift Mastery & Lat Destruction',
      category: 'back',
      type: 'back',
      difficulty: 'advanced',
      source: 'Coach Elena Rostova',
      duration_minutes: 60,
      calories: 620,
      reps_sets: '5 sets x 5 reps',
      sets: 5,
      reps: 5,
      description: 'Conventional deadlift form refinement combined with heavy chest-supported rows.',
      media_url: 'https://images.unsplash.com/photo-1603287681859-4d7cb0efb323',
      image_url: 'https://images.unsplash.com/photo-1603287681859-4d7cb0efb323',
      completion_percentage: 65,
      exercises_count: 7,
      updated_at: '2026-08-22T14:30:00Z',
    },
    {
      id: 'wk_leg_01',
      title: 'Squat Compound & Quad Overload',
      category: 'leg',
      type: 'leg',
      difficulty: 'advanced',
      source: 'Coach Elena Rostova',
      duration_minutes: 55,
      calories: 550,
      reps_sets: '5 sets x 6-8 reps',
      sets: 5,
      reps: 8,
      description: 'Heavy barbell back squat paired with walking lunges and leg press.',
      media_url: 'https://images.unsplash.com/photo-1434608596716-15ff99c6083f',
      image_url: 'https://images.unsplash.com/photo-1434608596716-15ff99c6083f',
      completion_percentage: 40,
      exercises_count: 5,
      updated_at: '2026-08-25T11:00:00Z',
    },
    {
      id: 'wk_arm_01',
      title: 'Bicep Peak & Tricep Horseshoe Circuit',
      category: 'arm',
      type: 'arm',
      difficulty: 'beginner',
      source: 'GymFlow Master Trainer Marcus',
      duration_minutes: 30,
      calories: 250,
      reps_sets: '3 sets x 12-15 reps',
      sets: 3,
      reps: 15,
      description: 'High pump arm sculpting supersets with minimal rest periods.',
      media_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61',
      image_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61',
      completion_percentage: 80,
      exercises_count: 4,
      updated_at: '2026-08-26T09:00:00Z',
    },
    {
      id: 'wk_fullbody_01',
      title: 'Full-Body Metcon Engine',
      category: 'full-body',
      type: 'full-body',
      difficulty: 'intermediate',
      source: 'Coach Sarah Jenkins',
      duration_minutes: 45,
      calories: 500,
      reps_sets: '4 rounds for time',
      sets: 4,
      reps: 12,
      description: 'Dynamic kettlebell swings, rowing intervals, and wall-balls.',
      media_url: 'https://images.unsplash.com/photo-1534258936971-a7e5955b0274',
      image_url: 'https://images.unsplash.com/photo-1534258936971-a7e5955b0274',
      completion_percentage: 20,
      exercises_count: 6,
      updated_at: '2026-08-28T16:00:00Z',
    },
  ];

  public sessions: Session[] = [
    {
      id: 'sess_hiit_101',
      workout_id: 'wk_fullbody_01',
      title: 'High-Octane Conditioning',
      trainer: { id: 't1', name: 'Coach Marcus Vance' },
      location: 'Main Turf Arena',
      start_time: '2026-09-06T09:00:00Z',
      end_time: '2026-09-06T10:00:00Z',
      starts_at: '2026-09-06T09:00:00Z',
      ends_at: '2026-09-06T10:00:00Z',
      status: 'upcoming',
      can_cancel: true,
      is_checked_in: false,
    },
    {
      id: 'sess_yoga_204',
      workout_id: null,
      title: 'Vinyasa Flow & Breathwork',
      trainer: { id: 't2', name: 'Sarah Jenkins' },
      location: 'Mind-Body Studio 3',
      start_time: '2026-09-07T17:30:00Z',
      end_time: '2026-09-07T18:30:00Z',
      starts_at: '2026-09-07T17:30:00Z',
      ends_at: '2026-09-07T18:30:00Z',
      status: 'cancelled_by_gym', // Pre-cancelled to test 409 conflict
      can_cancel: false,
      is_checked_in: false,
    },
    {
      id: 'sess_strength_305',
      workout_id: 'wk_chest_01',
      title: 'Hypertrophy Bench Clinic',
      trainer: { id: 't1', name: 'Coach Marcus Vance' },
      location: 'Free Weights Deck',
      start_time: '2026-09-08T14:00:00Z',
      end_time: '2026-09-08T15:00:00Z',
      starts_at: '2026-09-08T14:00:00Z',
      ends_at: '2026-09-08T15:00:00Z',
      status: 'upcoming',
      can_cancel: true,
      is_checked_in: false,
    },
  ];

  public attendanceLogs: AttendanceRecord[] = [];
  public progressHistory: ProgressEntry[] = [
    {
      id: 'prog_rec_4582',
      workout_id: 'wk_chest_01',
      workout_title: 'Barbell Bench & Upper Hypertrophy',
      member_id: 1,
      started_at: '2026-09-05T07:30:00Z',
      completed_at: '2026-09-05T08:20:00Z',
      duration_seconds: 3000,
      calories_burned: 480,
      idempotency_key: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      heart_rate: null, // R4 null heart rate requirement
      created_at: '2026-09-05T08:20:05Z',
    },
  ];

  public seenIdempotencyKeys = new Map<string, any>();
  public validTokens = new Set<string>([
    '1|abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
    '1|mocksanctumtokenabcdef123456',
  ]);

  public reset(): void {
    this.forcedStatusByEndpoint.clear();
    this.timeoutEndpoints.clear();
    this.networkConnected = true;
    this.seenIdempotencyKeys.clear();
    this.profile.must_change_password = false;
    this.sessions.forEach((s) => {
      if (s.id === 'sess_yoga_204') {
        s.status = 'cancelled_by_gym';
        s.can_cancel = false;
      } else {
        s.status = 'upcoming';
        s.can_cancel = true;
        s.is_checked_in = false;
      }
    });
  }

  public setForcedError(endpoint: string, status: number, body?: any): void {
    this.forcedStatusByEndpoint.set(endpoint, { status, body });
  }

  public setTimeout(endpoint: string): void {
    this.timeoutEndpoints.add(endpoint);
  }

  public clearOverrides(): void {
    this.forcedStatusByEndpoint.clear();
    this.timeoutEndpoints.clear();
  }

  private calculateLatency(): number {
    if (!this.enableSimulatedDelay) return 0;
    return Math.floor(
      Math.random() * (this.simulatedLatencyMax - this.simulatedLatencyMin + 1) +
        this.simulatedLatencyMin
    );
  }

  private isAuthorized(authHeader?: string): boolean {
    if (!authHeader) return false;
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return false;
    const token = match[1];
    return this.validTokens.has(token);
  }

  /**
   * Dispatches request to handler and returns typed HTTP response.
   */
  public async request<T = any>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<HttpResponse<T>> {
    const latency = this.calculateLatency();
    if (latency > 0) {
      await new Promise((r) => setTimeout(r, latency));
    }

    if (!this.networkConnected) {
      throw new Error('Network request failed: device is offline');
    }

    // Check forced timeout
    if (this.timeoutEndpoints.has(path)) {
      throw new Error(`Gateway Timeout: simulated timeout for ${path}`);
    }

    // Check forced error status
    if (this.forcedStatusByEndpoint.has(path)) {
      const override = this.forcedStatusByEndpoint.get(path)!;
      return {
        status: override.status,
        statusText: `Error ${override.status}`,
        headers: { 'content-type': 'application/json' },
        data: override.body ?? { message: `Simulated error ${override.status}` },
        latencyMs: latency,
      };
    }

    const authHeader = headers['Authorization'] || headers['authorization'];
    const cleanPath = path.split('?')[0];

    // ── 1. Confirmed Login Contract: POST /api/v1/auth/login ─────────────
    if (cleanPath === '/api/v1/auth/login' && method === 'POST') {
      if (!body || !body.email || !body.password) {
        return {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: { 'content-type': 'application/json' },
          data: {
            message: 'The given data was invalid.',
            errors: {
              email: !body?.email ? ['The email field is required and must be a valid email address.'] : [],
              password: !body?.password ? ['The password field is required.'] : [],
            },
          },
          latencyMs: latency,
        };
      }

      const isValidUser =
        (body.email === this.credentials.email && body.password === this.credentials.password) ||
        (body.email === this.altCredentials.email && body.password === this.altCredentials.password);

      if (!isValidUser) {
        return {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'content-type': 'application/json' },
          data: { message: 'These credentials do not match our records.' },
          latencyMs: latency,
        };
      }

      const token = '1|abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      this.validTokens.add(token);
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: {
          token,
          user: {
            id: 1,
            name: this.profile.name,
            role: 'member' as const,
          },
        },
        latencyMs: latency,
      };
    }

    // ── 2. POST /api/v1/auth/forgot-password ──────────────────────────────
    if (cleanPath === '/api/v1/auth/forgot-password' && method === 'POST') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!body?.email || !emailRegex.test(body.email)) {
        return {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: { 'content-type': 'application/json' },
          data: { message: 'The email must be a valid email address.' },
          latencyMs: latency,
        };
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { message: 'If an account exists with this email, password reset instructions have been sent.' },
        latencyMs: latency,
      };
    }

    // ── 3. POST /api/v1/auth/change-password ──────────────────────────────
    if (cleanPath === '/api/v1/auth/change-password' && method === 'POST') {
      if (!this.isAuthorized(authHeader)) {
        return {
          status: 401,
          statusText: 'Unauthorized',
          headers: { 'content-type': 'application/json' },
          data: { message: 'Unauthenticated.' },
          latencyMs: latency,
        };
      }
      const { new_password, new_password_confirmation, password } = body || {};
      const targetPass = new_password || password;

      if (!targetPass || targetPass.length < 8) {
        return {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: { 'content-type': 'application/json' },
          data: { message: 'The password must be at least 8 characters.' },
          latencyMs: latency,
        };
      }

      if (new_password && new_password_confirmation && new_password !== new_password_confirmation) {
        return {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: { 'content-type': 'application/json' },
          data: { message: 'The password confirmation does not match.' },
          latencyMs: latency,
        };
      }

      this.profile.must_change_password = false;
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { message: 'Password has been successfully updated.' },
        latencyMs: latency,
      };
    }

    // ── Protected Endpoints Check ─────────────────────────────────────────
    if (!this.isAuthorized(authHeader)) {
      return {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'content-type': 'application/json' },
        data: { message: 'Unauthenticated.' },
        latencyMs: latency,
      };
    }

    // ── 4. GET & PATCH /member/profile ────────────────────────────────────
    if (cleanPath === '/member/profile') {
      if (method === 'GET') {
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { ...this.profile },
          latencyMs: latency,
        };
      }
      if (method === 'PATCH') {
        if (body?.photo_url && !body.photo_url.startsWith('http')) {
          return {
            status: 422,
            statusText: 'Unprocessable Entity',
            headers: { 'content-type': 'application/json' },
            data: { message: 'Invalid photo URL format.' },
            latencyMs: latency,
          };
        }
        Object.assign(this.profile, body, { updated_at: new Date().toISOString() });
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { ...this.profile },
          latencyMs: latency,
        };
      }
    }

    // ── 5. GET & PATCH /member/preferences ────────────────────────────────
    if (cleanPath === '/member/preferences') {
      if (method === 'GET') {
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { ...this.preferences },
          latencyMs: latency,
        };
      }
      if (method === 'PATCH') {
        if (
          body?.weekly_workout_goal !== undefined &&
          (body.weekly_workout_goal < 1 || body.weekly_workout_goal > 7)
        ) {
          return {
            status: 422,
            statusText: 'Unprocessable Entity',
            headers: { 'content-type': 'application/json' },
            data: { message: 'Weekly workout goal must be between 1 and 7 days.' },
            latencyMs: latency,
          };
        }
        Object.assign(this.preferences, body, { updated_at: new Date().toISOString() });
        if (this.profile.preferences) {
          Object.assign(this.profile.preferences, this.preferences);
        }
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { ...this.preferences },
          latencyMs: latency,
        };
      }
    }

    // ── 6. GET /member/workouts & GET /member/workouts/:id ─────────────────
    if (cleanPath.startsWith('/member/workouts')) {
      const match = cleanPath.match(/\/member\/workouts\/([^/?]+)/);
      if (match) {
        const id = match[1];
        const workout = this.workouts.find((w) => w.id === id);
        if (!workout) {
          return {
            status: 404,
            statusText: 'Not Found',
            headers: { 'content-type': 'application/json' },
            data: { message: 'Workout not found' },
            latencyMs: latency,
          };
        }
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: workout,
          latencyMs: latency,
        };
      }

      if (method === 'GET') {
        const queryParams = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');
        const category = queryParams.get('category') || queryParams.get('type');
        const difficulty = queryParams.get('difficulty');

        let filtered = [...this.workouts];
        if (category && category !== 'all') {
          filtered = filtered.filter((w) => w.category === category || w.type === category);
        }
        if (difficulty && difficulty !== 'all') {
          filtered = filtered.filter((w) => w.difficulty === difficulty);
        }

        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: filtered,
          latencyMs: latency,
        };
      }
    }

    // ── 7. POST /member/attendance ────────────────────────────────────────
    if (cleanPath === '/member/attendance' && method === 'POST') {
      const { session_id, checked_in_at, idempotency_key } = body || {};
      const session = this.sessions.find((s) => s.id === session_id);

      if (!session) {
        return {
          status: 404,
          statusText: 'Not Found',
          headers: { 'content-type': 'application/json' },
          data: { message: 'Session does not exist.' },
          latencyMs: latency,
        };
      }

      if (session.status === 'cancelled_by_gym' || session.status === 'cancelled') {
        return {
          status: 409,
          statusText: 'Conflict',
          headers: { 'content-type': 'application/json' },
          data: {
            error: 'conflict',
            code: 'SESSION_CANCELLED_BY_GYM',
            message: 'This session has already been cancelled by the gym.',
            reason: 'session_cancelled',
          },
          latencyMs: latency,
        };
      }

      if (idempotency_key && this.seenIdempotencyKeys.has(idempotency_key)) {
        return {
          status: 200,
          statusText: 'OK (Replayed)',
          headers: { 'content-type': 'application/json' },
          data: this.seenIdempotencyKeys.get(idempotency_key),
          latencyMs: latency,
        };
      }

      const record: AttendanceRecord = {
        id: `att_log_${this.attendanceLogs.length + 9001}`,
        session_id,
        member_id: 1,
        checked_in_at: checked_in_at || new Date().toISOString(),
        status: 'confirmed',
        idempotency_key,
      };

      this.attendanceLogs.push(record);
      session.is_checked_in = true;
      session.checked_in = true;

      if (idempotency_key) {
        this.seenIdempotencyKeys.set(idempotency_key, record);
      }

      return {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: record,
        latencyMs: latency,
      };
    }

    // ── 8. POST /member/progress & GET /member/progress ───────────────────
    if (cleanPath === '/member/progress') {
      if (method === 'POST') {
        const {
          workout_id,
          started_at,
          completed_at,
          duration_seconds,
          calories_burned,
          idempotency_key,
          heart_rate,
        } = body || {};

        if (idempotency_key && this.seenIdempotencyKeys.has(idempotency_key)) {
          return {
            status: 200,
            statusText: 'OK (Idempotent replay)',
            headers: { 'content-type': 'application/json' },
            data: this.seenIdempotencyKeys.get(idempotency_key),
            latencyMs: latency,
          };
        }

        const workout = this.workouts.find((w) => w.id === workout_id);
        const record: ProgressEntry = {
          id: `prog_rec_${this.progressHistory.length + 4583}`,
          workout_id,
          workout_title: workout?.title || 'Workout Execution',
          member_id: 1,
          started_at: started_at || new Date().toISOString(),
          completed_at: completed_at || new Date().toISOString(),
          duration_seconds: Number(duration_seconds) || 0,
          calories_burned: Number(calories_burned) || 0,
          idempotency_key: idempotency_key || `gen_${Date.now()}`,
          heart_rate: heart_rate ?? null,
          created_at: new Date().toISOString(),
        };

        this.progressHistory.unshift(record);
        if (idempotency_key) {
          this.seenIdempotencyKeys.set(idempotency_key, record);
        }

        return {
          status: 201,
          statusText: 'Created',
          headers: { 'content-type': 'application/json' },
          data: record,
          latencyMs: latency,
        };
      }

      if (method === 'GET') {
        const queryParams = new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');
        const period = (queryParams.get('period') || 'week') as 'week' | 'month' | 'year' | 'all';

        const totalWorkouts = this.progressHistory.length;
        const totalDuration = this.progressHistory.reduce((acc, p) => acc + p.duration_seconds, 0);
        const totalCalories = this.progressHistory.reduce((acc, p) => acc + p.calories_burned, 0);
        const weeklyGoal = this.preferences.weekly_workout_goal || 4;
        const goalProgress = Math.min(100, Math.round((totalWorkouts / weeklyGoal) * 100));

        const chartData: ChartDataPoint[] = [
          { label: 'Mon', calories: 480, duration_minutes: 50, date: '2026-08-31' },
          { label: 'Tue', calories: 0, duration_minutes: 0, date: '2026-09-01' },
          { label: 'Wed', calories: 620, duration_minutes: 60, date: '2026-09-02' },
          { label: 'Thu', calories: 0, duration_minutes: 0, date: '2026-09-03' },
          { label: 'Fri', calories: 550, duration_minutes: 55, date: '2026-09-04' },
          { label: 'Sat', calories: 500, duration_minutes: 45, date: '2026-09-05' },
          { label: 'Sun', calories: 0, duration_minutes: 0, date: '2026-09-06' },
        ];

        const summary: ProgressSummary = {
          period,
          total_workouts: totalWorkouts,
          total_duration_seconds: totalDuration,
          total_calories: totalCalories,
          weekly_goal: weeklyGoal,
          goal_progress_percentage: goalProgress,
          average_heart_rate: null, // Strictly null per requirement
          chart_data: chartData,
          history: [...this.progressHistory],
        };

        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: summary,
          latencyMs: latency,
        };
      }
    }

    // ── 9. GET /member/sessions & POST /member/sessions/:id/cancel ────────
    if (cleanPath.startsWith('/member/sessions')) {
      const cancelMatch = cleanPath.match(/\/member\/sessions\/([^/?]+)\/cancel/);
      if (cancelMatch && method === 'POST') {
        const sessionId = cancelMatch[1];
        const session = this.sessions.find((s) => s.id === sessionId);
        if (!session) {
          return {
            status: 404,
            statusText: 'Not Found',
            headers: { 'content-type': 'application/json' },
            data: { message: 'Session not found' },
            latencyMs: latency,
          };
        }

        if (session.status === 'cancelled_by_gym') {
          return {
            status: 409,
            statusText: 'Conflict',
            headers: { 'content-type': 'application/json' },
            data: {
              error: 'conflict',
              code: 'SESSION_CANCELLED_BY_GYM',
              message: 'This session has already been cancelled by the gym.',
            },
            latencyMs: latency,
          };
        }

        session.status = 'cancelled_by_member';
        session.can_cancel = false;

        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: {
            id: sessionId,
            status: 'cancelled_by_member',
            cancelled_at: new Date().toISOString(),
            message: 'Session successfully cancelled.',
          },
          latencyMs: latency,
        };
      }

      if (method === 'GET') {
        return {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: [...this.sessions],
          latencyMs: latency,
        };
      }
    }

    // Default 404
    return {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'application/json' },
      data: { message: `Route not found: ${method} ${path}` },
      latencyMs: latency,
    };
  }
}
