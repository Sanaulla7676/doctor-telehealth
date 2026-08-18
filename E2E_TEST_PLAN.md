# Selenium E2E Test Plan

## Required environment

```text
E2E_BASE_URL=https://your-deployed-domain
E2E_DOCTOR_EMAIL=<doctor account>
E2E_DOCTOR_PASSWORD=<doctor account>
E2E_EVIDENCE_DIR=tests/evidence
```

Run:

```bash
cd tests/e2e
pip install -r requirements.txt
pytest test_telehealth.py -v --html=report.html --self-contained-html
```

## Critical journeys

| ID | Journey | Expected result | Evidence |
|---|---|---|---|
| WEB-001 | Open public homepage | Home renders without fatal error | screenshot |
| WEB-002 | Open Blogs from navigation | `/blogs/` renders | screenshot |
| DOC-001 | Doctor login | React EMR loads | screenshot |
| DOC-002 | Open every primary sidebar section | Overview, appointments, patients, follow-ups, documents and Blog Studio render | screenshot per section |
| CMS-001 | Create article | Article persists through API | screenshot |
| CMS-002 | Public reflection | Newly published article appears on `/blogs/` | screenshot |
| CMS-003 | Edit article | Updated content persists | screenshot |
| CMS-004 | Delete article | Article disappears from manager/public listing | screenshot |
| BOOK-001 | Reach consultation form | Booking section renders | screenshot |
| BOOK-002 | Patient authentication prerequisite | Unauthenticated booking redirects to patient auth rather than silently creating a booking | screenshot |
| BOOK-003 | Authenticated booking | Appointment appears in doctor appointments | screenshot + DB/API assertion |
| VIDEO-001 | Doctor confirms appointment | Appointment transitions to Confirmed/READY | screenshot + API assertion |
| VIDEO-002 | Patient receives meeting state | Patient UI exposes Join Consultation | screenshot |
| VIDEO-003 | Video room loads | Jitsi/provider iframe appears | screenshot |
| DOCS-001 | Patient uploads document | Doctor receives document record | screenshot + API assertion |
| FOLLOW-001 | Create follow-up | Follow-up and reminder stages persist | screenshot + API assertion |

## Evidence rule

A screenshot is evidence only when captured by the Selenium run against a running environment. Repository code, mocked pages, or manually created images are not test proof.

## Known external dependency

The video test must run with the configured Jitsi/provider service available. Camera/microphone permissions can be stubbed for browser automation, but the test must still assert that the meeting iframe/room is created and visible.
