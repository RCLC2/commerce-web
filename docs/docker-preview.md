# Docker에서 수정 화면 사용하기

프런트엔드 `commerce-web-readability`와 백엔드 `commerce-ui-support`의 현재 소스를 함께 실행한다. Docker Desktop과 Docker Compose 2.24.4 이상이 필요하다.

```bash
cd /Users/yeongjae/commerce-web-readability
./scripts/docker-preview.sh
```

처음 실행할 때 이미지를 빌드하고 로컬 DB에 마이그레이션과 개발용 회원·마켓·상품·쿠폰 데이터를 넣는다. 프런트엔드는 `http://localhost:3000`, API는 `http://localhost:8080`, Temporal 화면은 `http://localhost:8233`이다. 호스트 포트는 로컬 컴퓨터에만 공개한다.

현재 컴퓨터에는 아래 로컬 토픽과 그룹을 준비했다. 완전히 새 브로커 볼륨으로 실행할 때만 아래 순서로 수동 준비한다. 애플리케이션 시작 과정에서 토픽을 자동 생성하지 않는다. 기존 브로커에는 먼저 `METADATA topic=...`, `GROUP_STATUS group=...`로 존재 여부를 확인하고, 없는 항목에 대해서만 실행한다.

```bash
./scripts/docker-preview.sh up -d mysql temporal cursus-broker
./scripts/docker-preview.sh exec -T cursus-broker /app/cursusctl --broker 127.0.0.1:9000 CREATE topic=commerce.event-log.v1 partitions=1
./scripts/docker-preview.sh exec -T cursus-broker /app/cursusctl --broker 127.0.0.1:9000 REGISTER_GROUP topic=commerce.event-log.v1 group=commerce-event-log-writer
./scripts/docker-preview.sh exec -T cursus-broker /app/cursusctl --broker 127.0.0.1:9000 CREATE topic=commerce.experiment.events partitions=1
./scripts/docker-preview.sh exec -T cursus-broker /app/cursusctl --broker 127.0.0.1:9000 REGISTER_GROUP topic=commerce.experiment.events group=experiment-server
./scripts/docker-preview.sh
```

이 명령은 이 프로젝트의 새 로컬 브로커만을 대상으로 한다. 공유·운영 브로커의 토픽은 백엔드의 Cursus 운영 정책과 별도 카탈로그를 따른다.

기본 마이그레이션에 포함되지 않은 `coupon_targets` 테이블도 이 로컬 DB에 준비했다. DB 볼륨을 새로 만들 때는 백엔드의 `docs/infrastructure/coupon_targets_k3s_mysql_operations.md`에 있는 첫 번째 CREATE TABLE 문을 시드 실행 후 로컬 MySQL에 수동 적용해야 한다. 기존 쿠폰의 대상을 임의로 추가하지 않는다.

## 개발용 로그인

| 역할 | 이메일 | 비밀번호 |
| --- | --- | --- |
| 일반 회원 | user1@test.com | password123 |
| 판매자 | seller1@market.com | password123 |
| 관리자 | admin@commerce.com | password123 |

이 계정은 새 로컬 DB에 들어가는 개발용 시드 계정이다.

## 관리

```bash
./scripts/docker-preview.sh ps
./scripts/docker-preview.sh logs --tail=100 web api
./scripts/docker-preview.sh stop
./scripts/docker-preview.sh start
```

코드를 수정한 뒤 기본 실행 명령을 다시 실행하면 이미지를 다시 빌드한다. MySQL·Temporal·Cursus는 전용 볼륨에 저장된다. 초기화 컨테이너는 Temporal·Cursus 저장 디렉터리의 소유권만 설정한다. 토픽이나 그룹은 만들지 않는다. `down --volumes`는 데이터를 삭제하므로 일반적인 종료에는 사용하지 않는다. 시드 컨테이너를 다시 실행하면 개발용 계정과 상품의 기본값이 다시 적용될 수 있다.

다른 프런트엔드 포트는 `COMMERCE_WEB_PORT=3100 ./scripts/docker-preview.sh`, 다른 백엔드 폴더는 `COMMERCE_BACKEND_CONTEXT=/절대/경로 ./scripts/docker-preview.sh`로 지정한다.

## 연동 범위

- 브라우저의 API 요청은 프런트엔드와 같은 주소로 전달되고, Next.js가 Docker 내부 API로 연결한다. 서버에서 실행하는 상품 상세 조회도 내부 API 주소를 사용한다.
- 일반 탐색, 로그인, 상품·장바구니 조회 및 수량·옵션 저장은 로컬 API와 DB를 사용한다.
- 결제 키는 초기화용 자리표시자다. 결제 승인을 사용하려면 실제 Toss 테스트 키를 `COMMERCE_PREVIEW_TOSS_SECRET_KEY`, `COMMERCE_PREVIEW_TOSS_CLIENT_KEY`로 설정하고 재실행해야 한다. 현재 설정으로 결제가 완료된다고 표시하지 않는다.
- 이미지 업로드용 S3, AI 코디 생성용 외부 키는 주입하지 않는다. 해당 외부 서비스 기능은 별도 설정이 필요하다.
- Apple Silicon에서도 실행할 수 있도록 Cursus 브로커와 로컬에 설치된 Temporal의 amd64 이미지를 명시적으로 사용한다.
- Cursus는 로컬 단일 브로커에 맞게 복제 수와 최소 동기 복제 수를 1로 설정한다. 이미지 entrypoint가 실행 파일을 붙이므로 command에는 플래그만 전달한다.

## 실행 확인

2026-09-06 로컬 Docker에서 프런트엔드 HTTP 200, API의 DB·Temporal 준비 완료 응답, 개발용 로그인 성공을 확인했다. 브라우저에서 상품을 담고 수량을 1→2로 변경한 뒤 다른 옵션으로 저장했다. 새로고침 후에도 옵션·수량·가격이 실제 MySQL의 장바구니 응답과 일치했다. 카테고리의 전체 상품 수와 범위 밖 페이지 보정도 실제 API에서 확인했다.
