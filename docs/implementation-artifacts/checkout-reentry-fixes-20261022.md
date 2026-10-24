# 결제 콜백 재진입·반품 주소 미등록 오류 수정

> 이 문서는 해당 날짜·작업 범위의 검증 이력이다. 현재 구현·API 계약·PR 반영 구분·최종 영상·테스트 범위는 [2026-10-24 최신 안내](return-pickup-address-20261022.md)를 기준으로 한다. 과거 실제 Toss TEST 검증과 최신 PG 대역 검증을 합쳐 설명하지 않는다.

2026-10-22. 기존 변경을 보존했으며 커밋·푸시는 하지 않았다. 추가 DDL은 없다.

## 변경

- 백엔드 `internal/order/application/place_order_facade.go`: 기존 승인과 일치하는 주문자·결제키·상품 및 배송비 포함 금액이면 배송 중·배송 완료·구매확정·반품 진행 상태에서도 PG 재승인 없이 성공 응답을 반환한다. 취소·반품 완료 주문은 기존처럼 차단한다.
- 프론트 `src/app/payments/toss/success/toss-success-client.tsx`, `src/lib/toss-payment.ts`: 서버 확인 후 배송 이후 상태도 결제 완료 화면과 주문 상세 링크로 연결한다.
- `src/lib/returns-api.ts`: 주소 조회의 HTTP 404 + `RESOURCE_NOT_FOUND`만 `null`로 정규화한다. 미등록이 React Query의 정상 조회 상태가 되어 콘솔 전역 오류 집계에 들어가지 않는다. 다른 코드의 404·권한 오류·서버 장애는 계속 오류로 전달한다.
- `src/components/order-return-management.tsx`: 주소 편집기와 수거 작성 화면에서 `null`을 등록 필요 상태로 표시한다. 콘솔 전체 오류 처리 자체를 완화하지 않았다.

## 검증

- 수정 전에 배송 완료 주문 콜백과 미등록 주소 전역 배너 회귀 테스트가 실패하는 것을 확인했다.
- 프론트 관련 6개 테스트 파일 66건 통과. 결제 후 상태별 진입, 승인 거절, 미등록 주소, 실제 조회 장애, 기존 반품·저장 후 재조회 동작을 포함한다.
- `go test ./internal/order/application -count=1` 통과. 결제 후 8개 상태에 대해 동일 요청·다른 소유자·다른 결제키·잘못된 금액을 검증했다. 취소·반품 완료 차단과 PG 재호출 없음도 검증했다.
- `npx tsc --noEmit`, 변경 제품 코드·신규 테스트의 ESLint, 양쪽 저장소 `git diff --check` 통과.

## 실제 API·DB 브라우저 확인

이전 실제 Toss TEST 카카오페이 결제를 완료한 `ORD-1792671309279062000-1`을 그대로 사용했다. 새 결제·PG 인증은 하지 않았다. 재진입이 PG 승인을 호출하면 성공할 수 없도록 이 검증 서버에는 유효한 PG 키를 넣지 않았다.

1. 실제 로그인 후 같은 배송 완료 주문의 Toss 성공 URL을 두 번 열었다. 두 번 모두 complete-payment 202와 결제 완료 화면·주문 상세 링크를 확인했다.
2. 주문 상세는 계속 `DELIVERED`였다. 주문 1건·결제 승인 작업 1건·승인 작업 시도 1회·재고 확정 작업 1건·재고 9개·예약 0개가 유지됐다.
3. 기본 반품 주소가 0건인 마켓의 판매자 주문 상세에서 실제 `RESOURCE_NOT_FOUND` 404 응답을 받았다. 기본 반품 도착지 등록 안내와 등록 양식이 표시되고 전역 오류 배너는 표시되지 않았다.
4. 500·403·다른 코드의 404는 컴포넌트 통합 테스트에서 조회 실패 안내·재시도·전역 오류 표시가 유지되는 것을 확인했다.

증거는 Git에서 제외된 `output/playwright/checkout-reentry-fixes-20261022/`에 보관했다.

- `callback-revisit-1.png`, `callback-revisit-2.png`, `buyer-success.txt`: 성공 URL 재진입.
- `seller-missing-address.png`, `seller-missing-address.txt`: 미등록 주소 등록 양식과 전역 오류 미표시.
- `browser-verification.json`, `database-evidence.json`, `api.log`: 실제 화면·상태·요청 결과.

이번 브라우저 검증은 이미 승인된 주문의 재진입과 주소 미등록 처리에 한정한다. 신규 실제 결제부터 배송까지의 검증은 [앞선 보고서](checkout-toss-delivery-verification-20261022.md)에 기록돼 있다.

## 수정 부분 동작 영상

프로덕션 빌드·실제 로컬 API·DB에서 두 부분만 별도로 촬영했다. 두 영상은 1440×900px, 25fps이며 로그인·새 결제 인증은 포함하지 않는다.

- `output/playwright/checkout-reentry-videos-20261022/01-payment-success-reentry.mp4` — 27초. 배송 완료 주문 상세의 뒤로가기로 결제 성공 페이지를 두 번 재방문하고 다시 주문 상세로 이동한다. 정상 Toss TEST 설정에서 현금영수증 조회도 200임을 확인한 영상이다.
- `output/playwright/checkout-reentry-videos-20261022/02-missing-return-address.mp4` — 27초. 판매자 주문 상세에서 반품 주소 미등록 안내·등록 양식을 확인하고, 대화상자를 닫아도 전역 오류 배너가 나타나지 않음을 보여준다. 주소를 저장하지 않아 미등록 상태를 보존했다.
- 촬영 후에도 주문 1건·승인 작업 1건·승인 시도 1회·재고 확정 1건·재고 9개·예약 0개·반품 주소 0건이 유지됐다.

영상은 저장소에서 제외된 로컬 파일이며 커밋·푸시는 하지 않았다.
