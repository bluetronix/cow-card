-- Account email, verification tokens, password reset tokens and rate limiting.
ALTER TABLE users ADD COLUMN email TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN email_verified_at TEXT DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
  ON users(email) WHERE email <> '';

CREATE TABLE IF NOT EXISTS email_verifications (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT DEFAULT '',
  requested_ip TEXT DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
  id_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT DEFAULT '',
  requested_ip TEXT DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user
  ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires
  ON email_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_user
  ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires
  ON password_resets(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window
  ON auth_rate_limits(window_start);
