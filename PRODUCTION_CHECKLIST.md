# Production Readiness Checklist

## A. Public product

- [ ] Home page, About, Services, Consultation, Blog, Contact
- [ ] Responsive layouts at mobile/tablet/desktop breakpoints
- [ ] Accessible keyboard navigation and visible focus states
- [ ] Metadata, sitemap, robots, canonical URLs, Open Graph
- [ ] Error, loading and empty states
- [ ] Privacy, terms, telemedicine consent and cancellation policy

## B. Patient

- [ ] Secure registration/login/logout
- [ ] Profile management
- [ ] Appointment creation and history
- [ ] Appointment status timeline
- [ ] Notifications
- [ ] Medical documents
- [ ] Prescription access
- [ ] Follow-up visibility
- [ ] Consultation join state

## C. Doctor EMR

- [ ] Secure doctor authentication
- [ ] Overview dashboard
- [ ] Appointment action cards
- [ ] Patient directory and search
- [ ] Patient timeline
- [ ] Clinical notes
- [ ] Prescription workflow
- [ ] Follow-ups
- [ ] Documents
- [ ] Notifications
- [ ] Blog Studio
- [ ] Analytics
- [ ] Audit log

## D. Realtime and telehealth

- [ ] Socket.IO connection/reconnect handling
- [ ] Appointment state broadcast
- [ ] Payment state broadcast when payment is enabled
- [ ] Deterministic Jitsi room generation
- [ ] Doctor join gating
- [ ] Patient join gating
- [ ] Consultation completion state
- [ ] Graceful reconnect behavior

## E. Security

- [ ] Strong JWT secret in deployment environment
- [ ] No hard-coded credential fallback
- [ ] Production CORS allowlist
- [ ] Request body limits by endpoint
- [ ] Rate limits on auth and booking endpoints
- [ ] Server-side RBAC and record ownership checks
- [ ] Validation for every public mutation
- [ ] Audit logging for clinical mutations
- [ ] No sensitive tokens in logs
- [ ] Secure file/document access

## F. Data

- [ ] Versioned migrations
- [ ] Explicit foreign keys and indexes
- [ ] Appointment uniqueness/business constraints
- [ ] Safe startup without full-table data rewrites
- [ ] Backup and restore procedure
- [ ] Staging database separated from production

## G. QA

- [ ] Static checks
- [ ] Type checks
- [ ] Backend syntax checks
- [ ] API tests
- [ ] Frontend smoke tests
- [ ] Doctor E2E
- [ ] Patient E2E
- [ ] Appointment lifecycle E2E
- [ ] Realtime lifecycle E2E
- [ ] Jitsi staging E2E
- [ ] Accessibility smoke suite
- [ ] Mobile browser smoke suite

## H. Delivery

- [ ] CI required on pull requests
- [ ] Staging deployment before production
- [ ] Production deployment with rollback
- [ ] Runtime health checks
- [ ] Error monitoring
- [ ] Deployment changelog
- [ ] Release approval checklist
