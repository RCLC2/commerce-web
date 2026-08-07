- source_spec: docs/implementation-artifacts/spec-resolve-remaining-frontend-defects.md
  summary: 포인트 이벤트 보상의 회원별 수령 여부를 서버 응답에 포함한다.
  evidence: 쿠폰 보상은 보유 쿠폰의 `coupon_id`로 재조정할 수 있지만 포인트 보상은 현재 잔액만으로 특정 reward 수령 여부를 증명할 수 없다. 프론트는 확인된 성공만 회원별로 보존하고 실패를 성공으로 추론하지 않는다.
- source_spec: docs/implementation-artifacts/spec-resolve-remaining-frontend-defects.md
  summary: 주문·장바구니·리뷰 생성 mutation에 idempotency key 계약을 추가한다.
  evidence: 프론트는 응답 유실 뒤 cart/review/order 컬렉션을 재조회해 유일한 결과만 복구하지만, 완전한 exactly-once 보장은 서버의 중복 키 저장과 동일 응답 재생이 필요하다.
- source_spec: none
  summary: 주문 상세에서 현재 백엔드의 배송 정보를 조회하고 고객 배송조회 기능을 연결한다.
  evidence: 좋아요·팔로우·리뷰·쿠폰 상태 수정과 독립적으로 배포 가능한 주문 상세 기능이므로 사용자 선택에 따라 분리했다.
- source_spec: none
  summary: 개인화 추천과 CMS 홈 구좌를 백엔드 설정 및 회원 추천 결과에 맞게 연결한다.
  evidence: 고객 상호작용 상태 수정과 독립적인 홈 콘텐츠 전달 기능이므로 사용자 선택에 따라 분리했다.
