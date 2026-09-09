import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import { logClientApiError } from "./client-error-logger";

describe("logClientApiError", () => {
  it("logs only endpoint, status, code, request ID, and contract issues", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new ApiError("공개 메시지", "http", 500, {
      secret: "never-log-me",
      authorization: "Bearer token",
    }, "PRODUCT_POPULAR_READ_FAILED", "request-123");

    logClientApiError("/api/v1/products/popular", error);

    expect(consoleError).toHaveBeenCalledWith("[commerce-api-error]", {
      endpoint: "/api/v1/products/popular",
      status: 500,
      code: "PRODUCT_POPULAR_READ_FAILED",
      request_id: "request-123",
      issues: undefined,
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("never-log-me");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("Bearer token");
  });
});
