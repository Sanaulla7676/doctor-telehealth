"use client";

import Link from "next/link";
import { PatientTestimonial } from "@/lib/testimonials";
import { Star, ArrowRight } from "lucide-react";

interface TestimonialCardProps {
  item: PatientTestimonial;
}

export default function TestimonialCard({ item }: TestimonialCardProps) {
  return (
    <div className="bg-white border border-black/[0.04] p-8 rounded-[24px] shadow-sm flex flex-col justify-between hover:scale-[1.02] hover:shadow-md transition duration-300 font-sans">
      <div className="space-y-4">
        {/* Rating */}
        <div className="flex text-amber-500 gap-0.5">
          {[...Array(item.rating || 5)].map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
          ))}
        </div>

        {/* Title */}
        <h4 className="font-extrabold text-luxDark text-sm">
          {item.title}
        </h4>

        {/* Short summary description */}
        <p className="text-xs text-luxMuted leading-relaxed italic line-clamp-4">
          "{item.summary || (item.feedbackText ? item.feedbackText.substring(0, 180) + '...' : '')}"
        </p>

        {/* Type labels badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          {item.type && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-luxBg text-luxAccent px-2.5 py-0.5 rounded-full border border-black/[0.03]">
              {item.type === "case-study" ? "Before / After Case" : item.type === "mixed" ? "Mixed Case Story" : "Patient Testimony"}
            </span>
          )}
          {item.condition.slice(0, 2).map((c, idx) => (
            <span key={idx} className="text-[9px] font-bold uppercase tracking-wider bg-gray-50 text-luxMuted px-2.5 py-0.5 rounded-full">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-black/[0.04] pt-4 mt-6 flex justify-between items-center">
        <div>
          <h5 className="font-extrabold text-luxDark text-xs">
            {item.patient.name}
          </h5>
          <span className="text-[10px] text-luxMuted block mt-0.5">
            {item.status}
          </span>
        </div>

        <Link
          href={`/testimonials/${item.slug}`}
          className="text-luxAccent hover:text-luxDark transition text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
        >
          <span>Read Story</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
