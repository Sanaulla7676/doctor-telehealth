# Dr Varsha Telehealth — Agency Completion Matrix

This document is the release gate for the production transformation. A feature is **COMPLETE** only when its implementation exists, server authorization is enforced, automated tests cover the critical path, and staging evidence exists.

## Current status

### COMPLETE / VERIFIED IN CODE
- [x] Next.js/React/TypeScript frontend foundation
- [x] Express/Node.js backend foundation
- [x] PostgreSQL/Neon data layer integration
- [x] Doctor authentication foundation
- [x] Patient authentication foundation
- [x] Appointment persistence foundation
- [x] Patient directory API foundation
- [x] Patient appointment/notification APIs
- [x] Blog Studio create/edit/delete foundation
- [x] Socket.IO realtime foundation
- [x] Jitsi room integration foundation
- [x] Production architecture documentation
- [x] Appointment state-machine specification
- [x] Production checklist and QA matrix
- [x] Vercel preview deployment for agency branch
- [x] Repository hygiene workflow definition

## PENDING IMPLEMENTATION

### 1. Security and authorization — CRITICAL
- [ ] Replace wildcard production CORS with an allowlist from `CORS_ORIGINS`.
- [ ] Remove hard-coded/default doctor credentials from runtime code.
- [ ] Move first-doctor provisioning behind an explicit one-time bootstrap/migration.
- [ ] Add rate limiting to doctor login, patient login, password reset, and booking mutations.
- [ ] Add centralized request validation for every public mutation.
- [ ] Enforce doctor role/ownership on every doctor mutation.
- [ ] Enforce patient record ownership on every patient read/write.
- [ ] Prevent cross-patient appointment/document/clinical-record access.
- [ ] Stop logging password-reset tokens; implement real reset-token storage and delivery.
- [ ] Add audit events for authentication, appointments, clinical notes, prescriptions, documents, and blog publishing.

### 2. Database and migrations — CRITICAL
- [ ] Replace startup `CREATE TABLE/ALTER TABLE` migrations with versioned migrations.
- [ ] Add indexes for appointment/date, patient account, patient, follow-up, notifications, and blog queries.
- [ ] Add explicit foreign keys for all ownership relationships.
- [ ] Add business constraints for appointment status transitions.
- [ ] Add unique/duplication protection for appointment booking where policy requires it.
- [ ] Define production backup/restore procedure.
- [ ] Separate staging and production databases.

### 3. Doctor EMR — CRITICAL
- [ ] Upgrade appointment cards with Accept/Reject/WhatsApp/Confirm/Join Video state-aware controls.
- [ ] Enforce those actions server-side, not only in the UI.
- [ ] Patient detail workspace with timeline.
- [ ] Clinical consultation workspace.
- [ ] Structured clinical notes.
- [ ] Prescription creation/versioning.
- [ ] Patient prescription view/download.
- [ ] Follow-up creation/edit/cancel/complete.
- [ ] Follow-up reminder queue.
- [ ] Document upload/list/download/delete with patient ownership.
- [ ] Notifications center.
- [ ] Operational analytics.
- [ ] Audit log viewer.

### 4. Patient portal — HIGH
- [ ] Complete appointment status timeline.
- [ ] Appointment cancellation/rebooking rules.
- [ ] Notifications center and read state.
- [ ] Prescription access.
- [ ] Document access.
- [ ] Follow-up visibility.
- [ ] Server-driven Join Consultation state.
- [ ] Realtime reconnect + API reconciliation.

### 5. Telehealth/Jitsi — CRITICAL
- [ ] Server-generated deterministic room identifiers.
- [ ] Prevent joining before server room readiness.
- [ ] Doctor join state.
- [ ] Patient join state.
- [ ] Consultation in-progress state.
- [ ] Consultation completed state.
- [ ] Reconnect/rejoin reconciliation.
- [ ] Staging test with two real browser sessions entering the same room.
- [ ] Screenshot/video evidence of the full consultation lifecycle.

### 6. Blog CMS — MEDIUM
- [ ] Draft state.
- [ ] Publish/unpublish.
- [ ] Slug validation.
- [ ] SEO title/meta description.
- [ ] Cover image upload rather than URL-only entry.
- [ ] Public article regression test.
- [ ] Doctor-only authorization test.

### 7. Public website — HIGH
- [ ] Verify all navigation routes on desktop/tablet/mobile.
- [ ] Verify About content and doctor experience text.
- [ ] Verify favicon/brand assets everywhere.
- [ ] SEO metadata, sitemap, robots, canonical URLs and Open Graph.
- [ ] Accessibility smoke testing.
- [ ] Loading/empty/error states.
- [ ] Privacy policy, terms, telemedicine consent, cancellation/refund policy.
- [ ] Real-world browser regression at target breakpoints.

### 8. Notifications — HIGH
- [ ] Central event/notification service.
- [ ] Doctor new-booking notification.
- [ ] Patient appointment update notification.
- [ ] Consultation-ready notification.
- [ ] Follow-up reminders.
- [ ] Email delivery integration and failure handling.
- [ ] WhatsApp delivery beyond click-to-chat where an approved provider is configured.
- [ ] Push notifications if/when mobile channel is enabled.

### 9. QA and automation — CRITICAL
- [ ] Unit/API tests for state transitions.
- [ ] Authentication/authorization tests.
- [ ] Cross-patient access tests.
- [ ] Appointment lifecycle E2E.
- [ ] Doctor EMR E2E.
- [ ] Patient portal E2E.
- [ ] Blog CMS E2E.
- [ ] Jitsi two-browser E2E in staging.
- [ ] Mobile browser smoke suite.
- [ ] Accessibility smoke suite.
- [ ] Screenshot evidence archive.
- [ ] Automated test report generated per release.

### 10. CI/CD and operations — CRITICAL
- [ ] Make CI required on PRs before merge.
- [ ] Add staging deployment gate.
- [ ] Add production deployment gate.
- [ ] Add health endpoint and smoke check.
- [ ] Add runtime error monitoring.
- [ ] Add deployment rollback procedure.
- [ ] Add release changelog.
- [ ] Verify Render/Neon/Vercel environment variables in staging.
- [ ] Run real staging smoke tests before production.

### 11. Payment — intentionally deferred
- [ ] Cashfree/selected gateway sandbox integration.
- [ ] Server-side order creation.
- [ ] Webhook signature verification.
- [ ] Amount reconciliation.
- [ ] Payment/refund ledger.
- [ ] Appointment confirmation gated on verified payment.

Payment remains out of the current release until the underlying platform is stable.

## Release rule

The system must not be labeled **production ready** until every CRITICAL item above is complete and the staging E2E suite passes with evidence.
