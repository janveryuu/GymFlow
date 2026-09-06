/**
 * SQLite DDL Schema, Index, and Trigger Definitions for GymFlow Mobile.
 * 5 Core Tables:
 * - Workout: Local cached workout catalog
 * - Session: Member class / trainer scheduled sessions
 * - ProgressEntry: Local completion history & synchronized logs
 * - Preferences: Single-member workout preferences & weekly goal
 * - WriteQueue: Durable offline mutation queue
 */

export const CREATE_WORKOUT_TABLE = `
CREATE TABLE IF NOT EXISTS Workout (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  calories INTEGER NOT NULL,
  description TEXT,
  image_url TEXT,
  sets_reps TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'program',
  sets INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  media_url TEXT,
  slug TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  completion_percentage REAL NOT NULL DEFAULT 0.0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
`;

export const CREATE_WORKOUT_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_workouts_category ON Workout(category);
CREATE INDEX IF NOT EXISTS idx_workouts_difficulty ON Workout(difficulty);
CREATE INDEX IF NOT EXISTS idx_workouts_is_featured ON Workout(is_featured);
`;

export const CREATE_WORKOUT_TRIGGERS = `
CREATE TRIGGER IF NOT EXISTS trg_workout_updated_at
AFTER UPDATE OF title, category, difficulty, duration_minutes, calories, description, image_url, sets_reps, is_featured, source, sets, reps, media_url, completion_percentage ON Workout
FOR EACH ROW
BEGIN
  UPDATE Workout SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = OLD.id;
END;
`;

export const CREATE_SESSION_TABLE = `
CREATE TABLE IF NOT EXISTS Session (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT,
  title TEXT NOT NULL,
  trainer_id TEXT,
  trainer_name TEXT,
  trainer_avatar TEXT,
  location TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20,
  booked_count INTEGER NOT NULL DEFAULT 0,
  is_cancelled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled',
  can_cancel INTEGER NOT NULL DEFAULT 1,
  checked_in INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (workout_id) REFERENCES Workout(id) ON DELETE SET NULL
);
`;

export const CREATE_SESSION_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_sessions_starts_at ON Session(starts_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON Session(status);
CREATE INDEX IF NOT EXISTS idx_sessions_is_cancelled ON Session(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_sessions_workout_id ON Session(workout_id);
`;

export const CREATE_PROGRESS_ENTRY_TABLE = `
CREATE TABLE IF NOT EXISTS ProgressEntry (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT NOT NULL,
  workout_title TEXT,
  started_at TEXT,
  completed_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  calories_burned INTEGER NOT NULL,
  heart_rate INTEGER,
  idempotency_key TEXT UNIQUE,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  FOREIGN KEY (workout_id) REFERENCES Workout(id) ON DELETE CASCADE
);
`;

export const CREATE_PROGRESS_ENTRY_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_progress_workout_id ON ProgressEntry(workout_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed_at ON ProgressEntry(completed_at);
CREATE INDEX IF NOT EXISTS idx_progress_sync_status ON ProgressEntry(sync_status);
CREATE INDEX IF NOT EXISTS idx_progress_idempotency_key ON ProgressEntry(idempotency_key);
`;

export const CREATE_PREFERENCES_TABLE = `
CREATE TABLE IF NOT EXISTS Preferences (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
  workout_type TEXT NOT NULL DEFAULT 'full-body',
  intensity TEXT NOT NULL DEFAULT 'moderate',
  weekly_workout_goal INTEGER NOT NULL DEFAULT 5,
  weight_kg REAL,
  daily_nutrition_target_calories INTEGER,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
`;

export const CREATE_PREFERENCES_TRIGGERS = `
CREATE TRIGGER IF NOT EXISTS trg_preferences_updated_at
AFTER UPDATE OF workout_type, intensity, weekly_workout_goal ON Preferences
FOR EACH ROW
BEGIN
  UPDATE Preferences SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = OLD.id;
END;
`;

export const CREATE_WRITE_QUEUE_TABLE = `
CREATE TABLE IF NOT EXISTS WriteQueue (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'create',
  endpoint TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL DEFAULT 'POST',
  payload_json TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  next_attempt_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
`;

export const CREATE_WRITE_QUEUE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_write_queue_status ON WriteQueue(status);
CREATE INDEX IF NOT EXISTS idx_write_queue_idempotency_key ON WriteQueue(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_write_queue_priority ON WriteQueue(status, next_attempt_at, entity_type, created_at);
`;

export const CREATE_WATER_INTAKE_TABLE = `
CREATE TABLE IF NOT EXISTS WaterIntakeEntry (
  id TEXT PRIMARY KEY NOT NULL,
  amount_ml INTEGER NOT NULL,
  logged_at TEXT NOT NULL,
  date_key TEXT NOT NULL
);
`;

export const CREATE_NUTRITION_TABLE = `
CREATE TABLE IF NOT EXISTS NutritionEntry (
  id TEXT PRIMARY KEY NOT NULL,
  food_name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  serving_size TEXT,
  meal_type TEXT NOT NULL,
  source TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  date_key TEXT NOT NULL,
  barcode TEXT
);
`;

export const CREATE_CHAT_MESSAGE_TABLE = `
CREATE TABLE IF NOT EXISTS ChatMessage (
  id TEXT PRIMARY KEY NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  session_id TEXT NOT NULL
);
`;

export const FULL_SCHEMA_DDL = `
${CREATE_WORKOUT_TABLE}
${CREATE_WORKOUT_INDEXES}
${CREATE_WORKOUT_TRIGGERS}

${CREATE_SESSION_TABLE}
${CREATE_SESSION_INDEXES}

${CREATE_PROGRESS_ENTRY_TABLE}
${CREATE_PROGRESS_ENTRY_INDEXES}

${CREATE_PREFERENCES_TABLE}
${CREATE_PREFERENCES_TRIGGERS}

${CREATE_WRITE_QUEUE_TABLE}
${CREATE_WRITE_QUEUE_INDEXES}

${CREATE_WATER_INTAKE_TABLE}
${CREATE_NUTRITION_TABLE}
${CREATE_CHAT_MESSAGE_TABLE}
`;
