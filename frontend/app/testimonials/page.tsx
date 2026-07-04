import { getAllTestimonials } from "@/lib/testimonials";
import TestimonialsList from "@/components/testimonials/TestimonialsList";

export default function TestimonialsPage() {
  const testimonials = getAllTestimonials();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 font-sans min-h-[70vh]">
      {/* Header */}
      <div className="text-center mb-16">
        <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest block">
          Directory
        </span>
        <h1 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">
          Success & Healing Stories
        </h1>
        <p className="text-xs text-luxMuted mt-3 max-w-lg mx-auto leading-relaxed">
          Explore clinical before/after case studies, patient appreciation letters, and recoveries under classical homeopathic evaluation.
        </p>
      </div>

      {/* Client List Filter */}
      <TestimonialsList initialTestimonials={testimonials} />
    </div>
  );
}
