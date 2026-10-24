# 반품·수거·검수·환불 통합 코드 리뷰

> 이 문서는 해당 날짜·작업 범위의 검증 이력이다. 현재 구현·API 계약·PR 반영 구분·최종 영상·테스트 범위는 [2026-10-24 최신 안내](return-pickup-address-20261022.md)를 기준으로 한다. 과거 실제 Toss TEST 검증과 최신 PG 대역 검증을 합쳐 설명하지 않는다.

> 2026-10-23 후속: 당시 보류한 D1·D2와 공통 재현 스크립트 D3를 해결했다. [최신 통합 검증](returns-d123-verification-20261023.md)을 참고한다. 아래 Defer 표기는 최초 리뷰 당시의 분류다.

작성일: 2026-10-22 · 상태: 수정 권장 7건 반영·검증 완료 (커밋·푸시 없음)

## 최초 리뷰 범위와 제한

- 프론트: `/Users/yeongjae/commerce-web`, `feat/commerce-web-ux-integration`, 기준 HEAD `3edc7c0` 이후 미커밋 변경. 추적 파일 17개와 신규 `src/components/order-detail-page.test.tsx`를 포함한 18개 파일, +2,258 / -243.
- 백엔드: `/Users/yeongjae/commerce-toss-full-refund`, `feat/toss-full-refund`, 기준 HEAD `cb068dc` 이후 미커밋 변경. 7개 파일, +208 / -6.
- 기준 명세: `/Users/yeongjae/commerce-toss-full-refund/docs/planning-artifacts/shipping-refund-spec.md`.
- 독립 코드 검토, 경계 조건, 검증 누락, 명세 충족 여부의 네 리뷰를 모두 완료했다. 실패한 리뷰는 없다.
- 기존 PR 전체나 운영 환경을 새로 인증하는 리뷰는 아니다. 최초 리뷰 단계에서는 Docker·MySQL 통합 환경이나 실제 Toss 결제를 다시 실행하지 않았다. 이후 수정 검증은 아래 보완 결과에 구분했다.
- 최초 리뷰 단계에서는 구현 코드·기존 테스트·PR을 수정하지 않았다. 이후 승인된 수정은 아래 보완 결과에 기록했다. 커밋·푸시·PR 변경은 하지 않았다. BMAD 초기화 산출물 `.agents/`, `_bmad/`는 기능 변경 검토에서 제외했다.
- 기준 명세에는 Tasks/Subtasks나 스토리 상태가 없어 정책 문서에 리뷰 작업을 섞지 않고 이 보고서에 기록했다. 스토리 키가 없어 스프린트 상태는 갱신하지 않았다.

## 요약

| 분류 | 묶은 항목 수 |
| --- | ---: |
| 수정 가능: patch | 7 |
| 사용자 정책 결정 필요: decision-needed | 0 |
| 기존 문제로 별도 기록: defer | 2 |
| 제외한 원본 지적: rejected | 2 |

수정 항목은 **동작 문제 4개, 접근성 1개, 회귀 테스트 누락 2개**다. 이번에 변경된 백엔드 구현에서 추가로 확정한 동작 결함은 없으며, 아래 검수 저장 HTTP 응답 테스트가 필요하다. 이는 PG 전체 기능이나 운영 안전성에 대한 무결함 보증을 의미하지 않는다.

## 승인 후 보완 결과 (2026-10-22)

사용자가 수정 권장 7건 전체 적용을 승인했다. 아래 체크 항목은 최초 지적과 재현 근거를 보존하며, 현재는 모두 반영·검증했다.

| 항목 | 반영한 내용 | 확인 |
| --- | --- | --- |
| R1 | 진행 중인 주문 조회·수동 갱신 이후 완료를 보정하고, 첫 조회의 완료도 반영한다. 같은 완료 ID를 반복 처리하지 않는다. | 수동 갱신 경합, 최초 주문 응답 전·후 완료 도착, 동일 완료 응답 반복 |
| R2 | 관리자·판매자 주문의 기존 배송비를 전달한다. 요청별 견적의 차감액과 최초 유료배송비 유지액을 구분하고, 이전 요청 및 현재 요청에서 환불한 배송비는 제외한다. 기존 합산 응답 표시는 유지한다. | 유료배송비 유지·회수비 분리, 현재/이전 요청에서 배송비 환불 |
| R3 | 저장 mutation을 재마운트되지 않는 부모로 옮겨 조회 완료까지 입력·제출을 잠근다. | 느린 GET 동안 재저장·직접 form submit 차단, 완료 후 요약·접기 |
| R4 | 현재 신청 가능량으로 제출 대상을 구성하고 수량을 검증한다. 자동 갱신으로 숨겨진 상품은 전송하지 않는다. | 마지막 수량 예약 후 상품 제거·제출 비활성·직접 submit 차단 |
| R5 | 구매자 화면에 짧은 polite 완료 알림을 제공한다. | 완료 시 상태 영역 갱신·키보드 초점 유지 |
| R6 | 실제 handler를 호출하는 판매자 인증 컨텍스트의 검수 POST 테스트를 추가했다. | 성공 JSON에 restocked_quantity:0, restocked_at:null이 명시됨 |
| R7 | 수거 workspace의 여러 검수 버전을 함께 렌더링하는 테스트를 추가했다. | 이전 재입고 2개·최신 재판매 가능 3개 → 기본/최대 1개, 2개 제출 차단 |

