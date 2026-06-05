import { SimpleProductSection } from "@/components/simple-product-section";

export default function Recommendations() {
  return <SimpleProductSection title="추천 상품" description="취향 기반 추천 영역을 위한 상품 리스트입니다." query={{ sort: "popular" }} />;
}
