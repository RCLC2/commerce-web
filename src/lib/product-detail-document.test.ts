import { describe, expect, it } from "vitest";
import {
  createProductDetailBlock,
  detailDocumentFromDescription,
  emptyProductDetailDocument,

  serializeProductDetailDocument,
  withProductDetailBlocks,
} from "./product-detail-document";

describe("product detail document", () => {
  it("renders seller blocks into portable commerce HTML without interpolating unsafe text", () => {
    const document = withProductDetailBlocks(emptyProductDetailDocument(), [
      createProductDetailBlock("hero", {
        title: "매일 입고 싶은 <니트>",
        body: "부드러운 촉감 & 편안한 실루엣",
        imageURL: "https://images.example.com/knit.jpg",
        imageAlt: "베이지 니트",
      }),
      createProductDetailBlock("features", { title: "이런 점이 좋아요", items: ["가벼운 무게", "탄탄한 마감"] }),
    ]);

    expect(document.html).toContain("detail-hero");
    expect(document.html).toContain("매일 입고 싶은 &lt;니트&gt;");
    expect(document.html).toContain("부드러운 촉감 &amp; 편안한 실루엣");
    expect(document.html).toContain('<img src="https://images.example.com/knit.jpg" alt="베이지 니트">');
    expect(document.html).toContain("탄탄한 마감");
  });

  it("round-trips an authored builder document and falls back to HTML-only legacy content", () => {
    const authored = withProductDetailBlocks(emptyProductDetailDocument(), [
      createProductDetailBlock("text", { title: "상품 소개", body: "한 줄 소개" }),
    ]);
    const restored = detailDocumentFromDescription(serializeProductDetailDocument(authored));

    expect(restored).toEqual(authored);

    const legacy = detailDocumentFromDescription(JSON.stringify({ html: "<p>기존 상세 설명</p>" }));
    expect(legacy.blocks).toEqual([]);
    expect(legacy.html).toBe("<p>기존 상세 설명</p>");
  });

  it("drops unsupported blocks from malformed saved documents", () => {
    const malformed = detailDocumentFromDescription(JSON.stringify({ version: 1, blocks: [{ id: "unknown", type: "unknown" }], html: "<p>보존할 HTML</p>" }));

    expect(malformed.blocks).toEqual([]);
    expect(malformed.html).toBe("<p>보존할 HTML</p>");
  });
});
