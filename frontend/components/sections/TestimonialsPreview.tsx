import Link from "next/link";
import { getAllTestimonials } from "@/lib/testimonials";
import { Star, ArrowRight } from "lucide-react";

export default function TestimonialsPreview() {
  const testimonials = getAllTestimonials().filter(t => t.featured).slice(0, 3);

  return (
    <section id="testimonials" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-black/[0.04] relative">
      <div className="text-center mb-16">
        <span className="text-luxMuted text-xs uppercase font-extrabold tracking-widest font-sans">
          Patient Experiences
        </span>
        <h2 className="text-4xl font-extrabold text-luxDark mt-1 tracking-tight font-serif">
          Healing Testimonials
        </h2>
      </div>

      {/* Grid listing of Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 font-sans mb-12">
        {testimonials.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-black/[0.04] p-8 rounded-[24px] shadow-sm flex flex-col justify-between hover:scale-[1.02] transition duration-300"
          >
            <div className="space-y-4">
              <div className="flex text-amber-500 gap-0.5">
                {[...Array(item.rating || 5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                ))}
              </div>
              <h4 className="font-extrabold text-luxDark text-sm">
                {item.title}
              </h4>
              <p className="text-xs text-luxMuted leading-relaxed italic">
                "{item.summary || (item.feedbackText ? item.feedbackText.substring(0, 200) + '...' : '')}"
              </p>
            </div>
            
            <div className="border-t border-black/[0.04] pt-4 mt-6 flex justify-between items-center">
              <div>
                <h5 className="font-extrabold text-luxDark text-xs">
                  {item.patient.name}
                </h5>
                <span className="text-[10px] text-luxMuted">
                  {item.duration ? `Duration: ${item.duration}` : "Homeopathic Treatment"}
                </span>
              </div>
              
              <Link
                href={`/testimonials/${item.slug}`}
                className="text-luxAccent hover:text-luxDark transition text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
              >
                <span>Read Story</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link
          href="/testimonials"
          className="premium-btn px-8 py-3.5 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
        >
          <span>View All Success Stories</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
