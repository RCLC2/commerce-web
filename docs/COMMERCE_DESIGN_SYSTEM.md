# Commerce Design System

## Goal

`src/components/ui`는 소비자 쇼핑 화면과 셀러·관리자 도구가 공유하는 UI 기반이다. 화면은 원시 색상·임의의 높이보다 의미 토큰과 컴포넌트 API를 먼저 사용한다.

## Foundation

- **Three token layers:** primitive → semantic → component 순서로만 참조한다. `--primitive-*`은 팔레트 정의용이고, 화면은 `--commerce-*` semantic token 또는 `Button` 같은 component recipe만 사용한다.
- **Semantic tokens:** `src/app/globals.css`의 `--commerce-*` 값은 canvas, surface, content, border, action, status처럼 의도로 이름을 붙인다. Tailwind에서는 `bg-surface-raised`, `text-content-secondary`, `border-border-subtle`처럼 사용한다.
- **Readability palette:** primary/secondary/tertiary 콘텐츠는 흰 표면에서 각각 높은 대비, 6:1 이상, 4.5:1 이상을 확보한다. `border-subtle`은 구획용으로만 쓰고, 입력·버튼·필터처럼 조작해야 하는 요소에는 3:1 이상인 `border-interactive`를 쓴다. 정보 상태도 `status-info`를 포함한 semantic token으로만 표현한다.

| Role | Color | Minimum checked contrast |
| --- | --- | --- |
| Content primary | `#17171b` | 17.88:1 on white |
| Content secondary | `#5c5e66` | 6.47:1 on white |
| Content tertiary | `#6d6f79` | 4.54:1 on subtle surface |
| Interactive border | `#858791` | 3.34:1 on canvas |
| Action text / primary CTA | `#d90065` | 5.07:1 on white / 4.81:1 with on-brand text |
| Positive / warning / negative / promotion / info | semantic status tokens | 5.00:1 / 5.43:1 / 5.35:1 / 7.10:1 / 5.98:1 on white |
- **Brand color:** commerce 메인 핑크는 `#ff0077`이다. 흰색 위의 작은 핑크 텍스트에는 대비가 부족하므로 `text-action-primary`(더 짙은 `#d90065`)를 쓴다. 구매·결제 같은 채움형 CTA는 `#d90065`와 미색 화이트 `#fff7f8`을 쌍으로 사용해 4.81:1 대비를 확보한다. Hover와 pressed는 빨강으로 색조를 옮기지 않고, 같은 마젠타 계열 안에서 명도만 낮춘다.
- **Interaction:** pointer가 있는 환경의 primary hover는 더 깊은 마젠타 `#c9005c`로 명확히 바뀌고, pressed는 `#bf0058`과 작은 축소로 확인 피드백을 준다. secondary·ghost는 연한 핑크 배경과 핑크 텍스트·테두리로 반응한다. 키보드에는 `focus-visible` 링만 보이며, 비활성 버튼은 실제 `disabled` 속성으로 클릭과 포커스를 막는다.
- **Type and density:** 기본 본문은 14px, 보조 정보는 12px, 페이지 제목은 30px 이상을 기준으로 한다. 버튼·입력은 최소 44px의 터치 영역을 유지한다.
- **Shape and elevation:** control 12px, surface 16px, feature 24px 반경을 쓴다. shadow는 floating layer 또는 card hierarchy를 표현할 때만 쓴다.
- **Accessibility:** 키보드 focus ring, `prefers-reduced-motion`, 오류의 `role="alert"`, overlay의 focus trap과 focus return을 공통으로 제공한다. 상태는 색상만으로 전달하지 않는다.

## Components

| Need | Component | Rule |
| --- | --- | --- |
| Main action | `Button` | 한 블록의 primary action은 하나만 둔다. 위험한 작업에는 `danger`를 쓴다. |
| Form input | `Field` + `Input` / `Select` / `Textarea` | label, hint, error를 field 내부에서 함께 제공한다. |
| Short state | `Badge` | 배송·할인·재고 같은 짧은 상태에 쓴다. |
| Grouped content | `Surface`, `ListRow` | 표면과 목록의 여백·경계를 일관되게 한다. |
| Feedback | `Notice` | 성공·경고·오류를 작업 근처에 표시한다. |
| Async state | `Skeleton`, `LoadingState`, `EmptyState`, `Toast` | 로딩·빈 결과·짧은 피드백을 데이터 화면마다 빠뜨리지 않는다. |
| Selection | `Tabs`, `FilterChip`, `QuantityStepper` | 선택값을 상태로 갖고, `aria-selected`/`aria-pressed`로 표현한다. |
| Overlay | `Dialog`, `BottomSheet` | escape, 배경 클릭, 키보드 focus를 다룬다. 모바일 상세 작업에는 BottomSheet를 우선한다. |
| Order domain | `OrderSummary`, `OrderStatus` | 금액 라벨·강조·주문 상태를 화면별로 다시 조합하지 않는다. |
| Checkout action | `BottomActionBar` | 모바일 구매 흐름에서 CTA를 화면 하단에 안전하게 고정한다. |

