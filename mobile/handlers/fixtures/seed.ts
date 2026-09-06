import { LoginResponse, MemberProfile, Preferences, ProgressEntry, Session, Workout } from '@/types';

const iso = (d: Date) => d.toISOString();
export const at = (dayOffset: number, hour: number, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d;
};

export const validCredentials = [
  { email: 'jane.doe@example.com', password: 'Password123!' },
  { email: 'member@gymflow.test', password: 'TempPass!23' },
  { email: 'alex.vance@gymflow.com', password: 'password123' },
  { email: 'alex.vance@gymflow.com', password: 'Password123!' },
  { email: 'mustchange@gymflow.com', password: 'tempPass123!' },
  { email: 'mustchange@gymflow.com', password: 'password123' },
];

export const seedLogin: LoginResponse = {
  token: '1|abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
  user: {
    id: 1,
    name: 'Jane Doe',
    role: 'member',
  },
};

export const seedProfile: MemberProfile = {
  id: 1,
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  phone: '+1 (555) 234-5678',
  photo_url: null,
  must_change_password: false,
  membership: {
    id: 'mem_tier_elite_01',
    tier: 'Black Diamond All-Access',
    status: 'active',
    expires_at: iso(at(180, 23, 59)),
  },
  created_at: '2024-01-15T08:00:00Z',
  updated_at: '2026-09-01T12:00:00Z',
  preferences: {
    workout_type: 'full-body',
    intensity: 'moderate',
    weekly_workout_goal: 5,
  },
};

export const seedPreferences: Preferences = {
  workout_type: 'full-body',
  intensity: 'moderate',
  weekly_workout_goal: 5,
};

const img = (id: string) => `https://images.unsplash.com/${id}?w=800&q=70`;

export const seedWorkouts: Workout[] = [
  {
    id: 'w1',
    title: 'Bench Press Power',
    category: 'chest',
    difficulty: 'intermediate',
    source: 'trainer',
    duration_minutes: 45,
    calories: 320,
    sets: 4,
    reps: 10,
    reps_sets: '4 sets x 10 reps',
    image_url: img('photo-1571019613454-1cb2f99b2d8b'),
    media_url: img('photo-1571019613454-1cb2f99b2d8b'),
    description: 'Barbell bench progression with incline accessory work.',
    completion_percentage: 100,
  },
  {
    id: 'w2',
    title: 'Pull Day Foundations',
    category: 'back',
    difficulty: 'beginner',
    source: 'program',
    duration_minutes: 30,
    calories: 210,
    sets: 3,
    reps: 12,
    reps_sets: '3 sets x 12 reps',
    image_url: img('photo-1517836357463-d25dfeac3438'),
    media_url: img('photo-1517836357463-d25dfeac3438'),
    description: 'Lat pulldown, rows, and scapular activation.',
    completion_percentage: 65,
  },
  {
    id: 'w3',
    title: 'Leg Press Circuit',
    category: 'leg',
    difficulty: 'advanced',
    source: 'trainer',
    duration_minutes: 50,
    calories: 480,
    sets: 5,
    reps: 8,
    reps_sets: '5 sets x 8 reps',
    image_url: img('photo-1434608596716-15ff99c6083f'),
    media_url: img('photo-1434608596716-15ff99c6083f'),
    description: 'High-volume lower-body circuit with plyo finisher.',
    completion_percentage: 40,
  },
  {
    id: 'w4',
    title: 'Arm Sculpt Express',
    category: 'arm',
    difficulty: 'beginner',
    source: 'program',
    duration_minutes: 20,
    calories: 140,
    sets: 3,
    reps: 15,
    reps_sets: '3 sets x 15 reps',
    image_url: img('photo-1583454110551-21f2fa2afe61'),
    media_url: img('photo-1583454110551-21f2fa2afe61'),
    description: 'Superset curls and pushdowns, minimal rest.',
    completion_percentage: 85,
  },
  {
    id: 'w5',
    title: 'Full-Body Metcon',
    category: 'full-body',
    difficulty: 'intermediate',
    source: 'program',
    duration_minutes: 35,
    calories: 400,
    sets: 4,
    reps: 12,
    reps_sets: '4 sets x 12 reps',
    image_url: img('photo-1534258936971-a7e5955b0274'),
    media_url: img('photo-1534258936971-a7e5955b0274'),
    description: 'Kettlebell, row, and sled intervals.',
    completion_percentage: 20,
  },
  {
    id: 'w6',
    title: 'Incline Press & Fly',
    category: 'chest',
    difficulty: 'advanced',
    source: 'trainer',
    duration_minutes: 40,
    calories: 300,
    sets: 5,
    reps: 8,
    reps_sets: '5 sets x 8 reps',
    image_url: img('photo-1581009146145-b5ef050c2e1e'),
    media_url: img('photo-1581009146145-b5ef050c2e1e'),
    description: 'Upper-chest emphasis with cable fly burnout.',
    completion_percentage: 0,
  },
  {
    id: 'w7',
    title: 'Deadlift Basics',
    category: 'back',
    difficulty: 'beginner',
    source: 'trainer',
    duration_minutes: 40,
    calories: 260,
    sets: 4,
    reps: 6,
    reps_sets: '4 sets x 6 reps',
    image_url: img('photo-1526506118085-60ce8714f8c5'),
    media_url: img('photo-1526506118085-60ce8714f8c5'),
    description: 'Form-first conventional deadlift session.',
    completion_percentage: 50,
  },
  {
    id: 'w8',
    title: 'Squat Strength Ladder',
    category: 'leg',
    difficulty: 'intermediate',
    source: 'program',
    duration_minutes: 45,
    calories: 350,
    sets: 6,
    reps: 5,
    reps_sets: '6 sets x 5 reps',
    image_url: img('photo-1574680096145-d05b474e2155'),
    media_url: img('photo-1574680096145-d05b474e2155'),
    description: 'Ascending ladder to a working set of five.',
    completion_percentage: 10,
  },
];

