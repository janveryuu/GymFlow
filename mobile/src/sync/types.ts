import type {
  Workout,
  Session,
  ProgressEntry,
  ProgressHistoryResponse,
  Preferences,
  MemberProfile,
} from '../types';

export type QueueEntityType = 'attendance' | 'progress' | 'session_cancel' | 'preferences' | 'profile';
export type QueueAction = 'create' | 'update' | 'delete';
export type QueueStatus = 'pending' | 'in_flight' | 'rejected' | 'completed' | 'failed' | 'paused';
export type SyncEngineState = 'idle' | 'syncing' | 'paused' | 'offline';
export type SyncStateStatus = 'idle' | 'syncing' | 'paused' | 'error' | 'offline';

export interface WriteQueueItem {
  id: string;
  entity_type: QueueEntityType | string;
  action: QueueAction | string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE' | string;
  payload: any;
  idempotency_key?: string;
  created_at: string;
  retry_count: number;
  attempt_count: number;
  status: QueueStatus | string;
  last_error?: string | null;
  rejected_reason?: string | null;
  rejection_reason?: string | null;
  last_attempt_at?: string | null;
  next_attempt_at?: string | null;
}

export interface SyncEngineStatus {
  state: SyncEngineState;
  pending_count: number;
  rejected_count: number;
  has_7day_warning: boolean;
  active_banner: string | null;
}

export interface DrainResult {
  processed: number;
  paused: boolean;
  rejected: number;
  failed: number;
  succeeded?: number;
}

export interface SyncStateInfo {
  pendingCount: number;
  syncState: SyncStateStatus;
  hasAmberWarning: boolean;
  rejectedCount: number;
  isOnline: boolean;
  lastSyncAt: string | null;
  activeBanner: string | null;
}

export interface GetWorkoutsOptions {
  forceRefresh?: boolean;
  category?: 'chest' | 'back' | 'leg' | 'arm' | 'full-body' | string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | string;
}

export interface GetSessionsOptions {
  forceRefresh?: boolean;
  from?: string;
  to?: string;
}

export interface ProgressSubmission {
  workout_id: string;
  workout_title?: string;
  started_at?: string;
  completed_at: string;
  duration_seconds: number;
  calories_burned: number;
  heart_rate?: number | null;
  idempotency_key?: string;
}

export interface AttendanceSubmission {
  session_id: string;
  checked_in_at?: string;
  idempotency_key?: string;
}

export interface RecordAttendanceResult {
  queueId: string;
  status: 'queued' | 'synced';
  record?: {
    id: string;
    session_id: string;
    checked_in_at: string;
    status: string;
  };
}

export interface SubmitProgressResult {
  queueId: string;
  status: 'queued' | 'synced';
  entry?: ProgressEntry;
}

export interface CancelSessionResult {
  success: boolean;
  status: 'cancelled' | 'cancelled_by_member' | 'cancelled_by_gym' | 'failed';
  message: string;
  session?: Session;
}

export interface ISyncRepository {
  getWorkouts(options?: GetWorkoutsOptions): Promise<Workout[]>;
  getWorkoutById(id: string, options?: { forceRefresh?: boolean }): Promise<Workout | null>;
  getSessions(options?: GetSessionsOptions): Promise<Session[]>;
  cancelSession(sessionId: string, reason?: string): Promise<CancelSessionResult>;
  getProgressHistory(period?: string, options?: { forceRefresh?: boolean }): Promise<ProgressHistoryResponse>;
  getPreferences(options?: { forceRefresh?: boolean }): Promise<Preferences | null>;
  updatePreferences(pref: Partial<Preferences>): Promise<Preferences>;
  recordAttendance(sessionId: string): Promise<RecordAttendanceResult>;
  submitProgress(entry: ProgressSubmission): Promise<SubmitProgressResult>;
  toggleFavoriteWorkout(workoutId: string): Promise<boolean>;
  getFavoriteWorkouts(): Promise<Workout[]>;
  getProfile(options?: { forceRefresh?: boolean }): Promise<MemberProfile | null>;
  updateProfile(profile: Partial<MemberProfile>): Promise<MemberProfile>;
  getSyncState(): Promise<SyncStateInfo>;
  drainQueue(): Promise<DrainResult>;
  dismissRejectedItem(queueId: string): Promise<void>;
}
