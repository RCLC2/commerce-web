import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ApiContractError,
  ApiParseError,
  parseContract,
  parseVoid,
  request,
  shouldRetryApiError,
} from "./api-client";

afterEach(() => vi.unstubAllGlobals());

describe("request", () => {
  it("keeps a raw JSON response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 1 }]), { status: 200 })));
    await expect(request("/raw")).resolves.toEqual([{ id: 1 }]);
  });

  it("unwraps only a recognized success envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { id: 2 } }), { status: 200 })));
    await expect(request("/envelope")).resolves.toEqual({ id: 2 });
  });

  it("does not unwrap a raw object just because it has a success field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, status: "ok" }), { status: 200 })));
    await expect(request("/raw-success")).resolves.toEqual({ success: true, status: "ok" });
  });

  it("keeps a raw business object that also has success and data fields", async () => {
    const payload = { success: true, data: { id: 1 }, business_type: "REPORT" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 })));
    await expect(request("/raw-business")).resolves.toEqual(payload);
  });

  it("accepts an empty 201 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 201 })));
    await expect(request("/created", { method: "POST" })).resolves.toBeUndefined();
  });

  it.each([401, 403, 404, 409, 422, 500])("maps HTTP %s to a status-aware error", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("failure", { status })));
    await expect(request("/failure")).rejects.toMatchObject({ kind: "http", status });
  });

  it("preserves the common error code and request ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: {
        code: "EVENT_PRODUCT_READ_FAILED",
        message: "이벤트 상품을 불러오지 못했습니다.",
        request_id: "2f6ddbc3-374e-4285-b934-fca9f01356e1",
        details: { event_id: 104 },
      },
    }), { status: 500 })));

    await expect(request("/api/v1/events/104/products")).rejects.toMatchObject({
      kind: "http",
      status: 500,
      code: "EVENT_PRODUCT_READ_FAILED",
      requestID: "2f6ddbc3-374e-4285-b934-fca9f01356e1",
      message: "이벤트 상품을 불러오지 못했습니다.",
      details: { event_id: 104 },
    });
  });

  it("clears the stored session and emits an unauthorized event for an authenticated 401", async () => {
    window.localStorage.setItem("commerce.accessToken", "expired");
    const listener = vi.fn();
    window.addEventListener("commerce:unauthorized", listener);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("expired", { status: 401 })));

    await expect(request("/me", { token: "expired" })).rejects.toMatchObject({ status: 401 });

    expect(window.localStorage.getItem("commerce.accessToken")).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("commerce:unauthorized", listener);
  });
  it("distinguishes invalid JSON from an HTTP failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    await expect(request("/invalid-json")).rejects.toBeInstanceOf(ApiParseError);
  });

  it("classifies a fetch rejection without logging its private cause", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private DNS details")));
    await expect(request("/offline")).rejects.toMatchObject({
      kind: "network",
      code: "API_NETWORK_ERROR",
      message: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
    });
  });
});

describe("parseVoid", () => {
  it("rejects a raw failed status instead of reporting mutation success", () => {
    expect(() => parseVoid({ status: "FAILED", message: "처리 실패" }, "/commands"))
      .toThrow("처리 실패");
  });
});

describe("parseContract", () => {
  it("returns a validated endpoint value", () => {
    expect(parseContract(z.object({ id: z.number() }), { id: 1 }, "/items")).toEqual({ id: 1 });
  });

  it("throws a distinct contract error for a wrong shape", () => {
    expect(() => parseContract(z.object({ id: z.number() }), { id: "1" }, "/items")).toThrow(ApiContractError);
  });

  it("preserves exact Zod issue paths for contract diagnostics", () => {
    const schema = z.object({
      items: z.array(z.object({
        tag_chips: z.array(z.object({ tone: z.enum(["shipping", "delivery", "exclusive", "new", "default"]) })),
      })),
    });

    try {
      parseContract(schema, { items: [{ tag_chips: [{ tone: "promotion" }] }] }, "/api/v1/products/popular");
      throw new Error("expected parseContract to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiContractError);
      expect((error as ApiContractError).issues[0]?.path).toEqual(["items", 0, "tag_chips", 0, "tone"]);
    }
  });

});

describe("shouldRetryApiError", () => {
  it("does not retry schema contract failures", () => {
    expect(shouldRetryApiError(0, new ApiContractError("/products", []))).toBe(false);
  });

  it("allows one retry for a transient HTTP failure", () => {
    expect(shouldRetryApiError(0, new Error("temporary"))).toBe(true);
    expect(shouldRetryApiError(1, new Error("temporary"))).toBe(false);
  });
});
