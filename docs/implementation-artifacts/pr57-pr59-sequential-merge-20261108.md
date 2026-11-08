# PR57 → main → PR59 순차 병합 검증

확인일: 2026-11-08 (Asia/Seoul)

## 요청한 병합 순서

1. [PR57](https://github.com/RCLC2/commerce-web/pull/57)을 main에 squash 병합합니다.
2. [PR59](https://github.com/RCLC2/commerce-web/pull/59)의 기능별 다섯 커밋을 새 main 위에 재배치하고 base를 main으로 변경합니다.
3. 최신 head의 필수 리뷰·검사를 충족한 뒤 PR59를 main에 squash 병합합니다.

저장소는 squash만 허용하며 main 병합 시 head 브랜치를 자동 삭제합니다. PR57 squash 후 기존 20개 선행 커밋을 PR59에서 다시 노출하지 않도록 다섯 커밋만 재배치해야 합니다. 보호 규칙 우회나 강제 main push는 사용하지 않습니다.

## PR57 정리 결과

- main의 #55 squash `41d8b96`과 PR57 `0c15c8e` 사이 마켓 화면·테스트 두 파일의 충돌을 해결했습니다.
- merge 커밋 `47cab64`는 PR57의 제품 트리를 그대로 보존합니다. #55의 커버·소개·상품 레이아웃과 #57의 기본·로딩·오류 상태 뒤로가기 및 직접 진입 fallback을 함께 유지합니다.
- 테스트 전용 커밋 `be0a13d`에서 현재 알림함 page/message 계약에 맞는 fixture·기대값과 실제 광고 높이 컨테이너를 찾는 검증으로 기존 실패 3건을 해결했습니다. 제품/API 동작 변경은 없습니다.
- 전체 Vitest **90개 파일 / 484개 통과**, production build(TypeScript 포함), 독립 tsc, 관련 ESLint·공백 검사 통과.
- head 브랜치에 두 커밋을 push하고 PR57 본문에 통합 결과를 추가했습니다. 기존 영상·본문은 보존했습니다.

## PR59 예비 통합 결과

- 원격 PR59 `5d02eb9`와 최신 PR57 `be0a13d`를 별도 로컬 worktree에서 통합했습니다. 추가 충돌은 없습니다.
- 전체 Vitest **93개 파일 / 500개 통과**, production build(TypeScript 포함), 독립 tsc, 관련 ESLint·공백 검사 통과.
- 원본 기능별 커밋 5개와 웹·모바일 동작 영상은 유지합니다. PR59 본문에는 순차 병합 계획과 예비 통합 검증을 반영했습니다.
- 실제 PG·전체 브라우저 E2E·실기기 Safari를 이번 정리에서 새로 실행하지 않았습니다.

## 승인 규칙과 main 재배치

PR57의 최신 커밋 push 후 기존 승인이 해제되어 GitHub 필수 리뷰 재승인을 받았습니다. 이후 PR57은 `b0958d828e616ed52810fb3555feee75c53e4700`으로 main에 squash 병합됐습니다. 보호 규칙은 변경하거나 우회하지 않았습니다.

PR59 원래 head `5d02eb9`의 기능별 다섯 커밋만 실제 main 위로 재배치했습니다. 재배치 직후 전체 트리가 500개 테스트를 통과한 로컬 통합 결과와 동일함을 확인했습니다. 기존 head SHA에 대한 force-with-lease로 게시하며, 바뀐 head의 필수 리뷰·검사 충족 후 squash 병합하는 순서를 사용합니다.

재배치한 다섯 커밋은 `5090a88`, `df3d585`, `f1de90f`, `cd7e874`, `b1dd26e`입니다. 별도 정리 문서는 제품 소스를 바꾸지 않습니다. 원본 영상 첨부 URL도 유지합니다.

## 로컬 작업 공간

- PR57 충돌 해소: `/tmp/commerce-web-pr57-main-20261108`, 브랜치 `feat/pr57-main-integration`.
- PR59 예비 통합: `/tmp/commerce-web-pr59-main-20261108`, 예비 브랜치 `feat/pr59-main-integration`, main 재배치 브랜치 `feat/pr59-main-final`.
- 사용자 원래 작업 공간의 `.agents/`, `_bmad/`, `docs/party-mode/`는 수정하지 않았습니다.
