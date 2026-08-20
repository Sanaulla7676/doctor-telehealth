# QA Matrix

| Area | Scenario | Expected | Evidence |
|---|---|---|---|
| Public | Home loads | No console/runtime blocker | Screenshot + CI |
| Public | Navigation | Every primary nav route resolves | Screenshot |
| Public | Booking validation | Invalid input blocked | E2E |
| Patient | Register | Account + patient profile created | DB/API test |
| Patient | Login | Portal loads with correct account | E2E |
| Patient | Appointment list | Only own appointments shown | API authorization test |
| Doctor | Login | Valid doctor enters EMR | E2E |
| Doctor | Patient list | Existing records load | API/E2E |
| Doctor | Appointment card | Correct patient/service/status data | E2E |
| Appointment | Accept | Server persists allowed state | API test |
| Appointment | Reject | Server persists rejection | API test |
| Appointment | Confirm | Only eligible appointment can confirm | API test |
| Realtime | Appointment update | Patient/doctor receive event | Integration test |
| Video | Room ready | Same deterministic room identifier | E2E staging |
| Video | Join gating | Premature join blocked | E2E |
| Clinical | Notes | Authorized doctor can save notes | API/E2E |
| Clinical | Prescription | Authorized doctor can issue; patient can view | API/E2E |
| Follow-up | Create | Follow-up linked to patient + consultation | API test |
| Documents | Upload | Authenticated ownership enforced | API test |
| Blogs | Create/edit/delete/publish | Doctor-only CMS | E2E |
| Notifications | State change | Correct target receives notification | Integration |
| Security | Missing token | 401 | API |
| Security | Wrong role | 403 | API |
| Security | Cross-patient record access | Denied | API |
| Security | Wildcard CORS | Not allowed in production | Static/config review |
| Recovery | Socket reconnect | Client reconciles from API | Integration |
| Deployment | Build | Production build succeeds | CI |
| Deployment | Runtime | Staging smoke test succeeds | Deployment evidence |
