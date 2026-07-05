"use client";

export default function HeroSection() {
  const handleConsultationClick = () => {
    const element = document.getElementById("contact");
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="min-h-[calc(100vh-80px)] relative overflow-hidden bg-black">
      {/* Full Bleed Looping Video — no overlay text */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/Healthcare_hero_section_animation_202606212301.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Subtle bottom gradient so button is readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-0" />

      {/* Book Now button — bottom left */}
      <div className="absolute bottom-10 left-8 md:left-12 z-10">
        <button
          onClick={handleConsultationClick}
          className="px-7 py-3.5 text-xs font-bold uppercase tracking-widest backdrop-blur-md bg-white/90 text-luxDark border border-black/10 rounded-full shadow-2xl transition duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        >
          Book Consultation
        </button>
      </div>
    </section>
  );
}
