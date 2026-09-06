/**
 * Domain types, API contracts, and state representations for GymFlow Mobile E2E testing.
 * Authoritative sources: ORIGINAL_REQUEST.md, PROJECT.md, CONTRACT.md
 */

export interface User {
  id: number;
  name: string;
  role: 'member';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Membership {
  id?: string;
  tier?: string;
  status: 'active' | 'expired' | 'pending';
  member_since?: string;
  valid_until?: string;
  expires_at?: string;
}

export interface Preferences {
  workout_type: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'full-body' | 'functional';
  intensity: 'low' | 'medium' | 'high' | 'extreme' | 'moderate';
  weekly_workout_goal: number; // 1-7
  updated_at?: string;
}

export interface MemberProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  photo_url: string | null;
  must_change_password: boolean;
  membership: Membership;
  preferences?: Preferences;
  created_at?: string;
  updated_at?: string;
}

export interface Workout {
  id: string;
  title: string;
  category: 'chest' | 'back' | 'leg' | 'arm' | 'full-body';
  type?: 'chest' | 'back' | 'leg' | 'arm' | 'full-body';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  source: 'trainer' | 'program' | string;
  duration_minutes: number;
  calories: number;
  reps_sets?: string;
  sets?: number;
  reps?: number;
  description: string;
  media_url?: string;
  image_url?: string;
  completion_percentage?: number;
  exercises_count?: number;
  updated_at?: string;
}

export interface Trainer {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  workout_id?: string | null;
  title: string;
  trainer: Trainer | string | null;
  location: string;
  start_time: string; // ISO
  end_time: string;   // ISO
  starts_at?: string; // alias
  ends_at?: string;   // alias
  status: 'upcoming' | 'scheduled' | 'completed' | 'cancelled_by_member' | 'cancelled_by_gym' | 'cancelled';
  can_cancel: boolean;
  is_checked_in: boolean;
  checked_in?: boolean;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  member_id?: number;
  checked_in_at: string;
  status?: string;
  idempotency_key?: string;
}

export interface ProgressEntry {
  id: string;
  workout_id: string;
  workout_title?: string;
  member_id?: number;
  started_at?: string;
  completed_at: string;
  duration_seconds: number;
  calories_burned: number;
  idempotency_key: string;
  heart_rate?: number | null;
  average_heart_rate?: number | null;
  is_synced?: boolean;
  created_at?: string;
}

export interface ChartDataPoint {
  label: string;
  calories: number;
  duration_minutes: number;
  date: string;
}

export interface ProgressSummary {
  period: 'week' | 'month' | 'year' | 'all';
  total_workouts: number;
  total_duration_seconds: number;
  total_calories: number;
  weekly_goal: number;
  goal_progress_percentage: number;
  average_heart_rate: number | null; // NULL MUST RENDER "—"
  chart_data: ChartDataPoint[];
  history: ProgressEntry[];
}

export type QueueEntityType = 'attendance' | 'progress' | 'session_cancel' | 'profile' | 'preferences';
export type QueueAction = 'create' | 'update' | 'delete';
export type QueueStatus = 'pending' | 'in_flight' | 'rejected' | 'completed' | 'failed';

export interface WriteQueueItem {
  id: string;
  entity_type: QueueEntityType;
  action: QueueAction;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload: any;
  idempotency_key?: string;
  created_at: string;
  retry_count: number;
  status: QueueStatus;
  last_error?: string | null;
  rejected_reason?: string | null;
}

export interface SyncEngineStatus {
  state: 'idle' | 'syncing' | 'paused' | 'offline';
  pending_count: number;
  rejected_count: number;
  has_7day_warning: boolean;
  active_banner: string | null;
}

export interface UIState {
  currentRoute: string;
  isLoading: boolean;
  isSkeletonVisible: boolean;
  isEmptyStateVisible: boolean;
  emptyStateText?: string;
  isErrorVisible: boolean;
  errorMessage?: string;
  isDismissibleBannerVisible: boolean;
  bannerText?: string;
  activeTab: 'Home' | 'Workouts' | 'Schedule' | 'Progress' | 'Profile';
  hapticEvents: string[];
}
