# Dr Varsha Telehealth — Agency Completion Matrix

This is the release gate. A feature is **COMPLETE** only when implementation exists, server authorization is enforced, automated tests cover the critical path, and staging evidence exists.

## Completed in the agency branch

- [x] Next.js/React/TypeScript frontend foundation
- [x] Express/Node.js backend foundation
- [x] PostgreSQL/Neon integration
- [x] Doctor authentication foundation
- [x] Patient authentication foundation
- [x] Appointment persistence foundation
- [x] Patient directory and patient appointment APIs
- [x] Blog Studio create/edit/delete foundation
- [x] Socket.IO realtime foundation
- [x] Jitsi integration foundation
- [x] Appointment state-machine specification and invariants
- [x] Versioned migration runner and schema hardening migration
- [x] Migration validation in CI
- [x] Security bootstrap with production CORS allowlist
- [x] Deployment-managed doctor provisioning
- [x] Request-size controls
- [x] Authentication/booking rate limits
- [x] Password-reset token logging removed
- [x] Health and database-readiness endpoints
- [x] Server-authorized appointment Accept/Reject/Confirm/Start/Complete actions
- [x] Doctor appointment UI with Accept/Reject/WhatsApp/Confirm/Join Video controls
- [x] React doctor dashboard responsive shell
- [x] Public privacy, terms and telemedicine-consent pages
- [x] Agency architecture/release/QA documentation
- [x] Vercel preview deployment for the agency branch

## Still pending before production

### Security and authorization — CRITICAL
- [ ] Complete ownership enforcement for every doctor/patient/clinical/document endpoint.
- [ ] Replace temporary in-memory rate limiter with a production distributed limiter if multiple backend instances are used.
- [ ] Implement a real password-reset token store and delivery channel.
- [ ] Complete audit event writes and audit-log UI for all sensitive mutations.
- [ ] Verify security behavior against staging with real Render configuration.

### Database and operations — CRITICAL
- [x] Versioned migrations in repository.
- [x] Index/foreign-key hardening migration.
- [ ] Execute migrations against a dedicated staging Neon database.
- [ ] Separate staging and production database credentials.
- [ ] Prove backup and restore with a staging restore test.

### Doctor EMR — CRITICAL
- [x] Appointment action controls and server action endpoint.
- [x] Patient directory and search shell.
- [ ] Patient detail/timeline workspace.
- [ ] Clinical consultation workspace.
- [ ] Structured clinical notes.
- [ ] Prescription creation/versioning and patient access.
- [ ] Follow-up create/edit/complete and reminder queue.
- [ ] Patient-owned document upload/download/delete.
- [ ] Notifications center.
- [ ] Operational analytics.
- [ ] Audit-log viewer.

### Patient portal — HIGH
- [ ] Full appointment status timeline.
- [ ] Cancellation/rebooking rules.
- [ ] Notification read-state UI.
- [ ] Prescription and document access UI.
- [ ] Follow-up visibility.
- [ ] Server-driven Join Consultation state.
- [ ] Realtime reconnect + API reconciliation.

### Telehealth/Jitsi — CRITICAL
- [x] Deterministic room generation path.
- [x] Server-authorized room start path.
- [ ] Doctor joined state.
- [ ] Patient joined state.
- [ ] Consultation in-progress/completed lifecycle persistence.
- [ ] Reconnect/rejoin reconciliation.
- [ ] Two real browser sessions in staging entering the same room.
- [ ] Screenshot/video evidence archive.

### Blog CMS — MEDIUM
- [x] Doctor-only create/edit/delete foundation.
- [x] Draft/published status field.
- [ ] Server-validated slug/SEO metadata.
- [ ] Cover image upload storage.
- [ ] Public article regression with actual published content.
- [ ] Doctor-only authorization regression.

### Public website — HIGH
- [x] Blog route and navigation.
- [x] Favicon/brand asset path.
- [x] Privacy, terms, telemedicine consent.
- [ ] Final cancellation/refund policy.
- [ ] Canonical domain/metadata verification on production domain.
- [ ] Accessibility smoke tests.
- [ ] Desktop/tablet/mobile browser regression evidence.

### Notifications — HIGH
- [ ] Central event notification service.
- [ ] Doctor new-booking notification.
- [ ] Patient appointment state notification.
- [ ] Consultation-ready notification.
- [ ] Follow-up reminders.
- [ ] Email delivery and failure handling.
- [ ] WhatsApp API integration when an approved provider is configured.

### QA / automation — CRITICAL
- [x] Selenium test scaffold with screenshot evidence path.
- [x] Appointment transition unit/invariant tests.
- [x] Security static audit.
- [ ] API authorization tests.
- [ ] Cross-patient access tests.
- [ ] Full booking → dashboard lifecycle E2E.
- [ ] Doctor EMR E2E.
- [ ] Patient portal E2E.
- [ ] Blog publish regression in staging.
- [ ] Two-browser Jitsi E2E.
- [ ] Mobile browser smoke suite.
- [ ] Accessibility smoke suite.
- [ ] Release screenshot/test report generated from a real staging run.

### CI/CD and operations — CRITICAL
- [x] Quality gate exists.
- [x] Security audit exists.
- [x] Migration validation exists.
- [ ] Make CI checks required before merge on the repository.
- [ ] Add staging deployment gate.
- [ ] Add production deployment gate.
- [x] Health/readiness endpoints exist.
- [ ] Runtime monitoring/error tracking.
- [ ] Rollback verification.
- [ ] Real Render/Neon/Vercel environment verification.

### Payment — intentionally deferred
- [ ] Gateway integration.
- [ ] Webhook verification.
- [ ] Payment/refund ledger.
- [ ] Confirmation gated on verified payment.

## Release rule

Do not label the product **production ready** until every CRITICAL item is implemented and the staging E2E suite passes with evidence. Payment remains excluded from this gate until the core platform is stable.
