-- Bashe Dairy Farm - Turso Database Schema
-- Run: turso db shell <database-name> < schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  id_no TEXT DEFAULT '',
  tag TEXT DEFAULT '',
  collar_no TEXT DEFAULT '',
  rfid_no TEXT DEFAULT '',
  name TEXT DEFAULT '',
  sex TEXT DEFAULT '',
  breed TEXT DEFAULT '',
  colour TEXT DEFAULT '',
  origin TEXT DEFAULT '',
  birth_date TEXT DEFAULT '',
  group_name TEXT DEFAULT '',
  dam_id TEXT DEFAULT '',                    <!-- column: dam_id -->
  dam_breed TEXT DEFAULT '',                 <!-- new -->
  sire_id TEXT DEFAULT '',                   <!-- column: sire_id (was bull_name) -->
  sire_breed TEXT DEFAULT '',                <!-- new -->
  lactations INTEGER DEFAULT 0,
  calving_date TEXT DEFAULT '',
  pd_date TEXT DEFAULT '',
  pd_group TEXT DEFAULT '',
  pregnancy_result TEXT DEFAULT 'Open',
  ai_service_date TEXT DEFAULT '',
  expected_dry_off_date TEXT DEFAULT '',
  expected_calving_date TEXT DEFAULT '',
  days_in_milk INTEGER DEFAULT 0,
  peak_milk_yield REAL DEFAULT 0,
  current_daily_milk_yield REAL DEFAULT 0,
  total_lactation_yield REAL DEFAULT 0,
  fat_percent REAL DEFAULT 0,
  protein_percent REAL DEFAULT 0,
  projected_305d_milk_yield REAL DEFAULT 0,
  vaccinations TEXT DEFAULT '',
  deworming_dates TEXT DEFAULT '',
  mastitis_history TEXT DEFAULT '',
  body_condition_score REAL DEFAULT 0,
  dead_qtr_teat TEXT DEFAULT '',
  quarter_teat_status TEXT DEFAULT '',
  medical_records TEXT DEFAULT '',
  vet_recommendations TEXT DEFAULT '',     <!-- new -->
  feeding_group TEXT DEFAULT '',
  milking_group TEXT DEFAULT '',
  barn_name TEXT DEFAULT '',                 <!-- column: barn_name (was pen_barn_no) -->
  housing TEXT DEFAULT '',
  cull_status TEXT DEFAULT '-',             <!-- new, '+' or '-', default '-' -->
  abortion_count INTEGER DEFAULT 0,          <!-- new -->
  remarks TEXT DEFAULT '',
  issued_date TEXT DEFAULT '',
  issued_by TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  lactation_history TEXT DEFAULT '',
  current_health_status TEXT DEFAULT '',
  last_checkup_date TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS daily_records (
  id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL,
  date TEXT NOT NULL,
  milk_yield_morning REAL DEFAULT 0,
  milk_yield_evening REAL DEFAULT 0,
  milk_yield_total REAL DEFAULT 0,
  health_status TEXT DEFAULT '',
  last_checkup_date TEXT DEFAULT '',
  temperature REAL DEFAULT 0,
  symptoms TEXT DEFAULT '',
  treatment_given TEXT DEFAULT '',
  health_notes TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_records_cow_id ON daily_records(cow_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(date);

CREATE INDEX IF NOT EXISTS idx_cows_user_id ON cows(user_id);
CREATE INDEX IF NOT EXISTS idx_cows_id_no ON cows(id_no);
CREATE INDEX IF NOT EXISTS idx_cows_tag ON cows(tag);

-- ── Vet Space Tables ──────────────────────────────────

CREATE TABLE IF NOT EXISTS vet_visits (
  id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  vet_name TEXT DEFAULT '',
  diagnosis TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  temperature REAL DEFAULT 0,
  heart_rate REAL DEFAULT 0,
  respiration_rate REAL DEFAULT 0,
  weight REAL DEFAULT 0,
  body_condition_score REAL DEFAULT 0,
  created_at TEXT DEFAULT '',
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS health_incidents (
  id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL,
  incident_date TEXT NOT NULL,
  incident_type TEXT DEFAULT 'other',
  severity TEXT DEFAULT 'mild',
  status TEXT DEFAULT 'open',
  affected_area TEXT DEFAULT '',
  description TEXT DEFAULT '',
  treatment_given TEXT DEFAULT '',
  resolved_date TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS treatments (
  id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL,
  incident_id TEXT DEFAULT '',
  treatment_date TEXT NOT NULL,
  medication TEXT DEFAULT '',
  dosage TEXT DEFAULT '',
  route TEXT DEFAULT '',
  duration_days INTEGER DEFAULT 0,
  administered_by TEXT DEFAULT '',
  next_due_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lameness_sessions (
  id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL,
  session_date TEXT NOT NULL,
  duration_seconds REAL DEFAULT 0,
  gait_amplitude_avg REAL DEFAULT 0,
  gait_amplitude_max REAL DEFAULT 0,
  limp_detected INTEGER DEFAULT 0,
  confidence_score REAL DEFAULT 0,
  waveform_data TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vaccination_records (
  id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL,
  vaccine_name TEXT DEFAULT '',
  scheduled_date TEXT NOT NULL,
  administered_date TEXT DEFAULT '',
  administered_by TEXT DEFAULT '',
  batch_no TEXT DEFAULT '',
  next_due_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vet_visits_cow_id ON vet_visits(cow_id);
CREATE INDEX IF NOT EXISTS idx_health_incidents_cow_id ON health_incidents(cow_id);
CREATE INDEX IF NOT EXISTS idx_health_incidents_status ON health_incidents(status);
CREATE INDEX IF NOT EXISTS idx_treatments_cow_id ON treatments(cow_id);
CREATE INDEX IF NOT EXISTS idx_treatments_next_due ON treatments(next_due_date);
CREATE INDEX IF NOT EXISTS idx_lameness_sessions_cow_id ON lameness_sessions(cow_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_cow_id ON vaccination_records(cow_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_scheduled ON vaccination_records(scheduled_date);