### 수정 후 검증

- 프론트 관련 5개 파일 **54개 테스트 통과**. 새 정규 회귀 테스트 파일은 `src/components/order-returns-regressions.test.tsx`다. 수정 전 새 테스트 8개 중 동작·접근성 재현 7개가 실패했고, 기존 구현이 맞았던 누적 재입고 테스트 1개는 통과했다. 배송비 환불 분기 2개를 추가한 뒤 모두 통과했다.
- `npx tsc --noEmit`, 변경 소스·테스트 대상 ESLint, `npm run build` 통과. 타입 검사는 프로덕션 빌드에서도 다시 통과했다.
- 별도 Docker MySQL 8.4의 빈 `commerce_review` DB에 저장소 마이그레이션을 적용하고, 새 검수 POST 테스트를 포함한 **MySQL 반품 테스트 12개 통과**. PG는 테스트 대역이며 신규 실제 Toss 거래를 실행하지 않았다.
- 이 수정으로 API 경로·JSON 필드·엔터티·DDL·npm 의존성을 추가하지 않았다. 기존 API 응답과 주문 당시 배송비를 사용한다.
- 테스트 컨테이너 `commerce-review-mysql-20261022`는 검증 후 중지·자동 삭제했다. 기존 컨테이너·DB는 변경하지 않았다.
- 검증 로그: `/Users/yeongjae/commerce-web/output/review/returns-integrated-20261022/patch-final-results.txt`, `patch-lint-results.txt`, `patch-typecheck-results.txt`, `patch-build-results.txt`, `patch-backend-mysql-results.txt`.
- D1·D2 기존 문제는 별도 작업으로 남겼다. 스토리 파일·스토리 키가 없어 정책 명세나 스프린트 상태는 변경하지 않았다. **커밋·푸시·PR 변경 없음.**

## Review Findings

### 수정 항목

- [x] [Review][Patch][P2][R1] 환불 완료를 확인한 뒤 주문 정보의 갱신을 보장한다. — `/Users/yeongjae/commerce-web/src/components/customer-order-returns.tsx:58`.
  - 수동 새로고침이 진행 중일 때 반품 응답만 먼저 COMPLETED가 되면, 66행에서 완료 ID를 이미 기록하고 70행의 pending 검사로 주문 재조회를 생략한다. 뒤늦게 도착한 이전 주문 응답이 화면에 남고, 다음 effect에서도 새 완료로 인식하지 않는다.
  - 첫 진입 때 주문 응답이 완료 직전에, 반품 응답이 완료 직후에 만들어져도 `previous`가 없으므로 같은 불일치가 남는다. 완료된 반품만 남으면 주기 조회도 중단된다.
  - 재현: 반품은 환불 완료지만 상단은 배송 완료·환불액 0. 수동 갱신 경합 시 주문 조회 2회, 첫 진입 경합 시 1회 이후 보정 조회가 없다.
  - 방향: 완료 ID를 관찰한 시점과 주문 응답에 반영한 시점을 구분한다. 진행 중인 갱신 이후와 첫 완료 응답에서도 주문을 보정하고, 반복 갱신 루프를 방지한다. 두 응답 순서를 회귀 테스트에 포함한다.

