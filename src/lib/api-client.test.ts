import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiContractError, ApiParseError, parseContract, parseVoid, request } from "./api-client";

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
});
