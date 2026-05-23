-- Run once against fedhealth_ai if tables existed before patient memory feature.
-- New installs: SQLAlchemy create_all() creates these automatically.

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_uid VARCHAR(36) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    medical_record_number VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_patients_patient_uid ON patients (patient_uid);
CREATE INDEX IF NOT EXISTS ix_patients_medical_record_number ON patients (medical_record_number);

ALTER TABLE prediction_logs ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id);
ALTER TABLE prediction_logs ADD COLUMN IF NOT EXISTS source VARCHAR(32) DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS ix_prediction_logs_patient_id ON prediction_logs (patient_id);
