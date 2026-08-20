"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, ClipboardList, FileText, Pill, RefreshCw, Search, ShieldCheck, Stethoscope, UserRound, Users } from "lucide-react";
import { getApiUrl } from "@/lib/utils";

type Patient = { id: string; name: string; phone?: string; age?: number; gender?: string; medical_history?: string; notes?: string };
type Appointment = { id: string; date: string; time: string; reason: string; status: string; consultation_status?: string };
type ClinicalNote = { subjective?: string; objective?: string; assessment?: string; plan?: string; advice?: string };
type Prescription = { id: string; version_no: number; diagnosis?: string; medicines?: string; advice?: string; created_at: string };
type Followup = { followup_id: string; followup_date: string; current_stage?: string; message?: string; doctor_notes?: string };

export default function ClinicalWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [record, setRecord] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [note, setNote] = useState<ClinicalNote>({});
  const [prescription, setPrescription] = useState({ diagnosis: "", medicines: "", advice: "" });
  const [followup, setFollowup] = useState({ followup_date: "", message: "", doctor_notes: "" });
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setToken(localStorage.getItem("doctorToken")), []);

  const api = async (path: string, options: RequestInit = {}) => {
    if (!token) throw new Error("Doctor session not found.");
    const response = await fetch(getApiUrl(path), {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  };

  const loadPatients = async () => {
    if (!token) return;
    try {
      const result = await api("/api/patients");
      setPatients(result.patients || result || []);
      const stats = await api("/api/doctor/analytics");
      setAnalytics(stats);
      const audit = await api("/api/doctor/audit-logs");
      setAuditLogs(audit.logs || []);
    } catch (error: any) {
      setNotice(error.message);
    }
  };

  useEffect(() => { loadPatients(); }, [token]);

  const filteredPatients = useMemo(
    () => patients.filter((patient) => `${patient.name} ${patient.phone || ""}`.toLowerCase().includes(query.toLowerCase())),
    [patients, query]
  );

  const selectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setLoading(true);
    setNotice("");
    try {
      const data = await api(`/api/doctor/patients/${encodeURIComponent(patient.id)}`);
      setRecord(data);
      setSelectedAppointment(data.appointments?.[0] || null);
      if (data.appointments?.[0]) {
        const noteData = await api(`/api/doctor/appointments/${data.appointments[0].id}/clinical-note`);
        setNote(noteData.note || {});
      }
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const chooseAppointment = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    try {
      const data = await api(`/api/doctor/appointments/${appointment.id}/clinical-note`);
      setNote(data.note || {});
    } catch (error: any) { setNotice(error.message); }
  };

  const saveNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAppointment) return setNotice("Choose a consultation first.");
    try {
      await api(`/api/doctor/appointments/${selectedAppointment.id}/clinical-note`, { method: "PUT", body: JSON.stringify(note) });
      setNotice("Clinical note saved.");
      await selectPatient(selectedPatient!);
    } catch (error: any) { setNotice(error.message); }
  };

  const issuePrescription = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAppointment) return setNotice("Choose a consultation first.");
    try {
      await api(`/api/doctor/appointments/${selectedAppointment.id}/prescription`, { method: "POST", body: JSON.stringify(prescription) });
      setNotice("Prescription issued and patient notification created.");
      setPrescription({ diagnosis: "", medicines: "", advice: "" });
      await selectPatient(selectedPatient!);
    } catch (error: any) { setNotice(error.message); }
  };

  const createFollowup = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedPatient) return setNotice("Choose a patient first.");
    try {
      await api("/api/doctor/followups", { method: "POST", body: JSON.stringify({ patient_id: selectedPatient.id, consultation_id: selectedAppointment?.id, ...followup }) });
      setNotice("Follow-up scheduled with reminder queue.");
      setFollowup({ followup_date: "", message: "", doctor_notes: "" });
      await selectPatient(selectedPatient);
    } catch (error: any) { setNotice(error.message); }
  };

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#1c251d]">
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-[#f7f8f6]/95 backdrop-blur px-5 lg:px-10 py-5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-5">
          <div>
            <div className="text-[10px] uppercase tracking-[.22em] text-[#708264] font-bold">Clinical EMR</div>
            <h1 className="font-serif text-3xl mt-1">Patient care workspace</h1>
          </div>
          <button onClick={loadPatients} className="rounded-xl bg-white border border-black/[0.06] px-3 py-2.5" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-5 lg:p-10">
        {notice && <div className="mb-6 rounded-2xl border border-black/[0.06] bg-white px-5 py-3 text-sm">{notice}</div>}

        <section className="grid md:grid-cols-3 gap-4 mb-7">
          <div className="bg-[#1c251d] text-white rounded-3xl p-6"><Users className="w-5 h-5 opacity-70" /><div className="text-3xl font-semibold mt-5">{analytics?.totalPatients ?? patients.length}</div><div className="text-xs opacity-60 mt-1">Total patients</div></div>
          <div className="bg-white rounded-3xl border border-black/[0.05] p-6"><ClipboardList className="w-5 h-5 text-[#708264]" /><div className="text-3xl font-semibold mt-5">{analytics?.appointmentsByStatus?.reduce((sum: number, item: any) => sum + Number(item.count || 0), 0) ?? 0}</div><div className="text-xs text-[#6b756c] mt-1">Appointments in system</div></div>
          <div className="bg-white rounded-3xl border border-black/[0.05] p-6"><Activity className="w-5 h-5 text-[#708264]" /><div className="text-3xl font-semibold mt-5">{analytics?.upcomingFollowups ?? 0}</div><div className="text-xs text-[#6b756c] mt-1">Upcoming follow-ups</div></div>
        </section>

        <div className="grid xl:grid-cols-[320px_1fr] gap-6">
          <aside className="bg-white rounded-3xl border border-black/[0.05] overflow-hidden h-fit xl:sticky xl:top-28">
            <div className="p-5 border-b border-black/[0.05]"><div className="flex items-center gap-2 border rounded-xl px-3"><Search className="w-4 h-4 text-[#6b756c]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patients" className="w-full py-2.5 outline-none text-xs" /></div></div>
            <div className="max-h-[70vh] overflow-y-auto p-3 space-y-2">
              {filteredPatients.map((patient) => <button key={patient.id} onClick={() => selectPatient(patient)} className={`w-full text-left rounded-2xl px-4 py-4 transition ${selectedPatient?.id === patient.id ? "bg-[#1c251d] text-white" : "hover:bg-[#f4f5f2]"}`}><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-[#eef1ec] text-[#708264] flex items-center justify-center"><UserRound className="w-4 h-4" /></div><div><div className="text-sm font-bold">{patient.name}</div><div className={`text-[10px] mt-1 ${selectedPatient?.id === patient.id ? "text-white/60" : "text-[#6b756c]"}`}>{patient.phone || "No phone"}</div></div></div></button>)}
              {!filteredPatients.length && <div className="p-6 text-center text-xs text-[#6b756c]">No patients found.</div>}
            </div>
          </aside>

          <section className="space-y-6">
            {!selectedPatient && <div className="bg-white rounded-3xl border border-black/[0.05] p-12 text-center"><Stethoscope className="w-10 h-10 mx-auto text-[#708264]" /><h2 className="font-serif text-3xl mt-5">Select a patient</h2><p className="text-sm text-[#6b756c] mt-2 max-w-lg mx-auto">Open a patient to review consultations, write clinical notes, issue prescriptions, and schedule follow-ups.</p></div>}

            {selectedPatient && record && <>
              <div className="bg-white rounded-3xl border border-black/[0.05] p-7">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                  <div><div className="text-[10px] uppercase tracking-[.2em] text-[#708264] font-bold">Patient record</div><h2 className="font-serif text-3xl mt-2">{selectedPatient.name}</h2><p className="text-xs text-[#6b756c] mt-2">{selectedPatient.age ? `${selectedPatient.age} years` : "Age not recorded"} · {selectedPatient.gender || "Gender not recorded"} · {selectedPatient.phone || "No phone"}</p></div>
                  <div className="rounded-2xl bg-[#f7f8f6] px-4 py-3 text-xs"><div className="font-bold">Medical history</div><div className="text-[#6b756c] mt-1 max-w-md">{selectedPatient.medical_history || "No medical history recorded."}</div></div>
                </div>
              </div>

              <div className="grid lg:grid-cols-[1fr_1.25fr] gap-6">
                <div className="bg-white rounded-3xl border border-black/[0.05] p-6">
                  <div className="flex items-center gap-2"><CalendarDaysIcon /><h3 className="font-serif text-2xl">Consultation timeline</h3></div>
                  <div className="mt-5 space-y-3">{(record.appointments || []).map((appointment: Appointment) => <button key={appointment.id} onClick={() => chooseAppointment(appointment)} className={`w-full text-left rounded-2xl border p-4 ${selectedAppointment?.id === appointment.id ? "border-[#708264] bg-[#f3f6f1]" : "border-black/[0.05]"}`}><div className="flex justify-between gap-3"><div><div className="text-sm font-bold">{appointment.date} · {appointment.time}</div><div className="text-xs text-[#6b756c] mt-1">{appointment.reason}</div></div><span className="text-[10px] font-bold">{appointment.status}</span></div></button>)}{!(record.appointments || []).length && <p className="text-xs text-[#6b756c]">No consultations found.</p>}</div>
                </div>

                <form onSubmit={saveNote} className="bg-white rounded-3xl border border-black/[0.05] p-6 space-y-4">
                  <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-[#708264]" /><h3 className="font-serif text-2xl">Clinical notes</h3></div>
                  <div className="grid md:grid-cols-2 gap-4">{([['subjective','Subjective'],['objective','Objective'],['assessment','Assessment'],['plan','Plan']] as const).map(([key,label]) => <label key={key} className="text-xs font-bold">{label}<textarea value={(note as any)[key] || ''} onChange={(e) => setNote({ ...note, [key]: e.target.value })} rows={5} className="mt-2 w-full rounded-2xl border px-4 py-3 font-normal outline-none focus:border-[#708264]" /></label>)}</div>
                  <label className="text-xs font-bold">Advice<textarea value={note.advice || ''} onChange={(e) => setNote({ ...note, advice: e.target.value })} rows={4} className="mt-2 w-full rounded-2xl border px-4 py-3 font-normal outline-none focus:border-[#708264]" /></label>
                  <button className="rounded-2xl bg-[#1c251d] text-white px-5 py-3 text-xs font-bold">Save clinical note</button>
                </form>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <form onSubmit={issuePrescription} className="bg-white rounded-3xl border border-black/[0.05] p-6 space-y-4">
                  <div className="flex items-center gap-2"><Pill className="w-5 h-5 text-[#708264]" /><h3 className="font-serif text-2xl">Issue prescription</h3></div>
                  <input value={prescription.diagnosis} onChange={(e) => setPrescription({ ...prescription, diagnosis: e.target.value })} placeholder="Diagnosis / clinical impression" className="w-full rounded-2xl border px-4 py-3 text-sm" />
                  <textarea required value={prescription.medicines} onChange={(e) => setPrescription({ ...prescription, medicines: e.target.value })} placeholder="Medicines, potency, dosage, frequency and duration" rows={7} className="w-full rounded-2xl border px-4 py-3 text-sm" />
                  <textarea value={prescription.advice} onChange={(e) => setPrescription({ ...prescription, advice: e.target.value })} placeholder="Advice and precautions" rows={4} className="w-full rounded-2xl border px-4 py-3 text-sm" />
                  <button className="rounded-2xl bg-[#1c251d] text-white px-5 py-3 text-xs font-bold">Issue prescription</button>
                </form>

                <form onSubmit={createFollowup} className="bg-white rounded-3xl border border-black/[0.05] p-6 space-y-4">
                  <div className="flex items-center gap-2"><Activity className="w-5 h-5 text-[#708264]" /><h3 className="font-serif text-2xl">Schedule follow-up</h3></div>
                  <input required type="date" value={followup.followup_date} onChange={(e) => setFollowup({ ...followup, followup_date: e.target.value })} className="w-full rounded-2xl border px-4 py-3 text-sm" />
                  <textarea value={followup.message} onChange={(e) => setFollowup({ ...followup, message: e.target.value })} placeholder="Patient-facing reminder message" rows={5} className="w-full rounded-2xl border px-4 py-3 text-sm" />
                  <textarea value={followup.doctor_notes} onChange={(e) => setFollowup({ ...followup, doctor_notes: e.target.value })} placeholder="Internal follow-up notes" rows={5} className="w-full rounded-2xl border px-4 py-3 text-sm" />
                  <button className="rounded-2xl bg-[#708264] text-white px-5 py-3 text-xs font-bold">Schedule + reminders</button>
                </form>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl border border-black/[0.05] p-6"><div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#708264]" /><h3 className="font-serif text-2xl">Audit trail</h3></div><div className="mt-4 space-y-2 max-h-72 overflow-auto">{auditLogs.slice(0,20).map(log => <div key={log.id} className="rounded-2xl bg-[#f7f8f6] p-3"><div className="text-xs font-bold">{log.action}</div><div className="text-[10px] text-[#6b756c] mt-1">{log.resource_type} · {log.resource_id || "-"} · {new Date(log.created_at).toLocaleString()}</div></div>)}{!auditLogs.length && <p className="text-xs text-[#6b756c]">No audit entries yet.</p>}</div></div>
                <div className="bg-white rounded-3xl border border-black/[0.05] p-6"><div className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-[#708264]" /><h3 className="font-serif text-2xl">Recent prescriptions</h3></div><div className="mt-4 space-y-2">{(record.prescriptions || []).slice(0,8).map((rx: Prescription) => <div key={rx.id} className="rounded-2xl bg-[#f7f8f6] p-4"><div className="text-xs font-bold">Version {rx.version_no} · {new Date(rx.created_at).toLocaleDateString()}</div><div className="text-xs text-[#6b756c] mt-2 whitespace-pre-wrap">{rx.medicines || rx.advice}</div></div>)}{!(record.prescriptions || []).length && <p className="text-xs text-[#6b756c]">No prescriptions yet.</p>}</div></div>
              </div>
            </>}
          </section>
        </div>
      </div>
    </main>
  );
}

function CalendarDaysIcon() { return <span className="w-5 h-5 rounded-md bg-[#eef1ec] inline-block" aria-hidden="true" />; }
