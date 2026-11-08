# D1~D3 보완 및 통합 검증

> 아래 내용은 촬영·검증 당시의 기록이다. 이후 PR 분리·반영 상태와 현재 검증 범위는 [최신 안내](return-pickup-address-20261022.md)를 따른다.

검증일: 2026-10-23. 프론트 `feat/commerce-web-ux-integration` / HEAD `3edc7c0`, 백엔드 `feat/toss-full-refund` / HEAD `cb068dc` 기준의 **로컬 미커밋 변경**이다. 커밋·푸시·PR 본문 변경·운영 배포는 하지 않았다.

## 수정한 내용

| 과제 | 보완 | 회귀 확인 |
| --- | --- | --- |
| D1 · 열린 신청창 조회 오류 | 부모의 반품 목록 오류·조회 중 상태를 폼에 전달한다. 오류·재조회 중에는 제출을 막고 고정 하단에 `신청 가능 수량 다시 확인`을 제공한다. 입력을 유지하고, 성공 뒤 최신 신청 가능 수량으로 다시 판단한다. | 캐시가 있는 열린 폼의 조회 실패 → 버튼·폼 제출 차단 → 재시도 중 잠금 → 동일 수량·사유·수거지로 성공. 다른 요청으로 수량이 소진되면 신청을 차단하는 별도 컴포넌트 테스트도 포함한다. |
| D2 · 옵션 접근성 | 수량·사유 입력의 접근 가능한 이름에 상품명·옵션명을 포함한다. | 동일 상품의 네이비/블랙 옵션을 함께 선택해 각 입력을 이름으로 고유하게 찾는다. 상품명만 있는 기존 항목도 유지한다. |
| D3 · 공통 E2E | `tests/support/returns-browser-check.mjs`가 구매자·판매자별 기본 주소와 다른 저장 주소를 준비하고 실제 화면에서 선택한다. 최신 버튼·검수·재입고 문구와 종료 시 해당 세션 정리를 반영했다. | 새 fixture부터 신청·수거·검수·재입고·환불을 진행한다. 요청 수거지·수거 건 수거지/도착지의 5개 필드가 선택 주소와 일치하는지 검사한다. |

이번 세 항목 자체에는 새 API·DDL·백엔드 기능 변경이 없다. 기존 미커밋 수거지 스냅샷 DDL·API는 여전히 배포 전제다.

## 실행 결과

- 프론트 **8개 파일 81개 테스트** 통과. 이 중 반품 관련 4개 파일은 57개다. 전체 프론트 저장소 테스트 결과로 확대하지 않는다.
- 백엔드 `^TestMySQLReturn` **상위 테스트 13개** 통과. 신청 수거지 보존, 검수/재입고 응답, 수거 전체 검수 완료, 동시 실행, PG 이후 로컬 실패·중복 방지, 접근 범위를 포함한다. 전체 Go 테스트 실행 결과는 아니다.
- 프로덕션 빌드(TypeScript 포함), 후속 `tsc --noEmit`, 변경 파일 ESLint, 브라우저 스크립트 구문 검사, 양쪽 저장소 `git diff --check` 통과.
- 공통 브라우저 스크립트는 **새 fixture의 환불 5건 + 구매확정 상품 반품 차단**을 통과했다. 구매자 수거 목록 조회·판매자 환불 실행은 각각403으로 차단됐다.
- 부분 반품 상품 재고는 100→101로 선택한 1개만 재입고됐다. PG 대역 취소 요청은 합계4회다. 각 완료 요청을 다시 실행해도 추가 PG 취소가 발생하지 않았다.
- 열린 폼 목록 GET만 브라우저에서 일시 차단하고, 재확인 전에 차단을 해제했다. 재시도 성공 뒤 수량·사유·다른 저장 주소가 유지됐다. 나머지 비즈니스 API에는 성공 응답을 주입하지 않았다.
- Chromium390×600의 열린 폼에서 제목·재확인·신청 버튼이 화면 안에 있고, 스크롤 내용 높이가60px 이상이며 가로 넘침이 없음을 검사했다. 완료 화면은390×844에서 가로 넘침을 검사했다. 실물 모바일·iOS Safari 검증은 아니다.

### 저장된 환불 결과

| 시나리오 | 반품 ID | 현금 환불 | 포인트 복원 | 초과 반품비 면제 |
| --- | --- | --- | --- | --- |
| 무료배송 · 불량 1개 부분 반품 | 58 | 9,667원 | 333P | 0원 |
| 동일 주문 · 남은 2개 단순변심 | 59 | 13,333원 | 667P | 0원 |
| 유료배송 · 단순변심 전체 반품 | 60 | 17,000원 | 0P | 0원 |
| 반품비가 상품액보다 큰 경우 | 61 | 0원 | 0P | 2,000원 |
| 가상계좌 · 판매자 부담 반품 | 62 | 7,000원 | 0P | 0원 |

부분 반품 두 건의 포인트는333P+667P=1,000P다. PG 잔액은 무료배송 부분 반품 완료 후6,000원, 유료배송6,000원, 부족액 면제4,000원, 가상계좌0원이다. 반품비 초과 시나리오는 현금 환불0원·면제2,000원으로 PG 취소를 호출하지 않는다.

