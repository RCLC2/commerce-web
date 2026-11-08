export type CustomerInquiry = {
  id: string;
  category: string;
  title: string;
  content: string;
  createdAt: string;
  productName?: string;
} & (
  | { status: "WAITING" | "IN_PROGRESS"; answer?: never }
  | { status: "ANSWERED"; answer: { content: string; createdAt: string } }
);

/** Only enabled by NEXT_PUBLIC_INQUIRY_PREVIEW in the local preview build. */
export const previewInquiries: readonly CustomerInquiry[] = [
  {
    id: "preview-delivery",
    category: "배송 문의",
    title: "주문한 니트는 언제 출고되나요?",
    content: "이번 주말에 입으려고 주문했어요. 출고 예정일과 배송 일정을 확인하고 싶습니다.",
    productName: "데일리 소프트 라운드 니트",
    createdAt: "2026-11-08T01:30:00Z",
    status: "WAITING",
  },
  {
    id: "preview-option",
    category: "주문·상품 문의",
    title: "출고 전에 사이즈를 변경할 수 있나요?",
    content: "주문한 팬츠의 사이즈를 M에서 L로 변경하고 싶어요. 출고 전 변경이 가능한지 확인 부탁드립니다.",
    productName: "코튼 와이드 데님 팬츠",
    createdAt: "2026-11-07T05:10:00Z",
    status: "IN_PROGRESS",
  },
  {
    id: "preview-coupon",
    category: "결제·혜택 문의",
    title: "쿠폰과 포인트를 함께 사용할 수 있나요?",
    content: "보유한 할인 쿠폰과 포인트를 이번 주문에 함께 사용하고 싶어요. 적용 방법을 알려주세요.",
    createdAt: "2026-11-06T02:20:00Z",
    status: "ANSWERED",
    answer: {
      content: "네, 쿠폰의 사용 조건을 충족하면 포인트와 함께 사용할 수 있어요. 주문서의 쿠폰·포인트 영역에서 쿠폰을 선택한 뒤 사용할 포인트를 입력해주세요. 최종 결제 금액을 확인하고 결제하시면 됩니다.",
      createdAt: "2026-11-06T04:45:00Z",
    },
  },
];
