import type { NextConfig } from "next";

const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.trim().replace(/\/+$/, "");
const experimentApiBaseUrl = (process.env.EXPERIMENT_API_BASE_URL?.trim() || "http://localhost:8081").replace(/\/+$/, "");

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
  },
  {
    protocol: "https",
    hostname: "images.pexels.com",
  },
  {
    protocol: "https",
    hostname: "picsum.photos",
  },
  {
    protocol: "https",
    hostname: "*.supabase.co",
    pathname: "/storage/v1/object/**",
  },
  {
    protocol: "https",
    hostname: "*.supabase.co",
    pathname: "/storage/v1/render/image/**",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns,
  },
  async rewrites() {
    const rewrites = [
      {
        source: "/experiment-api/:path*",
        destination: `${experimentApiBaseUrl}/:path*`,
      },
    ];

    if (backendApiBaseUrl) {
      rewrites.push({
        source: "/api/v1/:path*",
        destination: `${backendApiBaseUrl}/api/v1/:path*`,
      });
    }

    return rewrites;
  },
};

export default nextConfig;
