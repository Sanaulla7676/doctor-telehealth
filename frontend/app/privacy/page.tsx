export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#1c251d] px-6 py-16">
      <article className="mx-auto max-w-3xl rounded-[32px] bg-white p-8 md:p-12 shadow-sm border border-black/[0.06]">
        <p className="text-xs uppercase tracking-[.2em] text-[#708264] font-bold">Dr. Varsha Bandi</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-3">Privacy Policy</h1>
        <p className="text-sm text-[#6b756c] mt-3">Last updated: August 2026</p>
        <div className="prose prose-sm md:prose-base mt-10 max-w-none">
          <p>We collect information needed to provide appointments, consultations, patient account services, clinical documentation and related clinic operations.</p>
          <h2>Information we collect</h2>
          <p>Depending on the service used, this may include name, contact details, appointment information, account credentials, documents and clinical information voluntarily provided during care.</p>
          <h2>How information is used</h2>
          <p>Information is used to provide and manage consultations, maintain clinical records, communicate appointment updates, support follow-up care and operate the clinic platform.</p>
          <h2>Access and security</h2>
          <p>Access to patient records is restricted by account and role permissions. Sensitive information should never be shared through unsecured public channels.</p>
          <h2>Third parties</h2>
          <p>Where external services are used for hosting, storage, communications or video consultation, information may be processed by those providers as necessary to deliver the requested service.</p>
          <h2>Your choices</h2>
          <p>Patients may request correction of inaccurate account information and should contact the clinic for questions about records, retention or privacy practices.</p>
        </div>
      </article>
    </main>
  );
}
