import { http, HttpResponse } from 'msw';
import { handleSimulation, isAuthorized, unauthorized } from './middleware';
import { seedWorkouts, state } from './fixtures/seed';

const VALID_WORKOUT_TYPES = [
  'chest',
  'back',
  'leg',
  'arm',
  'full-body',
  'full_body',
  'hiit',
  'strength',
  'cardio',
  'yoga',
  'recovery',
];

const VALID_INTENSITIES = [
  'light',
  'moderate',
  'intense',
  'low',
  'high',
  'extreme',
];

export const memberHandlers = [
  // ── Profile ────────────────────────────────────────────────────────
  http.get('*/api/v1/member/profile', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();
    return HttpResponse.json(state.profile, { status: 200 });
  }),

  http.get('*/member/profile', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();
    return HttpResponse.json(state.profile, { status: 200 });
  }),

  http.patch('*/api/v1/member/profile', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const patch = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (patch.photo_url !== undefined && patch.photo_url !== null) {
      const urlStr = String(patch.photo_url);
      if (urlStr && !urlStr.startsWith('http://') && !urlStr.startsWith('https://') && !urlStr.startsWith('file://')) {
        return HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { photo_url: ['The photo URL format is invalid.'] },
          },
          { status: 422 },
        );
      }
    }

    if (patch.phone !== undefined && patch.phone !== null) {
      const phoneStr = String(patch.phone);
      if (phoneStr && phoneStr.length < 5) {
        return HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { phone: ['The phone format is invalid.'] },
          },
          { status: 422 },
        );
      }
    }

    Object.assign(state.profile, patch);
    state.profile.updated_at = new Date().toISOString();
    return HttpResponse.json(state.profile, { status: 200 });
  }),

  http.patch('*/member/profile', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const patch = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (patch.photo_url !== undefined && patch.photo_url !== null) {
      const urlStr = String(patch.photo_url);
      if (urlStr && !urlStr.startsWith('http://') && !urlStr.startsWith('https://') && !urlStr.startsWith('file://')) {
        return HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { photo_url: ['The photo URL format is invalid.'] },
          },
          { status: 422 },
        );
      }
    }

    if (patch.phone !== undefined && patch.phone !== null) {
      const phoneStr = String(patch.phone);
      if (phoneStr && phoneStr.length < 5) {
        return HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { phone: ['The phone format is invalid.'] },
          },
          { status: 422 },
        );
      }
    }

    Object.assign(state.profile, patch);
    state.profile.updated_at = new Date().toISOString();
    return HttpResponse.json(state.profile, { status: 200 });
  }),

  // ── Preferences ────────────────────────────────────────────────────
  http.get('*/api/v1/member/preferences', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();
    return HttpResponse.json(state.preferences, { status: 200 });
  }),

  http.get('*/member/preferences', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();
    return HttpResponse.json(state.preferences, { status: 200 });
  }),

  http.patch('*/api/v1/member/preferences', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const patch = (await request.json().catch(() => ({}))) as {
      workout_type?: string;
      intensity?: string;
      weekly_workout_goal?: number;
    };

    if (patch.weekly_workout_goal !== undefined) {
      const goal = patch.weekly_workout_goal;
      if (typeof goal !== 'number' || !Number.isInteger(goal) || goal < 1 || goal > 7) {
        return HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { weekly_workout_goal: ['The weekly workout goal must be an integer between 1 and 7.'] },
          },
          { status: 422 },
        );
      }
    }

    if (patch.workout_type !== undefined) {
      if (typeof patch.workout_type !== 'string' || !VALID_WORKOUT_TYPES.includes(patch.workout_type)) {
        return HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { workout_type: ['The selected workout type is invalid.'] },
          },
          { status: 422 },
        );
      }
    }

    if (patch.intensity !== undefined) {
      if (typeof patch.intensity !== 'string' || !VALID_INTENSITIES.includes(patch.intensity)) {
        return HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { intensity: ['The selected intensity is invalid.'] },
          },
          { status: 422 },
        );
      }
    }

    Object.assign(state.preferences, patch);
    if (state.profile.preferences) {
      Object.assign(state.profile.preferences, patch);
    }
    const updated = {
      ...state.preferences,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(updated, { status: 200 });
  }),

  http.patch('*/member/preferences', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const patch = (await request.json().catch(() => ({}))) as {
      workout_type?: string;
      intensity?: string;
      weekly_workout_goal?: number;
    };

    if (patch.weekly_workout_goal !== undefined) {
      const goal = patch.weekly_workout_goal;
      if (typeof goal !== 'number' || !Number.isInteger(goal) || goal < 1 || goal > 7) {
        return HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { weekly_workout_goal: ['The weekly workout goal must be an integer between 1 and 7.'] },
          },
          { status: 422 },
        );
      }
    }

    if (patch.workout_type !== undefined) {
      if (typeof patch.workout_type !== 'string' || !VALID_WORKOUT_TYPES.includes(patch.workout_type)) {
        return HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { workout_type: ['The selected workout type is invalid.'] },
          },
          { status: 422 },
        );
      }
    }

    if (patch.intensity !== undefined) {
      if (typeof patch.intensity !== 'string' || !VALID_INTENSITIES.includes(patch.intensity)) {
        return HttpResponse.json(
          {
            message: 'The given data was invalid.',
            errors: { intensity: ['The selected intensity is invalid.'] },
          },
          { status: 422 },
        );
      }
    }

    Object.assign(state.preferences, patch);
    if (state.profile.preferences) {
      Object.assign(state.profile.preferences, patch);
    }
    const updated = {
      ...state.preferences,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(updated, { status: 200 });
  }),

  // ── Workouts ───────────────────────────────────────────────────────
  http.get('*/api/v1/member/workouts', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const url = new URL(request.url);
    const category = url.searchParams.get('category') || url.searchParams.get('type');
    const difficulty = url.searchParams.get('difficulty');

    let workouts = seedWorkouts;
    if (category) {
      workouts = workouts.filter((w) => w.category === category || (w as any).type === category);
    }
    if (difficulty) {
      workouts = workouts.filter((w) => w.difficulty === difficulty);
    }

    return HttpResponse.json({ data: workouts, meta: { total: workouts.length } }, { status: 200 });
  }),

  http.get('*/member/workouts', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const url = new URL(request.url);
    const category = url.searchParams.get('category') || url.searchParams.get('type');
    const difficulty = url.searchParams.get('difficulty');

    let workouts = seedWorkouts;
    if (category) {
      workouts = workouts.filter((w) => w.category === category || (w as any).type === category);
    }
    if (difficulty) {
      workouts = workouts.filter((w) => w.difficulty === difficulty);
    }

    return HttpResponse.json({ data: workouts, meta: { total: workouts.length } }, { status: 200 });
  }),

  http.get('*/api/v1/member/workouts/:id', async ({ request, params }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const w = seedWorkouts.find((x) => x.id === params.id);
    if (!w) {
      return HttpResponse.json({ message: 'Workout not found' }, { status: 404 });
    }
    return HttpResponse.json(w, { status: 200 });
  }),

  http.get('*/member/workouts/:id', async ({ request, params }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const w = seedWorkouts.find((x) => x.id === params.id);
    if (!w) {
      return HttpResponse.json({ message: 'Workout not found' }, { status: 404 });
    }
    return HttpResponse.json(w, { status: 200 });
  }),

  // ── Sessions ───────────────────────────────────────────────────────
  http.get('*/api/v1/member/sessions', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const url = new URL(request.url);
    const from = url.searchParams.get('from') || url.searchParams.get('start_date');
    const to = url.searchParams.get('to') || url.searchParams.get('end_date');

    let sessions = state.sessions;
    if (from) sessions = sessions.filter((s) => s.starts_at >= from);
    if (to) sessions = sessions.filter((s) => s.starts_at <= to);

    return HttpResponse.json({ data: sessions }, { status: 200 });
  }),

  http.get('*/member/sessions', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const url = new URL(request.url);
    const from = url.searchParams.get('from') || url.searchParams.get('start_date');
    const to = url.searchParams.get('to') || url.searchParams.get('end_date');

    let sessions = state.sessions;
    if (from) sessions = sessions.filter((s) => s.starts_at >= from);
    if (to) sessions = sessions.filter((s) => s.starts_at <= to);

    return HttpResponse.json({ data: sessions }, { status: 200 });
  }),

  http.post('*/api/v1/member/sessions/:id/cancel', async ({ request, params }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const s = state.sessions.find((x) => x.id === params.id);
    if (!s) {
      return HttpResponse.json({ message: 'Session not found' }, { status: 404 });
    }
    if (s.status === 'cancelled' || s.status === 'cancelled_by_gym' || s.status === 'cancelled_by_member') {
      return HttpResponse.json(
        {
          error: 'conflict',
          code: 'SESSION_CANCELLED_BY_GYM',
          reason: 'session_cancelled',
          message: 'This session has already been cancelled by the gym.',
        },
        { status: 409 },
      );
    }

    s.status = 'cancelled_by_member';
    s.can_cancel = false;
    return HttpResponse.json(
      {
        id: s.id,
        status: 'cancelled_by_member',
        can_cancel: false,
        message: 'Session successfully cancelled.',
      },
      { status: 200 },
    );
  }),

  http.post('*/member/sessions/:id/cancel', async ({ request, params }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const s = state.sessions.find((x) => x.id === params.id);
    if (!s) {
      return HttpResponse.json({ message: 'Session not found' }, { status: 404 });
    }
    if (s.status === 'cancelled' || s.status === 'cancelled_by_gym' || s.status === 'cancelled_by_member') {
      return HttpResponse.json(
        {
          error: 'conflict',
          code: 'SESSION_CANCELLED_BY_GYM',
          reason: 'session_cancelled',
          message: 'This session has already been cancelled by the gym.',
        },
        { status: 409 },
      );
    }

    s.status = 'cancelled_by_member';
    s.can_cancel = false;
    return HttpResponse.json(
      {
        id: s.id,
        status: 'cancelled_by_member',
        can_cancel: false,
        message: 'Session successfully cancelled.',
      },
      { status: 200 },
    );
  }),

  // ── Attendance ─────────────────────────────────────────────────────
  http.post('*/api/v1/member/attendance', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const body = (await request.json().catch(() => ({}))) as {
      session_id?: string;
      checked_in_at?: string;
      idempotency_key?: string;
    };

    if (!body.session_id) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { session_id: ['The session_id field is required.'] },
        },
        { status: 422 },
      );
    }

    const session = state.sessions.find((x) => x.id === body.session_id);
    if (!session) {
      return HttpResponse.json({ message: 'Session not found' }, { status: 404 });
    }
    if (session.status === 'cancelled' || session.status === 'cancelled_by_gym') {
      return HttpResponse.json(
        {
          error: 'conflict',
          code: 'SESSION_CANCELLED_BY_GYM',
          reason: 'session_cancelled',
          message: 'This session has already been cancelled by the gym.',
        },
        { status: 409 },
      );
    }

    const key = body.idempotency_key;
    if (key && state.seenIdempotencyKeys.has(key)) {
      return HttpResponse.json(state.seenIdempotencyKeys.get(key), { status: 200 });
    }

    const created = {
      id: `att-${state.attendance.length + 1}`,
      session_id: body.session_id,
      status: 'confirmed',
      checked_in_at: body.checked_in_at || new Date().toISOString(),
    };

    state.attendance.push(body as any);
    session.checked_in = true;
    if (key) {
      state.seenIdempotencyKeys.set(key, created);
    }

    return HttpResponse.json(created, { status: 201 });
  }),

  http.post('*/member/attendance', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const body = (await request.json().catch(() => ({}))) as {
      session_id?: string;
      checked_in_at?: string;
      idempotency_key?: string;
    };

    if (!body.session_id) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { session_id: ['The session_id field is required.'] },
        },
        { status: 422 },
      );
    }

    const session = state.sessions.find((x) => x.id === body.session_id);
    if (!session) {
      return HttpResponse.json({ message: 'Session not found' }, { status: 404 });
    }
    if (session.status === 'cancelled' || session.status === 'cancelled_by_gym') {
      return HttpResponse.json(
        {
          error: 'conflict',
          code: 'SESSION_CANCELLED_BY_GYM',
          reason: 'session_cancelled',
          message: 'This session has already been cancelled by the gym.',
        },
        { status: 409 },
      );
    }

    const key = body.idempotency_key;
    if (key && state.seenIdempotencyKeys.has(key)) {
      return HttpResponse.json(state.seenIdempotencyKeys.get(key), { status: 200 });
    }

    const created = {
      id: `att-${state.attendance.length + 1}`,
      session_id: body.session_id,
      status: 'confirmed',
      checked_in_at: body.checked_in_at || new Date().toISOString(),
    };

    state.attendance.push(body as any);
    session.checked_in = true;
    if (key) {
      state.seenIdempotencyKeys.set(key, created);
    }

    return HttpResponse.json(created, { status: 201 });
  }),

  // ── Progress (with Idempotency Deduplication) ───────────────────────
  http.post('*/api/v1/member/progress', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const body = (await request.json().catch(() => ({}))) as {
      workout_id?: string;
      started_at?: string;
      completed_at?: string;
      duration_seconds?: number;
      calories_burned?: number;
      heart_rate?: number | null;
      idempotency_key?: string;
    };

    const hasIdempotencyKey = typeof body.idempotency_key === 'string' && body.idempotency_key.trim().length > 0;
    if (
      !body.workout_id ||
      body.duration_seconds === undefined ||
      body.calories_burned === undefined ||
      !hasIdempotencyKey
    ) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: {
            ...(!body.workout_id ? { workout_id: ['The workout_id field is required.'] } : {}),
            ...(body.duration_seconds === undefined ? { duration_seconds: ['The duration_seconds field is required.'] } : {}),
            ...(body.calories_burned === undefined ? { calories_burned: ['The calories_burned field is required.'] } : {}),
            ...(!hasIdempotencyKey ? { idempotency_key: ['The idempotency_key field is required.'] } : {}),
          },
        },
        { status: 422 },
      );
    }

    if (body.duration_seconds < 0 || body.calories_burned < 0) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: {
            ...(body.duration_seconds < 0 ? { duration_seconds: ['Duration cannot be negative.'] } : {}),
            ...(body.calories_burned < 0 ? { calories_burned: ['Calories burned cannot be negative.'] } : {}),
          },
        },
        { status: 422 },
      );
    }

    const key = body.idempotency_key;
    if (key && state.seenIdempotencyKeys.has(key)) {
      return HttpResponse.json(state.seenIdempotencyKeys.get(key), { status: 200 });
    }

    const workout = seedWorkouts.find((w) => w.id === body.workout_id);
    const nowIso = new Date().toISOString();
    const entry = {
      id: `p-new-${state.progress.length + 1}`,
      workout_id: body.workout_id,
      workout_title: workout?.title || 'Workout',
      completed_at: body.completed_at || nowIso,
      duration_seconds: body.duration_seconds,
      calories_burned: body.calories_burned,
      heart_rate: body.heart_rate ?? null,
      idempotency_key: key,
      created_at: nowIso,
    };

    state.progress.unshift(entry);
    if (key) {
      state.seenIdempotencyKeys.set(key, entry);
    }

    return HttpResponse.json(entry, { status: 201 });
  }),

  http.post('*/member/progress', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const body = (await request.json().catch(() => ({}))) as {
      workout_id?: string;
      started_at?: string;
      completed_at?: string;
      duration_seconds?: number;
      calories_burned?: number;
      heart_rate?: number | null;
      idempotency_key?: string;
    };

    const hasIdempotencyKey = typeof body.idempotency_key === 'string' && body.idempotency_key.trim().length > 0;
    if (
      !body.workout_id ||
      body.duration_seconds === undefined ||
      body.calories_burned === undefined ||
      !hasIdempotencyKey
    ) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: {
            ...(!body.workout_id ? { workout_id: ['The workout_id field is required.'] } : {}),
            ...(body.duration_seconds === undefined ? { duration_seconds: ['The duration_seconds field is required.'] } : {}),
            ...(body.calories_burned === undefined ? { calories_burned: ['The calories_burned field is required.'] } : {}),
            ...(!hasIdempotencyKey ? { idempotency_key: ['The idempotency_key field is required.'] } : {}),
          },
        },
        { status: 422 },
      );
    }

    if (body.duration_seconds < 0 || body.calories_burned < 0) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: {
            ...(body.duration_seconds < 0 ? { duration_seconds: ['Duration cannot be negative.'] } : {}),
            ...(body.calories_burned < 0 ? { calories_burned: ['Calories burned cannot be negative.'] } : {}),
          },
        },
        { status: 422 },
      );
    }

    const key = body.idempotency_key;
    if (key && state.seenIdempotencyKeys.has(key)) {
      return HttpResponse.json(state.seenIdempotencyKeys.get(key), { status: 200 });
    }

    const workout = seedWorkouts.find((w) => w.id === body.workout_id);
    const nowIso = new Date().toISOString();
    const entry = {
      id: `p-new-${state.progress.length + 1}`,
      workout_id: body.workout_id,
      workout_title: workout?.title || 'Workout',
      completed_at: body.completed_at || nowIso,
      duration_seconds: body.duration_seconds,
      calories_burned: body.calories_burned,
      heart_rate: body.heart_rate ?? null,
      idempotency_key: key,
      created_at: nowIso,
    };

    state.progress.unshift(entry);
    if (key) {
      state.seenIdempotencyKeys.set(key, entry);
    }

    return HttpResponse.json(entry, { status: 201 });
  }),

  // ── Progress History & Chart Data ──────────────────────────────────
  http.get('*/api/v1/member/progress', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const url = new URL(request.url);
    let period = url.searchParams.get('period') || 'week';
    if (period === '7d') period = 'week';
    else if (period === '30d') period = 'month';
    else if (period === '90d') period = 'year';

    const validPeriods = ['week', 'month', 'year', 'all', '7d', '30d', '90d'];
    if (!validPeriods.includes(period)) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { period: ['Invalid period specified.'] },
        },
        { status: 422 },
      );
    }

    const now = new Date();
    const cutoff = new Date(now);
    let days = 7;
    if (period === 'month') days = 30;
    else if (period === 'year') days = 365;
    else if (period === 'all') days = 9999;
    cutoff.setDate(cutoff.getDate() - days);

    const filtered = state.progress.filter((p) => new Date(p.completed_at) >= cutoff);
    const totalDuration = filtered.reduce((acc, p) => acc + p.duration_seconds, 0);
    const totalCalories = filtered.reduce((acc, p) => acc + p.calories_burned, 0);

    const chartData = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      const dateStr = d.toISOString().split('T')[0]!;
      const dayEntries = filtered.filter((p) => p.completed_at.startsWith(dateStr));
      const calories = dayEntries.reduce((sum, e) => sum + e.calories_burned, 0);
      const durationMin = Math.round(dayEntries.reduce((sum, e) => sum + e.duration_seconds, 0) / 60);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return {
        label: dayNames[d.getDay()]!,
        calories,
        duration_minutes: durationMin,
        date: dateStr,
      };
    });

    return HttpResponse.json(
      {
        period,
        total_workouts: filtered.length,
        total_duration_seconds: totalDuration,
        total_calories: totalCalories,
        weekly_goal: state.preferences.weekly_workout_goal,
        goal_progress_percentage: Math.min(
          100,
          Math.round((filtered.length / state.preferences.weekly_workout_goal) * 100),
        ),
        average_heart_rate: null, // Always null by requirement R4
        chart_data: chartData,
        history: filtered,
      },
      { status: 200 },
    );
  }),

  http.get('*/member/progress', async ({ request }) => {
    const sim = await handleSimulation(request);
    if (sim) return sim;
    if (!isAuthorized(request)) return unauthorized();

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'week';

    const validPeriods = ['week', 'month', 'year', 'all'];
    if (!validPeriods.includes(period)) {
      return HttpResponse.json(
        {
          message: 'The given data was invalid.',
          errors: { period: ['Invalid period specified.'] },
        },
        { status: 422 },
      );
    }

    const now = new Date();
    const cutoff = new Date(now);
    let days = 7;
    if (period === 'month') days = 30;
    else if (period === 'year') days = 365;
    else if (period === 'all') days = 9999;
    cutoff.setDate(cutoff.getDate() - days);

    const filtered = state.progress.filter((p) => new Date(p.completed_at) >= cutoff);
    const totalDuration = filtered.reduce((acc, p) => acc + p.duration_seconds, 0);
    const totalCalories = filtered.reduce((acc, p) => acc + p.calories_burned, 0);

    const chartData = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      const dateStr = d.toISOString().split('T')[0]!;
      const dayEntries = filtered.filter((p) => p.completed_at.startsWith(dateStr));
      const calories = dayEntries.reduce((sum, e) => sum + e.calories_burned, 0);
      const durationMin = Math.round(dayEntries.reduce((sum, e) => sum + e.duration_seconds, 0) / 60);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return {
        label: dayNames[d.getDay()]!,
        calories,
        duration_minutes: durationMin,
        date: dateStr,
      };
    });

    return HttpResponse.json(
      {
        period,
        total_workouts: filtered.length,
        total_duration_seconds: totalDuration,
        total_calories: totalCalories,
        weekly_goal: state.preferences.weekly_workout_goal,
        goal_progress_percentage: Math.min(
          100,
          Math.round((filtered.length / state.preferences.weekly_workout_goal) * 100),
        ),
        average_heart_rate: null, // Always null by requirement R4
        chart_data: chartData,
        history: filtered,
      },
      { status: 200 },
    );
  }),
];
