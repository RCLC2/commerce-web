# UI 전·후 임시 비교

**2026-09-06 반영 결정:** 1·2·4·5·6·8·9번은 서비스에 적용했다. **3번 하단 메뉴는 기존 모습을 유지**하며, **7번 푸터는 접는 시안 대신 ‘쇼핑 / 내 쇼핑’ 가로 두 열로 적용**했다. 아래 사진은 비교 당시의 시안이므로 3·7번의 개선 시안은 최종 화면이 아니다. 적용 결과와 검증은 [실제 반영 기록](../../implementation-artifacts/ui-approved-improvements-2026-09-06.md)을 참고한다.

‘현재’는 비교 당시 서비스 화면, ‘개선 시안’은 별도 검증 브라우저에서 배치·스타일·문구만 바꿔 촬영한 화면이다. 시안을 촬영한 시점에는 애플리케이션 소스와 Docker 서비스에 적용하지 않았다. 각 비교에서 같은 상품 사진과 데이터를 사용했다.

모바일은 390px 너비이며 상품 카드 확대 예시만 데스크톱의 265px 카드다. 상품 목록과 카테고리는 동일한 첫 화면 범위를 비교하고, 나머지는 해당 영역을 촬영했다. ‘필터 상세’와 푸터 링크는 접힌 상태의 시안이다. 최종 구현과 상호작용 검증은 별도다.

| 항목 | 현재 | 개선 시안 |
| --- | --- | --- |
| **1. 상품 목록 필터** — 필터를 요약하고 상세 설정을 접어 첫 화면에 상품 노출 | ![현재 상품 목록](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/01-filters-before.png) | ![필터 요약 시안](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/01-filters-after.png) |
| **2. 상품 상세 구매 영역** — 기존 구매 바를 첫 화면부터 표시하고 하단 메뉴와 높이 정리 | ![현재 구매 영역](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/02-purchase-before.png) | ![구매 바 노출 시안](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/02-purchase-after.png) |
| **3. 하단 메뉴** — 메뉴 순서를 유지하며 홈 돌출을 없애고 아이콘·라벨 높이 통일 | ![현재 하단 메뉴](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/03-navigation-before.png) | ![하단 메뉴 정리 시안](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/03-navigation-after.png) |
| **4. 상품 카드 여백·강조** — 가격 배치는 유지하며 제목 아래 공백 축소, 최종 금액 강조 | ![현재 상품 카드](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/04-card-before.png) | ![상품 카드 정리 시안](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/04-card-after.png) |
| **5. 카테고리 구성** — 중첩 박스와 중복 분류·제목을 줄여 상품을 위로 배치 | ![현재 카테고리](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/05-category-before.png) | ![카테고리 단순화 시안](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/05-category-after.png) |
| **6. 쿠폰 정보 우선순위** — 할인 혜택을 크게, 쿠폰 이름·조건은 보조 정보로 표시 | ![현재 쿠폰](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/06-coupon-before.png) | ![할인 혜택 강조 시안](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/06-coupon-after.png) |
| **7. 모바일 푸터** — 소개 문구를 간결하게 하고 링크 그룹을 접어 높이 축소 | ![현재 푸터](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/07-footer-before.png) | ![푸터 축소 시안](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/07-footer-after.png) |
| **8. 미등록 정보 안내** — 내부 관리용 문구 대신 상품 상세 안내 링크로 정리 | ![현재 미등록 안내](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/08-empty-before.png) | ![상품 상세 안내 시안](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/08-empty-after.png) |
| **9. 본문 문구** — 서비스명은 유지하고 영어 섹션 라벨을 자연스러운 한국어로 통일 | ![현재 추천 영역 문구](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/09-copy-before.png) | ![한국어 문구 시안](/Users/yeongjae/commerce-web-readability/docs/previews/ui-before-after/09-copy-after.png) |

시안 작성일: 2026-09-06. 임시 촬영 절차는 Git에서 제외되는 `output/playwright/ui-before-after/`에 보관했다.
