import { fallbackHomeEvents, fallbackHomeProducts } from "./home-preview-fallback";
import type { EventDetail, EventProduct, EventProductPage, EventSort } from "./event-detail-types";

const sortOptions: EventDetail["product_display"]["sort_options"] = [
  { value: "RECOMMENDED", label: "추천순" },
  { value: "POPULAR", label: "인기순" },
  { value: "NEWEST", label: "최신순" },
  { value: "PRICE_ASC", label: "낮은 가격순" },
  { value: "PRICE_DESC", label: "높은 가격순" },
];

const filters = {
  markets: ["모먼트", "아카이브", "데일리무드", "스튜디오오", "누아르마켓"].map((name, index) => ({ id: 900 + index, name })),
  categories: ["상의", "팬츠", "원피스", "아우터", "가방", "스커트", "슈즈", "액세서리"].map((name, index) => ({ id: index + 1, name })),
};

export const fallbackEventDetails: Record<number, EventDetail> = Object.fromEntries(
  fallbackHomeEvents.map((event) => [event.id, {
    ...event,
    design_variant: event.id === 91002 ? "MARKET_STORY" : "BENEFIT_FOCUS",
    product_display: {
      enabled: true,
      mode: event.id === 91002 ? "MARKET_CAROUSELS" : "PRODUCT_GRID",
      section_title: event.id === 91002 ? "참여 마켓" : "슈즈 위크 상품",
      default_sort: event.id === 91002 ? "POPULAR" : "RECOMMENDED",
      sort_options: sortOptions,
      ...filters,
    },
    rewards: event.id === 91002 ? [
      {
        id: 93001, event_id: event.id, reward_type: "COUPON", reward_id: 94001,
        title: "5,000원 쿠폰", description: "참여 마켓 상품 3만 원 이상 구매 시", button_label: "쿠폰 받기", sequence: 1,
      },
      {
        id: 93004, event_id: event.id, reward_type: "COUPON", reward_id: 94003,
        title: "10% 할인 쿠폰", description: "5만 원 이상 구매 시 최대 1만 5천 원 할인", button_label: "쿠폰 받기", sequence: 2,
      },
      {
        id: 93005, event_id: event.id, reward_type: "POINT_EVENT", reward_id: 95002,
        title: "2,000P 받기", description: "이벤트 기간 중 1회 지급", button_label: "포인트 받기", sequence: 3,
      },
    ] : [
      { id: 93002, event_id: event.id, reward_type: "COUPON", reward_id: 94002, title: "15% 할인 쿠폰", description: "3만 원 이상 구매 시 최대 2만 원 할인", button_label: "쿠폰 받기", sequence: 1 },
      { id: 93003, event_id: event.id, reward_type: "POINT_EVENT", reward_id: 95001, title: "1,000P 받기", description: "이벤트 기간 중 1회 지급", button_label: "포인트 받기", sequence: 2 },
    ],
  }]),
);

export function fallbackEventProductPage(params: {
  eventID: number; limit: number; offset: number; sort: EventSort; marketID?: number; categoryID?: number;
}): EventProductPage {
  const detail = fallbackEventDetails[params.eventID];
  const marketProfiles = [
    { description: "매일 입기 좋은 감도의 데일리 셀렉션", followers: 12840 },
    { description: "오래 두고 싶은 클래식 아이템 아카이브", followers: 9320 },
    { description: "편안한 실루엣과 차분한 컬러를 소개해요", followers: 18650 },
    { description: "도시적인 무드의 작은 디테일을 만나요", followers: 7140 },
    { description: "선명한 취향을 담은 컨템포러리 마켓", followers: 11370 },
  ];
  let products: EventProduct[] = fallbackHomeProducts.map((product) => {
    const profile = marketProfiles[(product.market_id - 900) % marketProfiles.length];
    return {
      ...product,
      market_profile_image_url: "/images/fashion-placeholder.svg",
      market_description: profile.description,
      market_follower_count: profile.followers,
    };
  });
  if (params.marketID) products = products.filter((product) => product.market_id === params.marketID);
  if (params.categoryID) products = products.filter((product) => product.category_id === params.categoryID);
  products.sort((a, b) => compareEventProducts(a, b, params.sort));
  const items = products.slice(params.offset, params.offset + params.limit);
  return {
    mode: detail?.product_display.mode ?? "PRODUCT_GRID",
    items,
    paging: { limit: params.limit, offset: params.offset, has_next: params.offset + items.length < products.length },
  };
}

function compareEventProducts(a: EventProduct, b: EventProduct, sort: EventSort) {
  const price = (product: EventProduct) => product.discount_price || product.base_price;
  if (sort === "PRICE_ASC") return price(a) - price(b);
  if (sort === "PRICE_DESC") return price(b) - price(a);
  if (sort === "NEWEST") return b.id - a.id;
  return b.popularity_score - a.popularity_score || b.id - a.id;
}