- [x] [Review][Patch][P2][R2] 환불 확인창에 최초 유료배송비 유지 내역을 표시한다. — `/Users/yeongjae/commerce-web/src/components/order-refund-controls.tsx:389`.
  - 새 확인창은 `refundShippingItems()`를 요청별 견적에 사용한다. 이 함수는 `retained_shipping_fee`에 최초 유료배송비도 포함되어 있다고 가정하지만, 요청별 견적의 해당 값은 발송비 차감 + 회수비 - 면제액이다. 서버 근거: `/Users/yeongjae/commerce-toss-full-refund/internal/order/returns_refund.go:223`.
  - 예: 상품 20,000원 + 최초 배송비 3,000원 결제, 구매자 귀책 회수비 3,000원이면 결제수단 환불은 17,000원이다. 현재 내역에는 회수비 3,000원만 나타나고, 환불하지 않는 최초 배송비 3,000원은 나타나지 않는다.
  - 금액 계산 오류가 아니라 확인 단계의 설명 누락이다. 기존 주문 합산 응답과 요청별 견적의 필드 의미를 구분해 표시하고, 유료배송 사례를 테스트한다. 단순히 공용 함수를 바꿔 기존 완료 화면을 깨뜨리지 않도록 한다.

- [x] [Review][Patch][P2][R3] 반품지 저장부터 재조회 완료까지 저장 상태를 유지한다. — `/Users/yeongjae/commerce-web/src/components/order-return-management.tsx:408`.
  - 저장 응답 직후 `setQueryData()`가 editor의 JSON 기반 key를 바꾸어 자식을 재마운트한다. 이전 editor의 mutation은 재조회를 기다리지만 새 editor는 idle이므로 저장 버튼이 다시 활성화된다.
  - 재현: 첫 반품지 저장 성공 후 재조회 GET을 미완료로 유지했을 때 저장 버튼의 disabled가 false다. 그 사이 다른 저장이나 편집을 시작할 수 있고 이전 저장의 후속 닫기 동작과 겹친다.
  - 방향: 저장 작업 생명주기를 재마운트되지 않는 위치에서 관리하거나, 데이터 반영 때문에 editor의 진행 상태가 초기화되지 않도록 한다. 저장 성공과 재조회 완료 사이의 UI를 테스트한다.

- [x] [Review][Patch][P2][R4] 자동 갱신 후 반품 선택값과 제출 대상을 다시 검증한다. — `/Users/yeongjae/commerce-web/src/components/customer-order-returns.tsx:249`.
  - 새 폴링으로 신청 가능한 수량이 0이 되면 상품 카드가 사라지지만 `selection`은 그대로다. submit은 선택 객체가 비었는지만 확인하여 화면에 없는 상품을 전송한다.
  - 재현: 상품을 선택한 뒤 같은 상품의 REQUESTED 응답을 캐시에 반영하면 체크박스는 사라져도 제출 버튼이 활성화되어 `order_line_item_id:9, quantity:1`이 전송된다.
  - 서버의 중복·수량 검증을 우회하는 문제는 아니다. 사용자가 수정할 수도 없는 숨겨진 선택 때문에 신청이 거절되는 UX 결함이다. 현재 신청 가능량과 선택을 동기화하고 전송 직전에도 확인한다.

- [x] [Review][Patch][P2][R5] 구매자 화면의 자동 환불 완료를 보조기기에 알린다. — `/Users/yeongjae/commerce-web/src/components/customer-order-returns.tsx:393`.
  - 자동 갱신은 상태 배지와 환불 금액을 바꾸지만 해당 변경에 live region이나 상태 알림이 없다. 포커스를 유지한 화면 읽기 도구 사용자는 완료 전환을 안내받지 못한다.
  - 방향: 화면 전체를 반복 낭독하지 않도록 짧은 완료 상태 메시지를 polite 상태 영역으로 제공하고, 사용자의 포커스를 강제로 이동하지 않는다.

- [x] [Review][Patch][P2][R6] 검수 저장 POST의 JSON 계약을 HTTP 테스트로 고정한다. — `/Users/yeongjae/commerce-toss-full-refund/internal/order/returns_handler.go:137`.
  - 새 응답 wrapper의 `restocked_quantity: 0`, `restocked_at: null`은 프론트 파서가 요구하는 값이다. 서비스 테스트나 프론트의 mock만으로는 handler가 이를 누락하는 회귀를 잡지 못한다.
  - 검증 누락 리뷰의 확인 근거: 서비스 테스트 `returns_mysql_test.go:261`은 실제 POST 직렬화를 호출하지 않고, HTTP 테스트 `:506`은 환불 실행 경로를 확인한다. raw 엔터티 응답으로 되돌려도 이 계약의 회귀가 잡히지 않는다.
  - 방향: 인증된 검수 POST 요청의 성공 JSON에 두 필드가 명시적으로 존재하고 값이 0/null인지 검증한다. 현재 handler가 잘못되었다는 지적은 아니다.

