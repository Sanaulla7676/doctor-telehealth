"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import {
  User, Calendar, Bell, LogOut, Video, CheckCircle, Clock, X, ExternalLink,
  FileText, Upload, Pill, Stethoscope, CreditCard, AlertCircle, Download,
  ZoomIn, Activity, File, Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabType = "appointments" | "records" | "documents" | "notifications" | "profile";

export default function PortalPage() {
  const router = useRouter();
  const { isLoggedIn, token, logout, loading: authLoading } = useAuth();
  const socket = useSocket();

  const [activeTab, setActiveTab] = useState<TabType>("appointments");
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile edit states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Video call
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Document upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("Lab Report");
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; category: string; file_data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Green success flash for real-time updates
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  // Route protection
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/auth?tab=login");
    }
  }, [authLoading, isLoggedIn]);

  const loadData = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    setLoading(true);
    try {
      const [profileRes, appointmentsRes, notificationsRes, documentsRes] = await Promise.all([
        fetch("/api/patient/profile", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/patient/appointments", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/patient/notifications", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/patient/documents", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const profileData = await profileRes.json();
      if (profileData.success) {
        setProfile(profileData.profile);
        setFullName(profileData.profile.full_name || "");
        setPhone(profileData.profile.phone || "");
        setEmail(profileData.profile.email || "");
      }

      const appointmentsData = await appointmentsRes.json();
      if (appointmentsData.success) setAppointments(appointmentsData.appointments);

      const notificationsData = await notificationsRes.json();
      if (notificationsData.success) setNotifications(notificationsData.notifications);

      const documentsData = await documentsRes.json();
      if (documentsData.success) setDocuments(documentsData.documents);
    } catch (err) {
      console.error("Error loading portal data:", err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, token]);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket || !isLoggedIn) return;

    socket.on("appointment_updated", (updatedApp: any) => {
      setAppointments(prev =>
        prev.map(app => app.id === updatedApp.id ? { ...app, ...updatedApp } : app)
      );

      // Flash green notification for important status changes
      if (updatedApp.consultation_status === "Doctor Accepted Your Consultation") {
        setFlashMessage("✅ Doctor accepted your consultation! Payment confirmed.");
        setTimeout(() => setFlashMessage(null), 6000);
      } else if (updatedApp.consultation_status === "Doctor Joined Video Consultation") {
        setFlashMessage("📹 Doctor joined the video consultation! Click Join Now.");
        setTimeout(() => setFlashMessage(null), 10000);
      } else if (updatedApp.consultation_status === "Payment Request Sent") {
        setFlashMessage("💳 Payment request sent via WhatsApp. Please complete payment.");
        setTimeout(() => setFlashMessage(null), 8000);
      } else if (updatedApp.type === "notes_saved") {
        setFlashMessage("💊 New medical update! Your prescription and notes have been updated.");
        setTimeout(() => setFlashMessage(null), 8000);
        // Re-fetch appointments to get updated notes
        loadData();
      }

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

    socket.on("new_patient_document", () => {
      // Refresh documents list
      if (token) {
        fetch("/api/patient/documents", { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(d => { if (d.success) setDocuments(d.documents); });
      }
    });

    return () => {
      socket.off("appointment_updated");
      socket.off("new_notification");
      socket.off("new_patient_document");
    };
  }, [socket, isLoggedIn, token, loadData]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await fetch("/api/patient/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName, phone, email }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setFlashMessage("✅ Profile updated successfully!");
        setTimeout(() => setFlashMessage(null), 4000);
      } else alert("Update failed: " + data.error);
    } catch { alert("Error updating profile."); }
    finally { setIsUpdatingProfile(false); }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch("/api/patient/notifications/mark-read", {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, status: "Read" })));
    } catch (e) { console.error(e); }
  };

  const getRoomName = (app: any): string => app.video_room || app.videoRoom || `HomeopathwayRoom-${app.id}`;

  const joinVideoCall = (roomName: string) => {
    setActiveRoom(roomName);
    setActiveTab("appointments");
    setTimeout(() => {
      const el = document.getElementById("video-call-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const closeVideoCall = () => setActiveRoom(null);

  const openInNewTab = (roomName: string) => window.open(`https://meet.jit.si/${roomName}`, "_blank");

  // Document upload handler
  const handleUploadDocument = async () => {
    if (!uploadFile) { alert("Please select a file first."); return; }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string) || "";
        const sizeKB = Math.round(uploadFile.size / 1024);
        const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

        const res = await fetch("/api/patient/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: uploadFile.name,
            category: uploadCategory,
            size: sizeStr,
            file_data: base64,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setDocuments(prev => [data.document, ...prev]);
          setUploadFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          setFlashMessage("✅ Document uploaded successfully! Doctor can now view it in your Case Study.");
          setTimeout(() => setFlashMessage(null), 6000);
        } else alert("Upload failed: " + data.error);
        setIsUploading(false);
      };
      reader.readAsDataURL(uploadFile);
    } catch { setIsUploading(false); alert("Upload error."); }
  };

  // Preview document file data
  const previewDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/patient/documents/${docId}/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPreviewDoc(data.file);
    } catch { alert("Could not load preview."); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans text-xs font-bold uppercase tracking-wider text-luxMuted">
        Loading patient portal...
      </div>
    );
  }

  const unreadCount = notifications.filter(n => n.status === "Unread").length;
  const readyAppointments = appointments.filter(
    a => a.status === "Confirmed" && (a.meeting_status === "READY" || a.meeting_status === "ready")
  );
  const upcomingAppointments = appointments.filter(a => a.status !== "Cancelled" && a.status !== "Rejected");
  const pastAppointments = appointments.filter(a => a.status === "Cancelled" || a.status === "Rejected");

  const statusColor = (status: string) => {
    if (status === "Confirmed") return "bg-green-100 text-green-700";
    if (status === "WhatsApp Sent") return "bg-blue-100 text-blue-700";
    if (status === "Rejected" || status === "Cancelled") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  };

  const paymentColor = (status: string) => {
    if (status === "Paid") return "text-green-700 bg-green-50 border-green-200";
    if (status === "Payment Request Sent") return "text-blue-700 bg-blue-50 border-blue-200";
    return "text-amber-700 bg-amber-50 border-amber-200";
  };

  const getFileIcon = (name: string) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return <ImageIcon className="w-4 h-4 text-purple-500" />;
    if (/\.pdf$/i.test(name)) return <FileText className="w-4 h-4 text-red-500" />;
    if (/\.(doc|docx)$/i.test(name)) return <File className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans">

      {/* Flash Message Banner */}
      {flashMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] bg-green-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping inline-block" />
          {flashMessage}
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-luxDark rounded-[28px] p-8 md:p-12 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 shadow-sm">
        <div>
          <span className="text-xs uppercase tracking-widest text-luxAccent font-extrabold block">
            Homeopathway Medical Dashboard
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold font-serif tracking-tight mt-1">
            Welcome, {profile?.full_name || "Patient"}
          </h1>
          <p className="text-xs text-gray-300 mt-1 max-w-md leading-relaxed">
            View your appointments, prescriptions, medical records, and uploaded documents in real time.
          </p>
          <div className="flex gap-3 mt-4 flex-wrap">
            <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full font-semibold">📋 {appointments.length} Appointments</span>
            <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full font-semibold">📁 {documents.length} Documents</span>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-red-500/80 px-3 py-1 rounded-full font-semibold animate-pulse">🔔 {unreadCount} Unread</span>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Doctor Ready Alert Banner */}
      {readyAppointments.length > 0 && !activeRoom && (
        <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-5 mb-6 space-y-3">
          {readyAppointments.map(readyAppt => (
            <div key={readyAppt.id} className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <span className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-green-800 uppercase tracking-wider">
                    📹 Doctor Joined — Ready to Consult
                  </p>
                  <p className="text-[10px] text-green-700">{readyAppt.reason} — {readyAppt.date} at {readyAppt.time}</p>
                </div>
              </div>
              <button
                onClick={() => joinVideoCall(getRoomName(readyAppt))}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shadow-lg shadow-green-200"
              >
                <Video className="w-4 h-4" />
                Join Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Left Nav */}
        <div className="lg:col-span-1 space-y-2 text-xs font-bold uppercase tracking-wider">
          {([
            { id: "appointments", icon: <Calendar className="w-4 h-4 shrink-0" />, label: "Appointments" },
            { id: "records", icon: <Stethoscope className="w-4 h-4 shrink-0" />, label: "Medical Records" },
            { id: "documents", icon: <Upload className="w-4 h-4 shrink-0" />, label: "My Documents" },
            { id: "notifications", icon: <Bell className="w-4 h-4 shrink-0" />, label: "Notifications", badge: unreadCount },
            { id: "profile", icon: <User className="w-4 h-4 shrink-0" />, label: "Profile" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); if (tab.id !== "appointments") closeVideoCall(); }}
              className={`w-full text-left px-5 py-4 rounded-2xl border transition duration-300 flex items-center justify-between cursor-pointer ${
                activeTab === tab.id
                  ? "bg-luxDark text-white border-luxDark"
                  : "bg-white text-luxMuted border-black/[0.04] hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                {tab.icon}
                <span>{tab.label}</span>
              </div>
              {("badge" in tab) && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-3 space-y-6">

          {/* ─── APPOINTMENTS TAB ─── */}
          {activeTab === "appointments" && (
            <div className="space-y-6">

              {/* Embedded Video Call Frame */}
              {activeRoom && (
                <div id="video-call-section" className="border-2 border-luxAccent/30 rounded-2xl p-4 bg-luxBg">
                  <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                    <div>
                      <p className="text-[10px] text-luxAccent font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        Live Video Consultation
                      </p>
                      <p className="text-[9px] text-luxMuted mt-0.5 font-mono">Room: {activeRoom}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openInNewTab(activeRoom)}
                        className="text-[10px] bg-luxDark text-white px-3 py-1.5 rounded-full font-bold uppercase cursor-pointer flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />Open Full
                      </button>
                      <button
                        onClick={closeVideoCall}
                        className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-full font-bold uppercase cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />Leave
                      </button>
                    </div>
                  </div>
                  <iframe
                    ref={iframeRef}
                    src={`https://meet.jit.si/${activeRoom}#userInfo.displayName="${encodeURIComponent(profile?.full_name || "Patient")}"`}
                    allow="camera; microphone; display-capture; autoplay; clipboard-write"
                    allowFullScreen
                    className="w-full rounded-xl bg-black shadow-inner"
                    style={{ height: "480px", border: "none" }}
                    title="Video Consultation"
                  />
                  <p className="text-[9px] text-luxMuted mt-2 text-center">Allow camera &amp; microphone when prompted.</p>
                </div>
              )}

              {/* Appointments List */}
              <div className="bg-white border border-black/[0.04] p-8 rounded-[28px] shadow-sm space-y-6">
                <h3 className="text-xl font-extrabold text-luxDark font-serif italic border-b pb-3 flex items-center justify-between">
                  <span>Your Appointments</span>
                  <span className="text-xs font-sans not-italic text-luxMuted font-normal">Total: {appointments.length}</span>
                </h3>

                {appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((app) => {
                      const isReady = app.status === "Confirmed" && (app.meeting_status === "READY" || app.meeting_status === "ready");
                      const isEnded = app.meeting_status === "ENDED" || app.meeting_status === "ended";
                      const roomId = getRoomName(app);

                      return (
                        <div
                          key={app.id}
                          id={`appt-card-${app.id}`}
                          className={cn(
                            "border p-5 rounded-2xl flex flex-col gap-4 transition duration-300",
                            isReady
                              ? "border-green-400 bg-green-50/60 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                              : "border-black/[0.04] hover:bg-gray-50"
                          )}
                        >
                          {/* Top Row */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${statusColor(app.status)}`}>
                                  {app.status}
                                </span>
                                {app.consultation_status && app.consultation_status !== "Pending" && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                    {app.consultation_status}
                                  </span>
                                )}
                                {app.payment_status && (
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${paymentColor(app.payment_status)}`}>
                                    💳 {app.payment_status}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-extrabold text-luxDark text-sm">{app.reason}</h4>
                              {app.service_name && (
                                <p className="text-[11px] text-luxMuted font-semibold">
                                  🩺 {app.service_name} — ₹{app.consultation_fee?.toLocaleString()}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-luxMuted">
                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{app.date}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{app.time}</span>
                              </div>
                            </div>

                            {/* Video Join Button */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                              {isEnded ? (
                                <span className="text-[10px] text-luxMuted bg-gray-100 px-3 py-1.5 rounded-full">Call Ended</span>
                              ) : (
                                <>
                                  {(app.status === "Pending" || app.status === "Confirmed") && (
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
                                      <span>{isReady ? "JOIN NOW" : "Join Consultation"}</span>
                                    </button>
                                  )}
                                  {app.status === "Confirmed" && !isReady && (
                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                                      <CheckCircle className="w-3.5 h-3.5" />Confirmed
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Medical Details if available */}
                          {(app.prescription || app.medicines || app.advice || app.assessment || app.subjective) && (
                            <div className="bg-gray-50 border border-black/[0.04] rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {app.assessment && (
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-luxMuted mb-1">🔬 Diagnosis</p>
                                  <p className="text-xs text-luxDark leading-relaxed">{app.assessment}</p>
                                </div>
                              )}
                              {app.prescription && (
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-luxMuted mb-1">📋 Prescription</p>
                                  <p className="text-xs text-luxDark leading-relaxed">{app.prescription}</p>
                                </div>
                              )}
                              {app.medicines && (
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-luxMuted mb-1">💊 Medicines</p>
                                  <p className="text-xs text-luxDark leading-relaxed">{app.medicines}</p>
                                </div>
                              )}
                              {app.advice && (
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-luxMuted mb-1">💡 Doctor Advice</p>
                                  <p className="text-xs text-luxDark leading-relaxed">{app.advice}</p>
                                </div>
                              )}
                              {app.followup_date && (
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-luxMuted mb-1">📅 Follow-up Date</p>
                                  <p className="text-xs text-green-700 font-bold">{app.followup_date}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-luxMuted text-xs">
                    No appointments registered yet. Book a consultation using the form on the homepage.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── MEDICAL RECORDS TAB ─── */}
          {activeTab === "records" && (
            <div className="bg-white border border-black/[0.04] p-8 rounded-[28px] shadow-sm space-y-6">
              <h3 className="text-xl font-extrabold text-luxDark font-serif italic border-b pb-3">
                Medical Records &amp; Consultation History
              </h3>

              {appointments.filter(a => a.subjective || a.objective || a.assessment || a.plan || a.prescription || a.medicines || a.advice).length > 0 ? (
                <div className="space-y-5">
                  {appointments
                    .filter(a => a.subjective || a.objective || a.assessment || a.plan || a.prescription || a.medicines || a.advice)
                    .map(app => (
                    <div key={app.id} className="border border-black/[0.06] rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-bold text-luxDark text-sm">{app.reason}</p>
                          <p className="text-[10px] text-luxMuted">{app.date} at {app.time}</p>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${statusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {app.subjective && (
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600 mb-1">S — Subjective</p>
                            <p className="text-xs text-luxDark leading-relaxed">{app.subjective}</p>
                          </div>
                        )}
                        {app.objective && (
                          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-purple-600 mb-1">O — Objective</p>
                            <p className="text-xs text-luxDark leading-relaxed">{app.objective}</p>
                          </div>
                        )}
                        {app.assessment && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600 mb-1">A — Diagnosis</p>
                            <p className="text-xs text-luxDark leading-relaxed">{app.assessment}</p>
                          </div>
                        )}
                        {app.plan && (
                          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-green-600 mb-1">P — Treatment Plan</p>
                            <p className="text-xs text-luxDark leading-relaxed">{app.plan}</p>
                          </div>
                        )}
                        {app.prescription && (
                          <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-red-600 mb-1">📋 Prescription</p>
                            <p className="text-xs text-luxDark leading-relaxed">{app.prescription}</p>
                          </div>
                        )}
                        {app.medicines && (
                          <div className="bg-pink-50 border border-pink-100 rounded-xl p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-pink-600 mb-1">💊 Medicines</p>
                            <p className="text-xs text-luxDark leading-relaxed">{app.medicines}</p>
                          </div>
                        )}
                        {app.advice && (
                          <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-teal-600 mb-1">💡 Doctor Advice</p>
                            <p className="text-xs text-luxDark leading-relaxed">{app.advice}</p>
                          </div>
                        )}
                        {app.followup_date && (
                          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 mb-1">📅 Follow-up Scheduled</p>
                            <p className="text-sm font-bold text-indigo-700">{app.followup_date}</p>
                            {app.followup_notes && <p className="text-xs text-luxMuted mt-1">{app.followup_notes}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-luxMuted text-xs">
                  No medical records yet. Records will appear here after your first consultation.
                </div>
              )}
            </div>
          )}

          {/* ─── DOCUMENTS TAB ─── */}
          {activeTab === "documents" && (
            <div className="space-y-6">

              {/* Upload Panel */}
              <div className="bg-white border border-black/[0.04] p-8 rounded-[28px] shadow-sm space-y-5">
                <h3 className="text-xl font-extrabold text-luxDark font-serif italic border-b pb-3">
                  Upload Medical Documents
                </h3>
                <p className="text-xs text-luxMuted leading-relaxed">
                  Upload X-Ray, MRI, CT Scan, Blood Reports, ECG, Lab Reports, or any medical documents.
                  Files appear instantly in your doctor&apos;s Case Study section.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-luxMuted mb-1.5">Select File</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-luxDark file:text-white cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-luxMuted mb-1.5">Document Category</label>
                    <select
                      value={uploadCategory}
                      onChange={e => setUploadCategory(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none"
                    >
                      {["Lab Report", "X-Ray", "MRI", "CT Scan", "Blood Report", "ECG", "Previous Prescription", "Photo", "Other"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {uploadFile && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    {getFileIcon(uploadFile.name)}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-luxDark truncate">{uploadFile.name}</p>
                      <p className="text-[9px] text-luxMuted">{(uploadFile.size / 1024).toFixed(0)} KB · {uploadCategory}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUploadDocument}
                  disabled={isUploading || !uploadFile}
                  className="bg-luxDark hover:bg-luxMuted text-white font-bold px-6 py-3 rounded-xl uppercase text-[10px] tracking-wider transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? "Uploading..." : "Upload to Case Study"}
                </button>
              </div>

              {/* Uploaded Documents List */}
              <div className="bg-white border border-black/[0.04] p-8 rounded-[28px] shadow-sm space-y-4">
                <h3 className="text-xl font-extrabold text-luxDark font-serif italic border-b pb-3 flex items-center justify-between">
                  <span>My Uploaded Documents</span>
                  <span className="text-xs font-sans not-italic text-luxMuted font-normal">{documents.length} files</span>
                </h3>

                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map(doc => (
                      <div key={doc.id} className="border border-black/[0.04] rounded-xl px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(doc.name)}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-luxDark truncate">{doc.name}</p>
                            <p className="text-[9px] text-luxMuted">{doc.category} · {doc.size} · {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => previewDocument(doc.id)}
                          className="text-[10px] text-luxAccent bg-luxAccent/10 hover:bg-luxAccent/20 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition shrink-0"
                        >
                          <ZoomIn className="w-3 h-3" />Preview
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-luxMuted text-xs">
                    No documents uploaded yet.
                  </div>
                )}
              </div>
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
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`border p-4 rounded-xl flex items-start gap-4 transition duration-300 ${
                        notif.status === "Unread"
                          ? "bg-emerald-50/50 border-luxAccent/20"
                          : "bg-white border-black/[0.03]"
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${notif.status === "Unread" ? "bg-green-500 animate-pulse" : "bg-luxMuted/30"}`} />
                      <div className="space-y-1 min-w-0 flex-1">
                        {notif.title && <p className="text-xs font-bold text-luxDark">{notif.title}</p>}
                        <p className="text-xs text-luxDark leading-relaxed">{notif.message}</p>
                        <span className="block text-[9px] text-luxMuted">{new Date(notif.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-luxMuted text-xs">
                  No notifications yet.
                </div>
              )}
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
                    <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">Full Name</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">WhatsApp Number</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-luxMuted mb-1 uppercase tracking-wider">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-4 py-3 text-xs text-luxDark focus:outline-none" required />
                </div>
                <button type="submit" disabled={isUpdatingProfile}
                  className="bg-luxDark hover:bg-luxMuted text-white font-bold px-6 py-3.5 rounded-xl uppercase text-[10px] tracking-wider transition disabled:opacity-50 cursor-pointer">
                  {isUpdatingProfile ? "Saving..." : "Save Profile Changes"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-luxDark text-sm">{previewDoc.name}</p>
                <p className="text-[10px] text-luxMuted">{previewDoc.category}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={previewDoc.file_data}
                  download={previewDoc.name}
                  className="text-[10px] bg-luxDark text-white px-3 py-1.5 rounded-full font-bold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />Download
                </a>
                <button onClick={() => setPreviewDoc(null)}
                  className="text-[10px] bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold uppercase cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            {previewDoc.file_data?.startsWith("data:image") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewDoc.file_data} alt={previewDoc.name} className="w-full rounded-xl" />
            ) : previewDoc.file_data?.startsWith("data:application/pdf") ? (
              <iframe src={previewDoc.file_data} className="w-full rounded-xl" style={{ height: "600px" }} title={previewDoc.name} />
            ) : (
              <div className="bg-gray-50 rounded-xl p-8 text-center text-luxMuted text-xs">
                <FileText className="w-12 h-12 mx-auto mb-3 text-luxMuted/40" />
                Preview not available for this file type. Use the Download button above.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
