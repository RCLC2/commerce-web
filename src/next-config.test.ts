import { afterEach, describe, expect, it, vi } from "vitest";

const originalImgproxyBaseURL = process.env.IMGPROXY_BASE_URL;
const originalPublicImgproxyBaseURL = process.env.NEXT_PUBLIC_IMGPROXY_BASE_URL;

afterEach(() => {
  if (originalImgproxyBaseURL === undefined) delete process.env.IMGPROXY_BASE_URL;
  else process.env.IMGPROXY_BASE_URL = originalImgproxyBaseURL;
  if (originalPublicImgproxyBaseURL === undefined) delete process.env.NEXT_PUBLIC_IMGPROXY_BASE_URL;
  else process.env.NEXT_PUBLIC_IMGPROXY_BASE_URL = originalPublicImgproxyBaseURL;
  vi.resetModules();
});

describe("Next image origins", () => {
  it("does not expose the internal imgproxy origin when legacy environment values exist", async () => {
    process.env.IMGPROXY_BASE_URL = "http://commerce-imgproxy:8080";
    process.env.NEXT_PUBLIC_IMGPROXY_BASE_URL = "http://commerce-imgproxy:8080";
    vi.resetModules();

    const { default: nextConfig } = await import("../next.config");
    const patterns = nextConfig.images?.remotePatterns ?? [];

    expect(patterns).not.toContainEqual(
      expect.objectContaining({
        hostname: "commerce-imgproxy",
      }),
    );
  });
});
