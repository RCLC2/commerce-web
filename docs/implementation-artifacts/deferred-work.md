- source_spec: `docs/implementation-artifacts/spec-frontend-api-contract-recovery.md`
  summary: Next.js와 전이 의존성의 high 등급 보안 권고를 별도 의존성 업그레이드 작업으로 처리한다.
  evidence: `npm audit --omit=dev --audit-level=high`가 기존 `next@16.2.7` 및 포함된 PostCSS·Sharp에 3건을 보고하며, 자동 수정은 현재 명시 범위를 벗어난 `next@16.2.12` 강제 업그레이드를 요구한다.
- source_spec: `docs/implementation-artifacts/spec-frontend-origin-main-contract-followup.md`
  summary: 쿠폰 견적 요청 금액이 유한한 안전 정수인지 검증하는 입력 경계를 별도 작업으로 보강한다.
  evidence: 기존 `customer.ts` 구현은 `NaN`·`Infinity`·안전 정수 범위 밖 값을 `Math.max`와 `Math.floor`에 통과시켜 잘못된 `order_amount` 쿼리를 만들 수 있으며, 이번 응답 계약 복구에서 새로 생긴 문제는 아니다.
- source_spec: none
  summary: 주문 상세에서 현재 백엔드의 배송 정보를 조회하고 고객 배송조회 기능을 연결한다.
  evidence: 좋아요·팔로우·리뷰·쿠폰 상태 수정과 독립적으로 배포 가능한 주문 상세 기능이므로 사용자 선택에 따라 분리했다.
- source_spec: none
  summary: 개인화 추천과 CMS 홈 구좌를 백엔드 설정 및 회원 추천 결과에 맞게 연결한다.
  evidence: 고객 상호작용 상태 수정과 독립적인 홈 콘텐츠 전달 기능이므로 사용자 선택에 따라 분리했다.
