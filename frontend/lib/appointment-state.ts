export type AppointmentStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Payment Pending"
  | "Paid"
  | "Confirmed"
  | "Cancelled"
  | "No Show"
  | "Completed";

export type MeetingStatus = "PENDING" | "READY" | "IN_PROGRESS" | "COMPLETED";

const allowed: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  Pending: ["Accepted", "Rejected", "Cancelled"],
  Accepted: ["Payment Pending", "Cancelled"],
  Rejected: [],
  "Payment Pending": ["Paid", "Cancelled"],
  Paid: ["Confirmed", "Cancelled"],
  Confirmed: ["Completed", "No Show"],
  Cancelled: [],
  "No Show": [],
  Completed: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus) {
  return allowed[from].includes(to);
}

export function assertTransition(from: AppointmentStatus, to: AppointmentStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid appointment transition: ${from} -> ${to}`);
  }
}

export function canDoctorConfirm(status: AppointmentStatus, paymentStatus: string | undefined) {
  return status === "Paid" && paymentStatus === "Paid";
}

export function canCreateMeeting(status: AppointmentStatus, meetingStatus: MeetingStatus) {
  return status === "Confirmed" && meetingStatus === "PENDING";
}

export function canPatientJoin(status: AppointmentStatus, meetingStatus: MeetingStatus) {
  return status === "Confirmed" && (meetingStatus === "READY" || meetingStatus === "IN_PROGRESS");
}
