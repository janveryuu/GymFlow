/**
 * SyncRepository: Typed interface layer between UI and SQLite + SyncEngine.
 * Implements ISyncRepository from ./types.ts.
 *
 * Design:
 * - Cache-first reads: check SQLite first, fall back to API if empty or forceRefresh
 * - Online revalidation: if online + not offline-only, fetch from API and update SQLite
 * - All writes (attendance, progress, preferences) go through SyncEngine.enqueue()
 * - Never exposes raw exceptions to callers
 */

import { apiClient } from '../api/client';
import { getDatabase } from '../db/connection';
import {
  rowToWorkout,
  workoutToRow,
  rowToSession,
  sessionToRow,
  rowToProgressEntry,
  rowToPreferences,
  preferencesToRow,
} from '../db/mappers';
import { useSyncStore } from '../store/syncStore';
import { synthesizeWorkoutFromExercise } from './workoutMerge';
import { getExercise } from '@bryllim/workout-guide';
import { SyncEngine } from './SyncEngine';
import type {
  ISyncRepository,
  GetWorkoutsOptions,
  GetSessionsOptions,
  ProgressSubmission,
  RecordAttendanceResult,
  SubmitProgressResult,
  CancelSessionResult,
  SyncStateInfo,
  DrainResult,
} from './types';
import type { Workout, Session, Preferences, ProgressHistoryResponse, MemberProfile, ProgressEntry } from '../types';
import type { SQLiteDatabase } from 'expo-sqlite';

export interface SyncRepositoryOptions {
  db?: SQLiteDatabase;
  engine?: SyncEngine;
  httpClient?: typeof apiClient;
}

export class SyncRepository implements ISyncRepository {
  private customDb: SQLiteDatabase | null;
  private engine: SyncEngine;
  private http: typeof apiClient;

  constructor(options: SyncRepositoryOptions = {}) {
    this.customDb = options.db ?? null;
    this.engine = options.engine ?? new SyncEngine();
    this.http = options.httpClient ?? apiClient;
  }

  private async getDb(): Promise<SQLiteDatabase> {
    if (this.customDb) return this.customDb;
    return getDatabase();
  }

  // ── Workouts ────────────────────────────────────────────────────────

  async getWorkouts(options: GetWorkoutsOptions = {}): Promise<Workout[]> {
    const db = await this.getDb();
    const { forceRefresh = false, category, difficulty } = options;

    // Check cache first
    if (!forceRefresh) {
      try {
        let query = 'SELECT * FROM Workout WHERE 1=1';
        const params: any[] = [];
        if (category) {
          query += ' AND category = ?';
          params.push(category);
        }
        if (difficulty) {
          query += ' AND difficulty = ?';
          params.push(difficulty);
        }
        const cachedRows = await db.getAllAsync<any>(query, params);
        if (cachedRows.length > 0) {
          return cachedRows.map(rowToWorkout);
        }
      } catch {
        // Fall through to API
      }
    }

    // Fetch from API
    try {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (difficulty) params.difficulty = difficulty;

      const resp = await this.http.get('/api/v1/member/workouts', { params });
      const workouts: Workout[] = Array.isArray(resp.data)
        ? resp.data
        : Array.isArray(resp.data?.data)
          ? resp.data.data
          : [];

      // Upsert into SQLite
      await this._upsertWorkouts(db, workouts);
      return workouts;
    } catch {
      // Fall back to cache even if forceRefresh failed
      try {
        let query = 'SELECT * FROM Workout WHERE 1=1';
        const params: any[] = [];
        if (category) {
          query += ' AND category = ?';
          params.push(category);
        }
        if (difficulty) {
          query += ' AND difficulty = ?';
          params.push(difficulty);
        }
        const cachedRows = await db.getAllAsync<any>(query, params);
        return cachedRows.map(rowToWorkout);
      } catch {
        return [];
      }
    }
  }