## Documentation hub

디자인 시스템은 `docs/design-system/`의 독립 HTML 문서로 관리한다. `src/app`에는 문서 라우트를 등록하지 않는다. 실행 시 Next.js 서버나 API 연결이 필요하지 않으며, 상대 경로 링크와 로컬 CSS·스크립트·이미지로 동작한다.

| 파일 | Scope |
| --- | --- |
| [index.html](design-system/index.html) | 문서 진입점과 운영 원칙 |
| [foundations.html](design-system/foundations.html) | color, spacing, typography, density, motion, z-index, accessibility |
| [components.html](design-system/components.html) | 공통 primitive의 usage, state, keyboard, feedback |
| [commerce.html](design-system/commerce.html) | 고객의 상품 판단과 구매 조합 |
| [seller.html](design-system/seller.html) | 셀러 주문·재고 처리 조합 |
| [admin.html](design-system/admin.html) | 관리자 검토·확인 조합 |
| [patterns.html](design-system/patterns.html) | loading, empty, error, complete 상태 흐름 |

문서 내용은 `scripts/design-system/src/`에서 수정하고 `npm run design-system:build`로 HTML을 재생성한다. TSX는 실제 공통 UI를 사용해 화면과 표시용 예시 코드를 함께 만드는 원본이다. `docs/design-system/`에는 생성된 HTML·자산과 사용 안내만 두며, HTML을 직접 수정하지 않는다. `npm run design-system:serve`로 3001 포트의 정적 미리보기를 실행한다. 폴더 구조와 이동 방법은 [문서 README](design-system/README.md)를 따른다.

Customer 예시는 로컬 상품 이미지를 사용한다. Seller와 Admin 예시는 API·실운영 데이터에 연결하지 않은 익명 고정 데이터다. 차트와 차트 문서는 v1 범위에서 제외한다.

### Documentation visual language

문서 화면은 `scripts/design-system/src/components/docs.module.css`에서 기존 `--commerce-*` 토큰을 참조한다. 별도의 역할별 팔레트는 사용하지 않는다. 배경·본문·코드·설명은 중립색, 선택 상태와 주요 행동은 메인 핑크를 사용한다. 성공·경고·오류 색상은 해당 상태에만 사용한다. 일반 배송 정보와 숫자에 상태 색상을 붙이지 않는다.

`DocsExample`은 예시 라벨, 컴포넌트 영역, 설명 캡션으로 구성한다. 사용 기준과 조작 안내는 컴포넌트 영역 밖의 일반 텍스트로 표시한다. 초기 조작 안내를 Toast로 표시하지 않으며, 버튼을 누른 뒤에만 결과를 알린다. 문서 제목은 대상 컴포넌트와 용도를 직접 명시한다.

- 1024px 이상: 고정 사이드바, 콘텐츠에 맞는 메뉴 높이, 최대 본문 폭을 사용한다. 낮은 창에서는 사이드바 탐색 영역만 스크롤된다.
- 1024px 미만: 기본적으로 닫힌 문서 메뉴를 사용한다. 메뉴 이동 또는 Escape로 닫히며, Escape는 메뉴 제어로 포커스를 돌려준다.
- 640px 미만: 운영 예시의 표를 라벨이 있는 카드로 바꾸고, 필터·페이지네이션은 44px 이상의 터치 영역을 제공한다.
- 색상 토큰 이름은 줄바꿈하며, 간격 예시는 열의 실제 너비 안에서 배치한다. 코드 예시의 가로 스크롤은 코드 영역 안으로 한정한다.

### Component reference structure

Components는 Button, Field & Input, Select, Tabs, FilterChip, QuantityStepper, Dialog, BottomActionBar를 각각 한 번씩 설명한다. 각 섹션은 독립 동작 예시, 주요 속성, 해당 예시의 실제 TSX 소스로 구성한다. 속성과 소스는 기본적으로 접어둔다. `build.mjs`는 화면에 사용하는 `examples/*-demo.tsx`를 읽어 HTML과 공통 스크립트에 포함한다. 별도 코드 문자열을 관리하지 않는다.

