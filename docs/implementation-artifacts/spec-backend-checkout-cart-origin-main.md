# 백엔드 API 작업 계약

[OpenAPI 3.1 원본](./backend-cart-checkout.openapi.yaml) · 기준: `commerce` 백엔드 `origin/main` (`88add6a`)

| API | Request DTO | 성공 Response DTO | 필요한 화면 동작 |
| --- | --- | --- | --- |
| `PATCH /api/v1/cart/items` | `UpdateCartItemGroupRequest` | `CartItemResponse` · 200 | 장바구니의 옵션·수량 저장 후 재조회해도 변경 유지 |
| `DELETE /api/v1/cart/items` | `DeleteCartItemGroupRequest` | 본문 없음 · 204 | 선택 상품 삭제 후 장바구니에서 제거 |
| `POST /api/v1/me/addresses` | `CreateShippingAddressRequest` | `ShippingAddressResponse` · 201 | 주문서에서 첫 배송지 등록·즉시 선택 |
| `POST /api/v1/orders/quote` | `OrderQuoteRequest` | `OrderQuoteResponse` · 200 | 주문 전에 서버 기준 상품·할인·배송비·결제액 표시 |

각 DTO의 필드·예시와 인증, 오류 상태, 계산·트랜잭션 규칙은 OpenAPI 파일에 정의했습니다. 기존 프론트엔드가 파싱하는 JSON 필드명과 성공 응답 형식을 기준으로 했습니다.
