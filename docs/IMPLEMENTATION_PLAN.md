# Commerce Web 구현 현황과 후속 작업

이 문서는 초기 단계별 구현 계획을 대신하는 현재 상태 요약입니다. 실제 라우트는 `src/app`, API 계약은 `src/lib/api`, 실행 명령은 `package.json`을 단일 기준으로 사용합니다.

## 현재 범위

`commerce-web`은 하나의 Next.js 애플리케이션에서 다음 세 영역을 제공합니다.

- 고객 쇼핑: 홈, 탐색, 상품, 장바구니, 주문·결제, 회원 기능
- 셀러 콘솔: 상품·재고·주문·정산·리뷰·광고·감사 로그
- 관리자 콘솔: 회원·마켓·상품·주문·정산·쿠폰·CMS·광고·실험·감사 로그

과거 문서의 `Status: planned` 또는 `Status: required` 표시는 현재 구현 상태를 반영하지 못하므로 제거했습니다. 화면 존재 여부는 `src/app/**/page.tsx`, API 연결 여부는 해당 도메인의 `src/lib/api/*.ts`로 확인합니다.

## 고객 기능

### 상품 탐색

- `/`, `/categories`, `/products`, `/products/[id]`
- `/search`, `/recommendations`, `/market-feed`
- `/popular-products`, `/popular-markets`, `/markets/[id]`
- `/events/[id]`, `/today-outfit`

PLP, 카테고리, 검색, 홈 구좌와 이벤트 화면은 서버가 정한 정렬·페이지네이션·표시 메타데이터를 사용합니다. 프론트에서 임의의 상품, 태그 칩 또는 집계값을 합성하지 않습니다.

### 거래와 회원

- `/cart`, `/checkout`, `/payments/toss/success`, `/payments/toss/fail`
- `/orders/[orderCode]`
- `/login`, `/register`, `/onboarding/preferences`
- `/mypage`, `/mypage/profile`, `/mypage/coupons`, `/mypage/reviews`, `/likes`

주문과 결제의 서버 계약상 제약은 [백엔드 계약 개선 목록](BACKEND_CONTRACT_GAPS.md)에 기록합니다.

## 셀러 콘솔

현재 라우트는 다음과 같습니다.

- `/seller`: 운영 요약
- `/seller/products`: 상품 작성과 관리
- `/seller/inventory`: 외부 재고 연동
- `/seller/orders`: 주문 처리
- `/seller/settlements`: 정산 조회
- `/seller/reviews`: 리뷰 관리
- `/seller/ads`: 광고 운영
- `/seller/audit-logs`: 변경 이력 조회

셀러 상품 작성의 용어와 동작은 [상품 상세와 셀러 상품 작성](PDP_AND_SELLER_PRODUCTS.md)을 따릅니다.

## 관리자 콘솔

현재 라우트는 다음과 같습니다.

- `/admin`: 운영 요약
- `/admin/members`, `/admin/markets`, `/admin/products`
- `/admin/orders`, `/admin/settlements`, `/admin/coupons`
- `/admin/cms`, `/admin/ads`
- `/admin/experiments`, `/admin/tokens`
- `/admin/audit-logs`

민감한 변경 요청은 서버가 요구하는 권한과 사유 필드를 보존해야 합니다. UI가 있는 것과 서버가 모든 운영 시나리오를 지원하는 것은 구분하며, 미지원 계약을 성공한 것처럼 표시하지 않습니다.

## 데이터와 오류 처리 원칙

- 실제 API 오류는 오류 상태로 표시하고 미리보기·목 데이터로 대체하지 않습니다.
- 정상 빈 응답은 빈 상태로 표시합니다.
- 서버 응답의 페이지네이션, 순서, 표시 문구를 프론트에서 다시 계산하지 않습니다.
- 엔드포인트별 응답 형태 차이는 `src/lib/api/normalizers`와 계약 스키마에서 흡수합니다.
- 고객·셀러·관리자 데이터는 TanStack Query의 도메인별 키로 분리합니다.

## 현행 계약 문서

- [PLP 프론트 연동](PLP.md)
- [상품 상세와 셀러 상품 작성](PDP_AND_SELLER_PRODUCTS.md)
- [홈 카테고리 구좌](HOME_CATEGORY_CHIPS.md)
- [이벤트 상세 페이지 계약](EVENT_DETAIL.md)
- [백엔드 계약 개선 목록](BACKEND_CONTRACT_GAPS.md)

`docs/implementation-artifacts`와 `docs/superpowers`의 파일은 당시 의사결정과 구현 과정을 보존하는 기록입니다. 현재 동작과 충돌하면 소스 코드와 위 현행 문서를 우선합니다.

## 후속 작업 관리

새 화면을 포괄적인 장기 계획에 추가하지 않습니다. 다음 조건을 충족하는 작은 작업 단위로 관리합니다.

1. 대상 라우트와 사용자 역할을 명시합니다.
2. 사용할 서버 엔드포인트와 응답 모델을 명시합니다.
3. 로딩, 빈 상태, 오류 상태를 함께 정의합니다.
4. 서버 계약이 없으면 [백엔드 계약 개선 목록](BACKEND_CONTRACT_GAPS.md)에 먼저 기록합니다.
5. 구현과 같은 PR에서 관련 현행 문서를 갱신합니다.

## 검증

```bash
npm run lint
npm run test
npm run build
```

실제 백엔드 또는 브라우저가 필요한 변경은 범위에 따라 `npm run test:e2e:api` 또는 `npm run test:e2e:ui`를 추가합니다.
