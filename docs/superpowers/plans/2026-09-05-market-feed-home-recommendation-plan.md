# 마켓 피드 전환과 홈 추천 계약 정리 구현 계획

- 날짜: 2026-09-05
- 상태: 구현 진행
- 기준 설계: `docs/superpowers/specs/2026-09-05-market-feed-home-recommendation-design.md`
- 대상 저장소: `commerce-server`, `commerce-web`

## 1. 구현 원칙

1. 서버의 additive 계약을 먼저 완성한 뒤 웹을 연결한다.
2. 실패하는 계약·서비스 테스트를 먼저 작성하고 최소 구현으로 통과시킨다.
3. 회원 ID는 인증 컨텍스트에서만 읽고 개인 피드는 공유 캐시에 저장하지 않는다.
4. 상품 공개·마켓 제재 정책을 새 피드에서 우회하지 않는다.
5. 추천과 피드 모두 상품별 추가 HTTP 요청을 만들지 않는다.
6. 기존 작업 checkout의 미커밋 파일은 수정하거나 커밋하지 않는다.
7. 모든 커밋은 `git commit -s -S`로 만들고 서명과 `Signed-off-by`를 검증한다.

## 2. 작업 브랜치

- `commerce-server`: `feat/market-feed-home-recommendations`, 최신 `origin/main` 기준 clean worktree
- `commerce-web`: `feat/market-feed-home-recommendations`, 승인 설계가 포함된 `66b665a` 기준 clean worktree

## 3. 서버 구현

### 작업 1. 추천 응답에 상품 카드 일괄 결합

대상:

- `internal/recommendation/entity.go`
- `internal/recommendation/service.go`
- `internal/recommendation/service_test.go`
- `cmd/api/main.go`

순서:

1. 추천 결과의 순서를 보존하면서 상품 요약을 결합하고 비공개 상품을 제외하는 실패 테스트를 추가한다.
2. 추천 서비스에 `ListProductSummaries`를 가진 좁은 loader 인터페이스를 주입한다.
3. `RecommendationResult.product`에 기존 `product.ProductListItemResponse`를 담는다.
4. 배치 결과와 인기 fallback 모두 같은 결합 경로를 사용한다.
5. API 조립 시 이미 생성된 ProductService를 추천 서비스에 연결한다.

검증: `go test ./internal/recommendation ./cmd/api`

### 작업 2. 공개 마켓 목록 정렬 계약 추가

대상:

- `internal/market/repository.go`
- `internal/market/service.go`
- `internal/market/handler.go`
- 관련 테스트

순서:

1. `sort=new|popular` 검증과 popular 안정 정렬 테스트를 추가한다.
2. 마켓 목록 요청에 sort를 전달하고 기본값은 `new`로 유지한다.
3. 공개 불가 마켓을 목록에서 제외한다.
4. `popular`는 `market_followers` 관계 테이블의 수와 ID로 정렬한다.

검증: `go test ./internal/market`

### 작업 3. 인증 마켓 피드 API 추가

대상:

- 신규 `internal/marketfeed/{entity,repository,service,handler}.go`
- 신규 `internal/marketfeed/*_test.go`
- `cmd/api/main.go`
- 필요 시 새 migration과 migration 계약 테스트

순서:

1. 커서 round-trip·오류, limit, 회원 격리, 공개 판정, 안정 페이지네이션 테스트를 작성한다.
2. 팔로우한 공개 마켓의 판매 가능 상품을 `(created_at, id)` 역순으로 조회한다.
3. limit+1 조회로 `next_cursor`를 결정하고 상품 요약을 일괄 결합한다.
4. `GET /api/v1/me/market-feed`를 인증 라우트로 등록한다.
5. 개인 응답에 `Cache-Control: private, no-store`를 설정한다.
6. 실행 계획에 필요한 인덱스가 없을 때만 additive migration을 추가한다.

검증: `go test ./internal/marketfeed ./internal/product ./cmd/api`

