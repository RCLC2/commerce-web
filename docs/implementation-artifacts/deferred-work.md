- source_spec: `docs/implementation-artifacts/spec-toss-test-payments.md`
  summary: `payment_key` 컬럼 down migration은 100자를 넘는 Toss 키가 저장된 뒤 비파괴적으로 축소되지 않는다.
  evidence: `migrations/20260814001_expand_order_payment_key.sql`의 down 절은 varchar(100)으로 되돌리므로 운영 데이터가 있으면 rollback 전에 별도 데이터 검증이 필요하다.

- source_spec: `docs/implementation-artifacts/spec-toss-test-payments.md`
  summary: 실제 Toss 테스트 카드 브라우저 E2E를 실행하려면 실행 중인 API·DB·Temporal과 테스트 키가 필요하다.
  evidence: 로컬 API·DB·Temporal과 Toss 테스트 키를 주입한 무목 Playwright E2E를 실행해 주문 생성·결제창 결제·success callback·서버 승인·주문 `Paid` 상태를 확인했다. 재현 영상은 PR에 첨부한다.

- source_spec: `docs/implementation-artifacts/spec-toss-test-payments.md`
  summary: 저장소의 legacy `deployments/k8s/api.yaml`은 애플리케이션 DB 환경변수도 선언하지 않아 cluster-config 주입 계약 확인이 필요하다.
  evidence: 새 Toss 키 주입은 이 저장소가 아닌 운영 cluster-config에서 관리해야 하며, 해당 외부 저장소는 이번 worktree 범위에 없다.

## 반품 관련 과제 처리 결과

상태 확인: 2026-10-23. 아래 세 항목은 로컬 미커밋 코드에서 해결했다. 기존 PR·운영 반영을 뜻하지 않는다. 검증 범위와 재현 방법은 [D1~D3 통합 검증](returns-d123-verification-20261023.md)을 기준으로 한다.

- **D1 — 해결:** 열린 `ReturnRequestForm`에 최신 반품 목록의 조회 오류·조회 중 상태를 전달한다. 오류·재조회 중에는 제출을 차단하고 고정 하단에 재확인 버튼을 제공한다. 수량·사유·수거지는 유지하며, 재조회 성공 뒤에는 갱신된 신청 가능 수량으로 다시 판단한다.
- **D2 — 해결:** 수량·사유 입력의 접근 가능한 이름에 상품명과 옵션명을 함께 사용한다. 네이비·블랙 옵션이 있는 동일 상품을 각각 선택하는 회귀 테스트로 구분을 확인한다.
- **D3 — 해결:** 공통 `tests/support/returns-browser-check.mjs`에서 구매자·판매자 주소록 준비 → 각자 저장 주소 선택 → 요청/수거 주소 5개 필드 저장 검증을 수행한다. 최신 버튼·안내 문구, 조회 실패/재시도와 모바일 검증, 실행 후 해당 브라우저 세션 정리를 반영했다. 전용 API·DB·Temporal·PG 대역 및 새 fixture가 필요한 통합 스크립트이며 단독 실행형 테스트는 아니다.
