import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://doctor-telehealth.onrender.com/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'https://doctor-telehealth.onrender.com/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