### 작업 4. 서버 문서·전체 검증·커밋

- `docs/product/market_feed.md`에 API, 공개 판정, 운영 지표를 기록한다.
- `docs/qa/api_spec.md`에 새 계약과 추천 보강을 반영한다.
- `gofmt`, `go test ./...`, `git diff --check`를 실행한다.
- 서버 변경을 서명 커밋한다. 레거시 `/products/recommendations` 라우트는 배포 호환을 위해 이번 additive 커밋에서 유지한다.

## 4. 웹 구현

### 작업 5. API 계약 추가·교정

대상:

- 신규 `src/lib/api/market-feed.ts`와 테스트
- `src/lib/api/catalog.ts`와 테스트
- `src/lib/api/customer.ts`
- `src/lib/api/contracts/schemas.ts`
- `src/lib/query-keys.ts`

순서:

1. 마켓 피드, 커서 응답, popular market, 상품 포함 추천 응답의 실패 테스트를 추가한다.
2. `listMarketFeed`, `listMarkets({sort})`, `listMyRecommendations(token, limit)`를 구현한다.
3. 공개 `listRecommendedProducts`와 offset 기반 가짜 추천 계약을 제거한다.

검증: 관련 Vitest 계약 테스트

### 작업 6. 홈을 실제 추천으로 전환

대상:

- `src/components/home-page.tsx`
- 관련 컴포넌트 테스트

순서:

1. 로그인·비로그인·BATCH·FALLBACK·오류 분기 테스트를 추가한다.
2. 로그인은 `/me/recommendations`, 비로그인은 `/products/popular`를 사용한다.
3. 상품이 포함된 추천 결과를 기존 ProductCard로 렌더링한다.
4. offset과 무한 스크롤을 제거하고 추천 source에 맞는 제목을 표시한다.
5. CMS `/products/recommendations`를 최신 상품으로 조용히 치환하는 분기를 제거한다.

검증: 홈 단위 테스트와 이벤트 캐러셀 회귀 테스트

### 작업 7. 마켓 피드 화면과 탐색 전환

대상:

- 신규 `src/app/market-feed/page.tsx`
- 신규 `src/components/market-feed-page.tsx`와 테스트
- `src/components/app-shell.tsx`
- `src/app/snapshot/page.tsx`
- `src/app/recommendations/page.tsx`
- 관련 E2E

순서:

1. 비로그인, 무팔로우, 무상품, 정상 피드, 추가 페이지 오류, 팔로우 변경 테스트를 추가한다.
2. 트렌드관 메뉴를 마켓 피드로 교체한다.
3. 인증 피드와 popular market 발견 상태를 구현한다.
4. `/snapshot`은 `/market-feed`, `/recommendations`는 홈 추천 앵커로 리다이렉트한다.
5. 검색 화면의 인기 검색어 기능은 유지하고 트렌드 전용 테스트만 교체한다.

검증: 관련 Vitest와 Playwright E2E

### 작업 8. 웹 전체 검증·커밋

- `npm test -- --run`
- `npm run lint`
- `npm run build`
- 관련 Playwright E2E
- `git diff --check`
- 웹 변경을 서명 커밋한다.

## 5. 통합과 배포 경계

1. 서버를 먼저 배포해 마켓 피드와 상품 포함 추천 계약을 제공한다.
2. 웹을 배포해 새 계약으로 전환한다.
3. 배포 후 로그인·비로그인 홈, 마켓 피드, 팔로우·언팔로우를 확인한다.
4. `/api/v1/products/recommendations` 호출량을 7일간 관찰한다.
5. 호출이 없으면 별도 서버 정리 PR에서 레거시 라우트를 제거한다.

PR 생성, push, 배포, 레거시 호출량 관찰과 라우트 최종 제거는 사용자 요청 또는 승인된 후속 단계에서 수행한다. PR을 만들 경우 ready for review로 만들고 자동 리뷰와 CI를 확인하되 병합하지 않는다.
