import { MetadataRoute } from "next";
import { getAllTestimonials } from "@/lib/testimonials";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const testimonials = getAllTestimonials();
  const baseUrl = "https://www.drvarshabandi.com";
  const lastModified = new Date();

  const routes = [
    "",
    "/auth",
    "/portal",
    "/blogs",
    "/testimonials",
    "/privacy",
    "/terms",
    "/telemedicine-consent",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.7,
  }));

  const dynamicRoutes = testimonials.map((t) => ({
    url: `${baseUrl}/testimonials/${t.slug}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...routes, ...dynamicRoutes];
}
