# 날씨 카드 가독성 수정과 서비스 개선 후보

2026-09-06, 실행 중인 Docker 환경과 현재 프런트엔드 코드를 기준으로 확인했다. 이번 구현은 날씨 카드 가독성 수정이며, 아래 개선 후보는 아직 구현하지 않았다.

## 반영한 수정

- 밝은 그라데이션과 흰 글자가 겹치지 않도록 새벽·낮·노을 배경을 짙게 조정했다.
- 습도·강수 확률·최고/최저 기온 카드를 불투명한 흰 배경과 짙은 글자로 변경했다. 작은 라벨도 불투명한 보조 글자색을 사용한다.
- 해·별 장식의 밝기와 시간 배지의 배경을 조절했다. 정보의 위치와 반응형 배치는 유지했다.
- 변경 파일: [weather-panel.tsx](/Users/yeongjae/commerce-web-readability/src/components/today-outfit/weather-panel.tsx:28).
- Docker 웹 컨테이너를 다시 빌드해 `http://localhost:3000/today-outfit`에 반영했다.

## 검증 범위

- 실제 날씨 API 응답으로 수정 화면을 확인했다. 시간대별 화면 검증에서는 별도 검증 브라우저에서만 날씨 응답의 시간을 바꾸었다. 새벽·낮·노을·밤 × 1200px·320px의 8개 조합에서 가로 넘침이 없었다. 이후 응답 대체를 해제했다.
- 수치 카드의 라벨 대비는 6.47:1, 값의 대비는 17.88:1이다. 각 테마의 그라데이션 색상과 흰 본문의 대비도 4.5:1 이상이었다. 이는 브라우저가 계산한 색상에 대한 측정이며 전체 서비스 접근성 인증을 의미하지 않는다.
- 날씨 단위 테스트 8개, 변경 파일 ESLint, Docker 프로덕션 빌드와 `git diff --check`가 통과했다.
- 실제 API를 사용해 홈·카테고리·전체 상품·상품 상세·검색 결과·마켓 피드·오늘의 코디·로그인·마이페이지·쿠폰·장바구니·주문서의 12개 화면을 확인했다. 일반 탐색 화면 8개는 390px, 로그인부터 주문서까지는 1200px에서 점검했다. 주문 생성이나 결제는 실행하지 않았다.
- 일반 탐색 화면 8개는 모두 문서 HTTP 200과 가로 넘침 없음을 확인했다. 하위 요청에서는 모자 아이콘 404, 코디 조회 503이 발생했다. 페이지 문서가 200이라고 해서 모든 기능이 정상인 것은 아니다.
- 화면과 로그: `output/playwright/weather-*`, `output/playwright/screen-review-results-{1,2}.txt`, `output/playwright/review-*`.

## 확인된 문제와 개선 방향

