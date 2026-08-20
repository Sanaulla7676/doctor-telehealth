"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Phone, MapPin, CheckCircle, Video, Landmark, Calendar, Clock, User, FileText, Check, CreditCard } from "lucide-react";
import { siteConfig } from "@/data/site";
import { getApiUrl } from "@/lib/utils";

declare const Cashfree: any;
declare const JitsiMeetExternalAPI: any;

export default function BookingSection() {
  const socket = useSocket();
  const [mode, setMode] = useState<"clinic" | "video">("clinic");
  const [date, setDate] = useState(""); const [time, setTime] = useState("");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState(""); const [reason, setReason] = useState(""); const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); const [bookingSuccess, setBookingSuccess] = useState(false);
  const [myAppointmentId, setMyAppointmentId] = useState<string | null>(null); const [videoActive, setVideoActive] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false); const [paymentPaid, setPaymentPaid] = useState(false); const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const pending = sessionStorage.getItem("pendingBooking");
    if (pending) { try { const booking = JSON.parse(pending); setMode(booking.mode); setDate(booking.date); setTime(booking.time); setName(booking.name); setPhone(booking.phone); setEmail(booking.email); setReason(booking.reason); setSpecialty(booking.specialty || ""); sessionStorage.removeItem("pendingBooking"); } catch (e) { console.error("Error restoring pending booking", e); } }
  }, []);

  useEffect(() => {
    if (!socket || !myAppointmentId) return;
    const onUpdate = (appointment: any) => {
      if (appointment.id !== myAppointmentId) return;
      if (appointment.payment_status === "Paid") { setPaymentPaid(true); setPaymentPending(false); }
      if (appointment.status === "Confirmed" && appointment.videoRoom) { setVideoActive(true); startVideoCall(appointment.videoRoom); }
    };
    socket.on("appointment_updated", onUpdate);
    return () => { socket.off("appointment_updated", onUpdate); };
  }, [socket, myAppointmentId]);

  const startVideoCall = (roomName: string) => {
    const jitsiContainer = document.querySelector("#jitsi-patient-meet"); if (jitsiContainer) jitsiContainer.innerHTML = "";
    if (typeof JitsiMeetExternalAPI !== "undefined") new JitsiMeetExternalAPI("meet.jit.si", { roomName, width: "100%", height: "100%", parentNode: jitsiContainer, interfaceConfigOverwrite: { TILE_VIEW_MAX_COLUMNS: 2 } });
  };

  const formatTime12Hour = (timeString: string) => { if (!timeString) return ""; const [hours, minutes] = timeString.split(":"); let h = parseInt(hours); const ampm = h >= 12 ? "PM" : "AM"; h = h % 12; h = h || 12; return `${h < 10 ? "0" + h : h}:${minutes} ${ampm}`; };

  const beginPayment = async (appointmentId: string) => {
    setPaymentError(""); setPaymentPending(true);
    try {
      const token = localStorage.getItem("patientToken");
      const response = await fetch(getApiUrl("/api/payments/create-order"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ appointmentId }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to create payment order.");
      if (typeof Cashfree === "undefined") throw new Error("Payment checkout is temporarily unavailable.");
      const cashfree = Cashfree({ mode: data.environment === "production" ? "production" : "sandbox" });
      await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_modal" });
      const verifyResponse = await fetch(getApiUrl("/api/payments/verify"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ appointmentId, orderId: data.orderId }) });
      const verify = await verifyResponse.json();
      if (verify.paid) setPaymentPaid(true); else setPaymentPending(false);
      if (!verify.paid) setPaymentError("Payment is not yet marked successful. Please complete the checkout.");
    } catch (error: any) {
      setPaymentPending(false); setPaymentError(error.message || "Payment could not be started.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("patientToken"); const patientAccountId = localStorage.getItem("patientAccountId");
    if (!token) { sessionStorage.setItem("pendingBooking", JSON.stringify({ mode, date, time, name, phone, email, reason, specialty })); window.location.href = "/auth?tab=login&redirect=booking"; return; }
    if (mode === "video" && !consent) { alert("Please acknowledge and check the Telemedicine Consent Form to proceed with virtual video consultation."); return; }
    setIsSubmitting(true);
    const serviceFeeMap: Record<string, number> = { "Homoeopathic Consultation": 800, "Nutrition Consultation / Diet Plan": 5000, "Counselling": 3000 };
    const payload = { name, email, phone, date, time: formatTime12Hour(time), reason, patient_account_id: patientAccountId, service_name: specialty, consultation_fee: serviceFeeMap[specialty] || 800 };
    try {
      const response = await fetch(getApiUrl("/api/appointments"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Booking failed.");
      setMyAppointmentId(data.appointment.id); setBookingSuccess(true); await beginPayment(data.appointment.id);
    } catch (err: any) { alert(err.message || "Network error booking appointment. Please try again."); } finally { setIsSubmitting(false); }
  };

  const resetForm = () => { setBookingSuccess(false); setVideoActive(false); setMyAppointmentId(null); setPaymentPending(false); setPaymentPaid(false); setPaymentError(""); setDate(""); setTime(""); setName(""); setPhone(""); setEmail(""); setSpecialty(""); setReason(""); setConsent(false); };

  return (
    <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-black/[0.04] relative">
      <div className="text-center mb-16"><span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest block">Appointment Booking</span><h2 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">Book Consultation</h2></div>
      <div className="flex flex-col lg:flex-row gap-12 relative z-10 font-sans">
        <div className="lg:w-1/2 space-y-8"><h3 className="text-2xl font-extrabold text-luxDark font-serif">Plan your path to gentle healing</h3><p className="text-xs text-luxMuted leading-relaxed">Whether you are scheduling an initial in-depth constitutional consultation or seeking ongoing acute disease support, our clinical specialists are here to assist. Select your preference between in-person visits and private video calls.</p><div className="space-y-6"><div className="flex items-start space-x-4"><div className="bg-white border border-black/[0.04] shadow-sm p-3 rounded-xl"><Phone className="text-luxDark w-5 h-5" /></div><div><h4 className="font-bold text-luxDark text-sm">Clinical Helpline</h4><a href={`tel:${siteConfig.phone.replace(/\s+/g, '')}`} className="text-xs text-luxMuted hover:text-luxDark transition">{siteConfig.phone}</a></div></div><div className="flex items-start space-x-4"><div className="bg-white border border-black/[0.04] shadow-sm p-3 rounded-xl"><MapPin className="text-luxDark w-5 h-5" /></div><div><h4 className="font-bold text-luxDark text-sm">Aether Clinic Location</h4><p className="text-xs text-luxMuted leading-relaxed">{siteConfig.address}</p></div></div></div></div>
        <div className="lg:w-1/2 bg-white border border-black/[0.04] p-8 rounded-[28px] shadow-sm relative overflow-hidden min-h-[450px]">
          {bookingSuccess ? (
            <div className="absolute inset-0 bg-[#F4F6F4] z-50 flex flex-col items-center justify-center text-center p-8 overflow-y-auto"><div className="w-16 h-16 bg-white border border-black/[0.04] rounded-full flex items-center justify-center shadow-sm text-luxAccent text-2xl mb-4"><Check className="w-8 h-8 text-luxAccent" /></div><h3 className="text-2xl font-extrabold text-luxDark font-serif">Consultation Booked</h3><p className="text-xs text-luxMuted mt-2 max-w-sm">Your reservation is saved. Complete the secure payment below. The doctor can confirm the appointment after the gateway reports a successful payment.</p>
              <div className="mt-4 bg-white border border-black/[0.04] p-4 rounded-xl text-left w-full text-xs text-luxDark space-y-2 shadow-sm"><div className="flex justify-between border-b pb-1"><span className="text-luxMuted">Visit Mode:</span><span className="font-bold">{mode === "clinic" ? "In-Clinic Visit" : "Video Consultation"}</span></div><div className="flex justify-between border-b pb-1"><span className="text-luxMuted">Date:</span><span className="font-bold">{date}</span></div><div className="flex justify-between border-b pb-1"><span className="text-luxMuted">Scheduled Time:</span><span className="font-bold">{formatTime12Hour(time)}</span></div><div className="flex justify-between"><span className="text-luxMuted">Payment:</span><span className={`font-bold ${paymentPaid ? "text-green-700" : "text-amber-700"}`}>{paymentPaid ? "Paid" : paymentPending ? "Processing" : "Pending"}</span></div></div>
              {paymentError && <div className="mt-3 w-full rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs p-3">{paymentError}</div>}
              {!paymentPaid && myAppointmentId && <button onClick={() => void beginPayment(myAppointmentId)} disabled={paymentPending} className="mt-4 w-full bg-[#1c251d] text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"><CreditCard className="w-4 h-4"/>{paymentPending ? "Opening secure checkout..." : "Pay Consultation Fee"}</button>}
              {videoActive && <div id="videoContainer" className="mt-6 w-full border border-luxAccent/20 rounded-2xl p-4 bg-white/50 backdrop-blur-md shadow-sm"><p className="text-[10px] text-luxAccent font-bold uppercase tracking-widest mb-2 flex items-center justify-center"><span className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></span>Live Video Consultation Active</p><div id="jitsi-patient-meet" className="w-full h-[250px] rounded-xl overflow-hidden bg-black shadow-inner"></div></div>}
              <button onClick={resetForm} className="mt-8 premium-btn px-6 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"><span>Book another slot</span></button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="font-extrabold text-luxDark text-base mb-2">Request A Wellness Consultation</h3>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-luxMuted mb-2">1. Select Consultation Mode</label><div className="grid grid-cols-2 gap-4"><div onClick={() => setMode("clinic")} className={`border-2 p-4 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-start bg-white shadow-sm ${mode === "clinic" ? "border-luxDark" : "border-transparent bg-gray-50"}`}><Landmark className={`w-5 h-5 mb-2 ${mode === "clinic" ? "text-luxDark" : "text-luxMuted"}`} /><h4 className="font-bold text-xs text-luxDark">In-Clinic Visit</h4><p className="text-[9px] text-luxMuted mt-1 leading-normal">In-person holistic treatment at our serene Gangavathi clinic.</p></div><div onClick={() => setMode("video")} className={`border-2 p-4 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-start bg-white shadow-sm ${mode === "video" ? "border-luxDark" : "border-transparent bg-gray-50"}`}><Video className={`w-5 h-5 mb-2 ${mode === "video" ? "text-luxDark" : "text-luxMuted"}`} /><h4 className="font-bold text-xs text-luxDark">Video Consultation</h4><p className="text-[9px] text-luxMuted mt-1 leading-normal">Secure high-definition video evaluation from your home.</p></div></div></div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-luxMuted mb-2">2. Choose Date & Time</label><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-[9px] font-semibold text-luxMuted mb-1">Select Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark" required/></div><div><label className="block text-[9px] font-semibold text-luxMuted mb-1">Select Time</label><input type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark" required/></div></div></div>
              <div><label className="block text-[10px] font-bold uppercase tracking-widest text-luxMuted mb-2">3. Patient Profile Details</label><div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-[9px] font-semibold text-luxMuted mb-1">Your Full Name</label><input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark" required/></div><div><label className="block text-[9px] font-semibold text-luxMuted mb-1">WhatsApp Number</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark" required/></div></div><div><label className="block text-[9px] font-semibold text-luxMuted mb-1">Email Address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark" required/></div><div><label className="block text-[9px] font-semibold text-luxMuted mb-1">Consultation Service</label><select value={specialty} onChange={e=>setSpecialty(e.target.value)} className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark" required><option value="">Select service</option><option value="Homoeopathic Consultation">Homoeopathic Consultation — ₹800</option><option value="Nutrition Consultation / Diet Plan">Nutrition Consultation / Diet Plan — ₹5000</option><option value="Counselling">Counselling — ₹3000</option></select></div><div><label className="block text-[9px] font-semibold text-luxMuted mb-1">Reason for Consultation</label><textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark" required/></div></div></div>
              {mode === "video" && <label className="flex gap-2 items-start text-[10px] text-luxMuted"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-0.5"/> I acknowledge the Telemedicine Consent Form and agree to proceed with a video consultation.</label>}
              <button type="submit" disabled={isSubmitting} className="w-full bg-luxDark text-white hover:bg-luxMuted font-bold py-3.5 rounded-xl transition uppercase text-[10px] tracking-wider disabled:opacity-50">{isSubmitting ? "Processing..." : "Book Consultation"}</button>
            </form>
          )}
        </div>
      </div>
      <script src="https://sdk.cashfree.com/js/v3/cashfree.js" async />
    </section>
  );
}
