- source_spec: `docs/implementation-artifacts/spec-toss-test-payments.md`
  summary: `payment_key` 컬럼 down migration은 100자를 넘는 Toss 키가 저장된 뒤 비파괴적으로 축소되지 않는다.
  evidence: `migrations/20260814001_expand_order_payment_key.sql`의 down 절은 varchar(100)으로 되돌리므로 운영 데이터가 있으면 rollback 전에 별도 데이터 검증이 필요하다.

- source_spec: `docs/implementation-artifacts/spec-toss-test-payments.md`
  summary: 실제 Toss 테스트 카드 브라우저 E2E를 실행하려면 실행 중인 API·DB·Temporal과 테스트 키가 필요하다.
  evidence: 로컬 API·DB·Temporal과 Toss 테스트 키를 주입한 무목 Playwright E2E를 실행해 주문 생성·결제창 결제·success callback·서버 승인·주문 `Paid` 상태를 확인했다. 재현 영상은 PR에 첨부한다.

- source_spec: `docs/implementation-artifacts/spec-toss-test-payments.md`
  summary: 저장소의 legacy `deployments/k8s/api.yaml`은 애플리케이션 DB 환경변수도 선언하지 않아 cluster-config 주입 계약 확인이 필요하다.
  evidence: 새 Toss 키 주입은 이 저장소가 아닌 운영 cluster-config에서 관리해야 하며, 해당 외부 저장소는 이번 worktree 범위에 없다.
