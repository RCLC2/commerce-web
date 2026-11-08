# 하단 내비게이션 잘림 확인

> 아래 내용은 촬영·검증 당시의 기록이다. 이후 PR 분리·반영 상태와 현재 검증 범위는 [최신 안내](return-pickup-address-20261022.md)를 따른다.

2026-10-22. 커밋·푸시는 하지 않았다.

## 원인과 조치

이전 수동 인증용 Chrome은 자동화 뷰포트를 1440×1000px로 고정했다. 재현 시 실제 창은 1442×1050px, 위치는 `(2120, -56)`이었고 보조 모니터 아래로 벗어나 있었다. 페이지 내부에서는 메뉴가 뷰포트 하단에 정상 배치돼도 실제 모니터에서는 아래쪽이 보이지 않을 수 있는 설정이었다.

`tests/support/playwright-headed.config.json`을 추가했다. 수동 조작용 브라우저는 `viewport: null`로 실제 창의 콘텐츠 영역을 따르고, 초기 창 크기는 1440×900px로 연다. 새 주문 검증의 로컬 실행 보조 스크립트도 구매자 headed 세션에 이 설정을 사용하도록 변경했다. 앱 내비게이션의 크기·고정 위치·상품 CTA 간격은 변경하지 않았다.

## 확인 결과

- 수정 설정의 실제 창: 1440×900px, 위치 `(22, 52)`, 콘텐츠 높이 813px.
- 하단 메뉴 영역: y=748~813px, 높이 65px. 모든 메뉴 라벨이 화면 안에 있다.
- 상품 구매 바 하단: y=748px. 메뉴 상단과 맞닿으며 서로 겹치지 않는다.
- Chromium에서 1440×813, 1499×700, 390×844, 360×600으로 변경해 메뉴·라벨의 화면 내 배치와 구매 바 비중첩을 모두 확인했다.
- 증거: `output/playwright/navbar-clipping-20261022/after-native-viewport.png`, `after-bottom-bars.png`, `layout-check-results.txt`.

수동 인증·확인에 사용하는 CLI 실행 예시:

```sh
playwright_cli.sh --session commerce-manual open http://127.0.0.1:13001/products/1 \
  --headed --config tests/support/playwright-headed.config.json
```

headless 화면 크기별 검증에서는 기존처럼 명시적인 뷰포트를 사용한다. 해당 테스트의 고정 크기는 이 문제의 수동 브라우저 설정과 별개다.
