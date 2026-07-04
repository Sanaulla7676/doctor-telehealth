"use client";

import { useEffect, useState } from "react";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FloatingBookButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBookClick = () => {
    const element = document.getElementById("contact");
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <button
      onClick={handleBookClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-luxDark text-white px-5 py-3.5 rounded-full shadow-2xl hover:bg-luxAccent hover:scale-105 active:scale-95 transition-all duration-300 transform font-sans text-xs font-bold uppercase tracking-wider cursor-pointer border border-white/10",
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-20 opacity-0 pointer-events-none"
      )}
    >
      <CalendarRange className="w-4 h-4" />
      <span>Book Now</span>
    </button>
  );
}
