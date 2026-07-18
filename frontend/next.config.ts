import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export so Express can serve the compiled files from public/
  output: 'export',
  // Generate /auth/index.html instead of /auth.html for cleaner Express routing
  trailingSlash: true,
  images: {
    // Required for static export
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  // Note: rewrites() is not compatible with output: 'export'
  // In production, Express handles /api/* routing directly
  // For local dev, set NEXT_PUBLIC_API_URL=https://doctor-telehealth.onrender.com
};

export default nextConfig;
