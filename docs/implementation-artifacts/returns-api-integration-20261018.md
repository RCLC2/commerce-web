# 반품·수거·검수 프론트 연동 및 통합 검증

검증일: 2026-10-18. 프론트 [#57](https://github.com/RCLC2/commerce-web/pull/57), 백엔드 [#201](https://github.com/RCLC2/commerce-server/pull/201).

## 변경한 화면

- 구매자 주문 상세: 마켓별 상품·수량·사유 선택, 신청 가능한 남은 수량, 요청별 상태·확정 환불액을 표시한다. 구매확정 상품은 신청할 수 없으며 진행 중 반품이 있으면 해당 상품 구매확정을 막는다.
- 판매자 주문 상세: 본인 마켓의 반품 요청을 선택하고 수거 묶음 생성, 송장·수거·입고 상태 관리, 검수 저장·정정, 선택 수량 재입고를 처리한다. 환불 견적은 확인할 수 있으나 실행 버튼은 제공하지 않는다.
- 관리자 주문 상세: 같은 수거·검수 화면을 사용하며 `refund_id`별 견적 확인, 환불 확인 팝업, 실행·진행 상태·실패 철회를 처리한다.
- 마켓 설정: 현재 반품 도착지와 편도 회수비를 저장한다. 현재 설정 변경으로 기존 주문·수거 주소 스냅샷을 덮어쓰지 않는다.
- 공통 디자인 시스템의 Button·Dialog·Field·Input·Select·Notice와 primary 색상을 사용한다. 고정 하단 메뉴를 유지한다.

## API 계약

기존 주문 단위 `reason + items_received` 환불 폼을 요청·수거·검수 기반 계약으로 교체했다. 아래 경로는 `/api/v1` 기준이다.

| API | 화면에서 하는 일 |
| --- | --- |
| `GET/POST /orders/{orderCode}/refunds` | 구매자 신청 및 역할별 요청 목록 조회 |
| `GET/POST /orders/{orderCode}/return-collections` | 저장된 수거 목록 복원, 같은 주문·마켓의 접수 전 수거 묶음 생성/추가 |
| `PATCH /return-collections/{collectionID}` | 송장 접수, 수거/입고 확인, 수거 전 주소 수정 |
| `GET /return-collections/{collectionID}/inspections` | 입고된 수거의 검수 정정 이력 조회 |
| `POST /return-collection-items/{collectionItemID}/inspections` | 수령·환불 승인·재판매 가능 수량과 결과·귀책 저장 |
| `POST /return-inspections/{inspectionID}/restock` | 검수 후 사용자가 확인한 수량만 별도 재입고 |
| `GET /refunds/{refundID}/quote` | 현금·포인트·배송비 환불/차감·초과 면제액 조회 |
| `POST /refunds/{refundID}/execute` | 관리자 환불 실행, 필요 시 가상계좌 환불 계좌 전달 |
| `POST /refunds/{refundID}/withdraw` | 실행 전 또는 PG 효과 없는 확정 실패 요청 철회 |
| `GET/PUT /markets/{marketID}/return-address` | 마켓의 현재 반품 도착지 설정 |
| `GET/PUT /seller/markets/{marketID}/shipping-settings` | 기존 배송 설정에 편도 회수비 포함 |

응답은 Zod로 검증한다. 요청·견적·검수 캐시에는 로그인 토큰을 포함해 역할을 전환해도 다른 계정의 캐시를 재사용하지 않는다. 주문/요청/수거/검수/견적/재고 캐시를 처리 후 갱신한다.

금액은 서버 견적과 저장된 결과를 사용한다. PG 작업 상태가 `SUCCEEDED`여도 `completed`가 아니면 내부 처리가 끝난 것으로 표시하지 않고 재조회한다. 계좌번호와 예금주명은 화면 메모리에만 보관하고 실행 후 비운다. 가상계좌 취소 접수와 실제 은행 입금 완료를 구분한다.

## 통합 환경과 확인 결과

실제 Next.js 화면, 실제 API `main()` 부트스트랩, 인증·권한·도메인 서비스·Docker MySQL 8.4를 연결했다. 개발 서버와 별도로 새 주문을 생성해 프로덕션 빌드에서도 동일 흐름을 실행했다. Temporal은 전용 로컬 개발 서버를 사용했다.

**Toss HTTP 경계만 로컬 테스트 대역으로 대체했다.** 브라우저의 비즈니스 API를 가로채거나 정적 성공 응답으로 대체하지 않았다. 이번 검증은 새 실제 Toss 승인·카카오페이 인증·은행 송금·실물 택배를 수행한 기록이 아니다. 기존 실제 Toss TEST 영상은 #57 본문의 과거 검증 자료다.

| 주문 시나리오 | 브라우저 흐름과 기대 결과 |
| --- | --- |
| 무료배송 3개·포인트 1,000P | 판매자 귀책 1개 신청→수거→입고→검수→현금 9,667원·333P 복원. 남은 2개 신청 가능 확인 후 구매자 귀책 반품→현금 13,333원·667P 복원, 비용 6,000원 유지 |
| 유료배송 구매자 귀책 | 상품 20,000원+원 배송비 3,000원. 회수비 3,000원 반영, 현금 17,000원 환불·PG 잔액 6,000원 |
| 환불액보다 반품비가 큼 | 상품 현금 4,000원·비용 6,000원. 현금 환불 0원, 2,000원 면제, PG 취소 호출 없음 |
| 가상계좌 판매자 귀책 | 은행·계좌번호·예금주 입력 후 7,000원 취소, 계좌 전달 확인, 취소 접수 안내 표시 |
| 구매확정 상품 | 신청 가능한 수량 없음, 반품 신청 버튼 없음 |

추가 확인:

- 환불 실행 5건에 대해 DB에 저장된 상태·금액을 실제 API로 재조회했다. 금액이 0원인 1건을 제외한 PG 취소 요청은 총 4건이다.
- 완료 요청 재실행 후 PG 취소 건수가 증가하지 않는다. 첫 부분 반품에서 선택한 1개만 재입고하여 재고 100→101을 확인했다.
- 구매자의 수거 관리 접근, 판매자의 PG 환불 실행은 각각 403이다. 마켓 간 수거 조회 범위는 백엔드 MySQL 테스트로 확인했다.
- 수거 전 주소 변경으로 송장이 초기화되고 수거 이후 주소 입력이 잠긴다. 해당 서버 제약은 MySQL 회귀 테스트도 통과했다.
- 390×844 모바일 주문 상세에서 가로 넘침이 없으며 고정 하단 메뉴를 유지한다.
- 수거 생성 폼과 환불 영역의 React key 충돌을 수정하고 검수 화면 전환 시 이전 폼이 남지 않는 회귀 테스트를 추가했다.

## 자동 검사

- 관련 6개 파일/21개 Vitest 테스트 통과.
- TypeScript, 변경 파일 ESLint, Next.js 프로덕션 빌드 통과.
- 백엔드 수거 목록 범위·기존 마켓 wildcard와의 라우트 등록 충돌 회귀 테스트 추가. 관련 반품 MySQL 테스트 `-race` 통과.
- 전체 프론트 테스트 실행 당시 399개 중 396개 통과, 기존 실패 3개. 이후 폼 전환·판매자 마켓 범위 회귀 테스트 2개를 추가하고 관련 21개를 재실행했다.
- 기존 실패는 작업 시작 커밋 `d8edac0`의 별도 체크아웃에서도 동일하게 재현했다: `src/lib/api/commands.test.ts`의 알림 응답 계약 1개, `src/components/advertising/sponsored-placement.test.tsx`의 배너 비율 기대값 2개. 이번 수정에서 해당 영역을 변경하지 않았다.

## 재현

전제: #200 최신 마이그레이션이 적용된 **별도 로컬 테스트 DB**, 로컬 Temporal `127.0.0.1:17233`, Node/Go 및 Playwright CLI가 준비되어 있어야 한다. 운영 DB를 지정하지 않는다. 아래 명령은 각 저장소 루트에서 실행한다.

### 1. 백엔드 테스트 주문 생성

```sh
export COMMERCE_TEST_MYSQL_DSN='<별도 로컬 DB의 MySQL DSN: tcp(127.0.0.1:포트)/commerce?parseTime=true&multiStatements=true>'
RUN_RETURNS_UI_FIXTURE=1 \
RETURNS_UI_FIXTURE_FILE=/tmp/commerce-returns-ui.json \
go test ./tests/e2e -run '^TestReturnsUIFixture$' -count=1
```

이 파일에는 합성 테스트 계정과 토큰이 들어 있으므로 Git에 추가하지 않는다. 시나리오를 처음부터 반복할 때는 새 fixture를 생성하고 PG 대역도 새 파일로 재시작한다.

### 2. 프론트 저장소에서 PG HTTP 대역 실행

```sh
node tests/support/returns-payment-gateway.mjs /tmp/commerce-returns-ui.json
```

### 3. 백엔드 실제 부트스트랩 실행

```sh
export DATABASE_URL="$COMMERCE_TEST_MYSQL_DSN"
export APP_ENV=development
export HTTP_ADDR=127.0.0.1:18082
export JWT_SECRET=returns-ui-local-only
export TEMPORAL_HOST_PORT=127.0.0.1:17233
export TOSS_PAYMENTS_SECRET_KEY=test_gsk_returns_ui
export TOSS_PAYMENTS_CLIENT_KEY=test_gck_returns_ui
export TOSS_PAYMENTS_API_BASE_URL=https://api.tosspayments.com
export EXPERIMENT_BROKER_PROVIDER=noop
export NOTIFICATION_BROKER_PROVIDER=noop
export COURIER_TRACKING_ENABLED=false
export S3_BUCKET=''
export IMGPROXY_BASE_URL=''
export RUN_RETURNS_BROWSER_API=1
export RETURNS_UI_STOP_FILE=/tmp/commerce-returns-ui-stop-new
# 위 종료 파일이 이미 있으면 다른 새 경로를 사용한다.
go test ./cmd/api -run '^TestReturnsBrowserAPI$' -count=1 -timeout=47m
```

공식 Toss URL 검증은 프로덕션 코드에서 유지한다. opt-in `_test.go`의 전송 계층만 로컬 `18086`으로 연결한다. 종료 시 위 `RETURNS_UI_STOP_FILE` 경로에 빈 파일을 만든다.

### 4. 프론트 프로덕션 빌드·실행 및 브라우저 검증

```sh
BACKEND_API_BASE_URL=http://127.0.0.1:18082 NEXT_PUBLIC_API_BASE_URL=same-origin npm run build
BACKEND_API_BASE_URL=http://127.0.0.1:18082 NEXT_PUBLIC_API_BASE_URL=same-origin npm run start -- --port 13001
```

다른 터미널에서:

```sh
E2E_BASE_URL=http://127.0.0.1:13001 \
E2E_API_BASE_URL=http://127.0.0.1:18082 \
node tests/support/returns-browser-check.mjs /tmp/commerce-returns-ui.json
```

스크립트는 실제 로그인 및 구매자·판매자·관리자 화면 조작을 수행한다. `PLAYWRIGHT_CLI_PATH`로 CLI wrapper 경로를 지정할 수 있다. 결과 JSON과 모바일 스크린샷은 Git에서 제외된 `output/playwright/returns-integration/`에 생성한다.

## 배포 순서

#200 스키마 → 검토된 마켓 배송비 백필 → #198 → #201 API/worker → #57 프론트. 프론트 새 화면은 새 계약이 제공된 후 배포한다. 추가 프로덕션 환경변수나 npm 의존성은 없다.
