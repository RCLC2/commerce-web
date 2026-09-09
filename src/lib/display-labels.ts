/** Display labels only. Keep API values and operator-defined identifiers intact. */
const labels: Record<string, string> = {
  GOOGLE: "구글", KAKAO: "카카오", NAVER: "네이버", APPLE: "애플",
  ALL: "전체 알림", EMAIL: "이메일", SMS: "문자", NONE: "받지 않음",
  MEMBER: "일반 회원", SELLER: "판매자", ADMIN: "관리자", SYSTEM: "시스템", ANONYMOUS: "비회원",
  SHOPIFY: "쇼피파이", CAFE24: "카페24",
  PENDING: "대기", FAILED: "실패", SUCCESS: "성공", CONNECTED: "연결됨", DISCONNECTED: "연결 해제",
  DRAFT: "초안", SCHEDULED: "예정", RUNNING: "진행 중", PAUSED: "일시 중지", ENDED: "종료",
  UNDER_REVIEW: "검수 중", APPROVED: "승인", REJECTED: "반려", ACTIVE: "활성", INACTIVE: "비활성",
  PRODUCT_CARD: "상품 카드", BANNER: "배너", MARKET_SHELF: "마켓 상품 모음", PROMOTION_CARD: "프로모션 카드", PUSH: "푸시 알림",
  CPM: "1,000회 노출당 과금", DAILY_FLAT: "일 정액",
  purchase_rate: "구매 전환율", revenue_per_user: "회원당 매출", ctr: "클릭률", impressions: "노출 수",
  INSUFFICIENT_DATA: "데이터 부족", NO_WINNER: "우승군 없음", WINNER: "우승군 확정", INCONCLUSIVE: "판정 보류",
  PRODUCT: "상품", MARKET: "마켓", URL: "웹 주소", CATALOG: "상품 목록",
};

export function displayLabel(value: string | null | undefined) {
  return value ? labels[value] ?? value : "-";
}

export function paymentMethodLabel(value: string | null | undefined) {
  const methods: Record<string, string> = {
    CARD: "카드", BANK_TRANSFER: "계좌 이체", TRANSFER: "계좌 이체",
    VIRTUAL_ACCOUNT: "가상 계좌", EASY_PAY: "간편 결제", MOBILE_PHONE: "휴대폰 결제",
    POINT: "포인트", TOSS: "토스페이", TOSS_PAY: "토스페이", TOSSPAY: "토스페이",
  };
  return value ? methods[value] ?? value : "결제 수단 미확인";
}

export function shippingTypeLabel(value: string | null | undefined) {
  const types: Record<string, string> = {
    NORMAL: "일반 배송",
    FREE: "무료 배송",
  };
  return value ? types[value] ?? value : "배송 유형 미확인";
}
