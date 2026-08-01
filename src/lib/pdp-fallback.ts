import { ApiHttpError } from "./api-client";
import type { Product, Review, ReviewSummary } from "./types";

export function isNotFound(error: unknown): error is ApiHttpError {
  return error instanceof ApiHttpError && error.status === 404;
}

export function fallbackProduct(id: number, marketID = 1): Product {
  const galleryImages = [
    "/images/fashion-placeholder.svg",
    "/images/fashion-placeholder-detail.svg",
    "/images/fashion-placeholder-fabric.svg",
  ];
  const image = galleryImages[0];
  return {
    id,
    market_id: marketID,
    category_id: 1,
    name: "여름 데일리 린넨 셔츠",
    description: "미리보기 모드에서 제공하는 상품 상세 정보입니다.",
    summary_description: "가볍고 시원한 린넨 혼방 소재로 완성한 데일리 셔츠입니다.",
    detail_html: [
      '<section class="detail-band">',
      '<div class="detail-center">',
      "<h3>상품 이야기</h3>",
      "<p>백엔드 연결 전에도 긴 상품 상세 영역과 구매 동선을 확인할 수 있는 미리보기입니다.</p>",
      '<img src="/images/fashion-placeholder.svg" alt="상품 상세 미리보기" />',
      "<h4>소재 및 관리 방법</h4>",
      "<p>미지근한 물에 단독 세탁하고 그늘에서 자연 건조해 주세요.</p>",
      "</div>",
      "</section>",
    ].join(""),
    base_price: 69000,
    discount_price: 55200,
    shipping_type: "NORMAL",
    delivery_label: "무료 배송",
    popularity_score: 0,
    status: "SELLING",
    image_url: image,
    images: galleryImages.map((url, sort_order) => ({
      url,
      alt_text: `상품 미리보기 이미지 ${sort_order + 1}`,
      sort_order,
    })),
    market_name: "디어마켓",
    is_fallback: true,
    options: [
      {
        id: 1,
        product_id: id,
        option_name: "사이즈",
        option_value: "FREE",
        additional_price: 0,
        quantity: 20,
        is_active: true,
      },
    ],
  };
}

export function fallbackReviews(productID: number): Review[] {
  const option = { id: 1, name: "사이즈", value: "FREE" };
  const photo = (id: number, url: string) => [{
    id,
    media_asset_id: id,
    url,
    detail_url: url,
    thumbnail_url: url,
    sort_order: 0,
    is_representative: true,
    content_type: "image/svg+xml",
    size_bytes: 1,
  }];
  return [
    {
      id: 900001,
      product_id: productID,
      option_id: 1,
      rating_x2: 10,
      rating: 5,
      content: "핏이 여유롭고 소재가 가벼워서 한여름에도 편하게 입기 좋아요.",
      reviewer_name: "구매자 21**",
      verified_purchase: true,
      option,
      badges: ["VERIFIED_PURCHASE", "PHOTO_REVIEW", "BODY_PROFILE"],
      height_at_time: 164,
      weight_at_time: 52,
      is_photo_review: true,
      image_count: 1,
      images: photo(910001, "/images/fashion-placeholder-detail.svg"),
      created_at: "2026-08-01T00:00:00Z",
    },
    {
      id: 900002,
      product_id: productID,
      option_id: 1,
      rating_x2: 9,
      rating: 4.5,
      content: "사진별로 디테일을 비교하기 편했고 실제 색상도 화면과 비슷해요.",
      reviewer_name: "구매자 07**",
      verified_purchase: true,
      option,
      badges: ["VERIFIED_PURCHASE", "PHOTO_REVIEW"],
      is_photo_review: true,
      image_count: 1,
      images: photo(910002, "/images/fashion-placeholder-fabric.svg"),
      created_at: "2026-07-31T00:00:00Z",
    },
    {
      id: 900003,
      product_id: productID,
      option_id: 1,
      rating_x2: 10,
      rating: 5,
      content: "배송이 빨랐고 포장 상태도 깔끔했습니다. 다른 색상도 구매하고 싶어요.",
      reviewer_name: "구매자 84**",
      verified_purchase: true,
      option,
      badges: ["VERIFIED_PURCHASE"],
      is_photo_review: false,
      image_count: 0,
      images: [],
      created_at: "2026-07-30T00:00:00Z",
    },
    {
      id: 900004,
      product_id: productID,
      option_id: 1,
      rating_x2: 8,
      rating: 4,
      content: "기장이 생각보다 살짝 길지만 단독으로 입거나 아우터로 활용하기 좋습니다.",
      reviewer_name: "구매자 35**",
      verified_purchase: true,
      option,
      badges: ["VERIFIED_PURCHASE", "BODY_PROFILE"],
      height_at_time: 170,
      weight_at_time: 58,
      is_photo_review: false,
      image_count: 0,
      images: [],
      created_at: "2026-07-29T00:00:00Z",
    },
  ];
}

export function fallbackReviewSummary(productID: number): ReviewSummary {
  return {
    product_id: productID,
    review_count: 248,
    average_rating: 4.8,
    photo_review_count: 96,
    rating_distribution: {
      "0.5": 0,
      "1.0": 1,
      "1.5": 1,
      "2.0": 2,
      "2.5": 3,
      "3.0": 7,
      "3.5": 14,
      "4.0": 38,
      "4.5": 72,
      "5.0": 110,
    },
    latest_review_at: "2026-08-01T00:00:00Z",
    is_fallback: true,
  };
}
