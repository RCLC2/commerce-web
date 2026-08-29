# 추천 취향 온보딩 구현 계획

## 목적

승인된 [추천 취향 온보딩 설계](../specs/2026-08-28-onboarding-design.md)를 `commerce-server`와 `commerce-web`에 구현한다. 신규 일반 회원은 가입과 동시에 인증되고, 균형 상품 최대 10개를 O/X로 평가하거나 건너뛴 뒤 초기 추천을 받는다.

구현은 서버 계약과 migration을 먼저 배포하고 웹을 뒤따르게 한다. 서버 기능 플래그를 끈 상태에서는 기존 가입·로그인·추천 동작이 유지되어야 한다.

## 저장소와 브랜치

구현 시 현재의 관련 없는 작업 트리를 재사용하지 않고 각 저장소의 최신 `origin/main`에서 별도 작업 트리를 만든다.

- `commerce-server`: `feat/onboarding-api`
- `commerce-web`: `feat/onboarding-ui`

두 브랜치는 각각 독립 PR로 만든다. 서버 PR을 먼저 준비하되 병합과 배포는 사용자 소유 작업으로 남긴다. 웹 PR은 서버 계약을 Zod 스키마와 E2E에서 검증한다.

## 구현 원칙

- 각 작업은 실패하는 테스트를 먼저 추가하고 최소 구현으로 통과시킨다.
- 온보딩 domain은 기존 추천 배치와 파일 경계를 나누되 같은 `recommendation` 패키지 안에서 명시적 인터페이스로 연결한다.
- 회원가입 성공은 온보딩 세션 또는 추천 생성 실패 때문에 취소하지 않는다.
- 신규 `MEMBER`만 자동 온보딩 대상이다. 승인 대기 `SELLER`와 기존 회원은 대상이 아니다.
- 클라이언트 카드는 별도 모션 의존성을 추가하지 않고 React 포인터 이벤트와 CSS transform으로 구현한다.
- 서버 세션이 진실의 원천이며 클라이언트는 응답만 낙관적으로 반영한다.
- 배포 전까지 `ONBOARDING_ENABLED=false`를 기본값으로 둔다.
- 기능 플래그가 꺼졌거나 rollout 비대상인 가입은 토큰을 확장 반환하지 않고 기존 로그인 이동을 유지한다.

## 단계 0: 구현 작업 트리와 기준선 준비

### 서버

1. 최신 원격 상태를 확인하고 `origin/main`에서 `feat/onboarding-api` 작업 트리를 만든다.
2. 다음 기준 검증을 먼저 실행한다.

```powershell
go test ./internal/recommendation ./internal/member ./pkg/migrations
go build ./cmd/api ./cmd/worker
```

3. 실패가 있으면 기능 구현과 섞지 않고 기준선 문제로 기록한다.

### 웹

1. 최신 `origin/main`에서 `feat/onboarding-ui` 작업 트리를 만든다.
2. `node_modules/next/dist/docs/`에서 현재 Next 16.3의 App Router, client navigation, client component 문서를 확인한다.
3. 다음 기준 검증을 실행한다.

```powershell
npm test -- --run
npm run lint
npm run build
```

## 단계 1: 서버 migration과 계약 고정

### 파일

- 생성: `commerce-server/migrations/20260829001_onboarding.sql`
- 생성: `commerce-server/pkg/migrations/onboarding_contract_test.go`

### 테스트 우선

계약 테스트는 migration에 다음 요소가 있는지 검증한다.

- `onboarding_sessions`
- `onboarding_items`
- `UNIQUE(member_id, generation)`
- `UNIQUE(session_id, product_id)`
- `UNIQUE(session_id, position)`
- 회원·상태 및 세션·응답 조회 인덱스
- 허용 상태와 choice에 대한 CHECK 제약
- `-- +goose Down`에서 item 다음 session 순서로 제거
- MySQL 8에서 허용되는 타입과 구문만 사용

### 구현

