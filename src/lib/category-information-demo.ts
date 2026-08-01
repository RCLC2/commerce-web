import type { CategoryInformation, CommerceCategory, Market, Product } from "./types";

const demoCategories: CommerceCategory[] = [
  {
    id: 1, name: "아우터", slug: "outer", href: "/products?category=outer", depth: 1, level: 1, sort_order: 1, category_ids: [1, 11, 12],
    children: [
      { id: 11, parent_id: 1, name: "재킷", slug: "jacket", href: "/products?category=jacket", depth: 2, level: 2, sort_order: 1, category_ids: [11] },
      { id: 12, parent_id: 1, name: "카디건", slug: "cardigan", href: "/products?category=cardigan", depth: 2, level: 2, sort_order: 2, category_ids: [12] },
    ],
  },
  {
    id: 2, name: "상의", slug: "tops", href: "/products?category=tops", depth: 1, level: 1, sort_order: 2, category_ids: [2, 21, 22],
    children: [
      { id: 21, parent_id: 2, name: "티셔츠", slug: "t-shirts", href: "/products?category=t-shirts", depth: 2, level: 2, sort_order: 1, category_ids: [21] },
      { id: 22, parent_id: 2, name: "니트", slug: "knit", href: "/products?category=knit", depth: 2, level: 2, sort_order: 2, category_ids: [22] },
    ],
  },
  {
    id: 3, name: "하의", slug: "bottoms", href: "/products?category=bottoms", depth: 1, level: 1, sort_order: 3, category_ids: [3, 31, 32],
    children: [
      { id: 31, parent_id: 3, name: "데님", slug: "denim", href: "/products?category=denim", depth: 2, level: 2, sort_order: 1, category_ids: [31] },
      { id: 32, parent_id: 3, name: "슬랙스", slug: "slacks", href: "/products?category=slacks", depth: 2, level: 2, sort_order: 2, category_ids: [32] },
    ],
  },
];

const productNames = [
  "클린 라인 싱글 재킷", "소프트 크롭 카디건", "데일리 오버핏 재킷", "라이트 니트 집업",
  "스탠다드 코튼 티", "보트넥 리브 니트", "모달 레이어드 티", "컬러 블록 니트",
  "워시드 스트레이트 데님", "핀턱 와이드 슬랙스", "딥 인디고 데님", "셋업 테이퍼드 팬츠",
  "미니멀 하프 재킷", "버튼 포인트 카디건", "시그니처 라운드 니트", "데일리 세미 와이드 데님",
];
const categoryIDs = [11, 12, 11, 12, 21, 22, 21, 22, 31, 32, 31, 32, 11, 12, 22, 31];
const markets = ["아카이브룸", "모노데이", "시티브리즈", "르바인"];

const demoProducts: Product[] = productNames.map((name, index) => ({
  id: 9001 + index,
  market_id: 101 + (index % markets.length),
  market_name: markets[index % markets.length],
  market: { id: 101 + (index % markets.length), name: markets[index % markets.length] },
  category_id: categoryIDs[index],
  name,
  description: "카테고리 페이지 화면 검수를 위한 데모 상품입니다.",
  base_price: 69000 + (index % 4) * 12000,
  discount_price: 49000 + (index % 4) * 10000,
  shipping_type: index % 3 === 0 ? "FREE" : "NORMAL",
  popularity_score: 100 - index,
  realtime_popularity_score: 100 - index,
  status: "SELLING",
  tags: index % 2 === 0 ? ["오늘출발", "신상"] : ["쿠폰가능", "리뷰많음"],
  tag_chips: [
    ...(index % 3 === 0 ? [{ code: "FREE_SHIPPING", label: "무료배송", tone: "shipping" as const }] : []),
    ...(index % 2 === 0
      ? [{ code: "SAME_DAY_DISPATCH", label: "오늘출발", tone: "delivery" as const }, { code: "NEW", label: "신상", tone: "new" as const }]
      : [{ code: "EXCLUSIVE_DEAL", label: "단독특가", tone: "exclusive" as const }]),
  ],
}));

export function demoCategoryInformation(categorySlug: string, page: number, pageSize: number): CategoryInformation {
  const selected = findCategory(demoCategories, categorySlug) ?? demoCategories[0];
  const allowedIDs = selected.category_ids?.length ? selected.category_ids : [selected.id];
  const categoryProducts = demoProducts.filter((product) => allowedIDs.includes(product.category_id));
  const start = (page - 1) * pageSize;
  const products = categoryProducts.slice(start, start + pageSize);
  return {
    categories: demoCategories,
    selected_category: selected,
    bundle_label: `${allowedIDs.length}개 카테고리 묶음`,
    products,
    pagination: { page, page_size: pageSize, has_next: start + pageSize < categoryProducts.length },
    realtime_popular_carousel: {
      title: `${selected.name} 실시간 인기 상품`,
      description: "지금 이 카테고리에서 반응이 빠르게 오르는 상품입니다.",
      insert_after: 0,
      captured_at: new Date().toISOString(),
      products: [...categoryProducts]
        .sort((a, b) => (b.realtime_popularity_score ?? b.popularity_score) - (a.realtime_popularity_score ?? a.popularity_score))
        .slice(0, 8),
    },
    is_demo: true,
  };
}

export function demoMarket(marketId: number): Market {
  const marketIndex = Math.max(0, marketId - 101) % markets.length;
  return {
    id: marketId,
    name: markets[marketIndex],
    description: "감도 높은 데일리 상품을 소개하는 입점 마켓입니다.",
    follower_count: 12400 + marketIndex * 1800,
    status: "OPEN",
    tags: ["데일리", "신상품", "빠른배송"],
  };
}

export function demoMarketProducts(marketId: number): Product[] {
  const products = demoProducts.filter((product) => product.market_id === marketId);
  return products.length ? products : demoProducts.slice(0, 8).map((product) => ({
    ...product, market_id: marketId, market_name: demoMarket(marketId).name, market: { id: marketId, name: demoMarket(marketId).name },
  }));
}

function findCategory(categories: CommerceCategory[], slug: string): CommerceCategory | undefined {
  for (const category of categories) {
    if (!slug || category.slug === slug) return category;
    const child = findCategory(category.children ?? [], slug);
    if (child) return child;
  }
}
