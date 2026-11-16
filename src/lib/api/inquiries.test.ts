import { describe, expect, it } from "vitest";
import { naturalLanguageInquirySearchResponseSchema } from "./inquiries";

const inquiry = {
  id: 403,
  member_id: 3,
  member_email: "minji@example.com",
  owner_type: "ADMIN",
  category: "PROMOTION",
  subcategory: "COUPON_BENEFIT",
  title: "쿠폰이 결제 화면에 보이지 않아요",
  status: "COMPLETED",
  last_message_at: "2026-11-14T03:20:00Z",
  created_at: "2026-11-14T01:00:00Z",
  updated_at: "2026-11-14T03:20:00Z",
  match_reason: "결제 화면의 쿠폰 문제를 직접 설명하는 문의입니다.",
  highlights: ["쿠폰", "결제 화면"],
};

describe("naturalLanguageInquirySearchResponseSchema", () => {
  it("accepts interpreted queries and per-result explanations", () => {
    const result = naturalLanguageInquirySearchResponseSchema.parse({
      interpretation: {
        summary: "결제 화면의 쿠폰 문의를 찾습니다.",
        keywords: ["쿠폰", "결제 화면"],
        category: "PROMOTION",
      },
      summary: "쿠폰 노출 문제와 관련된 문의 1건입니다.",
      items: [inquiry],
      limit: 30,
      offset: 0,
      total: 1,
    });

    expect(result.items[0].match_reason).toContain("쿠폰");
  });

  it("rejects unexplained results", () => {
    expect(() => naturalLanguageInquirySearchResponseSchema.parse({
      interpretation: { summary: "쿠폰 문의", keywords: ["쿠폰"] },
      summary: "결과입니다.",
      items: [{ ...inquiry, match_reason: "" }],
      limit: 30,
      offset: 0,
      total: 1,
    })).toThrow();
  });
});
