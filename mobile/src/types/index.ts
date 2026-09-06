export interface User {
  id: number;
  name: string;
  role: 'member';
  email?: string;
  must_change_password?: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Membership {
  id: string;
  tier: string;
  status: string;
  expires_at: string;
}

export interface Preferences {
  workout_type: string;
  intensity: string;
  weekly_workout_goal: number;
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
  created_at: string;
  updated_at: string;
  preferences?: Preferences;
}

export interface Workout {
  id: string;
  title: string;
  category: 'chest' | 'back' | 'leg' | 'arm' | 'full-body' | string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | string;
  source: 'trainer' | 'program' | string;
  duration_minutes: number;
  calories: number;
  sets: number;
  reps: number;
  reps_sets?: string;
  sets_reps?: string;
  slug?: string;
  is_favorite?: boolean;
  image_url: string;
  media_url?: string;
  description: string;
  completion_percentage: number;
}

export interface MergedWorkout extends Workout {
  slug: string;
  exerciseId?: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  exerciseType: string;
  isStretch?: boolean;
}

export interface Trainer {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  workout_id: string | null;
  title: string;
  trainer: Trainer | null;
  trainer_name?: string;
  location: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'cancelled' | 'cancelled_by_gym' | 'cancelled_by_member' | 'completed' | string;
  can_cancel: boolean;
  checked_in: boolean;
  is_cancelled?: boolean;
}

export interface ProgressEntry {
  id: string;
  workout_id: string;
  workout_title?: string;
  completed_at: string;
  duration_seconds: number;
  calories_burned: number;
  heart_rate: number | null;
  idempotency_key?: string;
}

export interface ProgressChartData {
  label: string;
  calories: number;
  duration_minutes: number;
  date: string;
}

export interface ProgressHistoryResponse {
  period: string;
  total_workouts: number;
  total_duration_seconds: number;
  total_calories: number;
  weekly_goal: number;
  goal_progress_percentage: number;
  average_heart_rate: number | null;
  chart_data: ProgressChartData[];
  history: ProgressEntry[];
}
