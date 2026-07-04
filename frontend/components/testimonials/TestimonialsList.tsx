"use client";

import { useState } from "react";
import TestimonialCard from "@/components/testimonials/TestimonialCard";
import { Search, Sparkles } from "lucide-react";
import { PatientTestimonial } from "@/lib/testimonials";

interface TestimonialsListProps {
  initialTestimonials: PatientTestimonial[];
}

export default function TestimonialsList({ initialTestimonials }: TestimonialsListProps) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>("All");

  // Extract all distinct tags from list
  const tags = ["All", ...Array.from(new Set(initialTestimonials.flatMap(item => item.tags || [])))].slice(0, 10);

  // Filter list
  const filteredList = initialTestimonials.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.patient.name.toLowerCase().includes(search.toLowerCase()) ||
      item.condition.some((c: string) => c.toLowerCase().includes(search.toLowerCase())) ||
      (item.summary && item.summary.toLowerCase().includes(search.toLowerCase()));

    const matchesTag = activeTag === "All" || (item.tags && item.tags.includes(activeTag));

    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-12">
      {/* Search & Filters */}
      <div className="space-y-6">
        <div className="max-w-md mx-auto relative">
          <input
            type="text"
            placeholder="Search by patient, condition, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-black/[0.08] rounded-full px-6 py-3.5 pl-12 text-xs text-luxDark focus:outline-none focus:border-luxDark focus:ring-1 focus:ring-luxDark shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-luxMuted w-4 h-4" />
        </div>

        {/* Filter tags */}
        {tags.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 text-[10px] font-bold uppercase tracking-wider">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 rounded-full border transition duration-300 cursor-pointer ${
                  activeTag === tag
                    ? "bg-luxDark text-white border-luxDark"
                    : "bg-white text-luxMuted border-black/[0.06] hover:border-luxDark hover:text-luxDark"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid List */}
      {filteredList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredList.map((item) => (
            <TestimonialCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-black/[0.08] rounded-3xl bg-white/50">
          <Sparkles className="w-8 h-8 text-luxMuted mx-auto mb-3" />
          <h3 className="font-extrabold text-luxDark text-sm">No stories found</h3>
          <p className="text-[11px] text-luxMuted mt-1">Try modifying your search keywords or active tags.</p>
        </div>
      )}
    </div>
  );
}
