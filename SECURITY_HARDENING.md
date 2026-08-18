# Security Hardening

This branch hardens the telehealth server before production deployment.

## Required environment variables

- `DATABASE_URL`
- `JWT_SECRET` (use a long random value)
- `CORS_ORIGINS` (comma-separated allowed frontend origins)
- `BOOTSTRAP_DOCTOR=true` only when provisioning a fresh database
- `DOCTOR_EMAIL` and `DOCTOR_PASSWORD` when bootstrapping the doctor account
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_UPLOAD_PRESET`

## Data migration

Set `RUN_DATA_MIGRATION=true` only for a controlled deployment where the legacy appointment-to-patient migration is required. It is disabled by default so every server restart does not scan and rewrite the entire appointments table.

## Document storage

Documents are uploaded to Cloudinary and only the resulting secure URL is stored in PostgreSQL. This keeps large binary/base64 payloads out of the database.

Never commit production credentials or `.env` files.
