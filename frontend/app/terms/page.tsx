export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#1c251d] px-6 py-16">
      <article className="mx-auto max-w-3xl rounded-[32px] bg-white p-8 md:p-12 shadow-sm border border-black/[0.06]">
        <p className="text-xs uppercase tracking-[.2em] text-[#708264] font-bold">Dr. Varsha Bandi</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-3">Terms of Use</h1>
        <p className="text-sm text-[#6b756c] mt-3">Last updated: August 2026</p>
        <div className="prose prose-sm md:prose-base mt-10 max-w-none">
          <h2>Use of the platform</h2>
          <p>This website and patient portal are provided to help patients access clinic information, appointment services, teleconsultation and related digital services.</p>
          <h2>Appointments</h2>
          <p>Submitting an appointment request does not by itself guarantee a confirmed consultation. Appointment status is determined by the clinic workflow.</p>
          <h2>Patient responsibility</h2>
          <p>Patients are responsible for providing accurate contact and medical information and for protecting their account credentials.</p>
          <h2>Teleconsultation</h2>
          <p>Video consultation availability depends on the appointment state and technical availability of the video service. Patients should use the consultation feature only for their own appointment.</p>
          <h2>Acceptable use</h2>
          <p>Users must not attempt unauthorized access, interfere with the service, misuse patient information, or submit malicious or fraudulent content.</p>
          <h2>Service changes</h2>
          <p>The clinic may update platform features, workflows and these terms as operational and legal requirements evolve.</p>
        </div>
      </article>
    </main>
  );
}
