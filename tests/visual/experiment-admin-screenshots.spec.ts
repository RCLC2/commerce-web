import { expect, test } from "@playwright/test";

const experiment = {
  id: 24,
  key: "checkout.recommendation.v2",
  name: "결제 추천 영역 고도화",
  domain: "CHECKOUT",
  status: "RUNNING",
  include_anonymous: true,
  started_at: "2026-11-10T00:00:00Z",
  ended_at: "2026-12-10T00:00:00Z",
  primary_metric: "purchase_rate",
  description: "결제 단계 추천 상품의 구매 전환율을 비교합니다.",
  value_type: "JSON",
  default_value: { layout: "legacy", limit: 4 },
  kill_switch: false,
  targeting_rules: [
    { attribute: "country", operator: "EQ", value: "KR" },
    { attribute: "orders", operator: "GTE", value: 1 },
  ],
  overrides: [
    { subject_type: "MEMBER", subject_key: "qa-member-1004", variant_key: "treatment" },
  ],
  conclusion: "WINNER",
  winner_variant_key: "treatment",
  decision_reason: "구매 전환율 8.4% 개선",
  revision: 7,
  variants: [
    {
      id: 101,
      key: "control",
      name: "기존 추천",
      role: "CONTROL",
      description: "현재 결제 단계에서 제공하는 인기 상품 추천",
      traffic_weight: 25,
      value: { layout: "legacy", limit: 4 },
    },
    {
      id: 102,
      key: "treatment",
      name: "개인화 추천",
      role: "TREATMENT",
      description: "최근 행동을 반영한 개인화 상품 추천",
      traffic_weight: 50,
      value: { layout: "personalized", limit: 6 },
    },
    {
      id: 103,
      key: "treatment_compact",
      name: "간결한 개인화 추천",
      role: "TREATMENT",
      description: "개인화 상품을 작은 카드로 표시",
      traffic_weight: 25,
      value: { layout: "personalized_compact", limit: 4 },
    },
  ],
  created_at: "2026-11-08T03:00:00Z",
  updated_at: "2026-11-16T05:20:00Z",
};

const result = {
  experiment_key: experiment.key,
  status: experiment.status,
  primary_metric: experiment.primary_metric,
  decision: "WINNER",
  winner: {
    variant_key: "treatment",
    reason: "구매 전환율 8.4% 개선",
  },
  variants: [
    {
      variant_key: "control",
      impressions: 48210,
      clicks: 7618,
      add_to_carts: 3912,
      purchases: 2016,
      revenue: 85642000,
      ctr: 0.158,
      purchase_rate: 0.0418,
      revenue_per_user: 1776.9,
      traffic_weight: 25,
      sample_satisfied: true,
    },
    {
      variant_key: "treatment",
      impressions: 112490,
      clicks: 19685,
      add_to_carts: 10341,
      purchases: 5102,
      revenue: 223481000,
      ctr: 0.175,
      purchase_rate: 0.0454,
      revenue_per_user: 1986.7,
      traffic_weight: 50,
      sample_satisfied: true,
    },
    {
      variant_key: "treatment_compact",
      impressions: 48200,
      clicks: 8110,
      add_to_carts: 4200,
      purchases: 2180,
      revenue: 90120000,
      ctr: 0.168,
      purchase_rate: 0.0452,
      revenue_per_user: 1869.7,
      traffic_weight: 25,
      sample_satisfied: true,
    },
  ],
};

const revisions = {
  revisions: [
    {
      revision: 7,
      snapshot: {},
      change_reason: "승리군 treatment 확정 및 트래픽 확대",
      created_by: "admin@commerce.test",
      actor_member_id: 1,
      actor_email: "admin@commerce.test",
      actor_role: "ADMIN",
      created_at: "2026-11-16T05:20:00Z",
    },
    {
      revision: 6,
      snapshot: {},
      change_reason: "treatment 트래픽 70%로 확대",
      created_by: "admin@commerce.test",
      actor_member_id: 1,
      actor_email: "admin@commerce.test",
      actor_role: "ADMIN",
      created_at: "2026-11-14T09:10:00Z",
    },
    {
      revision: 5,
      snapshot: {},
      change_reason: "KR 재구매 고객 타게팅 추가",
      created_by: "admin@commerce.test",
      actor_member_id: 1,
      actor_email: "admin@commerce.test",
      actor_role: "ADMIN",
      created_at: "2026-11-12T02:30:00Z",
    },
  ],
};

