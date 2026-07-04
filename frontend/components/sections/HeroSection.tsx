"use client";

import { doctorData } from "@/data/doctor";

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
    <section id="home" className="min-h-[calc(100vh-80px)] relative overflow-hidden bg-black flex items-center justify-center">
      {/* Full Bleed Looping Video Backdrop */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      >
        <source src="/Healthcare_hero_section_animation_202606212301.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark overlay for typography legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/60 z-0"></div>

      {/* Content wrapper */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white space-y-6">
        <span className="text-xs uppercase tracking-widest text-luxAccent font-extrabold block animate-fade-in">
          Activate Your Vital Force
        </span>
        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight font-serif leading-tight">
          Holistic Clinical Homeopathy
        </h1>
        <p className="text-sm md:text-lg text-gray-200 font-sans max-w-2xl mx-auto leading-relaxed">
          Evidence-based diagnosis and individualized systemic healing with {doctorData.name}. 
          Activate long-term immune and nervous system recovery.
        </p>

        {/* Action button overlay */}
        <div className="pt-4">
          <button
            onClick={handleConsultationClick}
            className="premium-btn px-8 py-4 text-xs font-bold uppercase tracking-widest backdrop-blur-md bg-white/85 text-luxDark border border-black/10 shadow-2xl transition duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Book Consultation</span>
          </button>
        </div>
      </div>
    </section>
  );
}
