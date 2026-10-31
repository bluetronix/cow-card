-- Sync metadata for last-write-wins conflict resolution and tombstones.
-- Duplicate-column errors are ignored by the runner.

ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN deleted_at TEXT DEFAULT '';

ALTER TABLE cows ADD COLUMN updated_at TEXT DEFAULT '';
ALTER TABLE cows ADD COLUMN deleted_at TEXT DEFAULT '';

ALTER TABLE daily_records ADD COLUMN updated_at TEXT DEFAULT '';
ALTER TABLE daily_records ADD COLUMN deleted_at TEXT DEFAULT '';

ALTER TABLE vet_visits ADD COLUMN updated_at TEXT DEFAULT '';
ALTER TABLE vet_visits ADD COLUMN deleted_at TEXT DEFAULT '';

ALTER TABLE health_incidents ADD COLUMN updated_at TEXT DEFAULT '';
ALTER TABLE health_incidents ADD COLUMN deleted_at TEXT DEFAULT '';

ALTER TABLE treatments ADD COLUMN updated_at TEXT DEFAULT '';
ALTER TABLE treatments ADD COLUMN deleted_at TEXT DEFAULT '';

ALTER TABLE lameness_sessions ADD COLUMN updated_at TEXT DEFAULT '';
ALTER TABLE lameness_sessions ADD COLUMN deleted_at TEXT DEFAULT '';

ALTER TABLE vaccination_records ADD COLUMN updated_at TEXT DEFAULT '';
ALTER TABLE vaccination_records ADD COLUMN deleted_at TEXT DEFAULT '';

ALTER TABLE groups ADD COLUMN updated_at TEXT DEFAULT '';
ALTER TABLE groups ADD COLUMN deleted_at TEXT DEFAULT '';

-- Indexes are created after the columns exist (important for existing databases).
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE INDEX IF NOT EXISTS idx_cows_updated_at ON cows(updated_at);
CREATE INDEX IF NOT EXISTS idx_cows_deleted_at ON cows(deleted_at);

CREATE INDEX IF NOT EXISTS idx_daily_records_updated_at ON daily_records(updated_at);
CREATE INDEX IF NOT EXISTS idx_daily_records_deleted_at ON daily_records(deleted_at);

CREATE INDEX IF NOT EXISTS idx_vet_visits_updated_at ON vet_visits(updated_at);
CREATE INDEX IF NOT EXISTS idx_vet_visits_deleted_at ON vet_visits(deleted_at);

CREATE INDEX IF NOT EXISTS idx_health_incidents_updated_at ON health_incidents(updated_at);
CREATE INDEX IF NOT EXISTS idx_health_incidents_deleted_at ON health_incidents(deleted_at);

CREATE INDEX IF NOT EXISTS idx_treatments_updated_at ON treatments(updated_at);
CREATE INDEX IF NOT EXISTS idx_treatments_deleted_at ON treatments(deleted_at);

CREATE INDEX IF NOT EXISTS idx_lameness_sessions_updated_at ON lameness_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_lameness_sessions_deleted_at ON lameness_sessions(deleted_at);

CREATE INDEX IF NOT EXISTS idx_vaccination_records_updated_at ON vaccination_records(updated_at);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_deleted_at ON vaccination_records(deleted_at);

CREATE INDEX IF NOT EXISTS idx_groups_updated_at ON groups(updated_at);
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups(deleted_at);
