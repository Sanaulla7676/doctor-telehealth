import { MetadataRoute } from "next";
import { getAllTestimonials } from "@/lib/testimonials";

// Required for Next.js static export
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const testimonials = getAllTestimonials();
  const baseUrl = "https://doctor-telehealth.onrender.com";
  const lastMod = "2025-01-01";

  // Static routes
  const routes = ["", "/auth", "/portal", "/testimonials"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: lastMod,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  // Dynamic testimonial routes
  const dynamicRoutes = testimonials.map((t) => ({
    url: `${baseUrl}/testimonials/${t.slug}`,
    lastModified: lastMod,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...routes, ...dynamicRoutes];
}
