# Commerce 디자인 시스템 HTML

문서 7개를 Next.js 앱과 분리된 HTML 파일로 관리합니다. `index.html`과 `assets/`가 같은 폴더에 있으면 문서를 탐색하고 예시를 조작할 수 있습니다. 실행 시 API, Next.js 서버, CDN을 사용하지 않습니다.

| 파일 | 내용 |
| --- | --- |
| [index.html](index.html) | 문서 안내 |
| [foundations.html](foundations.html) | 색상·글자·간격 |
| [components.html](components.html) | 공통 컴포넌트 |
| [commerce.html](commerce.html) | 상품 구매 구성 |
| [seller.html](seller.html) | 주문 운영 |
| [admin.html](admin.html) | 검토와 승인 |
| [patterns.html](patterns.html) | 상태 패턴 |

## 보기

`index.html`을 브라우저에서 열거나, 저장소 루트에서 아래 명령으로 정적 미리보기를 실행합니다.

```sh
npm run design-system:serve
```

미리보기 주소: [http://localhost:3001](http://localhost:3001/index.html)

다른 폴더나 정적 호스팅으로 옮길 때는 HTML 7개와 `assets/`를 함께 복사합니다. 모든 문서 링크와 자산 경로는 상대 경로입니다.

## 수정과 재생성

문서 원본과 생성 도구는 [`scripts/design-system/`](../../scripts/design-system/)에서 관리합니다. 이 폴더에는 완성된 HTML과 실행에 필요한 자산만 둡니다.

TSX는 실제 공통 React 컴포넌트로 동작 예시를 만들고, 같은 파일을 화면의 소스 코드로 표시하기 위한 원본입니다. HTML은 이 원본에서 자동 생성하므로 별도로 수정하지 않습니다. HTML을 열 때는 TSX나 빌드 도구가 필요하지 않습니다.

```sh
npm run design-system:build
npm run design-system:check
```

- `scripts/design-system/src/pages/`: 문서별 내용
- `scripts/design-system/src/components/`: 문서 레이아웃과 예시
- `scripts/design-system/src/components/examples/`: 화면에 표시되는 실제 예시 코드
- `scripts/design-system/build.mjs`: HTML과 CSS·스크립트 생성
- `docs/design-system/assets/linen-shirt-product.png`: 로컬 상품 이미지

HTML과 `assets/docs.*`, `assets/tokens.css`는 생성 결과이므로 내용을 바꿀 때는 `scripts/design-system/src/`를 수정한 뒤 재생성합니다. 생성 결과도 이 폴더에서 버전 관리합니다.

빌드할 때는 저장소의 `src/components/ui/`와 `src/app/globals.css`를 참조해 실제 컴포넌트와 디자인 토큰을 사용합니다. 빌드된 HTML에는 문서 본문이 포함되며, 공통 스크립트가 예시 동작을 연결합니다. 화면에 표시하는 소스는 같은 예시 파일을 빌드 시 읽어 넣습니다.

이 문서는 `src/app`의 라우트나 앱 빌드에 등록되지 않습니다. 문서 타입 검사는 별도 tsconfig를 사용하며, 배포된 앱에는 문서가 포함되지 않습니다.
