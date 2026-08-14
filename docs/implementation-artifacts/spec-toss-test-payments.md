---
title: '토스 테스트 결제 전환'
type: 'feature'
created: '2026-08-14'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'a3ef6123bc6ac5b9c9660a7301997d44ca6d6f67'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 현재 주문 결제는 Lemon Squeezy가 생성한 hosted checkout URL과 webhook에 의존해 실제 테스트 결제 완료를 재현하지 못하며, 그 결과 결제 이후 배송·구매확정·리뷰 CRUD 전체 흐름도 안정적으로 검증하기 어렵다.

**Approach:** 최신 `origin/main`에서 분리한 프런트·백엔드 worktree에서 Lemon Squeezy를 제거하고, 토스페이먼츠 테스트 키 전용 결제위젯과 서버 승인·취소 API를 연결한다. 주문과 금액은 항상 서버 DB 값을 기준으로 검증하고, 토스 승인 후 기존 Temporal 주문 워크플로우를 그대로 진행한다.

## Boundaries & Constraints

**Always:** 브라우저에는 공개 client key만 전달하고 secret key는 백엔드에서만 사용한다. `test_gck_`/`test_gsk_` 키만 허용해 실제 과금 가능성을 차단한다. 결제 승인 전 로그인 사용자 소유권, `PAYMENT_PENDING`, 주문 ID, 서버 계산 금액을 검증한다. 승인 응답의 결제키·주문 ID·금액·`DONE` 상태를 재검증한 뒤에만 워크플로우에 신호를 보낸다. 승인과 전액 취소에는 재시도해도 같은 멱등 키를 사용한다. 기존 쿠폰·포인트·재고 보상과 구매확정·리뷰 조건은 유지한다. 기존 dirty worktree는 건드리지 않고 커밋·푸시하지 않는다.

**Ask First:** 일반결제 외 자동결제·가상계좌·브랜드페이·외부 셀러 지급대행까지 확장해야 하는 경우, 라이브 키를 허용해야 하는 경우, 결제 시도 전용 테이블이나 별도 Toss order ID 저장 컬럼이 필요해지는 경우에는 범위를 넓히기 전에 사용자에게 확인한다.

**Never:** secret key를 `NEXT_PUBLIC_*`, 프런트 번들, 로그, 저장소에 넣지 않는다. 콜백 URL의 금액이나 결제수단 문자열만 신뢰해 주문을 완료하지 않는다. 테스트용 결제를 라이브 결제처럼 활성화하지 않는다. 사업자·PG 계약·카드사 심사·지급대행은 구현 범위에 포함하지 않는다.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| 정상 카드 결제 | 본인 `PAYMENT_PENDING` 주문, 일치하는 order ID·금액·payment key | 위젯 인증 후 서버가 토스 승인, 기존 워크플로우가 주문을 `PAID/PLACED`로 전환 | 승인 응답 불일치 시 상태·재고 변경 없음 |
| 결제 취소·실패 | 사용자가 결제창을 닫거나 토스가 fail URL로 이동 | 주문은 `PAYMENT_PENDING`으로 남고 같은 주문을 재시도 | complete API를 호출하지 않고 오류와 재시도 동선 표시 |
| 변조된 성공 콜백 | order ID 또는 금액이 로컬 주문과 다름 | 토스 승인 API를 호출하지 않음 | 사용자에게 안전한 오류 표시, 주문 복구 상태 유지 |
| 성공 콜백 재실행 | 같은 payment key·order ID·금액으로 새로고침/재시도 | 중복 과금 없이 같은 결과를 반환하고 주문 상세로 이동 | 다른 결제키이면 충돌로 거절 |
| 재고 확정 실패 | 토스 승인 후 재고 차감 실패 | 토스 전액 취소와 기존 쿠폰·포인트·재고 보상 실행 | 취소 실패를 워크플로우 오류로 남김 |

</frozen-after-approval>

## Code Map

- `src/components/checkout-page.tsx` -- 주문 생성·복구 후 hosted URL로 이동하는 현재 결제 진입점
- `src/lib/queries/checkout.ts` -- 서버 확정 주문·금액 검증과 checkout URL 안전성 로직
- `src/lib/api/customer.ts`, `src/lib/api/contracts/raw.ts`, `src/lib/types.ts` -- 프런트 결제 요청·완료 API 계약
- `src/app/payments/toss/` -- 새 success/fail 콜백 화면과 서버 승인 재시도 경계
- `/Users/yeongjae/commerce-toss-test-payments/internal/payment/` -- Lemon 어댑터를 대체할 Toss 승인·조회·전액 취소 어댑터
- `/Users/yeongjae/commerce-toss-test-payments/internal/order/application/` -- 결제 요청 데이터 생성과 사용자 소유 주문 승인 오케스트레이션
- `/Users/yeongjae/commerce-toss-test-payments/configs/config.go` -- 서버 전용 Toss 테스트 키와 API base URL 설정
- `/Users/yeongjae/commerce-toss-test-payments/migrations/` -- 최대 200자 Toss payment key 저장을 위한 컬럼 확장

## Tasks & Acceptance