| 순서 | 우선순위 | 문제와 영향 | 확인 근거 | 개선 방향 |
| --- | --- | --- | --- | --- |
| 1 | 높음 | 배송지가 없는 사용자는 배송지를 등록할 수 없어 주문이 막힌다. | 실제 `user1` 계정의 마이페이지는 ‘등록된 배송지가 없습니다’만 표시하고, 주문서의 주문 버튼은 비활성화됐다. [배송지 UI](/Users/yeongjae/commerce-web-readability/src/components/my-page.tsx:102), [주문 차단](/Users/yeongjae/commerce-web-readability/src/components/checkout-page.tsx:450). | 배송지 신규 등록·기본 주소 지정과 주문서 내 등록/변경 경로를 제공한다. |
| 2 | 높음 | 장바구니에 담은 상품을 삭제할 수 없다. 선택 해제는 주문 대상만 바꾼다. | 실제 장바구니에 선택·수량·옵션 변경만 있으며 수량은 최소 1이다. [장바구니 조작](/Users/yeongjae/commerce-web-readability/src/components/cart-page.tsx:153), [고객 API](/Users/yeongjae/commerce-web-readability/src/lib/api/customer.ts:71). | 개별 삭제·선택 삭제와 취소 가능한 삭제 안내를 제공하고 저장 API를 연결한다. |
| 3 | 높음 | 현재 Docker 환경에서 오늘의 코디를 볼 수 없다. | 실제 `/api/v1/outfits/today`가 503과 `OUTFIT_UNAVAILABLE`을 반환한다. 서버는 공개 가능한 코디가 없을 때 이 오류를 반환한다. [서버 분기](/Users/yeongjae/commerce-ui-support/internal/outfit/service.go:93). 운영 환경도 같다고 단정하지 않는다. | 공개 코디 데이터·판매 가능 조건·이미지 제공 상태를 확인한다. 데이터 없음과 통신 실패를 구분하고 대체 상품 탐색 경로를 제공한다. |
| 4 | 중간 | 주문 상세가 배송지 정보를 항상 ‘확인할 수 없음’으로 표시한다. | [주문 상세](/Users/yeongjae/commerce-web-readability/src/components/order-detail-page.tsx:141)에 고정 안내가 있다. 배송 응답 스키마에는 수령인·연락처·주소 필드가 있고 서버 주문 저장 시 배송지 스냅샷을 저장한다. [배송 응답](/Users/yeongjae/commerce-web-readability/src/lib/api/contracts/schemas.ts:240), [저장 처리](/Users/yeongjae/commerce-ui-support/internal/order/repository.go:145). 이번 계정에는 기존 주문이 없어 화면의 실제 주문 조회 재현은 하지 않았다. | 주문 시점 배송지를 조회 응답에서 전달하고 실제 존재 여부에 따라 주소 또는 누락 안내를 표시한다. |
| 5 | 중간 | 오늘의 코디를 직접 열면 초기 렌더링 오류가 발생한다. | 응답 대체를 해제한 실제 화면에서도 React #418이 재현됐다. 서버 HTML에는 빌드 시점 `13:50`이 남았고, [초기 예보 생성](/Users/yeongjae/commerce-web-readability/src/components/today-outfit-page.tsx:24)은 [Date.now()](/Users/yeongjae/commerce-web-readability/src/lib/weather.ts:176)를 사용한다. 서버·브라우저의 초기 시간 차이가 유력한 원인이다. | 첫 렌더는 동일한 로딩 상태나 동일한 예보 스냅샷을 사용하고 브라우저 초기화 뒤 현재 시각을 반영한다. 오류 설명은 [React 공식 문서](https://react.dev/errors/418)를 참고한다. |
| 6 | 중간 | ‘15분마다 최신 예보 확인’이라는 안내와 실제 갱신 방식이 다르다. | [날씨 쿼리](/Users/yeongjae/commerce-web-readability/src/components/today-outfit-page.tsx:40)는 `staleTime`만 지정하고 주기적인 `refetchInterval`은 없다. 서버의 900초 캐시도 요청 없이 브라우저 데이터를 갱신하지 않는다. [안내 문구](/Users/yeongjae/commerce-web-readability/src/components/today-outfit/weather-panel.tsx:114). 15분을 기다리는 실측은 하지 않았으며 코드에서 확인했다. | 주기적인 갱신을 추가하거나 실제 동작에 맞게 안내를 변경한다. 마지막 성공 갱신 시각과 예시/이전 데이터 사용 여부도 구분한다. |
| 7 | 중간 | 주문 검색에서 두 번째 이후 상품명을 입력하면 주문이 누락될 수 있다. | [검색 조건](/Users/yeongjae/commerce-web-readability/src/components/my-page.tsx:60)이 `firstOrderItem`의 상품명만 검사한다. 다품목 주문을 새로 생성하는 검증은 하지 않았다. | 모든 주문 상품명을 검색하거나 서버 검색을 사용한다. |
| 8 | 중간 | 주문이 많아지면 마이페이지 초기 요청 수와 로딩 시간이 늘어난다. | [listAllOrders](/Users/yeongjae/commerce-web-readability/src/lib/api/customer.ts:43)가 전체 페이지를 순차 조회하고, [마이페이지](/Users/yeongjae/commerce-web-readability/src/components/my-page.tsx:50)는 상품별 상세를 추가 조회한다. 현재 데이터로 느린 응답이 재현된 것은 아니며 확장 시 성능 위험이다. | 주문 페이지 단위 조회와 서버 필터를 사용한다. 목록 응답에 표시용 상품 요약을 포함해 추가 조회를 줄인다. |
| 9 | 중간 | 관리자 홈 섹션에서 입력한 데이터 API 주소가 기대대로 반영되지 않을 수 있다. | [관리자 입력](/Users/yeongjae/commerce-web-readability/src/components/admin-console.tsx:363)은 자유 입력인데, [홈 조회 분기](/Users/yeongjae/commerce-web-readability/src/components/home-page.tsx:21)는 프로모션·최신 상품 외에는 인기 상품으로 처리한다. 운영 설정을 변경하는 재현은 하지 않았다. | 지원하는 데이터 유형을 선택하게 하고 해당 유형과 실제 쿼리를 명시적으로 연결한다. 지원하지 않는 값은 저장 전에 알려준다. |
| 10 | 낮음 | 홈의 모자 카테고리 아이콘이 표시되지 않는다. | 실제 `/icons/home-category/hats.svg` 요청이 404이고 해당 파일이 없다. | 누락된 에셋을 추가하거나 데이터의 아이콘 경로를 수정한다. 에셋이 없을 때의 기본 아이콘도 제공한다. |

## 기능 제안

아래 두 항목은 현재 장애로 판정한 것이 아니라 탐색·계정 복구를 돕는 기능 제안이다.

| 항목 | 현재 관찰 | 제안 |
| --- | --- | --- |
| 검색 자동완성·최근 검색어 | [헤더](/Users/yeongjae/commerce-web-readability/src/components/app-shell.tsx:111)는 포커스 시 검색 페이지로 이동하지만, [검색 페이지](/Users/yeongjae/commerce-web-readability/src/components/search-page.tsx:110)의 실제 입력에는 자동완성이 없다. | 자동완성을 실제 검색 입력에 연결하고 최근 검색어 삭제·키보드 선택을 지원한다. |
| 비밀번호 재설정 | [로그인 화면](/Users/yeongjae/commerce-web-readability/src/components/login-page.tsx:43)에 로그인과 계정 생성만 있다. | 비밀번호 재설정 경로와 입력 내용 표시/숨기기를 제공한다. 복구 API와 이메일 제공 방식은 별도 확인이 필요하다. |

이전 문서의 ‘로컬 API 연결 거부’와 ‘일반 가격 중복 표시’는 현재 문제 목록에서 제외했다. 이번 실제 화면 점검에서 주요 API는 응답했고, 일반 가격 중복은 앞선 가격 컴포넌트 작업에서 수정됐다. 이 문서는 현재 구현과 관찰을 기준으로 한 개선 후보이며 전체 운영 서비스 검증이나 모든 결제·배송 시나리오의 완료를 뜻하지 않는다.
