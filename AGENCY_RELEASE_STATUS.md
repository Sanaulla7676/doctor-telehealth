# Agency Release Status

## Current branch

`production/agency-grade-platform`

## Implemented in this release pass

- Production security bootstrap
- Explicit CORS allowlist support
- Deployment-managed doctor provisioning
- Request-size control
- Authentication and booking rate limiting
- Password-reset token log suppression
- Health/readiness endpoints
- Versioned database migration runner and validation
- Appointment lifecycle state rules and server action endpoint
- Doctor appointment UI with Accept / Reject / WhatsApp / Confirm / Join Video / Complete controls
- Responsive doctor dashboard shell
- Blog Studio integration
- Privacy, Terms and Telemedicine Consent pages
- Selenium smoke coverage for dashboard navigation, appointment controls and blog publishing
- CI security/migration/typecheck/build gates

## Still requires real environment verification

- Execute migrations against staging Neon
- Configure and verify Render production/staging environment variables
- Verify doctor provisioning in a controlled deployment
- Run authenticated Selenium suite with real credentials
- Run two-browser Jitsi staging test
- Verify patient and doctor realtime reconciliation
- Verify clinical notes, prescriptions, follow-ups and documents against their production API contracts
- Run backup/restore drill
- Configure runtime monitoring and rollback
- Enforce required GitHub branch checks before merge

## Production decision

**DO NOT MERGE OR LABEL PRODUCTION READY YET.**

The codebase now has the core release guardrails and appointment workflow, but production readiness still depends on real staging data, credentials, full authorization coverage, clinical module verification, and executed E2E evidence. Payment remains deferred by product decision.