## 실행 명령과 재현

프론트:

```sh
npx vitest run \
  src/components/return-pickup-address.test.tsx \
  src/components/order-returns.test.tsx \
  src/components/order-returns-regressions.test.tsx \
  src/components/order-return-address.test.tsx \
  src/components/order-detail-page.test.tsx \
  src/app/payments/toss/success/toss-success-client.test.tsx \
  src/components/shipping-policy.test.tsx \
  src/lib/returns-api.test.ts
```

백엔드 기능 워크트리에서 전용 로컬 DSN을 지정한다. 아래 명령은 운영 DB에 실행하지 않는다.

```sh
COMMERCE_TEST_MYSQL_DSN='<local-test-database>' \
go test ./internal/order -run '^TestMySQLReturn' -count=1 -v
```

API·DB·Temporal·PG 대역·프론트 기동과 새 fixture 준비는 [통합 환경 기동 안내](returns-api-integration-20261018.md)의 1~4단계를 따른다. 같은 fixture 파일로 PG 대역을 시작한 뒤 프론트 워크트리에서 실행한다.

```sh
E2E_BASE_URL=http://127.0.0.1:13001 \
E2E_API_BASE_URL=http://127.0.0.1:18082 \
E2E_OUTPUT_DIR=output/playwright/returns-integration \
node tests/support/returns-browser-check.mjs /tmp/commerce-returns-ui.json
```

기존 처리 중/완료 주문을 재사용한 실행과 새 주문 실행을 구분한다. `result.json`의 `openFormRefreshFailure.verified`는 첫 신청의 조회 실패 복구를 실제로 검사했는지 표시한다. 이번 최종 실행은 `true`다.

## 증거와 검증 경계

Git에서 제외된 `output/playwright/returns-d123-20261023/`:

- `final/result.json`: 새 fixture 전체 실행 결과·반품 ID·금액·PG 횟수·재고.
- `final-browser.log`: 최신 스크립트의 처음부터 끝까지 실행 로그.
- `final/open-form-refresh-failed.png`, `final/open-form-refresh-failed-mobile.png`: 열린 신청창 조회 실패 시 PC/모바일 잠금·안내.
- `final/buyer-completed-mobile.png`: 구매자 완료 화면.
- `tests.log`, `backend-tests.log`, `build.log`, `types.log`, `lint.log`: 위 자동 검사 결과.

실제 Next.js 프로덕션 화면·인증·로컬 API·Docker MySQL·Temporal을 사용했다. 계정·주소·배송 완료 주문은 합성 fixture이며 **PG HTTP 경계만 로컬 대역**이다. 이번 실행은 새 실제 Toss 승인/취소, 실계좌 입금, 택배사 API 접수, 실물 수거, 빈 DB 마이그레이션 또는 Down/Up 검증이 아니다.

위 자동 통합 테스트 실행에서는 영상을 새로 촬영하지 않았다. 이전 전체 흐름 영상과 그때의54개 테스트는 [주소록·신청창 영상 기록](return-pickup-address-20261022.md)에 별도 보존한다. 테스트 계정·토큰이 있는 fixture와 브라우저 산출물은 커밋하지 않는다. 검사 후 이번 실행의 브라우저·API·프론트·PG 대역과 테스트 컨테이너를 종료했으며 DB 데이터와 증거 파일은 보존했다.


## 후속 수정 부분 동작 영상 — 2026-10-23

- 영상: `output/playwright/returns-d123-changes-video-20261023/commerce-d123-changes.mp4` (1분40.88초,1440×900).
- 00:00~01:04: 두 옵션의 수량·사유를 각각 입력 → 구매자 주소록 선택 → 열린 신청창의 목록 GET 실패 → 제출 차단·입력 유지 → 재확인 → 실제 API 신청 성공.
- 01:04~01:41: 판매자 본인 주소록에서 반품센터 선택 → 기본 반품 도착지 저장 → 구매자 수거지/판매자 도착지 확인 → 수거 정보 저장.
- 합성 주문 `UI-RETURNS-partial-7dd439d3`, 반품63, 수거53. 네이비2개/불량·블랙1개/단순변심 값과 주소 5개 필드가 API 저장 결과와 일치했다. 옵션별 입력의 접근 가능한 이름은 같은 폴더 `option-input-names.txt`로 확인했다.
- 의도적인 실패 주입은 해당 주문의 반품 목록 GET에만 적용하고 재확인 전에 해제했다. 결제·환불 실행은 촬영 범위에 포함하지 않았으며 PG 취소 호출은0회다. 새 영상은 기존 전체 흐름 검증을 대체하지 않는다.
- 검증 결과·원본2개·촬영 스크립트는 같은 추적 제외 폴더의 `verification.json`, `timeline.json`, `record.mjs`에 보관한다. 커밋·푸시·PR 본문 수정은 하지 않았다.


## 이후 주소 요약·신청 완료 초점 보완

위 영상 검토에서 발견한 초점 유실과 긴 주소 폼을 보완했다. 현재 화면·관련62개 테스트·모바일 검사·새 수정 부분 영상은 [후속 검증](return-address-summary-focus-20261023.md)을 기준으로 한다. 위81개 테스트와 다중 시나리오 결과는 D1~D3 검증 당시 기록이다.
