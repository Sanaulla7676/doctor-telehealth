export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-luxBg px-5 py-28">
      <article className="max-w-3xl mx-auto bg-white rounded-3xl border border-black/[0.05] p-8 md:p-12">
        <div className="text-xs uppercase tracking-[.22em] text-luxAccent font-bold">Clinic policy</div>
        <h1 className="font-serif text-5xl text-luxDark mt-4">Cancellation & Refund Policy</h1>
        <div className="prose prose-sm mt-8 text-luxDark leading-7">
          <p>Appointment cancellations, rescheduling and refunds are handled according to the clinic’s current consultation policy and any payment-provider terms applicable to the transaction.</p>
          <p>Because consultation availability is reserved for a patient, cancellations close to the appointment time may be subject to clinic-specific restrictions.</p>
          <p>Where a payment gateway is enabled, any refund will be initiated only after the clinic confirms eligibility. Gateway processing times and bank settlement times may affect when the refund reaches the patient.</p>
          <p>This page is a general policy statement and does not replace the consultation-specific terms shown at the time of booking.</p>
        </div>
      </article>
    </main>
  );
}
