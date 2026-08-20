"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  Check,
  FileText,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  MessageCircle,
  Play,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { getApiUrl } from "@/lib/utils";

type Appointment = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  time: string;
  reason: string;
  status: string;
  meeting_status?: string;
  video_room?: string;
  videoRoom?: string;
  consultation_status?: string;
  payment_status?: string;
  service_name?: string;
  consultation_fee?: number;
};

type Patient = {
  id: string;
  name: string;
  phone: string;
  age?: number;
  gender?: string;
  total_visits?: number;
  last_visit_date?: string;
};

type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  cover_image?: string;
  category?: string;
  status: string;
  reading_time?: number;
  published_at?: string;
};

type Followup = {
  followup_id: string;
  patient_name?: string;
  patient_phone?: string;
  followup_date: string;
  current_stage?: string;
  message?: string;
};

type Tab = "overview" | "appointments" | "patients" | "followups" | "documents" | "blogs";

const tabs: Array<[Tab, string, any]> = [
  ["overview", "Overview", LayoutDashboard],
  ["appointments", "Appointments", CalendarDays],
  ["patients", "Patients", Users],
  ["followups", "Follow-ups", Activity],
  ["documents", "Documents", FileText],
  ["blogs", "Blog Studio", BookOpen],
];

export default function DoctorDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [active, setActive] = useState<Tab>("overview");
  const [mobile, setMobile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [blog, setBlog] = useState({ title: "", excerpt: "", content: "", cover_image: "", category: "Health", status: "published", reading_time: 5 });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("doctorToken");
    if (stored) setToken(stored);
  }, []);

  const api = async (path: string, options: RequestInit = {}) => {
    if (!token) throw new Error("Doctor session not found.");
    const response = await fetch(getApiUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setNotice("");
    try {
      const [appointmentsResponse, patientsResponse, blogsResponse, followupsResponse] = await Promise.all([
        api("/api/doctor/appointments"),
        api("/api/patients"),
        api("/api/doctor/blogs"),
        api("/api/doctor/followups"),
      ]);
      setAppointments(appointmentsResponse.appointments || appointmentsResponse || []);
      setPatients(patientsResponse.patients || patientsResponse || []);
      setBlogs(blogsResponse.blogs || blogsResponse || []);
      setFollowups(followupsResponse.followups || []);
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const action = async (id: string, name: "accept" | "reject" | "confirm" | "start" | "complete") => {
    try {
      const result = await api(`/api/doctor/appointments/${id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: name, roomName: `drvarsha-${id}` }),
      });
      const saved = result.appointment || result;
      setAppointments((items) => items.map((item) => (item.id === id ? saved : item)));
      setNotice(name === "start" ? "Consultation room is ready." : `Appointment ${name}d successfully.`);
    } catch (error: any) {
      setNotice(error.message);
    }
  };

  const openWhatsApp = (appointment: Appointment) => {
    if (!appointment.phone) {
      setNotice("This patient does not have a phone number.");
      return;
    }
    const phone = appointment.phone.replace(/\D/g, "");
    const message = `Hello ${appointment.name}, regarding your ${appointment.service_name || appointment.reason || "consultation"} with Dr. Varsha Bandi. Consultation fee: ₹${appointment.consultation_fee || "as discussed"}. Please complete the payment and share confirmation with the clinic.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const logout = () => {
    localStorage.removeItem("doctorToken");
    setToken(null);
  };

  const filteredPatients = useMemo(
    () => patients.filter((patient) => patient.name.toLowerCase().includes(search.toLowerCase()) || (patient.phone || "").includes(search)),
    [patients, search]
  );

  const stats = useMemo(
    () => ({
      today: appointments.filter((appointment) => appointment.date === new Date().toISOString().slice(0, 10)).length,
      pending: appointments.filter((appointment) => ["Pending", "Accepted"].includes(appointment.status)).length,
      confirmed: appointments.filter((appointment) => appointment.status === "Confirmed").length,
      live: appointments.filter((appointment) => ["READY", "IN_PROGRESS"].includes(appointment.meeting_status || "")).length,
    }),
    [appointments]
  );

  const saveBlog = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = editingId
        ? await api(`/api/doctor/blogs/${editingId}`, { method: "PUT", body: JSON.stringify(blog) })
        : await api("/api/doctor/blogs", { method: "POST", body: JSON.stringify(blog) });
      const saved = result.blog || result;
      setBlogs((items) => editingId ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
      setEditingId(null);
      setBlog({ title: "", excerpt: "", content: "", cover_image: "", category: "Health", status: "published", reading_time: 5 });
      setNotice("Blog saved successfully.");
    } catch (error: any) {
      setNotice(error.message);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-[#f7f8f6] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[32px] border border-black/[0.06] shadow-xl p-9">
          <div className="w-12 h-12 rounded-2xl bg-[#1c251d] text-white flex items-center justify-center font-serif text-xl">H</div>
          <h1 className="font-serif text-4xl text-[#1c251d] mt-6">Clinical Workspace</h1>
          <p className="text-sm text-[#6b756c] mt-2">Dr. Varsha Bandi · Secure EMR</p>
          <form onSubmit={async (event) => {
            event.preventDefault();
            setLoginError("");
            try {
              const response = await fetch(getApiUrl("/api/auth/login"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(login),
              });
              const data = await response.json();
              if (!response.ok || !data.success) throw new Error(data.error || "Invalid credentials");
              localStorage.setItem("doctorToken", data.token);
              setToken(data.token);
            } catch (error: any) {
              setLoginError(error.message);
            }
          }} className="space-y-4 mt-8">
            <input data-testid="doctor-email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} type="email" placeholder="Doctor email" className="w-full rounded-2xl border px-4 py-3 text-sm" required />
            <input data-testid="doctor-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} type="password" placeholder="Password" className="w-full rounded-2xl border px-4 py-3 text-sm" required />
            {loginError && <p className="text-xs text-red-600">{loginError}</p>}
            <button data-testid="doctor-login" className="w-full rounded-2xl bg-[#1c251d] text-white py-3.5 text-sm font-bold">Sign in</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#1c251d]">
      <aside className={`fixed z-40 inset-y-0 left-0 w-72 bg-white border-r border-black/[0.06] p-6 transition-transform lg:translate-x-0 ${mobile ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-between items-center">
          <div><div className="font-serif text-xl font-semibold">Homeopathway</div><div className="text-[10px] uppercase tracking-[.2em] text-[#708264] mt-1">Clinical EMR</div></div>
          <button className="lg:hidden" onClick={() => setMobile(false)}><X /></button>
        </div>
        <nav className="mt-8 space-y-1">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} data-testid={`nav-${id}`} onClick={() => { setActive(id); setMobile(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${active === id ? "bg-[#1c251d] text-white shadow-lg" : "text-[#6b756c] hover:bg-[#f0f2ee]"}`}><Icon className="w-4 h-4" />{label}</button>
          ))}
          <Link href="/doctor/clinical" className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-[#6b756c] hover:bg-[#f0f2ee]"><Activity className="w-4 h-4" />Clinical EMR</Link>
        </nav>
        <div className="absolute bottom-6 left-6 right-6 pt-5 border-t border-black/[0.06]"><div className="text-xs font-bold">Dr. Varsha Bandi</div><div className="text-[10px] text-[#6b756c] mt-1">HOD & Professor · 16+ years</div><button onClick={logout} className="mt-4 flex gap-2 items-center text-xs font-bold text-[#6b756c]"><LogOut className="w-3.5 h-3.5" />Sign out</button></div>
      </aside>

      <section className="lg:ml-72 min-h-screen">
        <header className="sticky top-0 z-30 bg-[#f7f8f6]/90 backdrop-blur-xl border-b border-black/[0.05] px-5 lg:px-10 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4"><button className="lg:hidden" onClick={() => setMobile(true)}><Menu /></button><div><div className="text-xs uppercase tracking-[.2em] text-[#708264] font-bold">Doctor Workspace</div><h1 className="font-serif text-2xl lg:text-3xl mt-1">{tabs.find((tab) => tab[0] === active)?.[1]}</h1></div></div>
            <div className="flex items-center gap-2"><Link href="/doctor/clinical" className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#1c251d] text-white px-4 py-2.5 text-xs font-bold"><Activity className="w-4 h-4" />Open Clinical EMR</Link><button onClick={load} className="p-2.5 rounded-xl bg-white border border-black/[0.06]" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button></div>
          </div>
        </header>

        <div className="p-5 lg:p-10 max-w-[1500px]">
          {notice && <div className="mb-5 bg-white border border-black/[0.06] rounded-2xl px-5 py-3 text-sm flex justify-between"><span>{notice}</span><button onClick={() => setNotice("")}><X className="w-4 h-4" /></button></div>}

          {active === "overview" && (
            <>
              <div className="grid md:grid-cols-4 gap-4">{[["Today", stats.today], ["Needs attention", stats.pending], ["Confirmed", stats.confirmed], ["Live rooms", stats.live]].map(([label, value]) => <div key={label} className="bg-white rounded-3xl p-6 border border-black/[0.05]"><div className="text-3xl font-semibold">{value}</div><div className="text-xs text-[#6b756c] mt-1">{label}</div></div>)}</div>
              <div className="mt-7 bg-white rounded-3xl border border-black/[0.05] p-6"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl">Today&apos;s clinical schedule</h2><button onClick={() => setActive("appointments")} className="text-xs font-bold text-[#708264]">Open appointments</button></div><div className="mt-5 grid gap-3">{appointments.slice(0, 8).map((appointment) => <div key={appointment.id} className="p-4 rounded-2xl bg-[#f7f8f6] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><div className="font-bold text-sm">{appointment.name}</div><div className="text-xs text-[#6b756c] mt-1">{appointment.date} · {appointment.time} · {appointment.service_name || appointment.reason}</div></div><span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white border w-fit">{appointment.status}</span></div>)}</div></div>
            </>
          )}

          {active === "appointments" && <div className="space-y-4">{appointments.map((appointment) => <article key={appointment.id} className="bg-white rounded-3xl border border-black/[0.05] p-6 shadow-sm"><div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5"><div><div className="flex items-center gap-3"><h2 className="font-serif text-2xl">{appointment.name}</h2><span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-[#f3f4f0]">{appointment.status}</span></div><p className="text-xs text-[#6b756c] mt-2">{appointment.date} · {appointment.time} · {appointment.service_name || appointment.reason}</p><p className="text-xs mt-1">{appointment.phone || "No phone"} · {appointment.email}</p><p className="text-xs mt-2 font-semibold">Payment: {appointment.payment_status || "Unpaid"} · Meeting: {appointment.meeting_status || "PENDING"}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => action(appointment.id, "accept")} disabled={appointment.status !== "Pending"} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#edf5ec] disabled:opacity-40"><Check className="w-3.5 h-3.5 inline mr-1" />Accept</button><button onClick={() => action(appointment.id, "reject")} disabled={appointment.status !== "Pending"} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#fff0f0] text-red-700 disabled:opacity-40">Reject</button><button onClick={() => openWhatsApp(appointment)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#edf7f2]"><MessageCircle className="w-3.5 h-3.5 inline mr-1" />WhatsApp</button><button onClick={() => action(appointment.id, "confirm")} disabled={!['Accepted', 'Paid', 'Payment Pending'].includes(appointment.status)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1c251d] text-white disabled:opacity-40">Confirm</button><button onClick={() => action(appointment.id, "start")} disabled={appointment.status !== "Confirmed"} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#e9eef5] disabled:opacity-40"><Play className="w-3.5 h-3.5 inline mr-1" />Join Video</button>{appointment.status === "In Progress" && <button onClick={() => action(appointment.id, "complete")} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#f0f2ee]">Complete</button>}</div></div></article>)}</div>}

          {active === "patients" && <div className="bg-white rounded-3xl border border-black/[0.05] overflow-hidden"><div className="p-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between"><div><h2 className="font-serif text-2xl">Patient directory</h2><Link href="/doctor/clinical" className="text-xs text-[#708264] font-bold mt-2 inline-flex items-center gap-1"><Link2 className="w-3 h-3" />Open full patient timelines</Link></div><div className="flex items-center gap-2 border rounded-xl px-3 bg-white"><Search className="w-4 h-4 text-[#6b756c]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient or phone" className="py-2 outline-none text-xs" /></div></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#f7f8f6]"><tr><th className="p-4">Patient</th><th>Phone</th><th>Age</th><th>Gender</th><th>Visits</th></tr></thead><tbody>{filteredPatients.map((patient) => <tr key={patient.id} className="border-t"><td className="p-4 font-bold">{patient.name}</td><td>{patient.phone}</td><td>{patient.age || "-"}</td><td>{patient.gender || "-"}</td><td>{patient.total_visits || 0}</td></tr>)}</tbody></table></div></div>}

          {active === "followups" && <div className="bg-white rounded-3xl border border-black/[0.05] overflow-hidden"><div className="p-6"><h2 className="font-serif text-2xl">Follow-up queue</h2><p className="text-xs text-[#6b756c] mt-1">Scheduled reminders are stored for 3 days, 2 days, 1 day and the consultation day.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-[#f7f8f6]"><tr><th className="p-4">Patient</th><th>Date</th><th>Stage</th><th>Message</th></tr></thead><tbody>{followups.map((followup) => <tr key={followup.followup_id} className="border-t"><td className="p-4 font-bold">{followup.patient_name || "Patient"}</td><td>{followup.followup_date}</td><td>{followup.current_stage || "Scheduled"}</td><td className="max-w-md">{followup.message || "-"}</td></tr>)}</tbody></table></div></div>}

          {active === "documents" && <div className="bg-white rounded-3xl border border-black/[0.05] p-10"><h2 className="font-serif text-3xl">Document management</h2><p className="text-sm text-[#6b756c] mt-3 max-w-2xl">Patient-owned uploads remain protected behind the patient account. Use the Clinical EMR workspace to review documents alongside the patient timeline.</p><Link href="/doctor/clinical" className="inline-flex items-center gap-2 mt-6 rounded-2xl bg-[#1c251d] text-white px-5 py-3 text-xs font-bold"><FileText className="w-4 h-4" />Open Clinical EMR</Link></div>}

          {active === "blogs" && <div className="grid xl:grid-cols-[1.05fr_1fr] gap-6"><form onSubmit={saveBlog} className="bg-white rounded-3xl border border-black/[0.05] p-7 space-y-4"><h2 className="font-serif text-3xl">{editingId ? "Edit article" : "Publish article"}</h2><input data-testid="blog-title" value={blog.title} onChange={(event) => setBlog({ ...blog, title: event.target.value })} placeholder="Article title" className="w-full border rounded-2xl px-4 py-3 text-sm" required /><input value={blog.excerpt} onChange={(event) => setBlog({ ...blog, excerpt: event.target.value })} placeholder="Short excerpt" className="w-full border rounded-2xl px-4 py-3 text-sm" /><input value={blog.cover_image} onChange={(event) => setBlog({ ...blog, cover_image: event.target.value })} placeholder="Cover image URL" className="w-full border rounded-2xl px-4 py-3 text-sm" /><textarea data-testid="blog-content" value={blog.content} onChange={(event) => setBlog({ ...blog, content: event.target.value })} placeholder="Write the article..." rows={13} className="w-full border rounded-2xl px-4 py-3 text-sm" required /><div className="grid grid-cols-2 gap-3"><input value={blog.category} onChange={(event) => setBlog({ ...blog, category: event.target.value })} placeholder="Category" className="border rounded-2xl px-4 py-3 text-sm" /><select value={blog.status} onChange={(event) => setBlog({ ...blog, status: event.target.value })} className="border rounded-2xl px-4 py-3 text-sm"><option value="published">Publish now</option><option value="draft">Save draft</option></select></div><button data-testid="publish-blog" className="w-full bg-[#1c251d] text-white rounded-2xl py-3.5 text-sm font-bold">{editingId ? "Update article" : "Publish to website"}</button></form><div className="bg-white rounded-3xl border border-black/[0.05] p-7"><h2 className="font-serif text-3xl">Articles</h2><div className="mt-5 space-y-3">{blogs.map((blogItem) => <div key={blogItem.id} className="p-4 rounded-2xl bg-[#f7f8f6] flex items-center justify-between gap-4"><div><div className="font-bold text-sm">{blogItem.title}</div><div className="text-[10px] text-[#6b756c] mt-1">{blogItem.status} · /blogs/{blogItem.slug}</div></div><button onClick={() => { setEditingId(blogItem.id); setBlog({ title: blogItem.title, excerpt: blogItem.excerpt || "", content: blogItem.content, cover_image: blogItem.cover_image || "", category: blogItem.category || "Health", status: blogItem.status, reading_time: blogItem.reading_time || 5 }); }} className="px-3 py-2 rounded-xl bg-white text-xs font-bold">Edit</button></div>)}</div></div></div>}
        </div>
      </section>
    </main>
  );
}