  async getWorkoutById(id: string, options: { forceRefresh?: boolean } = {}): Promise<Workout | null> {
    const db = await this.getDb();
    const { forceRefresh = false } = options;

    if (id.startsWith('guide-')) {
      const slug = id.replace('guide-', '');
      try {
        const ex = getExercise(slug);
        if (ex) {
          const synthesized = synthesizeWorkoutFromExercise(ex);
          try {
            const row = await db.getFirstAsync<any>('SELECT is_favorite FROM Workout WHERE id = ?', [id]);
            if (row) synthesized.is_favorite = Boolean(row.is_favorite);
          } catch {
            // Ignore DB lookup error for synthesized workout
          }
          return synthesized;
        }
      } catch {
        // Fall through
      }
    }

    if (!forceRefresh) {
      try {
        const row = await db.getFirstAsync<any>('SELECT * FROM Workout WHERE id = ?', [id]);
        if (row) return rowToWorkout(row);
      } catch {
        // Fall through
      }
    }

    try {
      const resp = await this.http.get(`/api/v1/member/workouts/${id}`);
      const workout: Workout = resp.data;
      if (workout && workout.id) {
        await this._upsertWorkouts(db, [workout]);
        return workout;
      }
      return null;
    } catch {
      // Fall back to cache
      try {
        const row = await db.getFirstAsync<any>('SELECT * FROM Workout WHERE id = ?', [id]);
        return row ? rowToWorkout(row) : null;
      } catch {
        return null;
      }
    }
  }

