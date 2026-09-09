import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./navigation";

describe("safeInternalPath", () => {
  it("preserves same-origin paths, queries, and fragments", () => {
    expect(safeInternalPath("/products/7?tab=reviews#photo")).toBe("/products/7?tab=reviews#photo");
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "/safe/..//evil.example/path",
    "/\\evil.example/path",
    "javascript:alert(1)",
    " /orders/1",
  ])("falls back for unsafe navigation input %s", (value) => {
    expect(safeInternalPath(value)).toBe("/mypage");
  });
});