1. session 테이블에 `member_id`, `generation`, `status`, `candidate_version`, `total_count`, `responded_count`, `started_at`, `finished_at`, 생성·수정 시각을 추가한다.
2. item 테이블에 `session_id`, `product_id`, `position`, `choice`, `input_method`, `responded_at`, 생성·수정 시각을 추가한다.
3. 상태는 `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, `UNAVAILABLE`만 허용한다.
4. choice는 `LIKE`, `DISLIKE`, NULL만 허용하고 input method는 `SWIPE`, `BUTTON`, `KEYBOARD`, NULL만 허용한다.
5. migration 버전 중복 테스트와 새 계약 테스트를 실행한다.

```powershell
go test ./pkg/migrations
```

### 커밋

`feat: 추천 온보딩 데이터 모델 추가`

## 단계 2: 온보딩 entity와 repository

### 파일

- 생성: `commerce-server/internal/recommendation/onboarding/entity.go`
- 생성: `commerce-server/internal/recommendation/onboarding/repository.go`
- 생성: `commerce-server/internal/recommendation/onboarding/repository_test.go`

### 모델과 인터페이스

다음 타입을 추천 배치 entity와 분리해 정의한다.

- `OnboardingStatus`
- `OnboardingChoice`
- `OnboardingInputMethod`
- `OnboardingSession`
- `OnboardingItem`
- `OnboardingCandidate`
- `OnboardingSessionView`

`OnboardingRepository`는 다음 책임만 가진다.

- 회원의 최신 또는 활성 세션 조회
- generation을 잠근 상태에서 신규 세션 생성
- 후보 풀과 전체 카테고리 계층 조회
- 세션 item 10개 원자적 저장
- 현재 세션 item 및 상품 카드 조회
- choice upsert 및 삭제와 `responded_count` 원자적 갱신
- 종료 상태 검증과 저장
- 미응답 판매 불가 상품 교체

### 테스트 우선

sqlmock 또는 기존 repository 테스트 패턴으로 다음을 고정한다.

- 회원별 최신 generation 조회
- 동일 회원에 활성 세션이 있을 때 새 세션을 만들지 않음
- choice 첫 저장은 카운터 증가, 재선택은 카운터 유지
- choice 삭제는 실제 응답이 있을 때만 카운터 감소
- 종료된 세션 수정 거부
- session·product 및 session·position 중복 거부
- 후보 조회가 `SELLING`, 열린 마켓, 대표 이미지, 활성 옵션의 가용 재고를 요구

가용 재고 조건은 활성 옵션 중 `quantity - reserved_quantity - safety_quantity > 0`인 항목이 하나 이상인 경우다.

### 구현 주의점

- 트랜잭션 내부 repository 호출은 `pkg/db.GetDB(ctx, r.db)`를 사용한다.
- 카운터는 음수가 되지 않도록 조건부 update한다.
- 종료와 restart는 최신 세션 행을 `FOR UPDATE`로 잠근다.
- 상품 카드 응답은 기존 PLP 응답 전체를 재사용하지 않고 온보딩에 필요한 ID, 마켓, 이름, 이미지, 가격만 projection한다.

### 검증

```powershell
go test ./internal/recommendation -run OnboardingRepository
```

### 커밋

`feat: 추천 온보딩 저장소 추가`

## 단계 3: 균형 후보 선정과 상태 서비스

### 파일

- 생성: `commerce-server/internal/recommendation/onboarding/service.go`
- 생성: `commerce-server/internal/recommendation/onboarding/service_test.go`

### 서비스 경계

`OnboardingService`는 repository, 시계 함수, seed 함수, 기능 노출 정책을 주입받는다. HTTP와 Temporal 타입에는 의존하지 않는다.

주요 메서드:

- `ProvisionForSignup(ctx, memberID)`
- `GetOrStart(ctx, memberID)`
- `SaveResponse(ctx, memberID, productID, choice, inputMethod)`
- `UndoResponse(ctx, memberID, productID)`
- `Finish(ctx, memberID, status)`
- `Restart(ctx, memberID)`

### 테스트 우선: 후보 선정

고정 후보 fixture로 다음을 검증한다.

- 인기와 최신 점수를 반영한 상위 200개만 입력으로 사용
- 같은 상위 카테고리 최대 2개
- 같은 마켓 최대 1개 우선 적용
- 가격 3분위 모두 포함
- 동일 member·session·version은 같은 순서
- 다른 member는 다른 순서가 될 수 있음
- 10개 미달 시 마켓, 가격, 카테고리 제약 순으로 완화
- 상품 중복은 어떤 경우에도 없음
- 자격 상품 5개 미만이면 `UNAVAILABLE`

상위 카테고리는 `categories.parent_id`를 따라 depth 1까지 올라가 계산한다. 가격 분위는 후보 풀의 실제 판매가로 계산하며 `discount_price > 0`이면 할인 가격을 사용한다.

### 테스트 우선: 상태 전이

- Provision은 대상 신규 MEMBER에게 generation 1의 `NOT_STARTED` 세션을 생성
- 첫 조회는 후보를 저장한 뒤 `IN_PROGRESS`
- `COMPLETED`는 모든 item에 choice가 있을 때만 허용
- `SKIPPED`는 0개 또는 일부 응답 상태에서 허용
- 종료 요청 반복은 기존 종료 결과 반환
- 종료 세션의 response 수정은 conflict
- restart는 generation을 1 증가시키고 활성 세션이 있으면 재사용
- 세션이 없는 기존 회원 조회는 `NOT_ELIGIBLE`
- 미응답 판매 불가 상품만 같은 position에서 교체

### 구현

1. 후보 점수와 다양성 선택을 순수 함수로 분리한다.
2. DB 변경은 repository 트랜잭션 경계 안에서 수행한다.
3. `Finish`는 세션 종료까지만 책임지고 추천 생성은 다음 단계의 orchestration에서 연결한다.
4. domain 오류를 `ErrOnboardingNotEligible`, `ErrOnboardingConflict`, `ErrOnboardingUnavailable`, `ErrInvalidOnboardingState`로 구분한다.

### 검증

```powershell
go test ./internal/recommendation -run Onboarding
```

### 커밋

`feat: 균형 추천 온보딩 세션 구현`

## 단계 4: 온보딩 HTTP API

### 파일

- 생성: `commerce-server/internal/recommendation/onboarding/handler.go`
- 생성: `commerce-server/internal/recommendation/onboarding/handler_test.go`
- 수정: `commerce-server/cmd/api/main.go`

### 테스트 우선

각 API를 httptest로 검증한다.

- 인증 컨텍스트가 없으면 401
- 세션 조회 성공 응답의 상태, 진행률, 고정 item 순서와 상품 projection
- choice 또는 input method가 allow-list 밖이면 400
- 화면 이벤트 이름이 allow-list 밖이거나 product·position이 현재 세션과 다르면 400
- 세션 외 product, 종료 세션 수정, 잘못된 완료 상태는 409
- 동일 PUT과 DELETE 반복의 멱등성
- 완료 시 전체 응답 수 검증
- repository 또는 서비스 장애의 500 응답과 사용자용 오류 메시지

### 라우트

`cmd/api/main.go`의 기존 `withAuth` 그룹에 다음을 연결한다.

- `GET /api/v1/me/onboarding`
- `PUT /api/v1/me/onboarding/responses/:productID`
- `DELETE /api/v1/me/onboarding/responses/:productID`
- `POST /api/v1/me/onboarding/finish`
- `POST /api/v1/me/onboarding/restart`
- `POST /api/v1/me/onboarding/events`

핸들러는 member ID를 인증 컨텍스트에서만 읽고 session ID를 외부 입력으로 받지 않는다.
화면 이벤트 API는 viewed, product impression, resumed, save failed만 best-effort 구조화 로그로 기록한다. rated, undo, skipped, completed는 상태 변경 핸들러에서 직접 기록한다.

### 검증

```powershell
go test ./internal/recommendation -run OnboardingHandler
```

### 커밋

`feat: 내 추천 온보딩 API 추가`

## 단계 5: 회원가입 자동 인증과 노출 정책

### 파일

- 수정: `commerce-server/configs/config.go`
- 수정: `commerce-server/configs/config_test.go`
- 수정: `commerce-server/internal/member/handler.go`
- 수정: `commerce-server/internal/member/handler_test.go`
- 수정: `commerce-server/cmd/api/main.go`
- 수정: `commerce-server/docker-compose.yml`

### 설정

다음 설정을 추가한다.

- `ONBOARDING_ENABLED`: 기본값 `false`
- `ONBOARDING_ROLLOUT_PERCENT`: 기본값 `0`, 범위 0~100

노출 여부는 `hash("onboarding-v1:" + member_id) % 100 < rollout_percent`로 결정해 재시도에도 안정적으로 유지한다. 로컬 E2E 프로필은 enabled=true, percent=100을 명시한다.

### 테스트 우선

- 설정 기본값과 0·10·100 경계
- rollout 비율 범위 보정
- MEMBER 가입만 Provision 호출
- SELLER 가입은 세션·토큰 자동 진입 대상이 아님
- Provision 실패 시 가입은 201이며 온보딩 상태는 `UNAVAILABLE`
- rollout 대상의 토큰 필드는 로그인 응답과 같은 발급기와 만료 시간을 사용
- rollout 비대상은 `NOT_ELIGIBLE`이며 토큰 필드가 없는 기존 가입 응답 유지
- 기존 `id`, `email`, `type`, `role`, `status` 응답 필드 유지
- 기존 forbidden role/status 입력과 body 크기 제한 유지

### 구현

1. member handler에 작은 `SignupOnboardingProvisioner` 인터페이스를 주입해 member 패키지가 추천 구현 세부사항을 알지 않게 한다.
2. 회원 생성 성공 후 역할이 `MEMBER`이고 노출 정책이 true일 때 세션을 best-effort Provision한다.
3. rollout 대상으로 Provision된 활성 MEMBER에게 액세스 토큰을 발급하고 signup 응답에 `accessToken`, `tokenType`, `expiresIn`, `onboardingStatus`를 추가한다.
4. rollout 비대상은 `NOT_ELIGIBLE` 상태와 기존 회원 필드만 반환한다. 새 웹은 토큰이 없으면 기존처럼 로그인 화면으로 이동한다.
5. rollout 대상으로 선정된 뒤 Provision이 실패하면 오류를 기록하고 `UNAVAILABLE`과 토큰을 반환한다. 회원 생성과 자동 로그인 fallback은 유지한다.

### 검증

```powershell
go test ./internal/member ./configs
```

### 커밋

`feat: 가입 직후 추천 온보딩 인증 연결`

## 단계 6: 온보딩 신호와 추천 점수 통합

### 파일

- 수정: `commerce-server/internal/recommendation/entity.go`
- 수정: `commerce-server/internal/recommendation/repository.go`
- 수정: `commerce-server/internal/recommendation/repository_test.go`
- 수정: `commerce-server/internal/recommendation/service.go`
- 생성 또는 수정: `commerce-server/internal/recommendation/service_test.go`

### 테스트 우선: 신호 조회

- 최신 종료 generation 한 개만 반환
- 진행 중 generation은 무시
- LIKE는 base `+3.0`, DISLIKE는 base `-0.5`
- session `finished_at`과 source `ONBOARDING`이 signal에 포함
- 평가 상품은 seen product 집합에 포함
- 이후 클릭·찜·좋아요·구매는 기존 가중치를 유지

### 테스트 우선: 감쇠와 scoring

- 완료 직후 실제 행동 0개인 LIKE 가중치는 3.0
- 45일 후 시간 감쇠는 50%
- 이후 실제 행동 10개면 행동 감쇠는 50%
- 90일 또는 실제 행동 20개면 0
- DISLIKE는 가격 평균에 포함하지 않음
- 부정 affinity 감점은 감점 전 점수의 30% 이하
- 긍정 행동 없이 X만 있으면 materialized 결과를 비우고 인기 상품 fallback 사용
- 온보딩 노출 상품은 최초 결과에서 제외

### 구현

1. `BehaviorSignal`에 source와 onboarding finished 시각을 추가한다.
2. raw signal을 읽은 뒤 profile 생성에서 시간·실제 행동 감쇠를 계산한다.
3. 가격 profile에는 최종 가중치가 양수인 신호만 사용한다.
4. candidate scoring을 base, positive affinity, raw negative penalty 세 부분으로 분리한다.
5. `final = base + positive - min(rawNegative, (base + positive) * 0.30)`을 적용한다.
6. `PositiveBehaviorCount`가 0이면 개인 결과를 저장하지 않는다.
7. 기존 `RefreshRecommendations` 동작은 유지하고 회원 단위 `RefreshMemberRecommendations` 공개 메서드를 추가한다.

### 검증

```powershell
go test ./internal/recommendation
```

### 커밋

`feat: 온보딩 취향을 추천 점수에 반영`

## 단계 7: 완료 직후 갱신과 Temporal 재시도

### 파일

- 수정: `commerce-server/internal/recommendation/activities.go`
- 수정: `commerce-server/internal/recommendation/workflow.go`
- 생성: `commerce-server/internal/recommendation/workflow_test.go`
- 수정: `commerce-server/internal/recommendation/onboarding/service.go`
- 수정: `commerce-server/internal/recommendation/onboarding/service_test.go`
- 수정: `commerce-server/cmd/api/main.go`
- 수정: `commerce-server/cmd/worker/main.go`

### 테스트 우선

- finish가 세션 종료 commit 후 회원 단위 동기 갱신 호출
- 동기 갱신 성공 시 `recommendation_ready=true`
- 동기 갱신 실패 시 종료 상태 유지, `recommendation_ready=false`, 재시도 enqueue
- 같은 finish 반복이 동일 회원 workflow를 중복 생성하지 않음
- Temporal workflow가 member ID를 activity에 전달하고 기존 재시도 정책을 사용
- worker가 새 workflow와 activity를 `recommendation-task-queue`에 등록

### 구현

1. `MemberRefreshWorkflowName`과 member ID 입력을 받는 workflow를 추가한다.
2. API 프로세스의 Temporal client를 감싼 `MemberRefreshScheduler` adapter를 만든다.
3. workflow ID는 `onboarding-member-{memberID}-generation-{generation}`으로 고정해 멱등성을 확보한다.
4. 온보딩 finish orchestration은 종료 commit과 추천 생성의 실패 경계를 분리한다.
5. Temporal 연결 자체가 실패해도 응답은 완료 상태와 `recommendation_ready=false`를 반환하고 오류를 기록한다.

### 검증

```powershell
go test ./internal/recommendation
go build ./cmd/api ./cmd/worker
```

### 커밋

`feat: 온보딩 추천 즉시 갱신과 재시도 추가`

## 단계 8: 서버 관측성과 전체 회귀 검증

### 파일

- 수정: `commerce-server/pkg/observability/observability.go`
- 수정: `commerce-server/pkg/observability/observability_test.go`
- 수정: `commerce-server/README.md`
- 생성 또는 수정: `commerce-server/tests/e2e/onboarding_e2e_test.go`

### 구현

- 저카디널리티 Prometheus counter: 세션 시작, O/X 응답, 완료, 건너뛰기, 저장 실패, 추천 준비 실패
- duration histogram: 세션 조회, 응답 저장, 완료 API
- 상품·회원·세션 ID는 metric label에 넣지 않고 구조화 로그 필드로만 기록
- 승인 명세의 이벤트 이름을 구조화 로그의 `event` 필드로 고정
- D1·D7 분석은 session/item 테이블과 기존 product click·wishlist·order 로그를 조인하는 운영 분석으로 남긴다.
- README에 기능 플래그, rollout percent, API 목록, fallback 동작을 기록한다.

### E2E

MySQL과 Temporal이 준비된 테스트 환경에서 다음을 검증한다.

- 신규 MEMBER 가입 응답에 토큰과 NOT_STARTED 상태
- GET으로 5~10개의 고정 후보 생성
- 일부 PUT 후 SKIPPED
- 10개 PUT 후 COMPLETED와 materialized recommendation
- 같은 요청 반복의 멱등성
- 기존 회원은 NOT_ELIGIBLE

### 서버 최종 게이트

```powershell
go test ./internal/recommendation ./internal/member ./configs ./pkg/migrations ./pkg/observability
go test ./...
golangci-lint run ./...
go build ./cmd/api ./cmd/worker
```

Docker E2E 환경이 허용되면 추가 실행한다.

```powershell
make test-e2e
```

### 커밋

`test: 추천 온보딩 통합 검증 추가`

## 단계 9: 웹 API 계약과 인증 라우팅

### 파일

- 수정: `commerce-web/src/lib/api/auth.ts`
- 생성: `commerce-web/src/lib/api/onboarding.ts`
- 생성: `commerce-web/src/lib/api/onboarding.test.ts`
- 수정: `commerce-web/src/lib/api.ts`
- 수정: `commerce-web/src/lib/query-keys.ts`
- 수정: `commerce-web/src/components/register-page.tsx`
- 수정: `commerce-web/src/components/login-page.tsx`
- 생성: `commerce-web/src/lib/onboarding-navigation.ts`
- 생성: `commerce-web/src/lib/onboarding-navigation.test.ts`

### 테스트 우선

- signup 응답의 id, role, 선택적 token, onboarding status parsing
- 세션·item·상품·finish 응답의 Zod 계약
- GET, PUT, DELETE, finish, restart, best-effort event의 method·path·token·body
- rollout 대상 signup 성공 시 `setSession` 후 NOT_STARTED이면 온보딩으로 이동
- NOT_ELIGIBLE 또는 토큰 없는 signup은 기존 로그인 화면으로 이동
- status가 UNAVAILABLE이면 홈으로 이동
- login 성공 후 원래 `next`를 보존하면서 세션 조회
- login 후 IN_PROGRESS이면 온보딩, 그 외에는 안전한 next 경로
- 온보딩 상태 조회 실패는 로그인을 실패시키지 않고 next로 이동

### 구현

1. signup 스키마는 토큰 필드를 optional로 받고, 토큰이 있으면 `id`를 session store의 memberID로 사용한다.
2. 회원가입 성공 시 토큰이 있는 경우에만 저장하고 status에 따라 이동한다. 토큰이 없으면 `/login`으로 이동한다.
3. 로그인은 토큰 저장 후 `resolvePostLoginDestination`에서 온보딩 조회와 safe next 경로를 조합한다.
4. SELLER·ADMIN 역할은 온보딩 조회 없이 기존 목적지로 이동한다.
5. query key에 member별 onboarding session key를 추가한다.
6. 화면 이벤트 client는 실패를 삼키는 best-effort 함수로 분리한다.

### 검증

```powershell
npm test -- --run src/lib/api/onboarding.test.ts src/lib/onboarding-navigation.test.ts
```

### 커밋

`feat: 가입 인증과 추천 온보딩 계약 연결`

## 단계 10: 직렬 응답 큐와 온보딩 상태 hook

### 파일

- 생성: `commerce-web/src/lib/onboarding-response-queue.ts`
- 생성: `commerce-web/src/lib/onboarding-response-queue.test.ts`
- 생성: `commerce-web/src/hooks/use-onboarding.ts`
- 생성: `commerce-web/src/hooks/use-onboarding.test.tsx`

### 테스트 우선

- 같은 세션의 PUT·DELETE가 호출 순서대로 직렬 실행
- 같은 상품의 전송 전 선택 변경은 최신 상태 하나로 축약
- 실패한 최신 operation만 지수 backoff 재시도
- 실행 취소가 진행 중 PUT 뒤에 DELETE로 실행
- finish가 queue drain을 기다림
- 5초 timeout 후 재시도 가능 상태 반환
- 서버 재조회 시 첫 미응답 position 선택
- optimistic progress와 서버 progress 재조정
- component unmount 후 state update 방지

### 구현

1. 큐는 React와 분리된 순수 TypeScript 클래스로 만든다.
2. hook은 React Query로 세션 조회와 finish/restart mutation을 관리한다.
3. UI에 필요한 `currentItem`, `progress`, `savingState`, `canUndo`, `choose`, `undo`, `skip`, `finish`만 노출한다.
4. 오류 객체는 사용자 메시지와 재시도 action을 함께 제공한다.
5. browser storage에는 선택 원본을 별도로 영구 보관하지 않는다. 서버에 성공한 응답만 재개 기준으로 삼는다.

### 검증

```powershell
npm test -- --run src/lib/onboarding-response-queue.test.ts src/hooks/use-onboarding.test.tsx
```

### 커밋

`feat: 온보딩 응답 저장 큐 구현`

## 단계 11: 스와이프 카드와 접근성 UI

### 파일

- 생성: `commerce-web/src/components/onboarding-card.tsx`
- 생성: `commerce-web/src/components/onboarding-card.test.tsx`
- 수정: `commerce-web/src/app/globals.css`

### 테스트 우선

- 포인터 이동이 카드 너비 25% 이상이면 방향에 맞는 choice
- 임계값 미만이면 원위치
- 빠른 fling은 거리와 관계없이 방향 choice
- O/X 버튼과 방향키가 동일 callback 호출
- drag 중 O/X 텍스트와 방향 상태 노출
- reduced motion에서 회전·fling class 미사용
- pointer capture 획득과 해제
- 이미지 alt, 버튼 접근성 이름, progress 라이브 알림

### 구현

1. native pointer events로 drag 시작점, 현재 x, 시간, velocity를 계산한다.
2. transform은 `translateX`와 작은 rotate만 사용하고 release 후 CSS transition으로 확정 또는 복귀한다.
3. `SafeImage`를 재사용하고 4:5 비율, 마켓명, 상품명, 판매가를 표시한다.
4. O/X는 텍스트와 아이콘을 함께 사용한다.
5. 키보드 이벤트는 입력 요소가 focus된 경우 무시하고 카드 또는 action 영역에서만 처리한다.
6. 애니메이션 종료와 응답 저장을 분리해 느린 네트워크가 카드 움직임을 막지 않게 한다.

### 검증

```powershell
npm test -- --run src/components/onboarding-card.test.tsx
```

### 커밋

`feat: 접근 가능한 상품 스와이프 카드 추가`

## 단계 12: 온보딩 페이지, 건너뛰기, 재설정

### 파일

- 생성: `commerce-web/src/app/onboarding/preferences/page.tsx`
- 생성: `commerce-web/src/components/onboarding-page.tsx`
- 생성: `commerce-web/src/components/onboarding-page.test.tsx`
- 수정: `commerce-web/src/components/app-shell.tsx`
- 수정: `commerce-web/src/components/profile-edit-page.tsx`

### 테스트 우선

- 로딩, NOT_ELIGIBLE, UNAVAILABLE, IN_PROGRESS, COMPLETED, SKIPPED 상태 화면
- 첫 카드에서만 제스처 안내
- 현재 카드가 보일 때 product impression 이벤트를 한 번만 전송
- `n/total` 진행률과 마지막 응답 후 자동 finish
- 직전 응답 실행 취소
- 0개 또는 일부 응답 후 건너뛰기
- 조회 실패의 다시 시도와 나중에 할게요
- 저장 timeout의 재시도와 홈 이동
- finish 성공 후 완료 알림과 홈 이동
- recommendation_ready=false여도 홈 이동
- 마이페이지 `취향 다시 설정`이 restart 후 온보딩 이동

### 구현

1. 온보딩 경로에서는 검색 header, footer, 모바일 하단 nav를 숨겨 카드 집중도를 유지한다.
2. 상단에 제목, 진행률, 저장 상태, 건너뛰기를 배치한다.
3. `aria-live` 영역으로 진행률, 저장 실패, 완료를 알린다.
4. 후보가 5개 이상 10개 미만이면 서버의 actual total을 그대로 표시한다.
5. 건너뛰기와 오류 fallback은 항상 홈 진입 버튼을 제공한다.
6. 프로필 페이지에 독립 section으로 `추천 취향`과 `다시 설정` 버튼을 추가한다.
7. viewed, product impression, resumed, save failed 화면 이벤트를 best-effort API로 전송한다.

### 검증

```powershell
npm test -- --run src/components/onboarding-page.test.tsx
```

### 커밋

`feat: 선택형 추천 온보딩 화면 추가`

## 단계 13: 웹 통합과 E2E

### 파일

- 생성: `commerce-web/tests/e2e/onboarding.spec.ts`
- 수정: `commerce-web/tests/support/live-backend.ts`
- 수정: `commerce-web/tests/e2e/catalog-and-account-coverage.spec.ts`

### E2E 시나리오

- UI 회원가입 → 토큰 저장 → 온보딩 진입 → 버튼으로 전부 응답 → 홈
- 카드 drag로 오른쪽 O와 왼쪽 X
- 가입 직후 즉시 건너뛰기
- 3개 응답 → page reload → 4번째부터 재개
- 응답 PUT 1회 실패 → 재시도 → 중복 없는 progress
- finish 응답 `recommendation_ready=false` → 홈 fallback
- 기존 seeded 회원 로그인 → 온보딩 없이 기존 next 경로
- 마이페이지 → 취향 다시 설정 → generation 신규 세션
- reduced motion emulation에서 전환과 버튼 동작

기존 account E2E의 `createMember`는 signup 응답 토큰을 무시해도 계속 동작하는지 확인하고, 새 E2E에서는 signup 토큰을 직접 사용한다.

### 웹 최종 게이트

```powershell
npm test -- --run
npm run lint
npm run build
npm run test:e2e:ui -- tests/e2e/onboarding.spec.ts
```

### 커밋

`test: 추천 온보딩 사용자 흐름 검증`

## 단계 14: 교차 저장소 계약과 배포 게이트

### 로컬 통합 순서

1. server migration 적용
2. server API와 worker 실행
3. onboarding enabled=true, rollout=100으로 웹 E2E 실행
4. 완료 회원의 `onboarding_sessions`, items, user profile, result를 확인
5. 서버를 재시작하고 같은 회원의 세션·추천이 유지되는지 확인
6. Temporal을 일시 중단한 상태에서 finish fallback을 확인

### 계약 체크리스트

- signup 필드의 camelCase가 웹 Zod와 일치
- 상태 enum과 choice enum이 양쪽에서 동일
- 세션 item의 position은 1부터 시작
- 판매가는 `discount_price > 0` 우선
- 401은 기존 unauthorized 이벤트와 로그인 복귀 경로를 사용
- 409는 사용자 입력 문제가 아니라 세션 재조회로 회복
- finish `recommendation_ready=false`는 오류 페이지가 아니라 정상 fallback

### 배포 순서

1. server migration과 API를 enabled=false, rollout=0으로 배포
2. API health, migration, 기존 signup/signin/recommendation 회귀 확인
3. web 배포
4. 내부 검증 환경에서 enabled=true, rollout=100
5. production 신규 MEMBER의 10%로 시작
6. 가입 완료율, API 오류율, 온보딩 완료율을 확인해 25%, 50%, 100%로 확대
7. 문제 발생 시 enabled=false로 신규 세션 생성을 중단하되 기존 session과 item은 보존

### PR 검증

- 각 저장소의 PR 템플릿 또는 최근 merged PR 형식을 따른다.
- 모든 커밋은 `git commit -s -S`로 생성하고 GPG 서명과 Signed-off-by를 검증한다.
- server PR에는 migration, signup token 경계, 상태 전이, 부정 점수 상한, Temporal fallback 라인에 짧은 inline self-review를 남긴다.
- 두 PR 모두 ready for review로 열고 초기 Codex Connector와 RabbitCode 리뷰 및 CI를 확인한다.
- actionable 초기 리뷰를 반영하고 thread를 해결한 뒤 CI를 다시 확인한다.
- PR 병합은 수행하지 않는다.

## 완료 조건

- 서버와 웹의 모든 단계별 테스트 및 최종 게이트가 통과한다.
- 기존 가입, 로그인, 추천 fallback, 셀러 가입 흐름에 회귀가 없다.
- 신규 MEMBER는 기능 노출 시 가입 후 자동 로그인되어 온보딩에 진입한다.
- 후보가 충분하면 균형 잡힌 중복 없는 상품 10개가 고정된다.
- O/X, 실행 취소, 건너뛰기, 새로고침 재개가 서버 상태와 일치한다.
- 완료 또는 부분 건너뛰기 후 초기 추천이 생성되며 실패 시 인기 상품으로 복구된다.
- 온보딩 신호 감쇠와 X 감점 상한이 자동 테스트로 고정된다.
- 기능 플래그로 신규 세션 생성을 즉시 중단할 수 있다.
- server와 web PR이 각각 초기 자동 리뷰와 CI를 통과한 ready-for-review 상태다.
