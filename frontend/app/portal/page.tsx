"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { User, Calendar, Bell, LogOut, Video, CheckCircle, Clock, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PortalPage() {
  const router = useRouter();
  const { isLoggedIn, token, logout, loading: authLoading } = useAuth();
  const socket = useSocket();

  const [activeTab, setActiveTab] = useState<"profile" | "appointments" | "notifications">("appointments");
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit profile states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Video call state — stores the room name of the active call
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Route protection
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/auth?tab=login");
    }
  }, [authLoading, isLoggedIn]);

  // Load dashboard data
  useEffect(() => {
    if (!isLoggedIn || !token) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [profileRes, appointmentsRes, notificationsRes] = await Promise.all([
          fetch("/api/patient/profile", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/patient/appointments", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/patient/notifications", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const profileData = await profileRes.json();
        if (profileData.success) {
          setProfile(profileData.profile);
          setFullName(profileData.profile.full_name || "");
          setPhone(profileData.profile.phone || "");
          setEmail(profileData.profile.email || "");
        }

        const appointmentsData = await appointmentsRes.json();
        if (appointmentsData.success) {
          setAppointments(appointmentsData.appointments);
        }

        const notificationsData = await notificationsRes.json();
        if (notificationsData.success) {
          setNotifications(notificationsData.notifications);
        }
      } catch (err) {
        console.error("Error loading portal data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isLoggedIn, token]);

  // Listen for real-time socket updates
  useEffect(() => {
    if (!socket || !isLoggedIn) return;

    socket.on("appointment_updated", (updatedApp: any) => {
      // Merge partial update into existing appointment — preserves all fields
      setAppointments(prev =>
        prev.map(app =>
          app.id === updatedApp.id ? { ...app, ...updatedApp } : app
        )
      );

      // When doctor marks READY, scroll to that specific card
      if (updatedApp.meeting_status === "READY") {
        setTimeout(() => {
          const el = document.getElementById(`appt-card-${updatedApp.id}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    });

    socket.on("new_notification", (notif: any) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => {
      socket.off("appointment_updated");
      socket.off("new_notification");
    };
  }, [socket, isLoggedIn]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await fetch("/api/patient/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: fullName, phone, email }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Profile updated successfully!");
        setProfile(data.profile);
      } else {
        alert("Update failed: " + data.error);
      }
    } catch {
      alert("Error updating profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch("/api/patient/notifications/mark-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * Get the unique room name for an appointment.
   * Priority: video_room (set by doctor) → videoRoom → fallback TelehealthRoom-{id}
   */
  const getRoomName = (app: any): string => {
    return app.video_room || app.videoRoom || `TelehealthRoom-${app.id}`;
  };

  /**
   * Join a video call by opening an iframe with meet.jit.si.
   * This approach works without any external API script — the camera
   * permission popup appears as normal in the browser.
   */
  const joinVideoCall = (roomName: string) => {
    setActiveRoom(roomName);
    // Give React time to render the iframe container before scrolling
    setTimeout(() => {
      const el = document.getElementById("video-call-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const closeVideoCall = () => {
    setActiveRoom(null);
  };

  /**
   * Open the video call in a new tab as fallback (full Jitsi experience)
   */
  const openInNewTab = (roomName: string) => {
    window.open(`https://meet.jit.si/${roomName}`, "_blank");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans text-xs font-bold uppercase tracking-wider text-luxMuted">
        Loading patient portal...
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const readyAppointments = appointments.filter(
    a => a.status === "Confirmed" && (a.meeting_status === "READY" || a.meeting_status === "ready")
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans">

      {/* Welcome Banner */}
      <div className="bg-luxDark rounded-[28px] p-8 md:p-12 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 shadow-sm">
        <div>
          <span className="text-xs uppercase tracking-widest text-luxAccent font-extrabold block">
            Telehealth Dashboard
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold font-serif tracking-tight mt-1">
            Welcome, {profile?.full_name || "Patient"}
          </h1>
          <p className="text-xs text-gray-300 mt-1 max-w-md leading-relaxed">
            Consult your clinical notes, join virtual video rooms, and schedule check-ups.
          </p>
        </div>
        <button
          onClick={logout}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Left Nav Tabs */}
        <div className="lg:col-span-1 space-y-2 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => { setActiveTab("appointments"); closeVideoCall(); }}
            className={`w-full text-left px-5 py-4 rounded-2xl border transition duration-300 flex items-center gap-3 cursor-pointer ${
              activeTab === "appointments"
                ? "bg-luxDark text-white border-luxDark"
                : "bg-white text-luxMuted border-black/[0.04] hover:bg-gray-50"
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Appointments</span>
          </button>

          <button
            onClick={() => { setActiveTab("profile"); closeVideoCall(); }}
            className={`w-full text-left px-5 py-4 rounded-2xl border transition duration-300 flex items-center gap-3 cursor-pointer ${
              activeTab === "profile"
                ? "bg-luxDark text-white border-luxDark"
                : "bg-white text-luxMuted border-black/[0.04] hover:bg-gray-50"
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => { setActiveTab("notifications"); closeVideoCall(); }}
            className={`w-full text-left px-5 py-4 rounded-2xl border transition duration-300 flex items-center justify-between cursor-pointer ${
              activeTab === "notifications"
                ? "bg-luxDark text-white border-luxDark"
                : "bg-white text-luxMuted border-black/[0.04] hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 shrink-0" />
              <span>Notifications</span>
            </div>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-3 space-y-6">

          {/* ─── APPOINTMENTS TAB ─── */}
          {activeTab === "appointments" && (
            <div className="space-y-6">

              {/* ── Doctor READY alert banner (one per ready appointment) ── */}
              {readyAppointments.length > 0 && !activeRoom && (
                <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-4 space-y-3">
                  {readyAppointments.map(readyAppt => (
                    <div key={readyAppt.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="relative flex h-3 w-3 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-green-800 uppercase tracking-wider truncate">
                            Doctor is Ready — {readyAppt.reason}
                          </p>
                          <p className="text-[10px] text-green-700">
                            Room: {getRoomName(readyAppt)} — Click JOIN NOW on the card below ↓
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => joinVideoCall(getRoomName(readyAppt))}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition shrink-0"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Now
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Active Video Call Frame (iframe — camera works natively) ── */}
              {activeRoom && (
                <div id="video-call-section" className="border-2 border-luxAccent/30 rounded-2xl p-4 bg-luxBg">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-[10px] text-luxAccent font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        Video Room Active
                      </p>
                      <p className="text-[9px] text-luxMuted mt-0.5 font-mono">
                        Room: {activeRoom}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openInNewTab(activeRoom)}
                        title="Open in new tab for full experience"
                        className="text-[10px] bg-luxDark text-white px-3 py-1.5 rounded-full font-bold uppercase cursor-pointer flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Full
                      </button>
                      <button
                        onClick={closeVideoCall}
                        className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-full font-bold uppercase cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Leave Room
                      </button>
                    </div>
                  </div>

                  {/* 
                    ✅ IFRAME approach — no external API script needed.
                    Camera/mic permission popup works natively.
                    allow="camera; microphone; display-capture" is required.
                  */}
                  <iframe
                    ref={iframeRef}
                    src={`https://meet.jit.si/${activeRoom}#userInfo.displayName="${encodeURIComponent(profile?.full_name || "Patient")}"`}
                    allow="camera; microphone; display-capture; autoplay; clipboard-write"
                    allowFullScreen
                    className="w-full rounded-xl bg-black shadow-inner"
                    style={{ height: "480px", border: "none" }}
                    title="Video Consultation"
                  />
                  <p className="text-[9px] text-luxMuted mt-2 text-center">
                    Allow camera &amp; microphone when your browser asks. Use "Open Full" for the best experience.
                  </p>
                </div>
              )}

              {/* ── Appointments List ── */}
              <div className="bg-white border border-black/[0.04] p-8 rounded-[28px] shadow-sm space-y-6">
                <h3 className="text-xl font-extrabold text-luxDark font-serif italic border-b pb-3 flex items-center justify-between">
                  <span>Your Appointments</span>
                  <span className="text-xs font-sans not-italic text-luxMuted font-normal">
                    Total: {appointments.length}
                  </span>
                </h3>

                {appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((app) => {
                      const isReady =
                        app.status === "Confirmed" &&
                        (app.meeting_status === "READY" || app.meeting_status === "ready");
                      const isEnded = app.meeting_status === "ENDED" || app.meeting_status === "ended";
                      const isPending = app.status === "Pending";
                      const isConfirmed = app.status === "Confirmed";
                      const roomId = getRoomName(app);

                      return (
                        <div
                          key={app.id}
                          id={`appt-card-${app.id}`}
                          className={cn(
                            "border p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition duration-300",
                            isReady
                              ? "border-green-400 bg-green-50/60 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                              : isEnded
                              ? "border-black/[0.03] bg-gray-50/50"
                              : "border-black/[0.04] hover:bg-gray-50"
                          )}
                        >
                          {/* Left: Appointment Info */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                  isConfirmed
                                    ? "bg-green-100 text-green-700"
                                    : app.status === "Cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {app.status}
                              </span>
                              <span className="text-[9px] text-luxMuted font-mono">
                                ID: {app.id}
                              </span>
                            </div>

                            <h4 className="font-extrabold text-luxDark text-sm">
                              Case: {app.reason}
                            </h4>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-luxMuted">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> {app.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {app.time}
                              </span>
                            </div>

                            {/* Show room ID for transparency */}
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[9px] text-luxMuted font-mono bg-black/[0.03] px-2 py-0.5 rounded-full truncate max-w-[220px]">
                                Room: {roomId}
                              </span>
                            </div>
                          </div>

                          {/* Right: Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isEnded ? (
                              <span className="text-[10px] text-luxMuted bg-gray-100 px-3 py-1.5 rounded-full">
                                Call Finished
                              </span>
                            ) : (
                              <>
                                {/* Each card has its OWN unique join button */}
                                {(isPending || isConfirmed) && (
                                  <button
                                    onClick={() => joinVideoCall(roomId)}
                                    className={cn(
                                      "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 cursor-pointer",
                                      isReady
                                        ? "bg-green-600 hover:bg-green-700 text-white shadow-[0_0_24px_rgba(34,197,94,0.55)]"
                                        : "border border-black/[0.1] text-luxDark bg-white hover:bg-gray-50 shadow-sm"
                                    )}
                                  >
                                    {isReady && (
                                      <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                                      </span>
                                    )}
                                    <Video className="w-4 h-4" />
                                    <span>{isReady ? "JOIN NOW" : "JOIN CONSULTATION"}</span>
                                  </button>
                                )}

                                {/* Open-in-tab fallback */}
                                {(isPending || isConfirmed) && (
                                  <button
                                    onClick={() => openInNewTab(roomId)}
                                    title="Open in new tab"
                                    className="border border-black/[0.06] text-luxMuted bg-white hover:bg-gray-50 px-2.5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Doctor Confirmed badge */}
                                {isConfirmed && !isReady && (
                                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Confirmed
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-luxMuted text-xs">
                    No appointments registered yet. Schedule a consultation using the form on the homepage.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── PROFILE TAB ─── */}
          {activeTab === "profile" && (
            <div className="bg-white border border-black/[0.04] p-8 rounded-[28px] shadow-sm">
              <h3 className="text-xl font-extrabold text-luxDark font-serif italic border-b pb-3 mb-6">
                Profile Information
              </h3>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="bg-luxDark hover:bg-luxMuted text-white font-bold px-6 py-3.5 rounded-xl uppercase text-[10px] tracking-wider transition disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingProfile ? "Saving..." : "Save Profile Changes"}
                </button>
              </form>
            </div>
          )}

          {/* ─── NOTIFICATIONS TAB ─── */}
          {activeTab === "notifications" && (
            <div className="bg-white border border-black/[0.04] p-8 rounded-[28px] shadow-sm space-y-6">
              <h3 className="text-xl font-extrabold text-luxDark font-serif italic border-b pb-3 flex items-center justify-between">
                <span>Activity Center</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[9px] bg-luxBg text-luxAccent px-3 py-1 rounded-full font-bold uppercase hover:bg-luxDark hover:text-white transition cursor-pointer border border-black/[0.03]"
                  >
                    Mark all read
                  </button>
                )}
              </h3>

              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`border p-4 rounded-xl flex items-start gap-4 transition duration-300 ${
                        notif.is_read
                          ? "bg-white border-black/[0.03]"
                          : "bg-emerald-50/40 border-luxAccent/20"
                      }`}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                          notif.is_read ? "bg-luxMuted/30" : "bg-luxAccent"
                        }`}
                      />
                      <div className="space-y-1">
                        <p className="text-xs text-luxDark leading-relaxed">{notif.message}</p>
                        <span className="block text-[9px] text-luxMuted">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-luxMuted text-xs">
                  No notifications recorded.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