- [x] [Review][Patch][P2][R7] 여러 검수 버전의 누적 재입고량 전달을 workspace 테스트로 고정한다. — `/Users/yeongjae/commerce-web/src/components/order-return-collection.tsx:365`.
  - 현재 합산 구현은 맞지만 자식 `ReturnRestock` 테스트는 합계 값을 직접 주입한다. 상위에서 전체 버전 대신 최신 버전만 전달하는 회귀는 잡히지 않는다.
  - 검증 누락 리뷰의 확인 근거: `order-returns.test.tsx:547`의 자식 테스트와 달리, 같은 수거 상품에 검수 버전이 둘 이상인 workspace 테스트가 없다.
  - 방향: 이전 버전 재입고 2개, 최신 버전 재판매 가능 3개인 경우 남은 수량이 1개인지 상위 조합을 통해 검증한다. 기본·최대 수량 1개, 2개 입력 시 제출 불가까지 확인한다.

### 기존 문제: 별도 작업

- [x] [Review][Defer][D1] 열린 반품 신청창에는 백그라운드 조회 오류가 전달되지 않는다. — `/Users/yeongjae/commerce-web/src/components/customer-order-returns.tsx:214`.
  - opener의 `disabled={query.isError}`는 이미 열린 창에 영향을 주지 않는다. 캐시가 남아 있으면 폼을 계속 제출할 수 있다. 기준 HEAD에도 오류 분기 밖에 같은 Dialog/폼이 있었으므로 이번 변경에서 발생한 결함으로 분류하지 않는다. 서버 검증이 최종 방어선이다.
- [x] [Review][Defer][D2] 같은 상품의 서로 다른 옵션에 수량·사유 입력의 접근 가능한 이름이 중복된다. — `/Users/yeongjae/commerce-web/src/components/customer-order-returns.tsx:311`.
  - `aria-label`은 상품명만 포함하며 시각적으로 추가한 옵션명이 입력 이름에 반영되지 않는다. 기준 HEAD에도 동일한 label 생성 방식이 있었다. 옵션명까지 포함하는 접근성 개선을 별도 기록한다.

## 검증 결과

### 기존 테스트

```sh
npx vitest run src/components/order-returns.test.tsx src/components/order-detail-page.test.tsx src/components/shipping-policy.test.tsx src/lib/returns-api.test.ts
```

4개 파일, **44개 테스트 통과**. 프론트와 백엔드의 `git diff --check`도 통과했다.

### 임시 재현 테스트

저장소의 기존 테스트를 수정하지 않고, 기본 Vitest 수집 대상 밖인 `output/review/returns-integrated-20261022/`에 재현 테스트를 작성했다. 실제 컴포넌트와 QueryClient를 사용하되 API 응답과 도착 순서는 제어했다. PG·DB 실행 검증이 아니다.

```sh
npx vitest run --config output/review/returns-integrated-20261022/review.config.mts
```

| 기대하는 정상 동작 | 현재 결과 | 연결 항목 |
| --- | --- | --- |
| 수동 갱신 중 완료 응답이 도착하면 주문을 다시 보정 | 반품 완료·주문 환불액 0 상태가 남음 | R1 |
| 첫 조회에서 주문보다 반품이 최신이면 주문 보정 | 주문 조회가 최초 1회로 끝남 | R1 |
| 유료배송비 유지와 회수비를 함께 설명 | 회수비 3,000원만 표시 | R2 |
| 저장 후 재조회 중 저장 버튼 비활성 유지 | 새 editor의 저장 버튼 활성화 | R3 |
| 자동 갱신으로 사라진 선택 상품 전송 차단 | 숨겨진 상품 전송 | R4 |

**5개 모두 정상 동작을 기대하는 assertion에 실패하여 문제를 재현했다.** 제품 테스트 통과로 보고하지 않는다. 상세 로그와 재현 코드는 `/Users/yeongjae/commerce-web/output/review/returns-integrated-20261022/`에 있다.

## 원본 지적별 판정 기록

중복을 묶기 전에 15개 지적 각각에 판정을 내렸다. severity는 리뷰를 통합하며 다시 판단했다. `medium`은 수정 가치가 있는 사용자 영향 또는 구체적인 회귀 위험을 뜻한다.

