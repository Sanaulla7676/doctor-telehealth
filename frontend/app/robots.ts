import { MetadataRoute } from "next";

// Required for Next.js static export
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/portal", "/api/"],
    },
    sitemap: "https://doctor-telehealth.onrender.com/sitemap.xml",
  };
}
