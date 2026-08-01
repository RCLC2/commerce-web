import type { CMSHomeSection, CommerceEvent, Product } from "./types";

const previewProductNames = [
  "소프트 코튼 오버핏 셔츠",
  "데일리 와이드 데님 팬츠",
  "미니멀 싱글 트렌치 코트",
  "클래식 레더 숄더백",
  "리브드 라운드 니트",
  "플리츠 롱 스커트",
  "시티 러너 스니커즈",
  "레이어드 실버 네크리스",
  "브이넥 셔링 원피스",
  "크롭 집업 후디",
];

export const fallbackHomeProducts: Product[] = Array.from({ length: 30 }, (_, index) => ({
  id: 90_001 + index,
  market_id: 900 + (index % 5),
  category_id: 1 + (index % 8),
  name: `${previewProductNames[index % previewProductNames.length]} ${Math.floor(index / previewProductNames.length) + 1}`,
  description: "백엔드 연결 전 홈 화면 확인을 위한 미리보기 상품입니다.",
  base_price: 29_000 + (index % 8) * 7_000,
  discount_price: index % 3 === 0 ? 24_900 + (index % 8) * 6_000 : 0,
  shipping_type: index % 4 === 0 ? "FREE" : "NORMAL",
  popularity_score: 100 - index,
  status: "SELLING",
  image_url: "/images/fashion-placeholder.svg",
  market_name: ["모먼트", "아카이브", "데일리무드", "스튜디오오", "누아르마켓"][index % 5],
}));

export const fallbackHomeEvents: CommerceEvent[] = [
  {
    id: 91_001,
    title: "슈즈 위크",
    subtitle: "새로운 계절을 위한 슈즈 셀렉션",
    image_url: "/images/fashion-placeholder.svg",
    link_url: "/events/91001",
    status: "ACTIVE",
    starts_at: "2026-08-01T00:00:00+09:00",
    ends_at: "2026-08-31T23:59:59+09:00",
  },
  {
    id: 91_002,
    title: "액세서리 데이",
    subtitle: "룩을 완성하는 작은 디테일",
    image_url: "/images/fashion-placeholder.svg",
    link_url: "/events/91002",
    status: "ACTIVE",
    starts_at: "2026-08-01T00:00:00+09:00",
    ends_at: "2026-08-31T23:59:59+09:00",
  },
];

export const fallbackHomeSections: CMSHomeSection[] = [
  {
    id: 92_001,
    sequence: 1,
    title: "지금 인기 있는 상품",
    description: "많이 찾는 아이템을 모았어요.",
    api_url: "/api/v1/products/popular",
    status: "ACTIVE",
  },
  {
    id: 92_002,
    sequence: 2,
    title: "새로 도착했어요",
    description: "오늘 업데이트된 신상품입니다.",
    api_url: "/api/v1/products/latest",
    status: "ACTIVE",
  },
];
