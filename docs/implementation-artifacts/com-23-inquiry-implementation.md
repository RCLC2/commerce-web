# COM-23 1:1 문의 구현 기록

## 범위

- 회원: 문의 목록, 신규 문의, 주문·상품 연결, 메시지 추가, 읽음 처리, 직접 종료, 만족도 조사
- 판매자: 소유 마켓의 주문·상품 문의 조회, 답변, 처리 완료
- 관리자: 일반·결제 문의 통합 검색, 관련 회원·주문·마켓 확인, 답변, 처리 완료
- 공통: `STARTED → IN_PROGRESS → COMPLETED → CLOSED` 상태 표시와 5초 폴링
- 마이페이지: 전체 주문·작성 리뷰·진행 문의 요약, 리뷰/문의 바로가기, 회원정보 수정 위치 조정
- 알림: 문의 답변 알림에서 해당 대화로 이동

## API 연결

| 화면 | API |
| --- | --- |
| 회원 목록/상세 | `GET /api/v1/me/inquiries`, `GET /api/v1/me/inquiries/:id` |
| 회원 접수/대화 | `POST /api/v1/inquiries`, `POST /api/v1/me/inquiries/:id/messages` |
| 회원 읽음/종료/만족도 | `POST /read`, `POST /close`, `POST /satisfaction` |
| 판매자 운영 | `/api/v1/seller/inquiries...` + `market_id` |
| 관리자 운영 | `/api/v1/admin/inquiries...` + `q/status/category` |

## 화면 증빙

PR 본문에는 `docs/pr-assets/com-23/`의 더미 데이터 스크린샷 10장을 화면 순서대로 첨부한다. 이미지는 `tests/e2e/com-23-screenshots.spec.ts`가 API를 가로채 동일 데이터로 재생성한다.

## 검증

- 로컬 Docker는 사용하지 않는다.
- 변경 파일 ESLint와 스크린샷 단일 Playwright 스펙만 로컬에서 확인한다.
- 전체 테스트, 빌드, 마이그레이션 계약 검증은 PR CI 결과를 최종 기준으로 삼는다.
