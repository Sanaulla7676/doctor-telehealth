-- Dr Varsha Telehealth: agency-grade database hardening
-- Idempotent migration. Run through scripts/migrate.js.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  actor_type VARCHAR(30) NOT NULL,
  actor_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON audit_logs(actor_type, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_date_time
  ON appointments(date, time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_account
  ON appointments(patient_account_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient
  ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_followups_patient_date
  ON followups(patient_id, followup_date);
CREATE INDEX IF NOT EXISTS idx_notifications_status_created
  ON notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_notifications_account_created
  ON patient_notifications(patient_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_patient_account
  ON documents(patient_account_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_patient
  ON documents(patient_id, uploaded_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_patient_account_fk'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_patient_account_fk
      FOREIGN KEY (patient_account_id) REFERENCES patient_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patient_notifications_appointment_fk'
  ) THEN
    ALTER TABLE patient_notifications
      ADD CONSTRAINT patient_notifications_appointment_fk
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_appointment_fk'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_appointment_fk
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Prevent impossible blank identities at the database boundary.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='email')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='appointments_email_nonblank') THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_email_nonblank CHECK (length(trim(email)) > 3);
  END IF;
END $$;

INSERT INTO schema_migrations(version)
VALUES ('001_agency_hardening')
ON CONFLICT (version) DO NOTHING;
