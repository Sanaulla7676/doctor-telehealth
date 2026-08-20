# Appointment workflow

1. Patient submits a booking. `POST /api/appointments` stores the appointment in PostgreSQL, links/creates the patient profile, and emits `new_booking_notification` over Socket.IO.
2. Doctor dashboard loads the appointment and shows Accept, Reject, WhatsApp, Confirm, and Join Video controls.
3. WhatsApp opens a direct `wa.me` chat for the patient's stored phone number with the selected service and consultation-fee payment request. The booking is marked `Pending Payment` / `Payment Request Sent` without pretending payment was verified.
4. Doctor uses Confirm after payment is verified outside this app. The backend sets `status=Confirmed` and emits `appointment_updated`; the patient portal receives the event and can show the confirmed appointment state.
5. Doctor uses Join Video once the appointment is confirmed. `/api/meeting/start` creates/updates a deterministic Jitsi room (`Homeopathway-<appointmentId>`), stores `meeting_status=READY` and `video_room`, emits `appointment_updated`, and the doctor opens `https://meet.jit.si/<room>`.
6. The patient portal listens for `appointment_updated`. When the appointment is `Confirmed` and `meeting_status=READY`, the existing patient Join Consultation control becomes available for the same Jitsi room.

## Important limitation

WhatsApp is only an external payment-request channel here. This application does not verify UPI/bank payment automatically. The doctor remains the source of truth for payment confirmation before clicking Confirm.
