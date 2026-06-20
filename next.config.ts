import type { NextConfig } from "next";

const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async rewrites() {
    if (!backendApiBaseUrl) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendApiBaseUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
