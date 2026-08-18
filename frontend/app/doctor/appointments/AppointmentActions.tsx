"use client";

import { MessageCircle, Check, XCircle, Video, ThumbsUp } from "lucide-react";

type Appointment = {
  id: string;
  name: string;
  phone?: string;
  service_name?: string;
  consultation_fee?: number;
  status?: string;
  payment_status?: string;
  consultation_status?: string;
  meeting_status?: string;
  videoRoom?: string;
  video_room?: string;
};

type Props = {
  appointment: Appointment;
  onUpdated: (appointment: Appointment) => void;
  request: (path: string, options?: RequestInit) => Promise<any>;
};

const roomFor = (a: Appointment) => a.video_room || a.videoRoom || `Homeopathway-${a.id}`;

export default function AppointmentActions({ appointment, onUpdated, request }: Props) {
  const openWhatsApp = () => {
    const phone = (appointment.phone || "").replace(/\D/g, "");
    if (!phone) return;
    const message = `Hello ${appointment.name}, regarding your ${appointment.service_name || "consultation"} with Dr. Varsha Bandi, please complete the consultation payment of ₹${appointment.consultation_fee || 800} to confirm your appointment. Once payment is completed, please reply here.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    void request(`/api/appointments/${appointment.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "Pending Payment", consultation_status: "Payment Request Sent" }),
    }).then((d) => onUpdated(d.appointment)).catch(() => undefined);
  };

  const updateStatus = async (status: string, consultation_status?: string) => {
    const d = await request(`/api/appointments/${appointment.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, consultation_status }),
    });
    onUpdated(d.appointment);
  };

  const confirm = async () => {
    const d = await request(`/api/appointments/${appointment.id}/status`, {
      method: "PUT",
      body: JSON.stringify({
        status: "Confirmed",
        consultation_status: "Doctor Accepted Your Consultation",
        meeting_status: "READY",
      }),
    });
    onUpdated(d.appointment);
  };

  const join = async () => {
    const roomName = roomFor(appointment);
    try {
      const d = await request("/api/meeting/start", {
        method: "POST",
        body: JSON.stringify({ appointmentId: appointment.id, roomName }),
      });
      onUpdated(d.appointment || { ...appointment, status: "Confirmed", meeting_status: "READY", video_room: roomName, videoRoom: roomName, consultation_status: "Doctor Joined Video Consultation" });
    } catch {
      // Still allow joining the deterministic Jitsi room if the persistence call fails.
    }
    window.open(`https://meet.jit.si/${encodeURIComponent(roomName)}`, "_blank", "noopener,noreferrer");
  };

  const ready = appointment.status === "Confirmed" && ["READY", "ready"].includes(appointment.meeting_status || "");

  return (
    <div className="flex flex-wrap gap-2 mt-4" data-testid={`appointment-actions-${appointment.id}`}>
      <button onClick={() => void updateStatus("Accepted", "Doctor Accepted Your Consultation")} disabled={appointment.status === "Confirmed"} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1c251d] text-white px-3 py-2 text-[11px] font-bold disabled:opacity-40" data-testid="appointment-accept"><ThumbsUp className="w-3.5 h-3.5"/> Accept</button>
      <button onClick={() => void updateStatus("Rejected", "Doctor Rejected Your Consultation")} disabled={appointment.status === "Confirmed"} className="inline-flex items-center gap-1.5 rounded-xl bg-white text-red-700 border border-red-200 px-3 py-2 text-[11px] font-bold disabled:opacity-40" data-testid="appointment-reject"><XCircle className="w-3.5 h-3.5"/> Reject</button>
      <button onClick={openWhatsApp} disabled={!appointment.phone} className="inline-flex items-center gap-1.5 rounded-xl bg-[#e9f7ee] text-[#176b3b] border border-[#b9e1c7] px-3 py-2 text-[11px] font-bold disabled:opacity-40" data-testid="appointment-whatsapp"><MessageCircle className="w-3.5 h-3.5"/> WhatsApp</button>
      <button onClick={confirm} disabled={appointment.status === "Confirmed" || appointment.status === "Rejected"} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1c251d] text-white px-3 py-2 text-[11px] font-bold disabled:opacity-50" data-testid="appointment-confirm"><Check className="w-3.5 h-3.5"/> Confirm</button>
      <button onClick={() => void join()} disabled={!ready} className="inline-flex items-center gap-1.5 rounded-xl bg-white text-[#1c251d] border border-black/10 px-3 py-2 text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed" data-testid="appointment-join-video"><Video className="w-3.5 h-3.5"/> Join Video</button>
    </div>
  );
}
