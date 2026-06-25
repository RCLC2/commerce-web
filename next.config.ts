import type { NextConfig } from "next";

const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.trim().replace(/\/+$/, "");

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
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

function remotePatternFromBaseUrl(rawBaseUrl?: string): RemotePattern | null {
  const baseUrl = rawBaseUrl?.trim();
  if (!baseUrl) {
    return null;
  }

  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return {
      protocol: url.protocol.slice(0, -1) as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

const imgproxyRemotePattern = remotePatternFromBaseUrl(process.env.IMGPROXY_BASE_URL ?? process.env.NEXT_PUBLIC_IMGPROXY_BASE_URL);
if (imgproxyRemotePattern) {
  remotePatterns.push(imgproxyRemotePattern);
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
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
