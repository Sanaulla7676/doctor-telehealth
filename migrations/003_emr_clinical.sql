-- Dr Varsha Telehealth: clinical workflow hardening
-- Idempotent migration for prescriptions, consultation sessions and EMR indexes.

CREATE TABLE IF NOT EXISTS prescription_versions (
  id VARCHAR(255) PRIMARY KEY,
  appointment_id VARCHAR(255) NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL,
  version_no INT NOT NULL,
  diagnosis TEXT DEFAULT '',
  medicines TEXT DEFAULT '',
  advice TEXT DEFAULT '',
  issued_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (appointment_id, version_no)
);

CREATE TABLE IF NOT EXISTS consultation_sessions (
  id VARCHAR(255) PRIMARY KEY,
  appointment_id VARCHAR(255) UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  room_name VARCHAR(255) NOT NULL,
  doctor_joined_at TIMESTAMPTZ,
  patient_joined_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(40) NOT NULL DEFAULT 'READY',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(120);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by_type VARCHAR(30) DEFAULT 'patient';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_prescription_patient_created
  ON prescription_versions(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_appointment_version
  ON prescription_versions(appointment_id, version_no DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_status
  ON consultation_sessions(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_updated
  ON clinical_notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_followup_reminders_date_status
  ON followup_reminders(reminder_date, status);
CREATE INDEX IF NOT EXISTS idx_documents_appointment_uploaded
  ON documents(appointment_id, uploaded_at DESC);

INSERT INTO schema_migrations(version)
VALUES ('003_emr_clinical')
ON CONFLICT (version) DO NOTHING;