test("captures the experiment admin control plane for the pull request", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.addInitScript(() => {
    window.localStorage.setItem("commerce.accessToken", "ci-admin-token");
    window.localStorage.setItem("commerce.memberID", "1");
    window.localStorage.setItem("commerce.role", "ADMIN");
  });

  await page.route("**/experiment-api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/experiment-api/v1/experiments" && route.request().method() === "GET") {
      await route.fulfill({ status: 200, json: { experiments: [experiment] } });
      return;
    }
    if (url.pathname === `/experiment-api/v1/experiments/${experiment.id}/results`) {
      await route.fulfill({ status: 200, json: result });
      return;
    }
    if (url.pathname === `/experiment-api/v1/experiments/${experiment.id}/revisions`) {
      await route.fulfill({ status: 200, json: revisions });
      return;
    }
    if (url.pathname === `/experiment-api/v1/experiments/${experiment.id}/config` && route.request().method() === "PUT") {
      await route.fulfill({ status: 409, json: { error: "experiment revision conflict", current_revision: 8 } });
      return;
    }
    await route.fulfill({ status: 404, body: "not mocked" });
  });
  await page.route("**/api/v1/categories**", (route) => route.fulfill({ status: 200, json: [] }));
  await page.route("**/api/v1/me", (route) => route.fulfill({ status: 200, json: { id: 1, email: "admin@commerce.test", role: "ADMIN", status: "ACTIVE", notification_type: "ALL", marketing_consent: true, nighttime_consent: false, height: 0, weight: 0, point_balance: 0, created_at: "2026-01-01T00:00:00Z" } }));
  await page.route("**/api/v1/me/notifications/unread-count", (route) => route.fulfill({ status: 200, json: { unread_count: 0 } }));

  await page.goto("/admin/experiments");
  await expect(page.getByRole("heading", { name: "실험 관리", exact: true })).toBeVisible();
  await expect(page.getByText("결제 추천 영역 고도화", { exact: true })).toBeVisible();
  await expect(page.getByText("대조군 · 기존 추천", { exact: true })).toBeVisible();
  await expect(page.getByText("현재 운영 기능으로 비교 기준입니다. (Control)", { exact: true })).toBeVisible();
  await page.addStyleTag({
    content: 'nav[aria-label="하단 주요 메뉴"] { display: none !important; }',
  });

  await page.screenshot({
    path: "output/pr-screenshots/experiment-admin-overview.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: "트래픽", exact: true }).click();
  await expect(page.getByText("합계 100%", { exact: true })).toBeVisible();
  await page.screenshot({ path: "output/pr-screenshots/experiment-admin-traffic.png", fullPage: true });

  await page.getByRole("button", { name: "대상 설정", exact: true }).click();
  await expect(page.getByText(/모든 조건을 AND로 평가합니다/)).toBeVisible();
  await page.screenshot({ path: "output/pr-screenshots/experiment-admin-targeting.png", fullPage: true });

  await page.getByRole("button", { name: "결과와 이력", exact: true }).click();
  await expect(page.getByText("admin@commerce.test", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: "output/pr-screenshots/experiment-admin-history.png", fullPage: true });

  await page.getByRole("button", { name: "긴급 중단", exact: true }).click();
  await expect(page.getByText(/변경자는 admin@commerce.test로 자동 기록됩니다/)).toBeVisible();
  await page.screenshot({ path: "output/pr-screenshots/experiment-admin-kill-switch.png", fullPage: true });
  await page.getByRole("button", { name: "취소", exact: true }).click();

  await page.getByRole("button", { name: "기본 설정", exact: true }).click();
  await page.getByLabel("운영 이름").first().fill("기존 추천 수정안");
  await page.getByRole("button", { name: "변경 저장", exact: true }).click();
  await expect(page.getByTestId("revision-conflict")).toBeVisible();
  await page.screenshot({ path: "output/pr-screenshots/experiment-admin-conflict.png", fullPage: true });
});
