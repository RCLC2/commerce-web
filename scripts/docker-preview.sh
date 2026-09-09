#!/usr/bin/env bash
set -euo pipefail

preview_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
preview_backend="${COMMERCE_BACKEND_CONTEXT:-$(dirname "$preview_root")/commerce-ui-support}"
export COMMERCE_WEB_CONTEXT="$preview_root"

if [[ ! -f "$preview_backend/docker-compose.yml" ]]; then
  echo "백엔드 경로를 COMMERCE_BACKEND_CONTEXT로 지정해주세요: $preview_backend" >&2
  exit 1
fi

# Preview-only placeholders. Payment approval requires real Toss test credentials.
export TOSS_PAYMENTS_SECRET_KEY="${COMMERCE_PREVIEW_TOSS_SECRET_KEY:-test_gsk_local_preview_unconfigured}"
export TOSS_PAYMENTS_CLIENT_KEY="${COMMERCE_PREVIEW_TOSS_CLIENT_KEY:-test_gck_local_preview_unconfigured}"
export TOSS_PAYMENTS_API_BASE_URL="https://api.tosspayments.com"
export JWT_SECRET="commerce-local-preview-jwt-secret-only"
export EXPERIMENT_ADMIN_TOKEN="commerce-local-preview-experiment-token"

if [[ $# -eq 0 ]]; then
  set -- up -d --build
fi
exec docker compose --project-name commerce-preview --env-file /dev/null \
  -f "$preview_backend/docker-compose.yml" \
  -f "$preview_root/compose.preview.yml" "$@"
