# 마이페이지 지갑·바텀시트 PR 준비

- 제목: **feat: 마이페이지 지갑과 상품 옵션 바텀시트 개선**
- head: `feat/mypage-wallet-design`
- base: `main` (#57 squash 병합 후 전환)
- 최초 작업 기준: `0c15c8e973121fa4c9c473c84f8ed57dc71e65d1`
- 재배치 기준 main: `b0958d828e616ed52810fb3555feee75c53e4700`
- 등록 구성: 기존 기능별 커밋 5개를 main 위에 재배치하고 순차 병합 검증 문서 커밋을 더했습니다. 웹·모바일 MP4의 GitHub 첨부는 유지합니다.
- GitHub 본문: [pr-mypage-wallet-design-body.md](pr-mypage-wallet-design-body.md)

## 참고한 기존 PR

- [#55](https://github.com/RCLC2/commerce-web/pull/55): 변경 요약, 전후 비교, 사용자 영향, 백엔드 의존성, 검증, 리뷰 요청, PR 범위 구성.
- [#57](https://github.com/RCLC2/commerce-web/pull/57): 화면별 사용자 동작 설명과 영상·검증 환경의 구분.
- [#58](https://github.com/RCLC2/commerce-web/pull/58): 중립적인 추천 문구와 실제 검증 범위를 명시하는 방식.

이번 본문은 최종 구현만 설명합니다. 초기 배송지 지갑, 주문 필터 바텀시트, 호버에 따른 정보 변경 등 중간 시안은 포함하지 않습니다.

## 등록 기준

1. 작업 소스·테스트·카드 이미지·구현 문서만 기능별로 선별해 커밋합니다. 사전 미추적 폴더와 `.env.local`, `output/`은 제외합니다.
2. 최초 게시 시 #57 브랜치를 기준으로 했습니다. #57이 main에 squash 병합된 뒤에는 기능별 다섯 커밋만 main 위에 재배치해 선행 커밋이 중복되지 않도록 했습니다.
3. 아래 MP4 두 개를 GitHub에 첨부하고 발급된 `user-attachments` URL을 본문에 반영했습니다. GitHub 미리보기에서 두 영상의 해상도·길이와 로딩 완료를 확인했습니다. 영상 파일은 Git 이력에 포함하지 않습니다.
4. #59 base는 main이며, 최초 다섯 커밋의 소스 트리가 500개 테스트를 통과한 예비 통합 결과와 동일함을 확인했습니다. #58이 먼저 병합되면 추천 문구 2개의 중복도 확인합니다.

## 영상 자료

두 환경 모두 로그인부터 로그아웃까지 끊지 않고 촬영했습니다. 원본 WebM과 전체 프레임·동일 길이를 유지한 MP4를 제공합니다. 컷·배속·자막·합성·오디오 추가는 없습니다.

| 환경 | 파일 | 원본 | 길이 | 규격 |
| --- | --- | --- | --- | --- |
| 웹 | [web-uncut.mp4](https://github.com/user-attachments/assets/4c1556cf-d4b6-4f08-9e06-2f723f78babe) | `web-uncut.webm` (로컬) | 269.2초 | 1440×1000 / 25fps / 6,730프레임 |
| 모바일 | [mobile-uncut.mp4](https://github.com/user-attachments/assets/6239f6e9-9113-4714-8884-517453cfe5a9) | `mobile-uncut.webm` (로컬) | 177.8초 | 390×844 / 25fps / 4,445프레임 |

WebM 원본은 `output/playwright/new-features-20261108/`에 보관합니다.

모바일은 Chromium 터치 에뮬레이션입니다. 실행 중인 프로덕션 프론트와 localhost 메모리 API를 사용했으며, 실제 운영 서버·PG·실기기 Safari 촬영은 아닙니다. 원본과 MP4의 길이·해상도·프레임 수와 MP4 전체 디코딩을 확인했습니다.

## 준비 시점 검증

- 순차 병합 검증: 전체 Vitest 93개 파일 / 500개, build·TypeScript·독립 tsc·관련 ESLint 통과. [통합 기록](pr57-pr59-sequential-merge-20261108.md)을 참고합니다.

- 2026-11-08: 관련 Vitest 7개 파일 / 40개 테스트 통과.
- 같은 시점: 변경·추가 TS/TSX 16개 파일 ESLint, `git diff --check` 통과.
- 최종 카드 크기·간격 변경 후 production build(TypeScript 포함) 통과한 상태로 두 영상을 촬영했습니다.
- 새 API·패키지·마이그레이션은 없습니다. 문의 미리보기는 opt-in 빌드 변수 `NEXT_PUBLIC_INQUIRY_PREVIEW=true`로만 켭니다.

## 코드 포함 범위

- `src/components/commerce-money-wallet.{tsx,module.css,test.tsx}`
- `src/components/my-inquiry-summary{,.test}.tsx`
- `src/components/my-page-support{,.test}.tsx`
- `src/components/my-page{,.test}.tsx`
- `src/lib/inquiry-preview.ts`
- `src/components/cart-option-editor.tsx`, `src/components/cart-page{,.test}.tsx`
- `src/components/product-detail-experience{,.test}.tsx`
- `src/components/pdp-merchandising-sections.tsx`
- `tests/e2e/public-and-customer.spec.ts`
- `public/images/payment-cards/*.png`
- 이번 작업의 `docs/implementation-artifacts/` 문서와 `deferred-work.md` 추가 내용

실제 인증·운영 계정 설정은 바꾸지 않았습니다. 임시 계정과 API 스크립트는 로컬 시연용으로만 남습니다.
