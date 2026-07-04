import { MetadataRoute } from "next";
import { getAllTestimonials } from "@/lib/testimonials";

export default function sitemap(): MetadataRoute.Sitemap {
  const testimonials = getAllTestimonials();
  const baseUrl = "https://doctor-telehealth.onrender.com";

  // Static routes
  const routes = ["", "/auth", "/portal", "/testimonials"].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split("T")[0],
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  // Dynamic testimonial routes
  const dynamicRoutes = testimonials.map((t) => ({
    url: `${baseUrl}/testimonials/${t.slug}`,
    lastModified: new Date().toISOString().split("T")[0],
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...routes, ...dynamicRoutes];
}
