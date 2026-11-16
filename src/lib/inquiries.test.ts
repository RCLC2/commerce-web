import { describe, expect, it, vi } from "vitest";
import { categoryLabel, inquiryStatusMeta, surveyAvailable } from "./inquiries";

describe("inquiry presentation", () => {
  it("uses customer-facing labels for category and lifecycle status", () => {
    expect(categoryLabel("ORDER", "RETURN")).toBe("주문 · 반품");
    expect(categoryLabel("BUG_FEEDBACK", "BUG_OR_FEEDBACK")).toBe("오류·의견 · 오류·개선 의견");
    expect(inquiryStatusMeta.COMPLETED.label).toBe("처리 완료");
  });

  it("only exposes satisfaction after the server due time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T03:20:00Z"));
    expect(surveyAvailable("2026-11-16T03:19:59Z")).toBe(true);
    expect(surveyAvailable("2026-11-16T03:20:01Z")).toBe(false);
    expect(surveyAvailable()).toBe(false);
    vi.useRealTimers();
  });
});
