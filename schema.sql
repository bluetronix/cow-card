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
  dam_id TEXT DEFAULT '',
  bull_name TEXT DEFAULT '',
  lactations INTEGER DEFAULT 0,
  calving_date TEXT DEFAULT '',
  pd_date TEXT DEFAULT '',
  pd_group TEXT DEFAULT '',
  pregnancy_result TEXT DEFAULT '',
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
  feeding_group TEXT DEFAULT '',
  milking_group TEXT DEFAULT '',
  pen_barn_no TEXT DEFAULT '',
  housing TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  issued_date TEXT DEFAULT '',
  issued_by TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS daily_records (
  id TEXT PRIMARY KEY,
  cow_id TEXT NOT NULL,
  date TEXT NOT NULL,
  milk_yield REAL DEFAULT 0,
  body_condition_score REAL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT '',
  FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cows_user_id ON cows(user_id);
CREATE INDEX IF NOT EXISTS idx_cows_id_no ON cows(id_no);
CREATE INDEX IF NOT EXISTS idx_cows_tag ON cows(tag);
CREATE INDEX IF NOT EXISTS idx_daily_records_cow_id ON daily_records(cow_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(date);
