"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Phone, MapPin, CheckCircle, Video, Landmark, Calendar, Clock, User, FileText, Check } from "lucide-react";
import { siteConfig } from "@/data/site";

declare const JitsiMeetExternalAPI: any;

export default function BookingSection() {
  const socket = useSocket();

  const [mode, setMode] = useState<"clinic" | "video">("clinic");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState(""); // empty = none selected, button stays disabled
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [myAppointmentId, setMyAppointmentId] = useState<string | null>(null);
  const [videoActive, setVideoActive] = useState(false);

  // Restore pending booking if returned from auth redirect
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingBooking");
    if (pending) {
      try {
        const booking = JSON.parse(pending);
        setMode(booking.mode);
        setDate(booking.date);
        setTime(booking.time);
        setName(booking.name);
        setPhone(booking.phone);
        setEmail(booking.email);
        setReason(booking.reason);
        sessionStorage.removeItem("pendingBooking");
      } catch (e) {
        console.error("Error restoring pending booking", e);
      }
    }
  }, []);

  // Socket confirmation listener
  useEffect(() => {
    if (!socket || !myAppointmentId) return;

    socket.on("appointment_updated", (appointment: any) => {
      if (appointment.id === myAppointmentId) {
        if (appointment.status === "Confirmed" && appointment.videoRoom) {
          setVideoActive(true);
          startVideoCall(appointment.videoRoom);
        }
      }
    });

    return () => {
      socket.off("appointment_updated");
    };
  }, [socket, myAppointmentId]);

  const startVideoCall = (roomName: string) => {
    // Clear previous instances
    const jitsiContainer = document.querySelector("#jitsi-patient-meet");
    if (jitsiContainer) jitsiContainer.innerHTML = "";

    if (typeof JitsiMeetExternalAPI !== "undefined") {
      const domain = "meet.element.io";
      new JitsiMeetExternalAPI(domain, {
        roomName: roomName,
        width: "100%",
        height: "100%",
        parentNode: jitsiContainer,
        interfaceConfigOverwrite: { TILE_VIEW_MAX_COLUMNS: 2 }
      });
    }
  };

  const formatTime12Hour = (timeString: string) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    let h = parseInt(hours);
    const m = minutes;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    const formattedHours = h < 10 ? "0" + h : h;
    return `${formattedHours}:${m} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem("patientToken");
    const patientAccountId = localStorage.getItem("patientAccountId");

    if (!token) {
      // Save current state to session storage
      const pendingBooking = {
        mode,
        date,
        time,
        name,
        phone,
        email,
        reason
      };
      sessionStorage.setItem("pendingBooking", JSON.stringify(pendingBooking));
      window.location.href = "/auth?tab=login&redirect=booking";
      return;
    }

    if (mode === "video" && !consent) {
      alert("Please acknowledge and check the Telemedicine Consent Form to proceed with virtual video consultation.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name,
      email,
      phone,
      date,
      time: formatTime12Hour(time),
      reason,
      patient_account_id: patientAccountId
    };

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        setMyAppointmentId(data.appointment.id);
        setBookingSuccess(true);
      } else {
        alert("Booking failed: " + data.error);
      }
    } catch (err) {
      console.error("Error booking appointment:", err);
      alert("Network error booking appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setBookingSuccess(false);
    setVideoActive(false);
    setMyAppointmentId(null);
    setDate("");
    setTime("");
    setName("");
    setPhone("");
    setEmail("");
    setReason("");
    setConsent(false);
  };

  return (
    <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-black/[0.04] relative">
      <div className="text-center mb-16">
        <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest block">
          Appointment Booking
        </span>
        <h2 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">
          Book Consultation
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 relative z-10 font-sans">
        
        {/* Contact details */}
        <div className="lg:w-1/2 space-y-8">
          <h3 className="text-2xl font-extrabold text-luxDark font-serif">
            Plan your path to gentle healing
          </h3>
          <p className="text-xs text-luxMuted leading-relaxed">
            Whether you are scheduling an initial in-depth constitutional consultation or seeking ongoing acute disease support, our clinical specialists are here to assist. Select your preference between in-person visits and private video calls.
          </p>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-white border border-black/[0.04] shadow-sm p-3 rounded-xl">
                <Phone className="text-luxDark w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-luxDark text-sm">Clinical Helpline</h4>
                <a href={`tel:${siteConfig.phone.replace(/\s+/g, '')}`} className="text-xs text-luxMuted hover:text-luxDark transition">
                  {siteConfig.phone}
                </a>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-white border border-black/[0.04] shadow-sm p-3 rounded-xl">
                <MapPin className="text-luxDark w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-luxDark text-sm">Aether Clinic Location</h4>
                <p className="text-xs text-luxMuted leading-relaxed">
                  {siteConfig.address}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="lg:w-1/2 bg-white border border-black/[0.04] p-8 rounded-[28px] shadow-sm relative overflow-hidden min-h-[450px]">
          
          {/* SUCCESS SCREEN */}
          {bookingSuccess ? (
            <div className="absolute inset-0 bg-[#F4F6F4] z-50 flex flex-col items-center justify-center text-center p-8 overflow-y-auto">
              <div className="w-16 h-16 bg-white border border-black/[0.04] rounded-full flex items-center justify-center shadow-sm text-luxAccent text-2xl mb-4">
                <Check className="w-8 h-8 text-luxAccent" />
              </div>
              <h3 className="text-2xl font-extrabold text-luxDark font-serif">
                Consultation Booked
              </h3>
              <p className="text-xs text-luxMuted mt-2 max-w-sm">
                Your reservation has been processed successfully. Our coordination desk will call shortly to verify details.
              </p>
              
              <div className="mt-4 bg-white border border-black/[0.04] p-4 rounded-xl text-left w-full text-xs text-luxDark space-y-2 shadow-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-luxMuted">Visit Mode:</span>
                  <span className="font-bold">{mode === "clinic" ? "In-Clinic Visit" : "Video Consultation"}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-luxMuted">Date:</span>
                  <span className="font-bold">{date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-luxMuted">Scheduled Time:</span>
                  <span className="font-bold">{formatTime12Hour(time)}</span>
                </div>
              </div>

              {/* EMBEDDED JITSI VIDEO MEETING (AUTO-LOADS INSTANTLY ON CONFIRM) */}
              {videoActive && (
                <div id="videoContainer" className="mt-6 w-full border border-luxAccent/20 rounded-2xl p-4 bg-white/50 backdrop-blur-md shadow-sm">
                  <p className="text-[10px] text-luxAccent font-bold uppercase tracking-widest mb-2 flex items-center justify-center">
                    <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></span>
                    Live Video Consultation Active
                  </p>
                  <div id="jitsi-patient-meet" className="w-full h-[250px] rounded-xl overflow-hidden bg-black shadow-inner"></div>
                </div>
              )}

              <button
                onClick={resetForm}
                className="mt-8 premium-btn px-6 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                <span>Book another slot</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="font-extrabold text-luxDark text-base mb-2">
                Request A Wellness Consultation
              </h3>

              {/* Step 1: Mode */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-luxMuted mb-2">
                  1. Select Consultation Mode
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setMode("clinic")}
                    className={`border-2 p-4 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-start bg-white shadow-sm ${
                      mode === "clinic" ? "border-luxDark" : "border-transparent bg-gray-50"
                    }`}
                  >
                    <Landmark className={`w-5 h-5 mb-2 ${mode === "clinic" ? "text-luxDark" : "text-luxMuted"}`} />
                    <h4 className="font-bold text-xs text-luxDark">In-Clinic Visit</h4>
                    <p className="text-[9px] text-luxMuted mt-1 leading-normal">
                      In-person holistic treatment at our serene Gangavathi clinic.
                    </p>
                  </div>
                  
                  <div
                    onClick={() => setMode("video")}
                    className={`border-2 p-4 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-start bg-white shadow-sm ${
                      mode === "video" ? "border-luxDark" : "border-transparent bg-gray-50"
                    }`}
                  >
                    <Video className={`w-5 h-5 mb-2 ${mode === "video" ? "text-luxDark" : "text-luxMuted"}`} />
                    <h4 className="font-bold text-xs text-luxDark">Video Consultation</h4>
                    <p className="text-[9px] text-luxMuted mt-1 leading-normal">
                      Secure high-definition video evaluation from your home.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Date & Time */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-luxMuted mb-2">
                  2. Choose Date & Time
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-semibold text-luxMuted mb-1">Select Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none focus:border-luxDark focus:ring-1 focus:ring-luxDark"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[9px] font-semibold text-luxMuted mb-1">Select Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none focus:border-luxDark focus:ring-1 focus:ring-luxDark"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Patient Info */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-luxMuted mb-2">
                  3. Patient Profile Details
                </label>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-semibold text-luxMuted mb-1">Your Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none focus:border-luxDark"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[9px] font-semibold text-luxMuted mb-1">WhatsApp Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91XXXXXXXXXX"
                        className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-semibold text-luxMuted mb-1">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none"
                        required
                      />
                    </div>
                    
                  </div>

                  {/* Service Selection Cards — mandatory */}
                  <div>
                    <label className="block text-[9px] font-semibold text-luxMuted mb-2 uppercase tracking-wider">
                      Select Service <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: "homeo", name: "Homoeopathic Consultation", price: "₹800", desc: "Classical constitutional remedy evaluation & prescription" },
                        { id: "nutrition", name: "Nutrition Consultation / Diet Plan", price: "₹5,000", desc: "Personalised clinical nutrition & therapeutic diet planning" },
                        { id: "counseling", name: "Counselling", price: "₹3,000", desc: "Mind-body emotional wellness & stress resolution sessions" },
                      ].map((service) => (
                        <div
                          key={service.id}
                          onClick={() => setSpecialty(service.name)}
                          className={`relative flex items-center justify-between gap-4 border-2 rounded-xl px-4 py-3.5 cursor-pointer transition-all duration-200 ${
                            specialty === service.name
                              ? "border-luxDark bg-luxDark text-white shadow-md"
                              : "border-black/[0.08] bg-[#F5F5F7] hover:border-luxDark/40 hover:bg-white"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold leading-tight ${ specialty === service.name ? "text-white" : "text-luxDark" }`}>
                              {service.name}
                            </p>
                            <p className={`text-[9px] mt-0.5 leading-relaxed ${ specialty === service.name ? "text-white/70" : "text-luxMuted" }`}>
                              {service.desc}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-sm font-extrabold font-serif ${ specialty === service.name ? "text-white" : "text-luxDark" }`}>
                              {service.price}
                            </span>
                            {specialty === service.name && (
                              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                                <CheckCircle className="w-3.5 h-3.5 text-luxDark" />
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {!specialty && (
                      <p className="text-[9px] text-red-400 mt-1.5 font-medium">Please select a service to continue</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-semibold text-luxMuted mb-1">Active Symptoms / Case Brief</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="Describe symptoms, duration, prior medication..."
                      className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Telemedicine Consent (Dynamic) */}
              {mode === "video" && (
                <div className="border border-black/[0.06] rounded-xl p-4 bg-[#F5F5F7] space-y-3 transition-all duration-500">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-luxMuted mb-1">
                    4. Telemedicine &amp; Research Consent
                  </label>

                  {/* Scrollable consent body */}
                  <div className="h-32 overflow-y-auto text-[9px] text-luxMuted leading-relaxed border-b border-black/[0.05] pb-2 space-y-2 pr-1">
                    <p className="font-bold text-luxDark text-[10px]">Telemedicine Consultation Agreement</p>
                    <p>By checking the box below, you acknowledge and agree to the following terms regarding virtual/telemedicine consultation with Homeopathway Clinic:</p>
                    <p>1. Tele-homeopathy is a supportive model used for consulting and evaluating constitutional patterns. It does not replace emergency medical interventions or acute critical surgical evaluations.</p>
                    <p>2. The remedies recommended are prepared through standard homoeopathic dilutions according to HPI standards, aimed at gentle systemic support.</p>
                    <p>3. You agree that information provided is fully accurate, and understand that remote assessments rely strictly on self-declared clinical reports.</p>

                    {/* Research consent — highlighted */}
                    <div className="mt-3 pt-3 border-t border-luxAccent/20 space-y-1.5">
                      <p className="font-bold text-luxAccent text-[10px] uppercase tracking-wide">📋 Research &amp; Publication Consent (Video Consultation)</p>
                      <p className="bg-luxAccent/10 border border-luxAccent/20 rounded-lg px-2 py-1.5 text-[9px] leading-relaxed">
                        All personal identifiers will be <strong>removed or coded</strong> to ensure confidentiality.
                      </p>
                      <p className="bg-luxAccent/10 border border-luxAccent/20 rounded-lg px-2 py-1.5 text-[9px] leading-relaxed">
                        Clinical information and treatment outcomes may be <strong>analysed for academic and research purposes</strong>.
                      </p>
                      <p className="bg-luxAccent/10 border border-luxAccent/20 rounded-lg px-2 py-1.5 text-[9px] leading-relaxed">
                        Participation is <strong>voluntary</strong> and consent may be <strong>withdrawn at any time</strong>.
                      </p>
                      <p className="bg-luxAccent/10 border border-luxAccent/20 rounded-lg px-2 py-1.5 text-[9px] leading-relaxed">
                        The study aims to contribute to <strong>scientific knowledge and improve future patient care</strong>.
                      </p>
                      <p className="bg-luxAccent/10 border border-luxAccent/20 rounded-lg px-2 py-1.5 text-[9px] leading-relaxed">
                        Further information may be requested from the <strong>researcher at any time</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Telemedicine consent checkbox */}
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="checkbox-consent"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5"
                      required
                    />
                    <label htmlFor="checkbox-consent" className="text-[9px] text-luxMuted leading-normal">
                      I have read the tele-homoeopathy guidelines and agree to the virtual consultation policy.
                    </label>
                  </div>

                  {/* Research consent checkbox */}
                  <div className="flex items-start space-x-2 bg-luxAccent/5 border border-luxAccent/20 rounded-xl p-2.5">
                    <input
                      type="checkbox"
                      id="checkbox-research"
                      className="mt-0.5 w-3.5 h-3.5 accent-[#708264]"
                    />
                    <label htmlFor="checkbox-research" className="text-[9px] text-luxDark leading-normal font-medium">
                      I consent to the use of my anonymized medical information for research and publication.
                    </label>
                  </div>
                </div>
              )}

              {/* Price summary shown when service is selected */}
              {specialty && (
                <div className="bg-luxDark/5 border border-luxDark/10 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-luxMuted uppercase tracking-wider font-bold">Selected Service</p>
                    <p className="text-xs font-bold text-luxDark mt-0.5">{specialty}</p>
                  </div>
                  <span className="text-lg font-extrabold text-luxDark font-serif">
                    {specialty === "Homoeopathic Consultation" && "₹800"}
                    {specialty === "Nutrition Consultation / Diet Plan" && "₹5,000"}
                    {specialty === "Counselling" && "₹3,000"}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !specialty}
                className="w-full bg-luxDark text-white hover:bg-luxMuted font-bold py-4 rounded-xl transition duration-300 uppercase text-[10px] tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Confirming..." : specialty ? `Book Consultation Now` : "Select a Service to Continue"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
