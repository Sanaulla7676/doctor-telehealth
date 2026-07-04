import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllTestimonials, getTestimonialBySlug } from "@/lib/testimonials";
import BeforeAfterSlider from "@/components/testimonials/BeforeAfterSlider";
import { Star, ChevronLeft, Calendar, UserCheck, ShieldAlert, Award, FileImage } from "lucide-react";
import Image from "next/image";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate static parameters for ISR build compilation
export async function generateStaticParams() {
  const testimonials = getAllTestimonials();
  return testimonials.map((t) => ({
    slug: t.slug,
  }));
}

// Generate dynamic SEO metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = getTestimonialBySlug(slug);

  if (!item) {
    return {
      title: "Story Not Found",
    };
  }

  return {
    title: item.seo?.metaTitle || `${item.title} | Dr. Varsha Bandi`,
    description: item.seo?.metaDescription || item.summary,
  };
}

export default async function TestimonialDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = getTestimonialBySlug(slug);

  if (!item) {
    notFound();
  }

  const hasBeforeAfter = item.beforeImagesUrl.length > 0 && item.afterImagesUrl.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 font-sans">
      
      {/* Back link */}
      <div className="mb-8">
        <Link
          href="/testimonials"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-luxAccent hover:text-luxDark transition uppercase tracking-wider cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Testimonials</span>
        </Link>
      </div>

      {/* Case Header */}
      <div className="space-y-4 mb-12">
        <div className="flex flex-wrap gap-2">
          {item.condition.map((c, idx) => (
            <span
              key={idx}
              className="text-[9px] font-bold uppercase tracking-wider bg-luxBg text-luxAccent px-3 py-1 rounded-full border border-black/[0.04]"
            >
              {c}
            </span>
          ))}
          {item.duration && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-50 text-luxMuted px-3 py-1 rounded-full flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{item.duration}</span>
            </span>
          )}
        </div>
        
        <h1 className="text-3xl md:text-5xl font-extrabold text-luxDark font-serif tracking-tight leading-tight">
          {item.title}
        </h1>

        <div className="flex items-center gap-3 pt-2 text-xs border-b border-black/[0.04] pb-4">
          <div className="flex text-amber-500 gap-0.5">
            {[...Array(item.rating || 5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
            ))}
          </div>
          <span className="text-luxMuted">|</span>
          <span className="text-luxDark font-bold">Patient: {item.patient.name}</span>
          {item.patient.gender && (
            <span className="text-luxMuted">({item.patient.gender})</span>
          )}
        </div>
      </div>

      {/* Case Details */}
      <div className="space-y-12">
        
        {/* Before / After Slider section */}
        {hasBeforeAfter && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-luxDark border-b pb-2 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-luxAccent" />
              <span>Before & After Treatment Comparison</span>
            </h3>
            <BeforeAfterSlider
              beforeUrl={item.beforeImagesUrl[0]}
              afterUrl={item.afterImagesUrl[0]}
            />
            <p className="text-[10px] text-luxMuted text-center leading-normal max-w-lg mx-auto">
              *Real clinical documentation of the case. Drag the slider to compare skin/lesion healing over the course of treatment.
            </p>
          </div>
        )}

        {/* Case Summary */}
        <div className="bg-white border border-black/[0.04] p-8 rounded-[24px] shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-luxDark font-serif italic border-b border-black/[0.04] pb-2">
            Clinical Summary & Analysis
          </h3>
          <p className="text-xs text-luxMuted leading-relaxed">
            {item.summary}
          </p>
        </div>

        {/* Highlights and results if present */}
        {item.treatmentHighlights && item.treatmentHighlights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-black/[0.04] p-6 rounded-[20px] shadow-sm space-y-3">
              <h4 className="font-bold text-luxDark text-xs uppercase tracking-wider border-b pb-2">
                Treatment Methodology
              </h4>
              <ul className="space-y-2 text-xs text-luxMuted">
                {item.treatmentHighlights.map((high, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-luxAccent font-bold">•</span>
                    <span>{high}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-black/[0.04] p-6 rounded-[20px] shadow-sm space-y-3">
              <h4 className="font-bold text-luxDark text-xs uppercase tracking-wider border-b pb-2">
                Healing Results
              </h4>
              <ul className="space-y-2 text-xs text-luxMuted">
                {item.results?.map((res, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{res}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Patient Feedback Text */}
        {item.feedbackText && (
          <div className="bg-white border border-black/[0.04] p-8 rounded-[24px] shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-luxDark font-serif italic border-b border-black/[0.04] pb-2 flex items-center justify-between">
              <span>Patient's Written Account</span>
              <span className="text-xs font-sans not-italic text-luxAccent font-bold">Verified Testimonial</span>
            </h3>
            <div className="text-xs text-luxMuted leading-relaxed whitespace-pre-line italic">
              {item.feedbackText}
            </div>
          </div>
        )}

        {/* Feedback Scanned Image */}
        {item.feedbackImageUrl && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-luxDark border-b pb-2 flex items-center gap-2">
              <FileImage className="w-5 h-5 text-luxAccent" />
              <span>Original Patient Appreciation Letter</span>
            </h3>
            <div className="relative w-full h-[500px] border border-black/[0.04] rounded-2xl overflow-hidden shadow-sm bg-gray-50 flex items-center justify-center">
              <Image
                src={item.feedbackImageUrl}
                alt="Original Appreciation Letter"
                fill
                className="object-contain p-4"
              />
            </div>
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-black/[0.04] pt-6">
            {item.tags.map((t, idx) => (
              <span key={idx} className="text-[9px] font-bold uppercase tracking-wider bg-gray-50 text-luxMuted px-2.5 py-0.5 rounded-full">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
