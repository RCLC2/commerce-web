import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const backendBaseURL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:18081";

export const seedAccounts = {
  member: { email: "user1@test.com", password: "password123", role: "MEMBER" },
  seller: { email: "seller1@market.com", password: "password123", role: "SELLER" },
  admin: { email: "admin@commerce.com", password: "password123", role: "ADMIN" },
} as const;

export type LiveSession = {
  accessToken: string;
  memberID: number;
  role: string;
};

export async function signIn(
  request: APIRequestContext,
  account: { email: string; password: string },
): Promise<LiveSession> {
  const response = await request.post(`${backendBaseURL}/api/v1/auth/signin`, {
    data: account,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json() as LiveSession;
  expect(body.accessToken).toBeTruthy();
  expect(body.memberID).toBeGreaterThan(0);
  return body;
}

export async function installSession(page: Page, session: LiveSession) {
  await page.addInitScript((value: LiveSession) => {
    window.localStorage.setItem("commerce.accessToken", value.accessToken);
    window.localStorage.setItem("commerce.memberID", String(value.memberID));
    window.localStorage.setItem("commerce.role", value.role);
  }, session);
}

export async function loginThroughUI(
  page: Page,
  account: { email: string; password: string },
) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(account.email);
  await page.getByLabel("비밀번호").fill(account.password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/mypage$/);
}

export async function flushReact(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  }));
}

export async function expectConsoleHealthy(page: Page, heading: string | RegExp) {
  await expect(page.getByRole("heading", {
    name: heading,
    exact: typeof heading === "string",
  })).toBeVisible();
  await flushReact(page);
  await expect(page.getByText("데이터를 불러오지 못했습니다.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("작업을 완료하지 못했습니다.", { exact: true })).toHaveCount(0);
}
