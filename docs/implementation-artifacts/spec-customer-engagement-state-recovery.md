---
title: '고객 좋아요·팔로우·리뷰·쿠폰 상태 복구'
type: 'bugfix'
created: '2026-08-04'
status: 'done'
review_loop_iteration: 0
baseline_commit: '7c2ba717dc7b19bc169ad86b8b4e2a96ed8ba76a'
context:
  - '{project-root}/docs/implementation-artifacts/spec-frontend-origin-main-contract-finalization.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 최신 백엔드가 배포돼도 PDP는 기존 Like·Wishlist 상태를 복구하지 않고 좋아요 페이지는 Wishlist만 표시한다. Follow·Review·Coupon 화면도 실패를 반대 상태나 빈 목록으로 오인하고 mutation 오류를 숨긴다.

**Approach:** 기존 Product Like, Wishlist, Market Follow, My Reviews, Coupon API를 의미별 UI와 Query Cache에 연결한다. 성공한 빈 상태와 실패를 분리하고 고객 mutation에 진행·성공·실패 및 재시도를 제공한다.

## Boundaries & Constraints

**Always:** Like와 Wishlist를 별도 상태·버튼·목록으로 표현한다; 인증 PDP는 두 목록으로 현재 상품 상태를 복구한다; Follow 조회 실패를 `false`로 간주하지 않는다; 성공 후 관련 캐시를 동기화한다; 리뷰 여부는 `order_line_item_id`로 복구한다; 빈 상태는 query 성공 시에만 표시한다; API 오류는 한국어와 재시도로 안내한다.

**Ask First:** Like/Wishlist 통합·제거, 백엔드 계약 변경, 전역 토스트 도입, 대규모 UI 재설계.

**Never:** 팔로우 마켓 목록을 합성한다; 오류를 빈 배열·`false`로 숨긴다; 로컬 boolean만으로 재방문 상태를 정한다; 배송·추천·CMS·장바구니·백엔드를 수정한다; 기존 untracked 파일을 삭제한다.

## I/O & Edge-Case Matrix

| Scenario | State | Expected | Error Handling |
|----------|-------|----------|----------------|
| 재방문 PDP | 기존 Like/Wishlist | 하트·북마크가 각각 서버 상태이며 올바른 DELETE 호출 | 실패한 상태 제어 잠금, 오류·재시도 |
| 비로그인 PDP | 보호 버튼 클릭 | 상품 경로를 `next`로 보존해 로그인 이동 | mutation 미호출 |
| 좋아요 페이지 | 두 목록이 다름 | 별도 탭·개수·페이지 표시 | 실패한 탭만 오류 표시 |
| Follow/Review/Coupon | 조회·mutation 실패 | 확인된 상태만 표시 | 오류·재시도, 빈 상태 미표시 |

</frozen-after-approval>

## Code Map

- `src/lib/query-keys.ts`, `src/lib/product-engagement.ts` -- 공통 캐시 키와 상태·페이지 순수 로직.
- `src/components/product-detail-experience.tsx`, `src/components/likes-page.tsx` -- Like/Wishlist 상태와 목록 UI.
- `src/components/market-page.tsx` -- Follow 조회·토글 동기화와 오류 처리.
- `src/components/my-reviews-page.tsx`, `src/components/order-detail-page.tsx` -- 리뷰 상태·mutation 및 재작성 방지.
- `src/components/my-coupons-page.tsx` -- 인증, 조회·발급 상태.
- `src/lib/api/commands.test.ts`, `src/lib/product-engagement.test.ts`, `tests/e2e/catalog-and-account-coverage.spec.ts` -- 회귀 검증.

## Tasks & Acceptance

