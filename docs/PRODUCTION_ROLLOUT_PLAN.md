# Production Rollout Plan

## Phase 1 — Security
- Strict CORS from `CORS_ORIGINS`
- Remove credential fallback/bootstrap from runtime
- Rate-limit authentication and booking mutations
- Central request validation
- Record ownership authorization
- Reset-token storage/delivery without logging secrets
- Audit events

## Phase 2 — Data
- Versioned migrations
- Foreign keys/indexes/constraints
- Booking duplication protection
- Backup/restore runbook
- Separate staging DB

## Phase 3 — EMR
- Appointment action card and server state transitions
- Patient timeline
- Consultation workspace
- Clinical notes
- Prescription lifecycle
- Follow-up lifecycle/reminders
- Document ownership/access
- Notifications
- Analytics
- Audit viewer

## Phase 4 — Patient
- Status timeline
- Cancellation/rebooking rules
- Prescription/documents/follow-ups
- Server-driven consultation join
- Reconnect reconciliation

## Phase 5 — Telehealth
- Server-generated room IDs
- Doctor/patient join state
- Consultation in-progress/completed state
- Reconnect/rejoin
- Two-browser staging evidence

## Phase 6 — CMS/public website
- Blog drafts/publishing/SEO
- Cover-image upload
- Public regression tests
- SEO/accessibility/consent/legal pages
- Responsive browser regression

## Phase 7 — QA/operations
- API/auth/state tests
- Full E2E/Selenium evidence
- Mobile/accessibility smoke tests
- CI required checks
- Staging gate
- Health endpoint
- Monitoring/rollback/changelog

## Phase 8 — Deferred payment
- Cashfree sandbox only after core release gate passes
- Server-side order creation
- Webhook verification
- Ledger/reconciliation
- Confirm only after verified payment

## Release rule
No production merge until every CRITICAL item in `AGENCY_COMPLETION_MATRIX.md` is implemented and staging E2E evidence is attached.
