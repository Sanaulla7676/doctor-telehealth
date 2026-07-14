"use client";

import { useEffect, useRef } from "react";

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { gsap } = await import("gsap");
      // Cinematic zoom-out and fade-in for the hero video
      gsap.fromTo(videoRef.current,
        { scale: 1.15, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.8, ease: "power2.out" }
      );
      // Premium slide-in for the bottom button
      gsap.fromTo(buttonRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, delay: 0.5, ease: "power3.out" }
      );
    })();
  }, []);

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
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-0"
      >
        <source src="/Untitled_Scene_07-14_14_16_48_202607142043.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Subtle bottom gradient so button is readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-0" />

      {/* Book Now button — bottom right */}
      <div ref={buttonRef} className="absolute bottom-10 right-8 md:right-12 z-10 opacity-0">
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
