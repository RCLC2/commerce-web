---
title: '잔여 프론트엔드 기능·보안·복구 결함 해결'
type: 'bugfix'
created: '2026-08-05'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'ae92edb8053d8c317e9daa9895fc48c29fa94045'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 최신 백엔드에서도 mutation 응답 유실이 중복 요청·거짓 실패를 만들고 판매자 HTML 미리보기와 로그인 복귀 URL은 공격 입력을 허용한다. 상품 재고와 여러 조회 화면도 실패를 품절·기본값·빈 결과로 오인한다.

**Approach:** mutation 전 복구 단서를 저장하고 실패 뒤 서버를 재조회해 유일하게 확인된 결과만 성공으로 채택한다. HTML·복귀 URL을 격리·검증하고 재고 상한과 오류 상태를 회귀 테스트로 고정하며 Next.js를 보안 수정 버전으로 올린다.

## Boundaries & Constraints

**Always:** dirty worktree와 기존 복구 기능을 보존한다; 회원별 상태를 격리한다; 응답 유실 뒤 POST를 바로 반복하지 않는다; 서버 조회로 대상을 유일하게 식별할 때만 성공 처리한다; 오류·재시도 UI를 제공한다; 예약 수량을 뺀 활성 재고를 넘지 않는다.

**Ask First:** 백엔드·DB·Vercel·Git 원격 변경, 새 런타임 의존성, 전역 상태/토스트나 대규모 재설계.

**Never:** 저장값만으로 서버 성공을 단정한다; 포인트 보상 수령을 추론한다; 미정제 URL을 라우터에 전달한다; 판매자 HTML을 부모 문서에서 실행한다; 구형 백엔드 호환 API를 추가하거나 사용자 변경을 되돌린다.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| 주문 응답 유실 | 주문 생성 뒤 응답 없음 | 저장한 cart ID 집합과 정확히 같은 단일 주문으로 결제 계속 | 0건·복수건이면 POST 차단·안내 |
| cart·리뷰 유실 | 반영 뒤 오류/409 | 새 cart 행·같은 line-item 리뷰 확인 시 성공 | 확인 불가 시 오류·목록 확인 |
| 보안 입력 | 이벤트 HTML, 외부형 `next` | script 없는 sandbox, 동일-origin 내부 이동 | 부적합 값은 `/mypage` |
| 상품 구매 | 품절·예약 재고·과다 수량 | 판매 가능 옵션 선택, 수량 clamp | 옵션 없으면 담기 차단 |
| 조회·보상 | 프로필/공개 API 실패, 쿠폰/포인트 | 오류와 재시도; 보유 쿠폰만 수령 복구 | 빈 성공과 분리, 포인트 추론 금지 |

</frozen-after-approval>

## Code Map

- `src/lib/queries/checkout.ts`, `src/components/{checkout-page,product-detail-experience}.tsx` -- 주문·cart 복구, 옵션·재고.
- `src/components/{review-write-panel,event-detail-page}.tsx` -- 리뷰·쿠폰 보상 재조정.
- `src/components/{seller-console,login-page}.tsx`, `src/lib/navigation.ts` -- HTML 격리와 내부 URL 검증.
- `src/components/{profile-edit-page,my-page,simple-product-section,home-page,popular-markets-page,search-page}.tsx` -- 실패/빈 상태 분리.
- `src/**/*.test.ts`, `tests/e2e/*.spec.ts`, `package*.json` -- 회귀, stale 테스트 교정, Next 16.3.0.

## Tasks & Acceptance

**Execution:**
- [x] 주문/cart·리뷰·쿠폰의 응답 유실을 서버 재조회로 복구하고 불명확한 POST 반복을 막는다.
- [x] PDP 옵션·가용 재고·수량과 Like/Wishlist 재시도 상태를 서버 권위로 맞춘다.
- [x] 판매자 HTML을 sandbox iframe으로 격리하고 로그인 복귀 경로를 동일 origin으로 제한한다.
- [x] 프로필·배송지·홈·마켓·검색어의 오류/재시도/빈 성공 상태를 분리한다.
- [x] 미사용 구형 PDP를 제거하고 현재 API·UI 기준으로 E2E를 교정한다.
- [x] Next 패키지를 16.3.0으로 맞추고 전체 검증을 통과시킨다.

**Acceptance Criteria:**
- Given 응답 유실, when 서버를 재조회하면, then 확인된 단일 결과만 성공 처리되고 중복 POST가 없다.
- Given 악성 HTML·외부형 `next`, when 미리보기·로그인하면, then 부모 토큰 접근과 외부 이동이 차단된다.
- Given 품절·예약 재고·API 실패, when 화면을 사용하면, then 불가 입력은 잠기고 실패는 기본값/빈 결과와 구분된다.
- Given 전체 검증, then 최신 백엔드 기준 회귀가 통과하고 포인트 수령 판정은 명시적 제한으로 남는다.

