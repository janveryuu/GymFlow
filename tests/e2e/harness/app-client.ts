/**
 * Unified GymFlow Mobile App Client Facade for Opaque-Box E2E Testing.
 * Coordinates MockServer, SQLiteStorageEngine, SyncEngine, and UIDriver
 * exactly as the mobile client does across all screens and offline scenarios.
 */

import { MockServer } from './mock-server.ts';
import { SQLiteStorageEngine } from './sqlite-storage.ts';
import { SyncEngine } from './sync-engine.ts';
import { THEME, UIDriver } from './ui-driver.ts';
import type {
  MemberProfile,
  Preferences,
  ProgressEntry,
  ProgressSummary,
  Session,
  Workout,
} from './types.ts';

export const CATEGORY_ART_FALLBACKS = {
  chest: 'assets/category/chest.png',
  back: 'assets/category/back.png',
  leg: 'assets/category/leg.png',
  arm: 'assets/category/arm.png',
  'full-body': 'assets/category/full-body.png',
};

export class GymFlowAppClient {
  public server: MockServer;
  public db: SQLiteStorageEngine;
  public sync: SyncEngine;
  public ui: UIDriver;

  public authToken: string | null = null;
  public currentUser: { id: number; name: string; role: 'member' } | null = null;

  constructor() {
    this.server = new MockServer();
    this.db = new SQLiteStorageEngine();
    this.sync = new SyncEngine(this.server, this.db);
    this.ui = new UIDriver();
  }

  public reset(): void {
    this.server.reset();
    this.db.reset();
    this.sync = new SyncEngine(this.server, this.db);
    this.ui.reset();
    this.authToken = null;
    this.currentUser = null;
  }

  public setOffline(offline: boolean): void {
    this.server.networkConnected = !offline;
    if (offline) {
      this.sync.state = 'offline';
    } else {
      if (this.sync.state === 'offline') {
        this.sync.state = 'idle';
      }
    }
  }

  // ── Authentication Flows ──────────────────────────────────────────────
  public async login(creds: { email?: string; password?: string }): Promise<{
    success: boolean;
    status: number;
    data: any;
  }> {
    this.ui.startLoading();
    try {
      const res = await this.server.request('POST', '/api/v1/auth/login', creds);
      this.ui.finishLoading();

      if (res.status === 200) {
        this.authToken = res.data.token;
        this.currentUser = res.data.user;
        this.sync.setToken(this.authToken);

        // Fetch initial profile to check must_change_password
        const profileRes = await this.server.request('GET', '/member/profile', null, {
          Authorization: `Bearer ${this.authToken}`,
        });

        if (profileRes.status === 200 && profileRes.data.must_change_password) {
          this.ui.navigate('ForcedPasswordResetScreen');
        } else {
          this.ui.navigate('DashboardScreen');
        }

        return { success: true, status: res.status, data: res.data };
      } else {
        this.ui.showError(res.data?.message || 'Login failed');
        return { success: false, status: res.status, data: res.data };
      }
    } catch (err: any) {
      this.ui.finishLoading();
      this.ui.showError(err.message || 'Network error');
      return { success: false, status: 0, data: { message: err.message } };
    }
  }

