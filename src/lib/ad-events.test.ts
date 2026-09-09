import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-client";
import { advertisingApi } from "./api/advertising";
import { logAdvertisingError, recordAdvertisingEvent } from "./ad-events";

afterEach(() => vi.restoreAllMocks());

describe("advertising event diagnostics", () => {
  it("keeps event failures from blocking navigation and logs trace fields", async () => {
    vi.spyOn(advertisingApi, "recordAdEvent").mockRejectedValue(new ApiError(
      "이벤트 저장 실패",
      "http",
      500,
      undefined,
      "AD_EVENT_WRITE_FAILED",
      "request-99",
    ));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(recordAdvertisingEvent({
      decisionID: "decision-7",
      placementKey: "search.sponsored_top",
      type: "CLICK",
      token: "token",
    })).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith("[commerce-advertising-error]", expect.objectContaining({
      placement_key: "search.sponsored_top",
      decision_id: "decision-7",
      code: "AD_EVENT_WRITE_FAILED",
      request_id: "request-99",
    }));
  });

  it("logs decision failures with their placement even before a decision exists", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logAdvertisingError(new ApiError("인증 실패", "http", 401, undefined, "AUTH_TOKEN_INVALID", "request-1"), {
      placementKey: "home.main_banner",
      operation: "decision",
    });

    expect(consoleError).toHaveBeenCalledWith("[commerce-advertising-error]", expect.objectContaining({
      placement_key: "home.main_banner",
      decision_id: undefined,
      code: "AUTH_TOKEN_INVALID",
      request_id: "request-1",
    }));
  });
});
