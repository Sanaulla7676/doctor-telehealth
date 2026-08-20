# Dr Varsha Telehealth — Product Standards

## Product target

A production-grade digital clinic platform with a premium public website, patient portal, doctor EMR, teleconsultation, clinical records, follow-ups, notifications, content management, analytics, and auditable operational workflows.

## Current architecture

- Next.js + React + TypeScript frontend
- Express + Node.js backend
- PostgreSQL / Neon data layer
- Socket.IO realtime events
- Jitsi teleconsultation
- Vercel frontend deployment
- Render backend deployment

## Product modules

1. Public website and conversion funnel
2. Patient authentication and portal
3. Appointment lifecycle
4. Doctor EMR and patient timeline
5. Consultation workspace
6. Prescriptions and clinical notes
7. Follow-up management and reminders
8. Document management
9. Notifications
10. Blog/CMS
11. Analytics
12. Audit trail
13. Security and access control
14. Operations and configuration

## Appointment state machine

BOOKING_REQUESTED -> PENDING -> ACCEPTED | REJECTED
ACCEPTED -> PAYMENT_PENDING -> PAID
PAID -> CONFIRMED -> ROOM_READY -> CONSULTATION_IN_PROGRESS -> COMPLETED
Any eligible state may transition to CANCELLED or NO_SHOW according to policy.

Every transition must be server-authorized, persisted, emitted through realtime events, and visible to the correct role.

## Non-negotiable security rules

- No production credential defaults in source code.
- Secrets only in platform environment variables.
- No wildcard CORS in production.
- All doctor and patient APIs require role-appropriate authentication.
- Patient records must be scoped to the authenticated patient account.
- Sensitive actions require server-side authorization, never UI-only guards.
- Payment state may only be set to Paid from verified gateway evidence.
- Clinical and account mutations must be auditable.

## Release definition

A production release is only considered ready after:

- frontend build passes
- backend syntax validation passes
- API contract checks pass
- authenticated doctor workflow passes
- authenticated patient workflow passes
- appointment lifecycle passes
- realtime update tests pass
- teleconsultation join flow passes in staging
- accessibility smoke checks pass
- no critical security findings remain
- staging deployment is verified
- production deployment is verified and rollback is available

## Explicitly not production-ready until verified

- Payment gateway, when enabled
- Real Render/Neon integration without staging credentials
- Real Jitsi two-party browser session
- WhatsApp delivery beyond opening a chat link
- Email delivery
- Push notifications
