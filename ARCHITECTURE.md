# Homeopathway Production Architecture

```mermaid
flowchart TB
  U[Patient / Browser] --> CDN[HTTPS + CDN / Vercel or Render]
  D[Doctor / React EMR] --> CDN
  CDN --> WEB[Next.js static React application]
  WEB --> API[Express API]
  WEB --> WS[Socket.IO]
  API --> AUTH[JWT + bcrypt authentication]
  API --> DB[(PostgreSQL / Neon)]
  API --> CMS[(Blog CMS tables)]
  API --> DOCS[Document storage adapter]
  API --> VIDEO[Jitsi / Video provider]
  WS --> API
  A[Android Clinical EMR] --> API
  A --> WS
  API --> NOTIFY[Patient + Doctor notifications]

  subgraph Public Website
    WEB
    BLOGS[/blogs/]
    BOOK[Consultation booking]
  end
  subgraph Doctor Workspace
    DASH[/doctor/ React EMR]
    CMSUI[Blog Studio]
    PAT[Patients]
    APPT[Appointments]
    FOLLOW[Follow-ups]
    DOC[Documents]
  end
  WEB --> BLOGS
  WEB --> BOOK
  DASH --> CMSUI
  DASH --> PAT
  DASH --> APPT
  DASH --> FOLLOW
  DASH --> DOC
```

## Application boundaries

- **Next.js + React** owns public pages and the new doctor workspace UI.
- **Express** remains the API and realtime boundary while legacy EMR endpoints are migrated incrementally.
- **PostgreSQL/Neon** remains the system of record for patients, appointments, clinical notes, follow-ups and blog metadata/content.
- **Socket.IO** handles realtime appointment and consultation state changes.
- **Video provider** remains isolated behind meeting APIs so the UI is not coupled to provider internals.
- **Selenium** validates critical user journeys against a running deployment.

## Migration rule

Do not rewrite working clinical workflows just to make the code look newer. Migrate one domain at a time behind stable API contracts, with E2E coverage before removing the legacy implementation.