  public async forcedChangePassword(params: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<{ success: boolean; status: number; data: any }> {
    this.ui.startLoading();
    try {
      const res = await this.server.request('POST', '/api/v1/auth/change-password', params, {
        Authorization: `Bearer ${this.authToken}`,
      });
      this.ui.finishLoading();

      if (res.status === 200) {
        this.ui.clearError();
        this.ui.navigate('DashboardScreen');
        return { success: true, status: res.status, data: res.data };
      } else {
        this.ui.showError(res.data?.message || 'Change password failed');
        return { success: false, status: res.status, data: res.data };
      }
    } catch (err: any) {
      this.ui.finishLoading();
      this.ui.showError(err.message);
      return { success: false, status: 0, data: { message: err.message } };
    }
  }

  public async forgotPassword(email: string): Promise<{
    success: boolean;
    status: number;
    data: any;
  }> {
    this.ui.startLoading();
    try {
      const res = await this.server.request('POST', '/api/v1/auth/forgot-password', { email });
      this.ui.finishLoading();
      if (res.status === 200) {
        this.ui.clearError();
        return { success: true, status: 200, data: res.data };
      } else {
        this.ui.showError(res.data?.message || 'Invalid email');
        return { success: false, status: res.status, data: res.data };
      }
    } catch (err: any) {
      this.ui.finishLoading();
      return { success: false, status: 0, data: { message: err.message } };
    }
  }

  // ── Dashboard & Workouts ──────────────────────────────────────────────
  public async loadDashboard(): Promise<{
    workouts: Workout[];
    sessions: Session[];
    weeklyProgressPercent: number;
  }> {
    this.ui.startLoading();

    let workouts: Workout[] = [];
    let sessions: Session[] = [];

    if (this.server.networkConnected) {
      try {
        const [wRes, sRes] = await Promise.all([
          this.server.request('GET', '/member/workouts', null, {
            Authorization: `Bearer ${this.authToken}`,
          }),
          this.server.request('GET', '/member/sessions', null, {
            Authorization: `Bearer ${this.authToken}`,
          }),
        ]);

        if (wRes.status === 200) {
          workouts = wRes.data;
          await this.db.cacheWorkouts(workouts);
        }
        if (sRes.status === 200) {
          sessions = sRes.data;
          await this.db.cacheSessions(sessions);
        }
      } catch {
        // Fallback to cache
        workouts = await this.db.getCachedWorkouts();
        sessions = await this.db.getCachedSessions();
      }
    } else {
      workouts = await this.db.getCachedWorkouts();
      sessions = await this.db.getCachedSessions();
    }

    this.ui.finishLoading();

    // Calculate weekly ring progress
    const completedCount = workouts.filter((w) => (w.completion_percentage || 0) >= 100).length;
    const goal = this.server.preferences.weekly_workout_goal || 4;
    const weeklyProgressPercent = Math.min(100, Math.round((completedCount / goal) * 100));

    return { workouts, sessions, weeklyProgressPercent };
  }

  public async loadCatalog(filter?: { category?: string; difficulty?: string }): Promise<Workout[]> {
    this.ui.startLoading();
    let workouts: Workout[] = [];

    if (this.server.networkConnected) {
      try {
        let path = '/member/workouts';
        const params: string[] = [];
        if (filter?.category) params.push(`category=${filter.category}`);
        if (filter?.difficulty) params.push(`difficulty=${filter.difficulty}`);
        if (params.length > 0) path += `?${params.join('&')}`;

        const res = await this.server.request('GET', path, null, {
          Authorization: `Bearer ${this.authToken}`,
        });

        if (res.status === 200) {
          workouts = res.data;
          await this.db.cacheWorkouts(workouts);
        }
      } catch {
        workouts = await this.db.getCachedWorkouts(filter);
      }
    } else {
      workouts = await this.db.getCachedWorkouts(filter);
    }

    this.ui.finishLoading();

    if (workouts.length === 0) {
      this.ui.showEmptyState('workouts');
    } else {
      this.ui.clearEmptyState();
    }

    return workouts;
  }

  public async getWorkoutDetail(id: string): Promise<{
    workout: Workout | null;
    resolvedImage: string;
    isOfflineFallback: boolean;
  }> {
    this.ui.startLoading();
    let workout: Workout | null = null;
    let isFallback = false;

    if (this.server.networkConnected) {
      try {
        const res = await this.server.request('GET', `/member/workouts/${id}`, null, {
          Authorization: `Bearer ${this.authToken}`,
        });
        if (res.status === 200) {
          workout = res.data;
          if (workout) {
            await this.db.cacheWorkouts([workout]);
          }
        }
      } catch {
        workout = await this.db.getCachedWorkoutById(id);
      }
    } else {
      workout = await this.db.getCachedWorkoutById(id);
    }

    this.ui.finishLoading();

    if (!workout) {
      return { workout: null, resolvedImage: '', isOfflineFallback: false };
    }

    // Check category fallback if offline or media url missing
    let resolvedImage = workout.media_url || workout.image_url || '';
    if (!this.server.networkConnected || !resolvedImage) {
      const cat = workout.category || workout.type || 'full-body';
      resolvedImage = (CATEGORY_ART_FALLBACKS as any)[cat] || CATEGORY_ART_FALLBACKS['full-body'];
      isFallback = true;
    }

    return { workout, resolvedImage, isOfflineFallback: isFallback };
  }

  public async completeWorkout(params: {
    workout_id: string;
    duration_seconds: number;
    calories_burned: number;
    idempotency_key: string;
    heart_rate?: number | null;
  }): Promise<{ success: boolean; queueId?: string; entry?: ProgressEntry }> {
    this.ui.triggerHaptic('notification_success');

    const progressEntry: ProgressEntry = {
      id: `p_loc_${Date.now()}`,
      workout_id: params.workout_id,
      completed_at: new Date().toISOString(),
      duration_seconds: params.duration_seconds,
      calories_burned: params.calories_burned,
      idempotency_key: params.idempotency_key,
      heart_rate: params.heart_rate ?? null,
      is_synced: false,
    };

    await this.db.insertProgressEntry(progressEntry);

    if (this.server.networkConnected) {
      try {
        const res = await this.server.request('POST', '/member/progress', params, {
          Authorization: `Bearer ${this.authToken}`,
        });
        if (res.status === 200 || res.status === 201) {
          progressEntry.is_synced = true;
          return { success: true, entry: res.data };
        }
      } catch {
        // Fall through to queueing
      }
    }

    // Offline or network drop: queue write mutation
    const queued = await this.db.enqueue({
      entity_type: 'progress',
      action: 'create',
      endpoint: '/member/progress',
      method: 'POST',
      payload: params,
      idempotency_key: params.idempotency_key,
    });

    return { success: true, queueId: queued.id, entry: progressEntry };
  }

  // ── Scheduling & Attendance ───────────────────────────────────────────
  public async loadSchedule(): Promise<Session[]> {
    this.ui.startLoading();
    let sessions: Session[] = [];

    if (this.server.networkConnected) {
      try {
        const res = await this.server.request('GET', '/member/sessions', null, {
          Authorization: `Bearer ${this.authToken}`,
        });
        if (res.status === 200) {
          sessions = res.data;
          await this.db.cacheSessions(sessions);
        }
      } catch {
        sessions = await this.db.getCachedSessions();
      }
    } else {
      sessions = await this.db.getCachedSessions();
    }

    this.ui.finishLoading();

    if (sessions.length === 0) {
      this.ui.showEmptyState('sessions');
    } else {
      this.ui.clearEmptyState();
    }

    return sessions;
  }

  public async checkInSession(sessionId: string): Promise<{
    success: boolean;
    queueId?: string;
    error?: string;
  }> {
    this.ui.triggerHaptic('notification_success');
    const checkedInAt = new Date().toISOString();
    const idempotencyKey = `idemp_att_${sessionId}_${Date.now()}`;

    if (this.server.networkConnected) {
      try {
        const res = await this.server.request(
          'POST',
          '/member/attendance',
          { session_id: sessionId, checked_in_at: checkedInAt, idempotency_key: idempotencyKey },
          { Authorization: `Bearer ${this.authToken}` }
        );

        if (res.status === 200 || res.status === 201) {
          await this.db.updateSessionStatus(sessionId, 'completed', { is_checked_in: true });
          return { success: true };
        } else if (res.status === 409) {
          // Gym conflict
          await this.db.updateSessionStatus(sessionId, 'cancelled_by_gym', { can_cancel: false });
          this.ui.showDismissibleBanner('Session was cancelled by the gym.');
          return { success: false, error: 'Session was cancelled by the gym' };
        }
      } catch {
        // Fall through to queue
      }
    }

    // Enqueue attendance mutation
    const queued = await this.db.enqueue({
      entity_type: 'attendance',
      action: 'create',
      endpoint: '/member/attendance',
      method: 'POST',
      payload: { session_id: sessionId, checked_in_at: checkedInAt, idempotency_key: idempotencyKey },
      idempotency_key: idempotencyKey,
    });

    return { success: true, queueId: queued.id };
  }

  public async cancelSession(sessionId: string, reason?: string): Promise<{
    success: boolean;
    status: number;
    error?: string;
  }> {
    if (this.server.networkConnected) {
      try {
        const res = await this.server.request(
          'POST',
          `/member/sessions/${sessionId}/cancel`,
          { reason },
          { Authorization: `Bearer ${this.authToken}` }
        );

        if (res.status === 200) {
          await this.db.updateSessionStatus(sessionId, 'cancelled_by_member', { can_cancel: false });
          return { success: true, status: 200 };
        } else if (res.status === 409) {
          await this.db.updateSessionStatus(sessionId, 'cancelled_by_gym', { can_cancel: false });
          this.ui.showDismissibleBanner('Session was cancelled by the gym.');
          return { success: false, status: 409, error: 'Session was cancelled by the gym' };
        }
        return { success: false, status: res.status, error: res.data?.message };
      } catch (err: any) {
        return { success: false, status: 0, error: err.message };
      }
    }

    // Offline queue
    await this.db.enqueue({
      entity_type: 'session_cancel',
      action: 'update',
      endpoint: `/member/sessions/${sessionId}/cancel`,
      method: 'POST',
      payload: { reason },
    });
    return { success: true, status: 200 };
  }

  // ── Progress & Analytics ──────────────────────────────────────────────
  public async loadProgress(period: 'week' | 'month' | 'year' | 'all' = 'week'): Promise<ProgressSummary | null> {
    this.ui.startLoading();
    let result: ProgressSummary | null = null;

    if (this.server.networkConnected) {
      try {
        const res = await this.server.request('GET', `/member/progress?period=${period}`, null, {
          Authorization: `Bearer ${this.authToken}`,
        });
        if (res.status === 200) {
          result = res.data;
        }
      } catch {
        // Fallback calculation from local db
      }
    }

    if (!result) {
      const localEntries = await this.db.getCachedProgressEntries();
      const prefs = await this.db.getPreferences();
      const goal = prefs?.weekly_workout_goal || 4;
      result = {
        period,
        total_workouts: localEntries.length,
        total_duration_seconds: localEntries.reduce((acc, p) => acc + p.duration_seconds, 0),
        total_calories: localEntries.reduce((acc, p) => acc + p.calories_burned, 0),
        weekly_goal: goal,
        goal_progress_percentage: Math.min(100, Math.round((localEntries.length / goal) * 100)),
        average_heart_rate: null, // Always null per requirement
        chart_data: [],
        history: localEntries,
      };
    }

    this.ui.finishLoading();

    if (result.total_workouts === 0) {
      this.ui.showEmptyState('progress');
    } else {
      this.ui.clearEmptyState();
    }

    return result;
  }

  // ── Profile & Preferences ─────────────────────────────────────────────
  public async updateProfile(patch: Partial<MemberProfile>): Promise<{
    success: boolean;
    status: number;
    profile?: MemberProfile;
  }> {
    this.ui.triggerHaptic('impact_medium');
    this.ui.startLoading();

    if (this.server.networkConnected) {
      const res = await this.server.request('PATCH', '/member/profile', patch, {
        Authorization: `Bearer ${this.authToken}`,
      });
      this.ui.finishLoading();

      if (res.status === 200) {
        return { success: true, status: 200, profile: res.data };
      }
      this.ui.showError(res.data?.message || 'Profile update failed');
      return { success: false, status: res.status };
    }

    // Offline queue
    await this.db.enqueue({
      entity_type: 'profile',
      action: 'update',
      endpoint: '/member/profile',
      method: 'PATCH',
      payload: patch,
    });
    this.ui.finishLoading();
    return { success: true, status: 200 };
  }

  public async updatePreferences(prefs: Partial<Preferences>): Promise<{
    success: boolean;
    status: number;
    preferences?: Preferences;
  }> {
    this.ui.triggerHaptic('impact_medium');
    this.ui.startLoading();

    if (prefs.weekly_workout_goal !== undefined) {
      if (prefs.weekly_workout_goal < 1 || prefs.weekly_workout_goal > 7) {
        this.ui.finishLoading();
        this.ui.showError('Weekly goal must be between 1 and 7');
        return { success: false, status: 422 };
      }
    }

    if (this.server.networkConnected) {
      const res = await this.server.request('PATCH', '/member/preferences', prefs, {
        Authorization: `Bearer ${this.authToken}`,
      });
      this.ui.finishLoading();

      if (res.status === 200) {
        await this.db.savePreferences(res.data);
        return { success: true, status: 200, preferences: res.data };
      }
      this.ui.showError(res.data?.message || 'Preferences update failed');
      return { success: false, status: res.status };
    }

    // Offline queue
    await this.db.enqueue({
      entity_type: 'preferences',
      action: 'update',
      endpoint: '/member/preferences',
      method: 'PATCH',
      payload: prefs,
    });
    await this.db.savePreferences(prefs as Preferences);
    this.ui.finishLoading();
    return { success: true, status: 200 };
  }

  // ── Sync Execution ────────────────────────────────────────────────────
  public async drainSyncQueue(): Promise<{
    processed: number;
    paused: boolean;
    rejected: number;
    failed: number;
  }> {
    const result = await this.sync.drainQueue();
    if (this.sync.activeBanner) {
      this.ui.showDismissibleBanner(this.sync.activeBanner);
    }
    return result;
  }
}