  private async _upsertWorkouts(db: SQLiteDatabase, workouts: Workout[]): Promise<void> {
    for (const w of workouts) {
      try {
        const row = workoutToRow(w);
        await db.runAsync(
          `INSERT OR REPLACE INTO Workout
           (id, title, category, difficulty, duration_minutes, calories, description,
            image_url, sets_reps, is_featured, source, sets, reps, media_url,
            slug, is_favorite, completion_percentage)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id, row.title, row.category, row.difficulty, row.duration_minutes,
            row.calories, row.description, row.image_url, row.sets_reps,
            row.is_featured, row.source, row.sets, row.reps, row.media_url,
            row.slug, row.is_favorite, row.completion_percentage,
          ]
        );
      } catch {
        // Skip individual upsert errors
      }
    }
  }

  async toggleFavoriteWorkout(workoutId: string): Promise<boolean> {
    const db = await this.getDb();
    try {
      const row = await db.getFirstAsync<{ is_favorite: number }>(
        'SELECT is_favorite FROM Workout WHERE id = ?',
        [workoutId]
      );
      const nextVal = row && row.is_favorite === 1 ? 0 : 1;
      await db.runAsync('UPDATE Workout SET is_favorite = ? WHERE id = ?', [nextVal, workoutId]);
      return nextVal === 1;
    } catch {
      return false;
    }
  }

  async getFavoriteWorkouts(): Promise<Workout[]> {
    const db = await this.getDb();
    try {
      const rows = await db.getAllAsync<any>(
        'SELECT * FROM Workout WHERE is_favorite = 1 ORDER BY title ASC'
      );
      return rows.map(rowToWorkout);
    } catch {
      return [];
    }
  }

  // ── Sessions ────────────────────────────────────────────────────────

  async getSessions(options: GetSessionsOptions = {}): Promise<Session[]> {
    const db = await this.getDb();
    const { forceRefresh = false, from, to } = options;

    if (!forceRefresh) {
      try {
        let query = 'SELECT * FROM Session WHERE 1=1';
        const params: any[] = [];
        if (from) { query += ' AND starts_at >= ?'; params.push(from); }
        if (to) { query += ' AND starts_at <= ?'; params.push(to); }
        const rows = await db.getAllAsync<any>(query, params);
        if (rows.length > 0) return rows.map(rowToSession);
      } catch {
        // Fall through
      }
    }

    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;

      const resp = await this.http.get('/api/v1/member/sessions', { params });
      const sessions: Session[] = Array.isArray(resp.data)
        ? resp.data
        : Array.isArray(resp.data?.data)
          ? resp.data.data
          : [];

      // Upsert into SQLite
      for (const s of sessions) {
        try {
          const row = sessionToRow(s);
          await db.runAsync(
            `INSERT OR REPLACE INTO Session
             (id, workout_id, title, trainer_id, trainer_name, trainer_avatar,
              location, starts_at, ends_at, capacity, booked_count, is_cancelled,
              status, can_cancel, checked_in)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.id, row.workout_id, row.title, row.trainer_id, row.trainer_name,
              row.trainer_avatar, row.location, row.starts_at, row.ends_at,
              row.capacity, row.booked_count, row.is_cancelled, row.status,
              row.can_cancel, row.checked_in,
            ]
          );
        } catch {
          // Skip individual
        }
      }
      return sessions;
    } catch {
      try {
        let query = 'SELECT * FROM Session WHERE 1=1';
        const params: any[] = [];
        if (from) { query += ' AND starts_at >= ?'; params.push(from); }
        if (to) { query += ' AND starts_at <= ?'; params.push(to); }
        const rows = await db.getAllAsync<any>(query, params);
        return rows.map(rowToSession);
      } catch {
        return [];
      }
    }
  }

  async cancelSession(sessionId: string, reason?: string): Promise<CancelSessionResult> {
    const db = await this.getDb();
    // Enqueue the cancellation
    await this.engine.enqueue({
      entity_type: 'session_cancel',
      action: 'create',
      endpoint: `/api/v1/member/sessions/${sessionId}/cancel`,
      method: 'POST',
      payload: { session_id: sessionId, reason: reason ?? 'member_request' },
      idempotency_key: `cancel_${sessionId}`,
    });

    // Optimistically update local SQLite
    try {
      await db.runAsync(
        "UPDATE Session SET status = 'cancelled_by_member', can_cancel = 0 WHERE id = ?",
        [sessionId]
      );
    } catch {
      // Ignore local update failure
    }

    return {
      success: true,
      status: 'cancelled_by_member',
      message: 'Session cancellation queued.',
      session: undefined,
    };
  }

  // ── Progress History ────────────────────────────────────────────────

  async getProgressHistory(period: string = 'week', options: { forceRefresh?: boolean } = {}): Promise<ProgressHistoryResponse> {
    const { forceRefresh = false } = options;

    const emptyResponse: ProgressHistoryResponse = {
      period,
      total_workouts: 0,
      total_duration_seconds: 0,
      total_calories: 0,
      weekly_goal: 5,
      goal_progress_percentage: 0,
      average_heart_rate: null,
      chart_data: [],
      history: [],
    };

    if (!forceRefresh) {
      try {
        const db = await this.getDb();
        const rows = await db.getAllAsync<any>(
          'SELECT * FROM ProgressEntry ORDER BY completed_at DESC'
        );
        if (rows.length > 0) {
          const allHistory = rows.map(rowToProgressEntry);

          // Calculate period cutoff
          let days = 7;
          if (period === 'month' || period === '30d') days = 30;
          else if (period === 'year' || period === '90d') days = 90;
          else if (period === 'all') days = 9999;

          const now = new Date();
          const cutoff = new Date(now);
          cutoff.setDate(cutoff.getDate() - days);

          const filteredHistory = allHistory.filter((p) => new Date(p.completed_at) >= cutoff);
          const totalDuration = filteredHistory.reduce((s, e) => s + e.duration_seconds, 0);
          const totalCalories = filteredHistory.reduce((s, e) => s + e.calories_burned, 0);

          // Compute 7-day trend chart series from local SQLite entries
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const chart_data = Array.from({ length: 7 }, (_, idx) => {
            const d = new Date(now);
            d.setDate(d.getDate() - (6 - idx));
            const dateStr = d.toISOString().split('T')[0]!;
            const dayEntries = filteredHistory.filter(
              (p) => p.completed_at && p.completed_at.startsWith(dateStr)
            );
            const calories = dayEntries.reduce((sum, e) => sum + (e.calories_burned || 0), 0);
            const durationMin = Math.round(
              dayEntries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / 60
            );
            return {
              label: dayNames[d.getDay()]!,
              calories,
              duration_minutes: durationMin,
              date: dateStr,
            };
          });

          // Fetch preferences for weekly goal
          const pref = await this.getPreferences({ forceRefresh: false });
          const weeklyGoal = pref?.weekly_workout_goal ?? 5;
          const goalPercentage = weeklyGoal > 0
            ? Math.min(100, Math.round((filteredHistory.length / weeklyGoal) * 100))
            : 0;

          // Trigger background sync/backfill without blocking local render
          this._syncProgressBackfill(period).catch(() => {});

          return {
            period,
            total_workouts: filteredHistory.length,
            total_duration_seconds: totalDuration,
            total_calories: totalCalories,
            weekly_goal: weeklyGoal,
            goal_progress_percentage: goalPercentage,
            average_heart_rate: null, // Strictly null per requirement R4
            chart_data,
            history: filteredHistory,
          };
        }
      } catch {
        // Fall through
      }
    }

    try {
      const apiPeriod = period === '7d' ? 'week' : period === '30d' ? 'month' : period === '90d' ? 'year' : period;
      const resp = await this.http.get('/api/v1/member/progress', { params: { period: apiPeriod } });
      const data: ProgressHistoryResponse = {
        period: resp.data.period ?? period,
        total_workouts: resp.data.total_workouts ?? 0,
        total_duration_seconds: resp.data.total_duration_seconds ?? 0,
        total_calories: resp.data.total_calories ?? 0,
        weekly_goal: resp.data.weekly_goal ?? 5,
        goal_progress_percentage: resp.data.goal_progress_percentage ?? 0,
        average_heart_rate: null, // Always null per requirement
        chart_data: resp.data.chart_data ?? [],
        history: resp.data.history ?? [],
      };

      // Cache individual progress entries
      try {
        const db = await this.getDb();
        for (const entry of data.history) {
          try {
            await db.runAsync(
              `INSERT OR REPLACE INTO ProgressEntry
               (id, workout_id, workout_title, completed_at, duration_seconds, calories_burned, heart_rate, idempotency_key)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                entry.id, entry.workout_id, entry.workout_title ?? null,
                entry.completed_at, entry.duration_seconds, entry.calories_burned,
                entry.heart_rate ?? null, entry.idempotency_key ?? null,
              ]
            );
          } catch {
            // Skip
          }
        }
      } catch {
        // Ignore cache write errors
      }

      return data;
    } catch {
      return emptyResponse;
    }
  }

  private async _syncProgressBackfill(period: string): Promise<void> {
    try {
      const apiPeriod = period === '7d' ? 'week' : period === '30d' ? 'month' : period === '90d' ? 'year' : period;
      const resp = await this.http.get('/api/v1/member/progress', { params: { period: apiPeriod } });
      const entries: ProgressEntry[] = resp.data?.history ?? [];
      const db = await this.getDb();
      for (const entry of entries) {
        try {
          await db.runAsync(
            `INSERT OR REPLACE INTO ProgressEntry
             (id, workout_id, workout_title, completed_at, duration_seconds, calories_burned, heart_rate, idempotency_key)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              entry.id, entry.workout_id, entry.workout_title ?? null,
              entry.completed_at, entry.duration_seconds, entry.calories_burned,
              entry.heart_rate ?? null, entry.idempotency_key ?? null,
            ]
          );
        } catch {
          // Skip
        }
      }
    } catch {
      // Ignore background error
    }
  }

  // ── Preferences ─────────────────────────────────────────────────────

  async getPreferences(options: { forceRefresh?: boolean } = {}): Promise<Preferences | null> {
    const db = await this.getDb();
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
      try {
        const row = await db.getFirstAsync<any>("SELECT * FROM Preferences WHERE id = 'default'");
        if (row) return rowToPreferences(row);
      } catch {
        // Fall through
      }
    }

    try {
      const resp = await this.http.get('/api/v1/member/preferences');
      const pref: Preferences = resp.data;
      if (pref) {
        const row = preferencesToRow(pref);
        await db.runAsync(
          `INSERT OR REPLACE INTO Preferences (id, workout_type, intensity, weekly_workout_goal)
           VALUES (?, ?, ?, ?)`,
          [row.id, row.workout_type, row.intensity, row.weekly_workout_goal]
        ).catch(() => {});
        return pref;
      }
      return null;
    } catch {
      try {
        const row = await db.getFirstAsync<any>("SELECT * FROM Preferences WHERE id = 'default'");
        return row ? rowToPreferences(row) : null;
      } catch {
        return null;
      }
    }
  }

  async updatePreferences(pref: Partial<Preferences>): Promise<Preferences> {
    const db = await this.getDb();

    // Optimistically update local SQLite
    try {
      await db.runAsync(
        `INSERT OR IGNORE INTO Preferences (id, workout_type, intensity, weekly_workout_goal)
         VALUES ('default', 'full-body', 'moderate', 5)`
      );
      const updates: string[] = [];
      const params: any[] = [];
      if (pref.workout_type !== undefined) { updates.push('workout_type = ?'); params.push(pref.workout_type); }
      if (pref.intensity !== undefined) { updates.push('intensity = ?'); params.push(pref.intensity); }
      if (pref.weekly_workout_goal !== undefined) { updates.push('weekly_workout_goal = ?'); params.push(pref.weekly_workout_goal); }
      if (updates.length > 0) {
        params.push('default');
        await db.runAsync(
          `UPDATE Preferences SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }
    } catch {
      // Ignore local update errors
    }

    // Enqueue the remote update
    await this.engine.enqueue({
      entity_type: 'preferences',
      action: 'update',
      endpoint: '/api/v1/member/preferences',
      method: 'PATCH',
      payload: pref,
      idempotency_key: `pref_update_${Date.now()}`,
    });

    // Return optimistic merged result
    const current = await this.getPreferences({ forceRefresh: false });
    return {
      workout_type: pref.workout_type ?? current?.workout_type ?? 'full-body',
      intensity: pref.intensity ?? current?.intensity ?? 'moderate',
      weekly_workout_goal: pref.weekly_workout_goal ?? current?.weekly_workout_goal ?? 5,
      updated_at: new Date().toISOString(),
    };
  }

  // ── Attendance ──────────────────────────────────────────────────────

  async recordAttendance(sessionId: string): Promise<RecordAttendanceResult> {
    const idempotency_key = `attendance_${sessionId}`;
    const item = await this.engine.enqueue({
      entity_type: 'attendance',
      action: 'create',
      endpoint: '/api/v1/member/attendance',
      method: 'POST',
      payload: {
        session_id: sessionId,
        checked_in_at: new Date().toISOString(),
        idempotency_key,
      },
      idempotency_key,
    });

    return {
      queueId: item.id,
      status: 'queued',
      record: {
        id: item.id,
        session_id: sessionId,
        checked_in_at: new Date().toISOString(),
        status: 'queued',
      },
    };
  }

  // ── Progress Submission ─────────────────────────────────────────────

  async submitProgress(entry: ProgressSubmission): Promise<SubmitProgressResult> {
    const idempotency_key = entry.idempotency_key ?? `progress_${entry.workout_id}_${Date.now()}`;
    const item = await this.engine.enqueue({
      entity_type: 'progress',
      action: 'create',
      endpoint: '/api/v1/member/progress',
      method: 'POST',
      payload: {
        workout_id: entry.workout_id,
        workout_title: entry.workout_title,
        started_at: entry.started_at,
        completed_at: entry.completed_at,
        duration_seconds: entry.duration_seconds,
        calories_burned: entry.calories_burned,
        heart_rate: entry.heart_rate ?? null,
        idempotency_key,
      },
      idempotency_key,
    });

    // Optimistically write to local SQLite ProgressEntry and Workout completion
    try {
      const db = await this.getDb();
      await db.runAsync(
        `INSERT OR REPLACE INTO ProgressEntry
         (id, workout_id, workout_title, completed_at, duration_seconds, calories_burned, heart_rate, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          entry.workout_id,
          entry.workout_title ?? null,
          entry.completed_at,
          entry.duration_seconds,
          entry.calories_burned,
          entry.heart_rate ?? null,
          idempotency_key,
        ]
      );
      await db.runAsync(
        'UPDATE Workout SET completion_percentage = 100 WHERE id = ?',
        [entry.workout_id]
      );
    } catch {
      // Ignore local optimistic write failure
    }

    return {
      queueId: item.id,
      status: 'queued',
    };
  }

  // ── Profile ─────────────────────────────────────────────────────────

  async getProfile(options: { forceRefresh?: boolean } = {}): Promise<MemberProfile | null> {
    try {
      const resp = await this.http.get('/api/v1/member/profile');
      return resp.data;
    } catch {
      return null;
    }
  }

  async updateProfile(profile: Partial<MemberProfile>): Promise<MemberProfile> {
    try {
      const resp = await this.http.patch('/api/v1/member/profile', profile);
      return resp.data;
    } catch {
      const idempotency_key = `profile_update_${Date.now()}`;
      await this.engine.enqueue({
        entity_type: 'profile',
        action: 'update',
        endpoint: '/api/v1/member/profile',
        method: 'PATCH',
        payload: profile,
        idempotency_key,
      });
      return profile as MemberProfile;
    }
  }

  // ── Sync State & Queue ──────────────────────────────────────────────

  async getSyncState(): Promise<SyncStateInfo> {
    const status = await this.engine.getStatus();
    const storeState = useSyncStore.getState();
    return {
      pendingCount: status.pending_count,
      syncState: status.state,
      hasAmberWarning: status.has_7day_warning,
      rejectedCount: status.rejected_count,
      isOnline: storeState.isOnline,
      lastSyncAt: storeState.lastSyncAt,
      activeBanner: status.active_banner,
    };
  }

  async drainQueue(): Promise<DrainResult> {
    return this.engine.drainQueue();
  }

  async dismissRejectedItem(queueId: string): Promise<void> {
    useSyncStore.getState().dismissRejectedItem(queueId);
    this.engine.dismissBanner();
  }
}

// Singleton instance for production use
let _instance: SyncRepository | null = null;

export function getSyncRepository(): SyncRepository {
  if (!_instance) {
    _instance = new SyncRepository();
  }
  return _instance;
}

export function setSyncRepositoryForTest(instance: SyncRepository | null): void {
  _instance = instance;
}
