# Commerce Web

`commerce-web`은 `commerce-server`와 연동하는 패션 커머스 프론트엔드입니다. 고객 쇼핑 화면, 셀러 운영 콘솔, 관리자 콘솔을 하나의 Next.js 애플리케이션으로 제공합니다.

저장소: [RCLC2/commerce-web](https://github.com/RCLC2/commerce-web)

## 기술 구성

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4
- TanStack Query, Zustand
- React Hook Form, Zod
- Vitest, Testing Library, Playwright
- Toss Payments SDK

## 로컬 실행

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:3000`입니다. 개발 환경에서 API 주소를 지정하지 않으면 커머스 API는 `http://127.0.0.1:8080`, 실험 API 프록시는 `http://localhost:8081`을 사용합니다.

환경별 값이 필요하면 저장소 루트에 `.env.local`을 직접 만듭니다.

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
EXPERIMENT_API_BASE_URL=http://localhost:8081
NEXT_PUBLIC_EXPERIMENT_API_BASE_URL=/experiment-api
```

| 환경 변수 | 용도 |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | 브라우저에서 사용하는 커머스 API 기준 주소. `same-origin`, 상대 경로, 호스트 또는 전체 URL을 지원합니다. |
| `BACKEND_API_BASE_URL` | 같은 출처 프록시를 사용할 때 Next.js 서버가 `/api/v1/*` 요청을 전달할 백엔드 주소입니다. |
| `EXPERIMENT_API_BASE_URL` | Next.js 서버가 `/experiment-api/*` 요청을 전달할 실험 API 주소입니다. |
| `NEXT_PUBLIC_EXPERIMENT_API_BASE_URL` | 브라우저에서 사용하는 실험 API 경로이며 기본값은 `/experiment-api`입니다. |

HTTPS로 배포하면서 백엔드가 별도 출처에 있다면 다음처럼 같은 출처 프록시를 사용합니다.

```bash
NEXT_PUBLIC_API_BASE_URL=same-origin
BACKEND_API_BASE_URL=https://<commerce-api-host>
EXPERIMENT_API_BASE_URL=http://<experiment-api-service>:8081
NEXT_PUBLIC_EXPERIMENT_API_BASE_URL=/experiment-api
```

`BACKEND_API_BASE_URL`에는 `/api/v1`을 붙이지 않습니다. 프론트엔드는 API 실패나 빈 응답을 목 데이터로 대체하지 않습니다.

## 구현된 화면

### 고객 쇼핑

- 홈, 카테고리, 상품 목록·상세, 통합 검색
- 추천, 마켓 피드, 인기 상품·마켓, 마켓 상세
- 이벤트 상세, 오늘의 코디
- 좋아요, 장바구니, 주문서, Toss 결제 성공·실패
- 로그인, 회원가입, 취향 온보딩
- 마이페이지, 프로필, 쿠폰, 리뷰, 주문 상세

주요 라우트는 `/`, `/categories`, `/products`, `/products/[id]`, `/search`, `/recommendations`, `/market-feed`, `/today-outfit`, `/events/[id]`, `/cart`, `/checkout`, `/orders/[orderCode]`, `/mypage`입니다.

### 셀러 콘솔

- 대시보드, 상품, 재고 연동, 주문, 정산, 리뷰
- 광고 운영, 변경 이력 감사 로그

모든 셀러 화면은 `/seller/*` 아래에 있습니다.

### 관리자 콘솔

- 대시보드, 회원, 마켓, 상품, 주문, 정산, 쿠폰
- CMS, 광고, 실험, 토큰, 변경 이력 감사 로그

모든 관리자 화면은 `/admin/*` 아래에 있습니다. UI 라우트가 존재하더라도 백엔드 계약의 제약은 [백엔드 계약 개선 목록](docs/BACKEND_CONTRACT_GAPS.md)을 기준으로 판단합니다.

## 주요 소스 위치

- `src/app`: App Router 페이지와 서버 라우트
- `src/components`: 고객·셀러·관리자 화면 구성 요소
- `src/lib/api`: 도메인별 API 클라이언트와 응답 정규화
- `src/lib`: 세션, 결제, 상품 표시, 작업 큐 등 공통 로직
- `tests/api`: 실제 백엔드 연동 API E2E
- `tests/e2e`: 브라우저 E2E

API 엔드포인트 목록은 중복된 README 표 대신 `src/lib/api` 구현을 단일 기준으로 사용합니다.

## 검사 명령

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
npm run test:e2e:api
npm run test:e2e:ui
```

`test:e2e:api`와 `test:e2e:ui`는 실행 대상 서비스와 브라우저가 준비된 환경에서 사용합니다.

## 문서

- [구현 현황과 후속 작업](docs/IMPLEMENTATION_PLAN.md)
- [PLP 프론트 연동](docs/PLP.md)
- [상품 상세와 셀러 상품 작성](docs/PDP_AND_SELLER_PRODUCTS.md)
- [홈 카테고리 구좌](docs/HOME_CATEGORY_CHIPS.md)
- [이벤트 상세 페이지 계약](docs/EVENT_DETAIL.md)
- [백엔드 계약 개선 목록](docs/BACKEND_CONTRACT_GAPS.md)

과거 구현 제안과 승인 기록은 `docs/implementation-artifacts`와 `docs/superpowers`에 보관합니다. 현재 동작을 확인할 때는 위 현행 문서와 소스 코드를 우선합니다.

## 배포

Vercel 배포는 접근 가능한 커머스 백엔드와 필요한 데이터가 준비되어 있어야 합니다. 배포 환경에서는 `NEXT_PUBLIC_API_BASE_URL=same-origin`과 `BACKEND_API_BASE_URL` 조합을 권장하며, 실험 화면을 사용할 때는 실험 API 프록시 변수도 함께 설정합니다.
