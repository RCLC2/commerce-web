import type { InquiryCategory, InquiryStatus } from "./api/inquiries";

export const inquiryCategories: Array<{ value: InquiryCategory; label: string; description: string }> = [
  { value: "ORDER", label: "주문", description: "배송, 결제, 취소, 반품" },
  { value: "MEMBER", label: "회원", description: "계정과 회원정보" },
  { value: "EVENT", label: "이벤트", description: "이벤트 참여와 당첨" },
  { value: "PROMOTION", label: "프로모션", description: "쿠폰과 할인 혜택" },
  { value: "REPORT", label: "신고", description: "상품과 이용자 신고" },
  { value: "NOTIFICATION", label: "알림", description: "푸시와 알림함" },
  { value: "BUG_FEEDBACK", label: "오류·의견", description: "서비스 오류와 개선 의견" },
  { value: "OTHER", label: "기타", description: "그 밖의 문의" },
];

export const inquirySubcategories: Record<InquiryCategory, Array<{ value: string; label: string }>> = {
  ORDER: [
    { value: "DELIVERY", label: "배송" },
    { value: "PAYMENT_METHOD", label: "결제" },
    { value: "CANCEL", label: "취소" },
    { value: "RETURN", label: "반품" },
    { value: "ORDER_OTHER", label: "주문 기타" },
  ],
  MEMBER: [{ value: "ACCOUNT", label: "계정·회원정보" }],
  EVENT: [{ value: "EVENT_PARTICIPATION", label: "참여·당첨" }],
  PROMOTION: [{ value: "COUPON_BENEFIT", label: "쿠폰·혜택" }],
  REPORT: [{ value: "CONTENT_REPORT", label: "상품·이용자 신고" }],
  NOTIFICATION: [{ value: "PUSH_INBOX", label: "푸시·알림함" }],
  BUG_FEEDBACK: [{ value: "BUG_OR_FEEDBACK", label: "오류·개선 의견" }],
  OTHER: [{ value: "OTHER", label: "기타" }],
};

export const inquiryStatusMeta: Record<InquiryStatus, { label: string; className: string; description: string }> = {
  STARTED: { label: "접수", className: "bg-status-warning-subtle text-status-warning", description: "문의가 접수되어 답변을 기다리고 있어요." },
  IN_PROGRESS: { label: "처리 중", className: "bg-status-info-subtle text-status-info", description: "담당자가 문의를 확인하고 있어요." },
  COMPLETED: { label: "처리 완료", className: "bg-status-positive-subtle text-status-positive", description: "답변이 완료되었어요. 추가 질문을 보내면 다시 처리 상태로 바뀝니다." },
  CLOSED: { label: "종료", className: "bg-surface-subtle text-content-secondary", description: "종료된 문의입니다." },
};

export function categoryLabel(category: InquiryCategory, subcategory?: string) {
  const categoryName = inquiryCategories.find((item) => item.value === category)?.label ?? category;
  const subcategoryName = inquirySubcategories[category].find((item) => item.value === subcategory)?.label;
  return subcategoryName ? `${categoryName} · ${subcategoryName}` : categoryName;
}

export function inquiryDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(value));
}

export function surveyAvailable(dueAt?: string) {
  return Boolean(dueAt && new Date(dueAt).getTime() <= Date.now());
}
