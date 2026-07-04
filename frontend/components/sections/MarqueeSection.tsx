"use client";

import { Leaf, CheckCircle2, Droplet, Zap, Shield, Heart } from "lucide-react";

export default function MarqueeSection() {
  const laws = [
    { text: "LAW OF SIMILARS (LIKE CURES LIKE)", icon: Leaf },
    { text: "INDIVIDUALIZED CARE PROTOCOLS", icon: CheckCircle2 },
    { text: "THE LAW OF THE SINGLE REMEDY", icon: Droplet },
    { text: "VITAL ENERGY STIMULATION", icon: Zap },
    { text: "SAFE, NON-TOXIC POTENTIZATION", icon: Shield },
    { text: "THE LAW OF THE MINIMUM DOSE", icon: Heart },
  ];

  return (
    <div className="py-12 border-t border-b border-black/[0.04] text-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden relative font-sans">
      <span className="text-[10px] tracking-widest text-luxMuted uppercase font-bold block text-center mb-8">
        FOUNDATIONAL LAWS OF HOMEOPATHY
      </span>

      {/* Soft gradient fades for elegant edges */}
      <div className="absolute left-0 top-16 bottom-0 w-20 bg-gradient-to-r from-luxBg to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-16 bottom-0 w-20 bg-gradient-to-l from-luxBg to-transparent z-10 pointer-events-none"></div>

      <div className="flex overflow-hidden marquee-container w-full">
        {/* Container 1 */}
        <div className="flex space-x-16 animate-marquee whitespace-nowrap min-w-full justify-around items-center text-xs font-semibold tracking-wider text-luxDark/80">
          {laws.map((law, idx) => {
            const Icon = law.icon;
            return (
              <span key={idx} className="flex items-center gap-2">
                <Icon className="text-luxAccent w-4 h-4 shrink-0" />
                <span>{law.text}</span>
              </span>
            );
          })}
        </div>

        {/* Container 2 */}
        <div className="flex space-x-16 animate-marquee whitespace-nowrap min-w-full justify-around items-center text-xs font-semibold tracking-wider text-luxDark/80" aria-hidden="true">
          {laws.map((law, idx) => {
            const Icon = law.icon;
            return (
              <span key={`clone-${idx}`} className="flex items-center gap-2">
                <Icon className="text-luxAccent w-4 h-4 shrink-0" />
                <span>{law.text}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