**Execution:**
- [x] 백엔드 `internal/payment`, config, DI, 모듈 의존성 -- Lemon SDK·mock·webhook을 제거하고 timeout·Basic 인증·멱등성을 갖춘 Toss 테스트 어댑터로 교체한다.
- [x] 백엔드 `internal/order/application` 및 migration -- 서버 확정 결제 요청 DTO와 승인 API를 도입하고 payment key 저장 길이 및 보상 취소 계약을 갱신한다.
- [x] 프런트 API 계약과 checkout query -- `checkout_url`을 제거하고 서버 확정 Toss 결제 요청 데이터 및 complete-payment 호출을 모델링한다.
- [x] 프런트 결제위젯과 success/fail routes -- 토스 SDK v2 위젯을 렌더하고 strict callback 검증·승인 재시도·주문 상세 이동을 구현한다.
- [x] 양쪽 테스트 -- 승인/취소 HTTP 계약, 금액·소유권·상태 불일치, 콜백 변조·실패·재실행과 기존 주문 복구 회귀를 검증한다.

**Acceptance Criteria:**
- Given 토스 테스트 client/secret key가 설정된 환경, when 로그인 사용자가 주문 결제를 완료하면, then 실제 출금 없이 Toss 테스트 승인이 완료되고 동일 주문이 기존 워크플로우를 거쳐 결제 완료 상태가 된다.
- Given 결제된 주문이 배송 완료와 구매확정을 거쳤을 때, when 사용자가 리뷰를 생성·조회·수정·삭제하면, then 기존 리뷰 권한과 CRUD 흐름이 변경 없이 동작한다.
- Given 누락·변조된 콜백 또는 타인 주문, when complete-payment가 호출되면, then 토스 승인과 주문·재고 상태 변경이 발생하지 않는다.
- Given 동일 성공 콜백이 반복될 때, when 서버와 화면이 재처리하면, then 중복 과금·중복 주문 없이 주문 상세로 수렴한다.
- Given 프런트 빌드 산출물을 검사할 때, when secret 패턴을 검색하면, then Toss secret key가 포함되지 않는다.

## Spec Change Log

## Design Notes

프런트는 서버가 반환한 `order_id`, `order_name`, `amount`, 공개 `client_key`만 위젯에 전달한다. 성공 URL의 세 값은 인증 결과일 뿐 최종 신뢰값이 아니므로, 백엔드가 DB 주문과 먼저 대조하고 `POST /v1/payments/confirm` 응답까지 재검증한다. 카드 테스트 결제는 동기 승인 경로로 충분하므로 Toss webhook과 비동기 결제수단은 이번 범위에서 제외한다.

## Verification

**Commands:**
- `go test ./...` -- 백엔드 전체 테스트 통과
- `npm test -- --run` -- 프런트 단위·컴포넌트 테스트 통과
- `npm run lint` -- ESLint 오류 없음
- `npx tsc --noEmit` -- TypeScript 오류 없음
- `npm run build` -- Next.js 16.3 프로덕션 빌드 성공
- `npx playwright test tests/e2e/public-and-customer.spec.ts --project=chromium --list` -- checkout 브라우저 회귀 16건 수집 성공
- 실제 Toss 테스트 결제 E2E -- 로컬 API·DB·Temporal과 테스트 키를 사용해 로그인 → 상품·장바구니 → 주문 생성 → Toss 테스트 결제창 → success callback → 서버 승인 → 주문 `Paid` 확인

실제 Toss 테스트 결제는 mock 없이 수행했으며, 테스트 주문과 결제 결과는 검증 후 로컬 테스트 리소스와 임시 키 파일을 정리했습니다. 재현 영상은 PR에 첨부합니다.

## Suggested Review Order

**서버 결제 경계**

- 서버 금액·소유권 검증과 단일 결제 시도 선점을 먼저 확인합니다.
  [`place_order_facade.go:373`](../../../commerce-toss-test-payments/internal/order/application/place_order_facade.go#L373)

- 승인 전 payment key를 보존해 Temporal 신호 실패와 재시도를 복구합니다.
  [`repository.go:169`](../../../commerce-toss-test-payments/internal/order/repository.go#L169)

- Toss 승인·취소의 Basic 인증, 응답 검증, 멱등 키를 확인합니다.
  [`toss.go:57`](../../../commerce-toss-test-payments/internal/payment/toss.go#L57)

**프런트 결제 흐름**

- 주문 복구와 서버 확정 금액 검증이 위젯 진입을 제어합니다.
  [`checkout.ts:183`](../../src/lib/queries/checkout.ts#L183)

- 공개 client key만 사용해 위젯을 렌더하고 중복 클릭·정리를 처리합니다.
  [`toss-payment-widget.tsx:30`](../../src/components/toss-payment-widget.tsx#L30)

- success 콜백은 strict 파싱, 서버 승인, 상태 폴링과 동일 결제 재시도를 담당합니다.
  [`toss-success-client.tsx:35`](../../src/app/payments/toss/success/toss-success-client.tsx#L35)

**계약과 운영 검증**

- 브라우저 API 계약은 테스트 client key와 양의 서버 금액만 허용합니다.
  [`customer.ts:125`](../../src/lib/api/customer.ts#L125)

- 콜백 파라미터의 order ID·금액 형식을 서버 요청 전에 제한합니다.
  [`toss-payment.ts:11`](../../src/lib/toss-payment.ts#L11)

- 로컬·배포 문서는 Toss 테스트 키와 새 엔드포인트만 안내합니다.
  [`toss_test_payment.md:1`](../../../commerce-toss-test-payments/docs/infrastructure/toss_test_payment.md#L1)

**Manual checks (if no CLI):**
- 토스 테스트 카드 결제 성공·취소·실패·성공 URL 새로고침을 확인하고, 결제 후 주문 상세에서 배송·구매확정·리뷰 CRUD로 이어지는지 확인한다.
