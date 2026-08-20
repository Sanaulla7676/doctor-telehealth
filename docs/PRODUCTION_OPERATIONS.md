# Production Operations Runbook

## Health

Backend probes:

- `GET /health` — process is alive.
- `GET /ready` — process and PostgreSQL connectivity are ready.

A deployment is not healthy if `/ready` returns non-200.

## Monitoring

Render should alert on:

- repeated 5xx responses
- `/ready` failures
- sustained restart loops
- elevated request latency
- database connection failures

Vercel should be checked for failed builds and preview regressions before promotion.

## Rollback

1. Stop promotion immediately.
2. Identify the last known-good Vercel/Render deployment.
3. Repoint the production deployment to that version.
4. Confirm `/health` and `/ready`.
5. Verify patient and doctor login.
6. Verify appointment read-only access.
7. Verify the incident is recorded.
8. Do not roll database schema backward unless the migration explicitly defines a safe down/recovery path.

## Database recovery

Use the manual GitHub Actions workflow `.github/workflows/staging-backup-restore.yml` for the recurring restore drill. Production backup/restore must use an approved isolated restore target and must never overwrite the live database during a test.

## Release gate

A release is approved only when:

- Vercel build is READY.
- Render health/readiness is healthy.
- Neon migrations are applied successfully.
- Authenticated Selenium staging suite passes with artifacts.
- Two-browser Jitsi test passes.
- Backup/restore drill passes.
- No critical security findings remain.
