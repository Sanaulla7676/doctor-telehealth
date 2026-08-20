-- Secure one-time password reset tokens.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(255) PRIMARY KEY,
  account_type VARCHAR(30) NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_lookup
  ON password_reset_tokens(account_type, account_id, expires_at DESC);

INSERT INTO schema_migrations(version)
VALUES ('004_password_reset')
ON CONFLICT (version) DO NOTHING;
