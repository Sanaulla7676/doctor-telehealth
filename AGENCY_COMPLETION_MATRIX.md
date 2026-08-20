# Dr Varsha Telehealth — Agency Completion Matrix

This is the release gate. A feature is **COMPLETE** only when implementation exists, server authorization is enforced, automated tests cover the critical path, and staging evidence exists.

## Implemented in the agency branch

- [x] Next.js/React/TypeScript frontend foundation
- [x] Express/Node.js backend foundation
- [x] PostgreSQL/Neon integration
- [x] Doctor and patient authentication foundations
- [x] Appointment persistence and server-authorized lifecycle actions
- [x] Patient directory and patient appointment APIs
- [x] Blog Studio create/edit/delete and public blog pages
- [x] Nine clinic nutrition/vitamin articles seeded from supplied DOCX material
- [x] Socket.IO realtime foundation
- [x] Jitsi deterministic room generation foundation
- [x] Versioned database migration runner
- [x] EMR clinical schema: clinical sessions and prescription versions
- [x] Clinical patient timeline API
- [x] Structured clinical notes API and React workspace
- [x] Prescription versioning and patient-access API
- [x] Follow-up create/update/complete APIs and reminder queue
- [x] Patient follow-up API
- [x] Doctor notification APIs and booking-event notification hook
- [x] Audit-log table, audit writers and audit viewer API/UI
- [x] Operational analytics API/UI
- [x] Doctor/patient telehealth join endpoints and consultation completion lifecycle
- [x] Patient cancellation API
- [x] Secure one-time password reset token storage and reset endpoint
- [x] Security bootstrap with production CORS allowlist
- [x] Deployment-managed doctor provisioning
- [x] Request-size controls and auth/booking rate limits
- [x] Health and database-readiness endpoints
- [x] Selenium smoke coverage for dashboard/blog/clinical EMR entry points
- [x] Static security, security-contract, migration and EMR-contract quality gates
- [x] Privacy, Terms, Telemedicine Consent and Cancellation/Refund Policy pages
- [x] Vercel preview deployment for the agency branch

## Still pending before production release

### Security and authorization — CRITICAL
- [ ] Complete full record-ownership review against every existing legacy endpoint in `server.js`.
- [ ] Replace temporary in-memory rate limiter with a distributed limiter if multiple backend instances are used.
- [ ] Configure a real password-reset delivery adapter and verify delivery end-to-end.
- [ ] Execute an authorization penetration/smoke suite against staging.
- [ ] Verify all security behavior against real Render configuration.

### Database and operations — CRITICAL
- [x] Versioned migrations through the current EMR/password-reset schema.
- [ ] Execute all migrations against a dedicated staging Neon database.
- [ ] Separate staging and production database credentials.
- [ ] Prove backup and restore with a staging restore test.
- [ ] Verify migration rollback/recovery procedure.

### Doctor EMR — CRITICAL
- [x] Patient detail/timeline workspace
- [x] Clinical consultation workspace
- [x] Structured clinical notes
- [x] Prescription creation/versioning and patient access API
- [x] Follow-up create/edit/complete and reminder queue
- [x] Patient document ownership APIs already present in the portal/backend; final doctor-side regression remains
- [x] Notifications API and audit-log API
- [x] Operational analytics
- [x] Audit-log viewer API/UI in Clinical EMR
- [ ] Real staging validation of every clinical write/read path

### Patient portal — HIGH
- [x] Existing appointment, document and notification portal foundation
- [x] Clinical records API
- [x] Patient follow-up API
- [x] Patient cancellation API
- [ ] Complete patient-facing prescription/clinical-record presentation regression
- [ ] Server-driven Join Consultation UI wired to the new join endpoint
- [ ] Realtime reconnect + API reconciliation test in staging

### Telehealth/Jitsi — CRITICAL
- [x] Deterministic room generation path
- [x] Server-authorized doctor join
- [x] Server-authorized patient join
- [x] Consultation in-progress/completed persistence
- [x] Rejoin/reconciliation API path
- [ ] Two real browser sessions in staging entering the same room
- [ ] Camera/microphone permission regression test
- [ ] Screenshot/video evidence archive from the staging run

### Blog CMS — MEDIUM
- [x] Doctor-only create/edit/delete foundation
- [x] Draft/published status
- [x] Public article pages
- [x] Nine supplied articles seeded
- [ ] Server-side SEO metadata validation and cover-image storage
- [ ] Public article regression against the real staging database
- [ ] Doctor-only authorization regression

### Public website — HIGH
- [x] Blog route and navigation
- [x] Favicon/brand asset path
- [x] Privacy, Terms and Telemedicine Consent
- [x] Cancellation/Refund Policy page
- [ ] Canonical domain/metadata verification on production domain
- [ ] Accessibility smoke tests
- [ ] Desktop/tablet/mobile browser regression evidence

### Notifications — HIGH
- [x] Central database-backed notification primitives
- [x] Doctor new-booking notification hook
- [x] Patient appointment notification hook
- [x] Consultation/follow-up notification primitives
- [x] Follow-up reminder processor endpoint
- [ ] Deploy/configure a scheduler to call the reminder processor
- [ ] Configure and verify email delivery/failure handling
- [ ] Configure WhatsApp API provider if required; current dashboard button remains a WhatsApp deep link

### QA / automation — CRITICAL
- [x] Selenium test scaffold with screenshot evidence path
- [x] Appointment transition invariant tests
- [x] Static security audit
- [x] Security contract check
- [x] EMR contract check
- [x] Clinical EMR Selenium coverage
- [ ] API authorization tests executed against staging
- [ ] Cross-patient access tests executed against staging
- [ ] Full booking → dashboard → confirmation → Jitsi E2E
- [ ] Doctor EMR write/read E2E with real data
- [ ] Patient portal E2E with real data
- [ ] Blog publish regression in staging
- [ ] Two-browser Jitsi E2E
- [ ] Mobile browser smoke suite
- [ ] Accessibility smoke suite
- [ ] Release screenshot/test report generated from the real staging run

### CI/CD and operations — CRITICAL
- [x] Quality gate exists
- [x] Security audit exists
- [x] Security contract check exists
- [x] Migration validation exists
- [x] EMR contract validation exists
- [ ] Make CI checks required before merge on the repository
- [ ] Add staging deployment gate
- [ ] Add production deployment gate
- [x] Health/readiness endpoints exist
- [ ] Runtime monitoring/error tracking
- [ ] Rollback verification
- [ ] Real Render/Neon/Vercel environment verification

### Payment — intentionally deferred
- [ ] Gateway integration
- [ ] Webhook verification
- [ ] Payment/refund ledger
- [ ] Confirmation gated on verified payment

## Release rule

Do not label the product **production ready** until every CRITICAL item is implemented and the staging E2E suite passes with evidence. Payment remains excluded from this gate until the core platform is stable.
