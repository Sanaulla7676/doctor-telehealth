export default function TelemedicineConsentPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#1c251d] px-6 py-16">
      <article className="mx-auto max-w-3xl rounded-[32px] bg-white p-8 md:p-12 shadow-sm border border-black/[0.06]">
        <p className="text-xs uppercase tracking-[.2em] text-[#708264] font-bold">Dr. Varsha Bandi</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-3">Telemedicine Consent</h1>
        <p className="text-sm text-[#6b756c] mt-3">Information for patients using video consultation</p>
        <div className="prose prose-sm md:prose-base mt-10 max-w-none">
          <h2>How teleconsultation works</h2>
          <p>When an appointment is confirmed and the consultation room is made ready, the patient may join the assigned video consultation from the patient portal.</p>
          <h2>Privacy and technology</h2>
          <p>Video consultation relies on a third-party video service. Patients should use a private location and avoid sharing their consultation link with others.</p>
          <h2>Technical limitations</h2>
          <p>Video quality depends on device, browser, microphone, camera and internet connectivity. A technical interruption may require reconnecting or an alternative communication method arranged by the clinic.</p>
          <h2>Clinical limitations</h2>
          <p>Teleconsultation may not be appropriate for every medical situation. The doctor may recommend an in-person assessment or urgent medical care when required.</p>
          <h2>Patient acknowledgement</h2>
          <p>By proceeding with a teleconsultation, the patient acknowledges the nature of remote care, the technology involved and the possibility of technical limitations.</p>
        </div>
      </article>
    </main>
  );
}