| ID | 출처 | 원본 지적과 위치 | 판정 | 확인 근거·처리 |
| --- | --- | --- | --- | --- |
| 1 | blind-hunter | 수동 갱신과 완료 응답 경합, customer-order-returns.tsx:66 | medium | 임시 테스트에서 완료 ID가 소비되고 주문은 이전 상태로 남음. R1. |
| 2 | blind-hunter | 첫 조회의 완료 응답 기준점 경합, customer-order-returns.tsx:58 | medium | 주문 이전 응답 뒤 완료 반품 응답을 보내도 주문 추가 조회 없음. R1. |
| 3 | blind-hunter | 자동 주문 재조회 실패 시 완료 이벤트 재시도 없음, customer-order-returns.tsx:66 | low | 완료 ID는 먼저 저장되지만 주문 조회 자체의 재시도·포커스 복귀 갱신과 캐시 오류 경고·명시적 재시도 버튼이 있다. 영구 복구 불능은 아니다. 별도 자동 재시도 상태기를 추가할 정도의 일상적 피해로 판단하지 않아 제외. |
| 4 | blind-hunter | 확인창 최초 유료배송비 유지 누락, order-refund-controls.tsx:389 | medium | 요청별 견적과 합산 응답의 retained 의미 차이를 코드와 재현으로 확인. R2. |
| 5 | blind-hunter | 열린 폼은 조회 오류에도 제출 가능, customer-order-returns.tsx:214 | medium | 폼은 캐시 데이터로 계속 표시됨. 기준 HEAD에도 동일하여 D1 defer. |
| 6 | blind-hunter | 폴링 후 숨겨진 선택 전송, customer-order-returns.tsx:249 | medium | 임시 테스트에서 카드가 사라진 후 create 호출 payload에 선택이 남음. 기존 상태 관리에 추가된 주기 갱신이 노출하는 문제. R4. |
| 7 | blind-hunter | 옵션별 입력 이름 중복, customer-order-returns.tsx:311,335 | medium | 옵션 표시는 추가됐지만 aria-label은 상품명만 사용. 기준 HEAD와 동일해 D2 defer. |
| 8 | blind-hunter | 저장 중 editor 재마운트로 재저장 활성, order-return-management.tsx:408 | medium | 느린 재조회 중 버튼이 활성화되는 것을 임시 테스트로 확인. R3. |
| 9 | blind-hunter | 일부 수량 재입고 후 잔량 설명 없음, order-return-inspection.tsx:186 | low | 처리량 자체는 정확하다. 명세상 같은 검수 버전의 다른 수량 재실행은 409이며 이전 UI도 추가 실행을 막았다. 별도 잔량 분기·안내 추가는 이번 결함 수정에서 제외. |
| 10 | blind-hunter | 자동 완료의 화면 읽기 도구 알림 없음, customer-order-returns.tsx:393 | medium | 새 자동 완료 경로의 배지·금액에 live 상태 알림이 없고 포커스를 유지한다. R5. |
| 11 | edge-case-hunter | 수동 갱신 중 완료 이벤트 누락, customer-order-returns.tsx:66 | medium | ID 기록 후 pending 검사 순서와 임시 재현으로 확인. 원본 1과 같은 원인으로 R1. |
| 12 | verification-gap-hunter | 검수 POST 응답 필드 HTTP 테스트 누락, returns_handler.go:137 | medium | 해당 리뷰가 확인한 handler·파서·서비스/HTTP 테스트 비교 증거를 채택. R6. 현재 계약 위반이 아니라 회귀 방어 누락. |
| 13 | verification-gap-hunter | 검수 버전 누적합 workspace 테스트 누락, order-return-collection.tsx:365 | medium | 해당 리뷰가 확인한 자식 직접 주입 테스트와 상위 다중 버전 사례 부재 증거를 채택. R7. |
| 14 | acceptance-auditor | 자동 완료 후 주문 합계 일치 보장 실패, customer-order-returns.tsx:66 | medium | 사용자 자동 갱신 요구와 맞지 않음. 임시 경합 재현으로 확인. 원본 1과 같은 원인으로 R1. |
| 15 | acceptance-auditor | 배송비 상세의 최초 유료배송 누락, order-refund-controls.tsx:389 | medium | 새 상세 내역의 표시 누락. 원본 4와 같은 API 의미 오용으로 R2. |

## Rejected

- **원본 3 — low:** 실패 시 복구 경로는 이미 제공한다. 드문 조회 실패 후 자동 재시도를 위한 별도 상태·분기 추가는 이번 리뷰 수정에서 제외한다.
- **원본 9 — low:** 버전당 1회 재입고 정책 안에서 실제 처리량은 정확히 표시한다. 미처리 잔량 설명을 위한 추가 조건부 UI는 이번 리뷰 수정에서 제외한다.
