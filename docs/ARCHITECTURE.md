# Dr Varsha Telehealth — Production Architecture

```mermaid
flowchart TB
  P[Patient Browser] --> V[Next.js Website / Patient Portal]
  D[Doctor Browser] --> E[React Doctor EMR]
  V -->|HTTPS| API[Express API on Render]
  E -->|HTTPS| API
  V <-->|Socket.IO| API
  E <-->|Socket.IO| API
  API --> DB[(Neon PostgreSQL)]
  API --> J[Jitsi Consultation]
  API --> FS[Document / Media Storage]
  API --> N[Notification Services]
  API --> C[Content / Blog CMS]
  API --> A[Audit Log]
  V --> SEO[SEO / Analytics]
```

## Logical layers

### Presentation
- Next.js public website
- Patient portal
- Doctor clinical workspace
- Responsive design system

### Application
- Authentication
- Appointment orchestration
- Patient management
- Consultation orchestration
- Clinical documentation
- Prescriptions
- Follow-ups
- Documents
- Notifications
- CMS
- Analytics

### Data
- PostgreSQL / Neon
- Transactional appointment data
- Patient and account records
- Clinical records
- Notification records
- CMS data
- Audit records

### Realtime

Socket.IO is used only for state-change signals. Source-of-truth data always remains in PostgreSQL and clients must refresh or reconcile after reconnect.

### External services

- Vercel: frontend delivery
- Render: backend runtime
- Neon: relational database
- Jitsi: video consultation
- Future payment gateway: payment order + webhook verification
- Future email/WhatsApp/push: notification delivery

## Deployment

```mermaid
flowchart LR
  G[GitHub main] --> CI[CI Quality Gate]
  CI --> S[Staging]
  S --> QA[Automated + Manual QA]
  QA --> PROD[Production]
  PROD --> RB[Rollback]
```

Production is not considered released until CI, staging checks, and smoke tests succeed.