Commerce는 같은 primitive를 조합한 구매 예시 하나만 제공한다. 수량 상태에서 합계와 장바구니 담기 수량을 계산한다. 모바일에서는 예시의 스크롤 컨테이너 하단에 `BottomActionBar`를 유지하며, PC에서는 상품 정보 아래에 배치한다. 장바구니·구매 결과는 구매 영역 안에 표시해 스크롤 위치와 관계없이 확인할 수 있다. 단독 하단 구매 바 예시는 Components에만 둔다.

QuantityStepper의 증감 버튼은 각각 44px이며, 폼을 제출하지 않는 `type="button"`이다. Overlay는 열림 상태가 유지되는 동안 입력 변경으로 포커스를 초기화하지 않는다. 배송 요청 예시는 기본 Select를 사용하며, 선택한 값을 즉시 셀렉트 박스에 표시한다.

## Extended custom properties

`globals.css`는 color/radius/shadow 외에 아래 property를 source of truth로 둔다.

| Group | Properties | Contract |
| --- | --- | --- |
| Spacing | `--commerce-space-{1,2,3,4,6,8,12,16}` | 4px 기반 간격 scale |
| Type | `--commerce-font-*`, `--commerce-line-*` | display부터 caption까지의 읽기 위계 |
| Density | `--commerce-density-comfortable`, `--commerce-density-console` | customer 핵심 행동 44px, console compact 36px |
| Motion | `--commerce-motion-{fast,normal,slow}`, `--commerce-ease-out` | 120/160/240ms; reduced motion을 존중 |
| Layer | `--commerce-z-{base,sticky,mobile-cta,dropdown,modal}` | 레이어 충돌 방지 순서 |

문서의 token/public primitive 변경은 문서에 usage, accessibility, migration 영향을 먼저 기록하고 changelog에 날짜와 영향을 남긴다. 버그 수정과 미세 시각 보정은 code first 후 문서를 즉시 동기화한다.

## Change log

| Date | Change | Impact / migration |
| --- | --- | --- |
| 2026-09-06 | 디자인 시스템을 독립 HTML 폴더로 분리 | 앱 문서 라우트와 AppShell 예외를 제거한다. HTML 7개와 로컬 자산을 docs/design-system에서 관리한다. |
| 2026-09-05 | 배송 요청 선택을 인라인 Select로 변경 | 별도 선택창과 적용 버튼을 제거하고, 문서·실제 예시 소스를 Select 기준으로 정리한다. |
| 2026-09-05 | 컴포넌트별 단일 예시, 실제 소스 표시, 수량·합계·모바일 구매 바 연결 | 통합 데모와 사용하지 않는 예시를 제거한다. 수량 버튼의 터치 영역과 폼 동작, Overlay의 편집 중 포커스를 수정한다. |
| 2026-09-05 | 설명과 컴포넌트 예시 분리, 문구 정리, 핑크·중립색으로 문서 팔레트 축소 | 역할별 장식 색상을 제거한다. 상태 색상은 성공·경고·오류에만 사용하며, 조작 안내는 예시 밖에 표시한다. |
| 2026-09-05 | 문서 전체 보조 팔레트·정보 위계·PC/모바일 레이아웃 재설계 | 문서 전용 CSS Module에 범위를 한정한다. 상품 UI 토큰과 API는 유지하며, 셀러 예시 요약값의 렌더링도 수정한다. |
| 2026-09-05 | v1.0 documentation hub, extended foundation properties, Button/Tabs/Overlay interaction contract | 기존 화면의 API나 endpoint는 바꾸지 않는다. 새 화면은 `--commerce-*`와 shared primitive를 사용하고, 기존 화면은 영향도 높은 흐름부터 점진적으로 옮긴다. |

## Adoption

새 화면은 다음 순서로 작성한다.

1. `Surface`로 콘텐츠 덩어리와 정보 위계를 잡는다.
2. `Field`와 입력 컴포넌트로 폼 상태를 연결한다.
3. 버튼 우선순위와 `Notice` 오류 상태를 명시한다.
4. 로딩, 빈 결과, 오류, 완료를 구현 전에 명시한다.
5. 원시 Tailwind 값이 반복되면 먼저 semantic token 또는 UI primitive로 승격할지 검토한다.

## Migration boundaries

기존 화면의 `zinc-*`, `red-*`, `amber-*` 같은 직접 색상 사용은 한 번에 기계적으로 바꾸지 않는다. 구매·인증·상품 카드처럼 고객 영향이 큰 흐름부터 semantic token과 공통 primitive로 이전하며, 새 코드는 원시 팔레트를 추가하지 않는다. 이 변경에서는 로그인·가입·상품 카드·장바구니·주문서에 공통 규칙을 적용했다.
