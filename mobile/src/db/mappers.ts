/**
 * Bi-directional converters between SQLite row representations and domain entities.
 */

import type {
  Workout,
  Session,
  ProgressEntry,
  Preferences,
} from '../types';

export interface WriteQueueRow {
  id: string;
  entity_type: string;
  action: string;
  endpoint: string;
  method: string;
  payload_json: string;
  idempotency_key: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  status: string;
  last_error: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface DomainWriteQueueItem {
  id: string;
  entity_type: 'attendance' | 'progress' | 'session_cancel' | 'preferences' | 'profile' | string;
  action: 'create' | 'update' | 'delete' | string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE' | string;
  payload: any;
  idempotency_key?: string;
  created_at: string;
  retry_count: number;
  attempt_count: number;
  status: 'pending' | 'in_flight' | 'rejected' | 'completed' | 'failed' | 'paused' | string;
  last_error?: string | null;
  rejected_reason?: string | null;
  rejection_reason?: string | null;
  last_attempt_at?: string | null;
  next_attempt_at?: string | null;
}

// ── Workout Mappers ──────────────────────────────────────────────────────────

export function rowToWorkout(row: any): Workout {
  const sets = Number(row.sets ?? 0);
  const reps = Number(row.reps ?? 0);
  return {
    id: String(row.id),
    title: String(row.title),
    category: row.category,
    difficulty: row.difficulty,
    source: row.source || 'program',
    duration_minutes: Number(row.duration_minutes ?? 0),
    calories: Number(row.calories ?? 0),
    sets,
    reps,
    reps_sets: row.sets_reps || (sets && reps ? `${sets} sets x ${reps} reps` : ''),
    image_url: row.image_url ?? '',
    media_url: row.media_url || undefined,
    slug: row.slug ? String(row.slug) : undefined,
    is_favorite: Boolean(row.is_favorite),
    description: row.description ?? '',
    completion_percentage: Number(row.completion_percentage ?? 0),
  };
}

export function workoutToRow(workout: Workout): Record<string, any> {
  return {
    id: workout.id,
    title: workout.title,
    category: workout.category,
    difficulty: workout.difficulty,
    duration_minutes: workout.duration_minutes,
    calories: workout.calories,
    description: workout.description || '',
    image_url: workout.image_url || '',
    sets_reps: workout.reps_sets || `${workout.sets ?? 0} sets x ${workout.reps ?? 0} reps`,
    is_featured: 0,
    source: workout.source || 'program',
    sets: workout.sets ?? 0,
    reps: workout.reps ?? 0,
    media_url: workout.media_url || null,
    slug: workout.slug || null,
    is_favorite: workout.is_favorite ? 1 : 0,
    completion_percentage: workout.completion_percentage ?? 0,
  };
}

// ── Session Mappers ──────────────────────────────────────────────────────────

export function rowToSession(row: any): Session {
  const isCancelled = Boolean(row.is_cancelled || row.status === 'cancelled_by_gym' || row.status === 'cancelled_by_member' || row.status === 'cancelled');
  const canCancel = Boolean(row.can_cancel && !isCancelled && row.status === 'scheduled');

  return {
    id: String(row.id),
    workout_id: row.workout_id ?? null,
    title: String(row.title),
    trainer: row.trainer_name
      ? { id: row.trainer_id || 'trainer_default', name: row.trainer_name }
      : null,
    location: String(row.location),
    starts_at: String(row.starts_at),
    ends_at: String(row.ends_at),
    status: row.status as Session['status'],
    can_cancel: canCancel,
    checked_in: Boolean(row.checked_in),
  };
}

export function sessionToRow(session: Session): Record<string, any> {
  const isCancelled = session.status === 'cancelled' ||
    session.status === 'cancelled_by_gym' ||
    session.status === 'cancelled_by_member';

  return {
    id: session.id,
    workout_id: session.workout_id ?? null,
    title: session.title,
    trainer_id: session.trainer?.id ?? null,
    trainer_name: session.trainer?.name ?? null,
    trainer_avatar: null,
    location: session.location,
    starts_at: session.starts_at,
    ends_at: session.ends_at,
    capacity: 20,
    booked_count: 0,
    is_cancelled: isCancelled ? 1 : 0,
    status: session.status,
    can_cancel: session.can_cancel ? 1 : 0,
    checked_in: session.checked_in ? 1 : 0,
  };
}

// ── ProgressEntry Mappers ──────────────────────────────────────────────────

export function rowToProgressEntry(row: any): ProgressEntry {
  return {
    id: String(row.id),
    workout_id: String(row.workout_id),
    workout_title: row.workout_title || undefined,
    completed_at: String(row.completed_at),
    duration_seconds: Number(row.duration_seconds),
    calories_burned: Number(row.calories_burned),
    heart_rate: row.heart_rate !== null && row.heart_rate !== undefined ? Number(row.heart_rate) : null,
    idempotency_key: row.idempotency_key || undefined,
  };
}

export function progressEntryToRow(entry: ProgressEntry): Record<string, any> {
  return {
    id: entry.id,
    workout_id: entry.workout_id,
    workout_title: entry.workout_title ?? null,
    started_at: null,
    completed_at: entry.completed_at,
    duration_seconds: entry.duration_seconds,
    calories_burned: entry.calories_burned,
    heart_rate: entry.heart_rate !== null && entry.heart_rate !== undefined ? entry.heart_rate : null,
    idempotency_key: entry.idempotency_key ?? null,
    sync_status: 'synced',
  };
}

// ── Preferences Mappers ────────────────────────────────────────────────────

export function rowToPreferences(row: any): Preferences {
  return {
    workout_type: String(row.workout_type),
    intensity: String(row.intensity),
    weekly_workout_goal: Number(row.weekly_workout_goal),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function preferencesToRow(pref: Preferences): Record<string, any> {
  return {
    id: 'default',
    workout_type: pref.workout_type,
    intensity: pref.intensity,
    weekly_workout_goal: pref.weekly_workout_goal,
  };
}

// ── WriteQueue Mappers ─────────────────────────────────────────────────────

export function rowToWriteQueueItem(row: WriteQueueRow | any): DomainWriteQueueItem {
  let parsedPayload: any = {};
  try {
    parsedPayload = typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json;
  } catch {
    parsedPayload = {};
  }

  const attempts = Number(row.attempt_count ?? 0);
  const reason = row.rejection_reason ?? null;

  return {
    id: String(row.id),
    entity_type: row.entity_type,
    action: row.action || 'create',
    endpoint: row.endpoint || '',
    method: row.method || 'POST',
    payload: parsedPayload,
    idempotency_key: row.idempotency_key || undefined,
    created_at: String(row.created_at),
    retry_count: attempts,
    attempt_count: attempts,
    status: row.status,
    last_error: row.last_error ?? null,
    rejected_reason: reason,
    rejection_reason: reason,
    last_attempt_at: row.last_attempt_at ?? null,
    next_attempt_at: row.next_attempt_at ?? null,
  };
}

export function writeQueueItemToRow(item: Partial<DomainWriteQueueItem> & { id: string; entity_type: string; payload: any }): WriteQueueRow {
  const attempts = item.retry_count ?? item.attempt_count ?? 0;
  const reason = item.rejected_reason ?? item.rejection_reason ?? null;

  return {
    id: item.id,
    entity_type: item.entity_type,
    action: item.action || 'create',
    endpoint: item.endpoint || '',
    method: item.method || 'POST',
    payload_json: typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload ?? {}),
    idempotency_key: item.idempotency_key ?? null,
    attempt_count: attempts,
    last_attempt_at: item.last_attempt_at ?? null,
    next_attempt_at: item.next_attempt_at ?? null,
    status: item.status || 'pending',
    last_error: item.last_error ?? null,
    rejection_reason: reason,
    created_at: item.created_at || new Date().toISOString(),
  };
}
