export const MOCK_ACCESS_TOKEN = "mock-access-token";

export function isMockingEnabled() {
  return process.env.NEXT_PUBLIC_API_MOCKING === "enabled";
}

export function getEffectiveToken(token: string | null | undefined) {
  return token ?? (isMockingEnabled() ? MOCK_ACCESS_TOKEN : null);
}
