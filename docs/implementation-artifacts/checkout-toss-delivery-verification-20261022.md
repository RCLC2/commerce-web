# 신규 주문 생성·실제 Toss TEST 결제·배송 완료 검증

> 아래 내용은 촬영·검증 당시의 기록이다. 이후 PR 분리·반영 상태와 현재 검증 범위는 [최신 안내](return-pickup-address-20261022.md)를 따른다.

검증일: 2026-10-22. 주문 0건인 전용 DB에서 Commerce 화면으로 새 주문을 생성했다. 기존 배송 완료 주문에 결제 기록을 연결하지 않았다. 커밋·푸시는 하지 않았다.

**후속 수정:** 아래에서 발견한 결제 콜백 재진입·반품 주소 전역 배너 두 문제를 수정했다. 기존 실제 결제 주문과 실제 API·DB로 재확인한 결과는 [오류 수정 검증](checkout-reentry-fixes-20261022.md)에 기록했다. 아래 재현 내용은 수정 전 관찰 기록이다.

## 결론

**일반 상품 1개·할인 없음·배송비 3,000원 조건의 정상 흐름은 통과했다.** 신규 배송지 등록 → 장바구니 주문 → 서버 견적 → 주문 생성 → 실제 Toss TEST 카카오페이 인증·승인 → Temporal 재고 확정 → 판매자 송장 등록 → 배송 완료 → 구매자 조회를 확인했다.

다만 배송 완료 후 결제 콜백 재진입과 반품 주소 미등록 오류 배너를 재현했으므로, 예외 흐름까지 모두 완료됐다고 판단하지 않는다.

## 환경과 실행 경계

- 프론트: `/Users/yeongjae/commerce-web`, `feat/commerce-web-ux-integration`, `3edc7c0`와 기존 미커밋 변경을 포함한 프로덕션 빌드.
- 백엔드: `/Users/yeongjae/commerce-toss-full-refund`, `feat/toss-full-refund`, `cb068dc`와 기존 미커밋 변경. 실제 API·transaction worker 실행 파일 사용.
- 전용 MySQL DB: `commerce_checkout_e2e_20261022_eb7fff`. 저장소 Goose 마이그레이션 모두 적용.
- 전용 Temporal dev server에서 실제 `OrderWorkflow`·`ConfirmStockActivity` 실행.
- 실제 `https://api.tosspayments.com`과 공식 개발 연동 체험 상점의 TEST 키 사용. PG 전송 가로채기·응답 대역 없음. 사용자가 카카오페이 인증을 완료했으며 실제 청구는 없다.
- 초기 데이터는 회원·마켓·상품·옵션·배송비 설정만 생성했다. 장바구니·배송지·주문은 화면으로 만들었다. 주문·재고·배송 상태를 SQL로 변경하지 않았다.
- 송장번호는 검증용 값이다. 판매자 화면의 배송 완료 처리를 확인했으며 실물 택배 접수·자동 추적·실제 배송은 검증하지 않았다.

## 새 주문 결과

주문번호: `ORD-1792671309279062000-1`.

| 단계 | 확인 결과 |
| --- | --- |
| 최초 상태 | 주문 0건, 구매자 배송지 0건, 옵션 재고 10개 |
| 상품·장바구니 | 상품 화면에서 네이비 1개 담기 → 선택 상품 주문 |
| 첫 배송지 | 주문서에서 직접 등록, addresses POST 201 |
| 서버 견적 | 상품 20,000원 + 배송비 3,000원 = 23,000원, quote POST 200 |
| 주문 생성 | orders POST 201, `PAYMENT_PENDING`, 예약 재고 1개 |
| 워크플로우 준비 | payment-request의 `ORDER_PAYMENT_PREPARING` 409 두 번 후 자동 재시도 200, 추가 주문 없음 |
| 실제 결제 | 카카오페이 인증 → Commerce 성공 콜백 → complete-payment 202 → `PAID` |
| 재고 확정 | Temporal 결제 완료 신호·ConfirmStockActivity 성공, 워크플로우 `COMPLETED` |
| 송장 등록 | 판매자 UI에서 CJ대한통운·검증용 송장 등록, API 200, 주문·마켓 주문·상품 `SHIPPED` |
| 배송 완료 | 판매자 확인창 실행, API 200, 주문·마켓 주문·상품·Delivery 모두 `DELIVERED` |
| 구매자 화면 | 재조회로 배송 완료·카카오페이·23,000원·택배사·송장 확인 |
| 최종 DB | 주문 1건, 승인 작업 1건, 재고 확정 작업 1건, 재고 9개·예약 0개, 활성 장바구니 0건, 배송·패키지 각 1건 |

관찰한 주문 상태는 `PAYMENT_PENDING → PAID → SHIPPED → DELIVERED`다. UI 진행 단계에는 주문 접수가 포함되지만 별도의 판매자 주문 접수 버튼을 누르거나 `PLACED` 상태를 확인한 것은 아니다.

### Toss·DB 대조와 중복 요청

