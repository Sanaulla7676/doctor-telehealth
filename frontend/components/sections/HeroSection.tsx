"use client";

import { useEffect, useRef } from "react";

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

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

      // Fade-in and slide-up for the brand container (logo)
      gsap.fromTo(brandRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, delay: 0.3, ease: "power3.out" }
      );

      // Letter-by-letter stagger animation for "Homoeopathway"
      if (titleRef.current) {
        const text = titleRef.current.innerText;
        titleRef.current.innerHTML = text
          .split("")
          .map((char) =>
            char === " "
              ? `<span style="display:inline-block;width:0.3em">&nbsp;</span>`
              : `<span style="display:inline-block;opacity:0;transform:translateY(40px)">${char}</span>`
          )
          .join("");

        gsap.to(titleRef.current.querySelectorAll("span"), {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.045,
          delay: 0.5,
        });
      }
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
      {/* Full Bleed Looping Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-0"
      >
        <source src="/0720(1).mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Brand Overlay on Left Side */}
      <div 
        ref={brandRef}
        className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 z-10 flex flex-col items-start space-y-3 pointer-events-none select-none opacity-0"
      >
        <div className="w-12 h-12 rounded-full bg-white/95 border border-white/20 flex items-center justify-center shadow-lg overflow-hidden backdrop-blur-sm">
          <img src="/logo.png" alt="Homoeopathway Logo" className="w-full h-full object-cover" />
        </div>
        <h1 
          ref={titleRef}
          className="text-white text-4xl sm:text-5xl md:text-7xl font-bold tracking-wider overflow-hidden"
          style={{ 
            fontFamily: "Arial, Helvetica, sans-serif",
            textShadow: "0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)"
          }}
        >
          Homoeopathway
        </h1>
      </div>

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