**Execution:**
- [x] 공통 키·상태 유틸리티와 단위 테스트를 추가한다.
- [x] PDP·좋아요 페이지에서 Like/Wishlist를 분리하고 인증·복구·오류 UI를 구현한다.
- [x] 마켓 Follow, 리뷰 조회·수정·삭제, 쿠폰 조회·발급의 오류·성공·재시도를 구현한다.
- [x] 주문 상세에서 내 리뷰를 line item에 연결해 재작성 버튼을 숨긴다.
- [x] API 경로와 새로고침·실패·빈 상태 E2E 회귀를 보강한다.

**Acceptance Criteria:**
- Given Like와 Wishlist가 다른 회원, when PDP와 좋아요 페이지를 새로고침하면, then 두 상태가 서버 데이터대로 분리된다.
- Given Follow·Review·Coupon API 실패, when 화면 조회 또는 mutation하면, then 반대 상태나 빈 목록 대신 오류와 재시도를 표시한다.
- Given 이미 리뷰한 주문 라인, when 주문 상세를 다시 열면, then 리뷰 작성 버튼이 노출되지 않는다.
- Given 비로그인 사용자, when 보호 동작을 누르면, then API 호출 없이 현재 경로를 보존해 로그인한다.

## Spec Change Log

## Design Notes

PDP 하트는 Product Like, 북마크는 Wishlist로 고정한다. 좋아요 페이지 기본 탭은 Like다. 팔로우 마켓 집계는 백엔드 목록 API가 없어 제외한다.

## Verification

**Commands:**
- `npm test -- --run` -- 전체 Vitest 통과.
- `npm run lint` -- lint 통과.
- `npm run build` -- Next.js 프로덕션 빌드 통과.
- `npm run test:e2e:ui -- tests/e2e/catalog-and-account-coverage.spec.ts` -- 가용 백엔드에서 고객 상태 시나리오 통과.

## Suggested Review Order

**상품 Like와 Wishlist 분리**

- PDP 진입 시 두 서버 컬렉션을 독립 상태로 복구합니다.
  [`product-detail-experience.tsx:49`](../../src/components/product-detail-experience.tsx#L49)

- 동시 mutation을 막고 기능별 오류와 재시도를 분리합니다.
  [`product-detail-experience.tsx:92`](../../src/components/product-detail-experience.tsx#L92)

- 좋아요 화면은 별도 탭과 성공한 빈 상태만 표시합니다.
  [`likes-page.tsx:19`](../../src/components/likes-page.tsx#L19)

**Follow·Review·Coupon 신뢰성**

- Follow 상태 경쟁을 취소하고 서버 값으로 재검증합니다.
  [`market-page.tsx:20`](../../src/components/market-page.tsx#L20)

- 리뷰 mutation은 목록을 선반영하고 PDP 리뷰 캐시도 갱신합니다.
  [`my-reviews-page.tsx:26`](../../src/components/my-reviews-page.tsx#L26)

- 주문 라인별 기존 리뷰를 복구해 중복 작성 버튼을 숨깁니다.
  [`order-detail-page.tsx:48`](../../src/components/order-detail-page.tsx#L48)

- 쿠폰 발급은 캐시 선반영과 발급 상태 확인 후 재시도를 사용합니다.
  [`my-coupons-page.tsx:22`](../../src/components/my-coupons-page.tsx#L22)

**공통 상태와 회귀 검증**

- 서버 컬렉션·페이지·리뷰 가능 여부를 순수 함수로 고정합니다.
  [`product-engagement.ts:1`](../../src/lib/product-engagement.ts#L1)

- 인증별 상태 캐시 키를 한곳에서 공유합니다.
  [`query-keys.ts:18`](../../src/lib/query-keys.ts#L18)

- Like·Wishlist 상이 상태와 POST·DELETE 새로고침을 검증합니다.
  [`catalog-and-account-coverage.spec.ts:182`](../../tests/e2e/catalog-and-account-coverage.spec.ts#L182)

- 리뷰·쿠폰 실패 재시도와 중복 리뷰 방지를 검증합니다.
  [`public-and-customer.spec.ts:76`](../../tests/e2e/public-and-customer.spec.ts#L76)