- 공식 조회: `status=DONE`, `totalAmount=23000`, `balanceAmount=23000`, 카카오페이, 취소 0건. 승인 시각은 `2026-10-22T21:19:43+09:00`.
- DB 승인 작업: `PAYMENT_CONFIRMATION/SUCCEEDED`, `provider_status=DONE`, `provider_amount=23000`, 공급자 완료·로컬 완료 시각 저장.
- 배송 완료 후 같은 승인 요청을 두 번 더 보내고 성공 URL도 재방문했다. 요청은 400으로 거절됐으며 Toss 결제키·거래키·금액·잔액과 로컬 주문·재고는 유지됐다. **중복 승인·재고 차감 방지는 확인했지만 재진입 성공 응답과 화면 처리는 실패했다.**
- 응답 필드 의미는 [Toss 공식 코어 API](https://docs.tosspayments.com/reference#payment-객체)를 기준으로 대조했다.

## 보완이 필요한 두 문제

### 1. 배송 이후 결제 성공 URL 재진입

- 배송 완료 후 뒤로가기로 Toss 성공 URL을 열면 complete-payment 400과 “결제 대기 주문만 결제 완료 처리할 수 있습니다 (현재 상태: DELIVERED)”·“결제 다시 시도”가 나타난다.
- 백엔드 `internal/order/application/place_order_facade.go`의 `isPaidOrder`와 프론트 `src/app/payments/toss/success/toss-success-client.tsx`가 `PAID/PLACED`만 완료 상태로 인정한다.
- 보완 방향: 소유자·결제키·금액이 일치하는 기존 승인과 배송 이후 상태도 PG 재승인 없이 확인하고 성공 화면으로 연결한다. 취소·환불 주문은 별도 규칙으로 구분한다.
- 증거: `13-callback-revisit-error.png`, `toss-and-idempotency.json`, `database-after-replay.json`.

### 2. 기본 반품 주소 미등록이 콘솔 전체 오류로 표시

- 신규 마켓의 판매자 주문 상세에서 주소 등록 안내와 함께 “데이터를 불러오지 못했습니다 / 요청한 리소스를 찾을 수 없습니다”가 나타난다. 송장 등록·배송 완료는 성공한다.
- `src/components/order-return-management.tsx`는 주소 404를 미등록으로 처리하지만 `src/components/console-layout.tsx`가 관찰 중인 모든 오류 쿼리를 전역 오류로 집계한다.
- 보완 방향: 정상적인 미등록 상태를 조회 결과로 정규화하거나 전역 오류 집계에서 제외한다. 실제 장애는 계속 표시한다.
- 증거: `seller-invoice-confirmation.txt`, `seller-shipping.txt`, `08-seller-shipping.png`.

## 스키마 확인

- Goose만 적용한 새 DB에는 `coupon_targets`가 없어 공개 상품 쿠폰가 조회 경고가 발생했다. 상품 조회는 정상가로 200 응답했고 이번 무쿠폰 결제에는 영향이 없었다.
- 기존 `docs/infrastructure/coupon_targets_k3s_mysql_operations.md`에 별도 수동 DDL이 명시돼 있다. 정상 흐름 기록 후 해당 DDL을 전용 DB에 적용하고 상품 조회 성공을 확인했다. 운영 DB는 변경하지 않았다. 신규 환경에는 Goose 외에 이 DDL도 필요하며, 운영 적용 여부·쿠폰 할인 결제는 이번 결과로 판단할 수 없다.
- `shipping_packages`의 기존 배송 상태·시각 중복 컬럼은 갱신되지 않았다. 현재 엔터티·저장소와 기존 설계 문서상 `Delivery`가 배송 정보를 소유하고 중복 컬럼은 후속 contract 마이그레이션 제거 대상이다. 최종 상태는 `deliveries`로 판단했다.

## 증거와 범위

Git에서 제외된 `output/playwright/checkout-full-realpg-20261022/`에 보관했다.

- `01-cart.png`~`06-payment-confirmed.png`: 장바구니·첫 배송지·견적·주문 생성·실제 인증·승인 완료.
- `07-buyer-paid-order.png`~`12-buyer-delivered.png`: 결제 완료·송장·배송 중·판매자 배송 완료·구매자 결과.
- `14-mobile-delivered.png`: 새 주문의 390×844px 배송 완료 화면, 가로 넘침 없음. 새 주문의 전체 구매 과정을 모바일로 재실행한 것은 아니다.
- `verification-summary.json`, `toss-and-idempotency.json`, `database-after-delivery.txt`, `database-after-replay.json`, `order-workflow.json`, `http-route-summary.json`: PG·DB·워크플로우·HTTP 증거.

쿠폰·포인트, 복수 마켓·상품, 결제 중 재고 소진, 가상계좌 입금·환불, 현금영수증, 취소·반품, 구매확정·정산, 실기기 Safari는 이 새 주문 검증 범위에 포함하지 않았다. 기존 모바일 반품·실제 Toss 환불 결과는 [별도 보고서](returns-mobile-toss-verification-20261022.md)에 남아 있다.