export const seedSessions: Session[] = [
  {
    id: 's1',
    workout_id: 'w1',
    title: 'Bench Press Power',
    trainer: { id: 't1', name: 'Marco D.' },
    location: 'Main Floor',
    starts_at: iso(at(0, 6, 30)),
    ends_at: iso(at(0, 7, 15)),
    status: 'scheduled',
    can_cancel: true,
    checked_in: false,
  },
  {
    id: 'sess_hiit_101',
    workout_id: 'w5',
    title: 'Full-Body Metcon',
    trainer: null,
    location: 'Studio B',
    starts_at: iso(at(0, 17, 0)),
    ends_at: iso(at(0, 17, 35)),
    status: 'scheduled',
    can_cancel: true,
    checked_in: false,
  },
  {
    id: 's2',
    workout_id: 'w5',
    title: 'Full-Body Metcon',
    trainer: null,
    location: 'Studio B',
    starts_at: iso(at(0, 17, 0)),
    ends_at: iso(at(0, 17, 35)),
    status: 'scheduled',
    can_cancel: true,
    checked_in: false,
  },
  {
    id: 's3',
    workout_id: 'w3',
    title: 'Leg Press Circuit',
    trainer: { id: 't2', name: 'Elena R.' },
    location: 'Free Weights',
    starts_at: iso(at(1, 7, 0)),
    ends_at: iso(at(1, 7, 50)),
    status: 'scheduled',
    can_cancel: true,
    checked_in: false,
  },
  {
    id: 's4',
    workout_id: null,
    title: 'Coach Check-in',
    trainer: { id: 't1', name: 'Marco D.' },
    location: 'Office',
    starts_at: iso(at(2, 16, 0)),
    ends_at: iso(at(2, 16, 30)),
    status: 'scheduled',
    can_cancel: true,
    checked_in: false,
  },
  {
    id: 's5',
    workout_id: 'w2',
    title: 'Pull Day Foundations',
    trainer: null,
    location: 'Machines',
    starts_at: iso(at(3, 6, 0)),
    ends_at: iso(at(3, 6, 30)),
    status: 'scheduled',
    can_cancel: true,
    checked_in: false,
  },
  {
    id: 's6',
    workout_id: 'w8',
    title: 'Squat Strength Ladder',
    trainer: { id: 't2', name: 'Elena R.' },
    location: 'Rack Area',
    starts_at: iso(at(-1, 8, 0)),
    ends_at: iso(at(-1, 8, 45)),
    status: 'completed',
    can_cancel: false,
    checked_in: true,
  },
  {
    id: 'sess_yoga_204',
    workout_id: null,
    title: 'Mobility & Recovery',
    trainer: { id: 't3', name: 'Sarah J.' },
    location: 'Studio A',
    starts_at: iso(at(0, 11, 0)),
    ends_at: iso(at(0, 11, 45)),
    status: 'cancelled_by_gym',
    can_cancel: false,
    checked_in: false,
  },
  {
    id: 's7',
    workout_id: null,
    title: 'Mobility & Recovery',
    trainer: { id: 't3', name: 'Sarah J.' },
    location: 'Studio A',
    starts_at: iso(at(0, 11, 0)),
    ends_at: iso(at(0, 11, 45)),
    status: 'cancelled_by_gym',
    can_cancel: false,
    checked_in: false,
  },
];

export const seedProgress: ProgressEntry[] = Array.from({ length: 14 }, (_, i) => {
  const w = seedWorkouts[i % seedWorkouts.length] as Workout;
  return {
    id: `p${i + 1}`,
    workout_id: w.id,
    workout_title: w.title,
    completed_at: iso(at(-i, 7 + (i % 10))),
    duration_seconds: w.duration_minutes * 60 - (i % 5) * 120,
    calories_burned: w.calories - (i % 7) * 15,
    heart_rate: i % 3 === 0 ? null : 118 + (i % 30),
  };
});

/** Mutable state singleton for the mock server */
export const state = {
  sessions: seedSessions.map((s) => ({
    ...s,
    trainer: s.trainer ? { ...s.trainer } : null,
  })),
  progress: seedProgress.map((p) => ({ ...p })),
  profile: {
    ...seedProfile,
    membership: { ...seedProfile.membership },
    preferences: seedProfile.preferences ? { ...seedProfile.preferences } : undefined,
  },
  preferences: { ...seedPreferences },
  attendance: [] as { session_id: string; checked_in_at: string; idempotency_key?: string }[],
  seenIdempotencyKeys: new Map<string, any>(),
};

/** Resets mutable state to initial fixtures (invoked in beforeEach or tests) */
export function resetState() {
  state.sessions = seedSessions.map((s) => ({
    ...s,
    trainer: s.trainer ? { ...s.trainer } : null,
  }));
  state.progress = seedProgress.map((p) => ({ ...p }));
  state.profile = {
    ...seedProfile,
    membership: { ...seedProfile.membership },
    preferences: seedProfile.preferences ? { ...seedProfile.preferences } : undefined,
  };
  state.preferences = { ...seedPreferences };
  state.attendance = [];
  state.seenIdempotencyKeys.clear();
}
