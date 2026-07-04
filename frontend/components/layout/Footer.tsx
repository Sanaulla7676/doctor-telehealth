"use client";

import Link from "next/link";
import { Sprout } from "lucide-react";
import { siteConfig } from "@/data/site";

export default function Footer() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-[#F5F5F7] border-t border-black/[0.04] text-xs py-12 text-luxMuted font-sans mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Practice info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-white border border-black/[0.05] p-2 rounded-xl shadow-sm">
                <Sprout className="text-luxDark w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-black text-luxDark tracking-tight uppercase">
                  Dr. Varsha Bandi
                </span>
                <span className="block text-[10px] font-medium text-luxMuted font-serif italic lowercase leading-none">
                  homeopathway
                </span>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-luxMuted">
              Providing specialized, clinical-grade classical homeopathic care and system recovery.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-extrabold text-luxDark text-xs mb-3 uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-[11px] font-semibold">
              <li>
                <button onClick={() => scrollToSection("home")} className="hover:text-luxDark transition text-left cursor-pointer">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("about")} className="hover:text-luxDark transition text-left cursor-pointer">
                  Philosophy
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("doctor")} className="hover:text-luxDark transition text-left cursor-pointer">
                  Our Specialist
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("services")} className="hover:text-luxDark transition text-left cursor-pointer">
                  Treatments
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("products")} className="hover:text-luxDark transition text-left cursor-pointer">
                  Methodology
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("testimonials")} className="hover:text-luxDark transition text-left cursor-pointer">
                  Testimonials
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("contact")} className="hover:text-luxDark transition text-left font-bold text-luxAccent cursor-pointer">
                  Book Consultation
                </button>
              </li>
            </ul>
          </div>

          {/* Practice Ethic */}
          <div>
            <h4 className="font-extrabold text-luxDark text-xs mb-3 uppercase tracking-wider">
              Practice Ethic
            </h4>
            <ul className="space-y-2 text-[11px] font-semibold">
              <li>
                <button onClick={() => scrollToSection("about")} className="hover:text-luxDark transition text-left cursor-pointer">
                  Holistic Philosophy
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("contact")} className="hover:text-luxDark transition text-left cursor-pointer">
                  Book Clinical Consultations
                </button>
              </li>
            </ul>
          </div>

          {/* Contact / Territories */}
          <div>
            <h4 className="font-extrabold text-luxDark text-xs mb-3 uppercase tracking-wider">
              Territories Covered
            </h4>
            <p className="text-[11px] leading-relaxed">
              Providing homeopathic wellness consultations across Gangavathi, Koppal, Bengaluru, and Karnataka, India.
            </p>
            <span className="block mt-4 font-bold text-luxDark">
              Support Hotline: {siteConfig.phone}
            </span>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-black/[0.04] pt-8 flex flex-col md:flex-row items-center justify-between text-luxMuted text-[10px] font-semibold">
          <span>&copy; {new Date().getFullYear()} Dr. Varsha Bandi. All Rights Reserved.</span>
          <span className="flex items-center space-x-1 mt-2 md:mt-0">
            <span>Text-based Classical Homeopathy.</span>
            <Sprout className="text-luxDark w-3 h-3" />
            <span>Bengaluru, India</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