## Spec Change Log

## Design Notes

주문은 line item `cart_id` 집합이 저장값과 정확히 같은 단일 후보만 채택한다. preview iframe에는 `sandbox`만 두고, COUPON reward는 보유 쿠폰의 `coupon_id === reward.reward_id`만 근거로 쓴다.

## Verification

**Commands:**
- `npm test -- --run` -- 13개 파일, 122개 복구·보안·재고 단위 테스트 통과.
- `npm run lint && npx tsc --noEmit && npm run build` -- 정적 검사와 37개 route 빌드 통과.
- 핵심 Playwright 13개 -- 응답 유실, XSS, redirect, 재고·오류 회귀 통과.
- `npm run test:e2e:ui` -- 43/51 통과; 8건은 로컬 구형 백엔드의 미배포 최신 계약으로 분리.
- `npm run test:e2e:api` -- 5/7 통과; `/me/reviews`, market follow 미배포 차이로 분리.
- `npm audit --audit-level=high` -- 전체 의존성 취약점 0건.

## Suggested Review Order

**주문 응답 유실과 중복 방지**

- POST 전에 복구 단서를 강제하고 불명확한 재주문을 잠급니다.
  [`checkout-page.tsx:239`](../../src/components/checkout-page.tsx#L239)

- 정확한 cart 집합의 단일 주문만 복구 대상으로 채택합니다.
  [`checkout.ts:144`](../../src/lib/queries/checkout.ts#L144)

- 확정 실패와 응답 유실을 분리해 안전한 재시도만 허용합니다.
  [`checkout.ts:205`](../../src/lib/queries/checkout.ts#L205)

**상품·마켓 상태 재조정**

- 활성 재고와 예약 수량으로 실제 전송 옵션·수량을 결정합니다.
  [`product-detail-experience.tsx:82`](../../src/components/product-detail-experience.tsx#L82)

- cart 사전조회 실패와 POST 응답 유실을 서로 다른 재시도로 처리합니다.
  [`product-detail-experience.tsx:95`](../../src/components/product-detail-experience.tsx#L95)

- 좋아요·찜 재시도 전 서버 컬렉션으로 목표 상태를 확인합니다.
  [`product-detail-experience.tsx:192`](../../src/components/product-detail-experience.tsx#L192)

- 마켓 팔로우 응답 유실도 서버 상태 확인 후 명령을 결정합니다.
  [`market-page.tsx:39`](../../src/components/market-page.tsx#L39)

**보상·리뷰의 거짓 성공 차단**

- 쿠폰은 서버 보유 상태, 포인트는 현재 성공 응답만 근거로 삼습니다.
  [`event-detail-page.tsx:75`](../../src/components/event-detail-page.tsx#L75)

- `ISSUED` 이외 보상 응답은 계약 오류로 거부합니다.
  [`event-detail.ts:52`](../../src/lib/api/event-detail.ts#L52)

- 리뷰 응답 유실은 같은 line-item의 단일 결과만 복구합니다.
  [`review-write-panel.tsx:72`](../../src/components/review-write-panel.tsx#L72)

- 백그라운드 재조회 중 열린 리뷰 초안을 유지합니다.
  [`order-detail-page.tsx:176`](../../src/components/order-detail-page.tsx#L176)

**보안 경계와 오류 상태**

- 동일 origin이어도 정규화 후 외부형 경로가 되면 차단합니다.
  [`navigation.ts:1`](../../src/lib/navigation.ts#L1)

- 판매자 HTML은 권한 없는 sandbox 문서에서만 미리봅니다.
  [`seller-console.tsx:428`](../../src/components/seller-console.tsx#L428)

- 회원별 편집 초안을 격리하고 실패 시 폼을 노출하지 않습니다.
  [`profile-edit-page.tsx:20`](../../src/components/profile-edit-page.tsx#L20)

- 계정 조회 실패를 0건·미등록 상태로 표시하지 않습니다.
  [`my-page.tsx:93`](../../src/components/my-page.tsx#L93)

- 통합 검색 오류에 같은 요청을 복구하는 동작을 제공합니다.
  [`search-page.tsx:150`](../../src/components/search-page.tsx#L150)

**회귀와 의존성**

- 실제 mutation 응답 유실 뒤 POST 1회 수렴을 브라우저로 고정합니다.
  [`public-and-customer.spec.ts:103`](../../tests/e2e/public-and-customer.spec.ts#L103)

- 마켓 팔로우 응답 유실의 서버 재조정을 회귀로 고정합니다.
  [`catalog-and-account-coverage.spec.ts:286`](../../tests/e2e/catalog-and-account-coverage.spec.ts#L286)

- Next와 ESLint 구성을 동일 보안 버전으로 고정합니다.
  [`package.json:21`](../../package.json#L21)
