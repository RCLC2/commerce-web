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
      traffic_weight: 30,
      value: { layout: "legacy", limit: 4 },
    },
    {
      id: 102,
      key: "treatment",
      name: "개인화 추천",
      traffic_weight: 70,
      value: { layout: "personalized", limit: 6 },
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
      traffic_weight: 30,
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
      traffic_weight: 70,
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
      created_by: "growth-operator",
      created_at: "2026-11-16T05:20:00Z",
    },
    {
      revision: 6,
      snapshot: {},
      change_reason: "treatment 트래픽 70%로 확대",
      created_by: "growth-operator",
      created_at: "2026-11-14T09:10:00Z",
    },
    {
      revision: 5,
      snapshot: {},
      change_reason: "KR 재구매 고객 타게팅 추가",
      created_by: "commerce-admin",
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
    window.localStorage.setItem("experimentAdminToken", "ci-experiment-admin-token");
  });

  await page.route("**/experiment-api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/experiment-api/v1/experiments") {
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
    await route.fulfill({ status: 404, body: "not mocked" });
  });
  await page.route("**/api/v1/categories**", (route) => route.fulfill({ status: 200, json: [] }));
  await page.route("**/api/v1/me/notifications/unread-count", (route) => route.fulfill({ status: 200, json: { unread_count: 0 } }));

  await page.goto("/admin/experiments");
  await expect(page.getByRole("heading", { name: "실험 관리", exact: true })).toBeVisible();
  await expect(page.getByText("결제 추천 영역 고도화", { exact: true })).toBeVisible();
  await expect(page.getByText("합계 100%", { exact: true })).toBeVisible();
  await expect(page.getByText("승리군 treatment 확정 및 트래픽 확대", { exact: true }).first()).toBeVisible();
  await page.addStyleTag({
    content: 'nav[aria-label="하단 주요 메뉴"] { display: none !important; }',
  });

  await page.screenshot({
    path: "output/pr-screenshots/experiment-admin-overview.png",
    fullPage: true,
  });

  const controlPlane = page.locator("section").filter({
    has: page.getByRole("heading", { name: "운영 제어", exact: true }),
  }).last();
  await controlPlane.screenshot({
    path: "output/pr-screenshots/experiment-admin-control-plane.png",
  });

  const revisionsPanel = page.locator("section").filter({
    has: page.getByRole("heading", { name: "중앙 판정 시뮬레이터와 변경 이력", exact: true }),
  }).last();
  await revisionsPanel.screenshot({
    path: "output/pr-screenshots/experiment-admin-revisions.png",
  });
});
