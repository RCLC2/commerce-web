import { afterEach, describe, expect, it, vi } from "vitest";
import { getApiBaseUrl } from "./api-base-url";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Docker API routing", () => {
  it("uses the internal backend for server-side product requests", () => {
    vi.stubGlobal("window", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "same-origin");
    vi.stubEnv("BACKEND_API_BASE_URL", "http://api:8080/");
    expect(getApiBaseUrl()).toBe("http://api:8080");
  });

  it("keeps browser requests on the frontend origin", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "same-origin");
    vi.stubEnv("BACKEND_API_BASE_URL", "http://api:8080");
    expect(getApiBaseUrl()).toBe("");
  });
});
