import { request } from "../api-client";
import type { LoginResponse, MemberProfile } from "../types";

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    request<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((data) => ({
      ...data,
      role: data.role ?? data.type ?? data.member?.role ?? data.member?.type ?? "CUSTOMER",
    })),
  register: (payload: {
    email: string;
    password: string;
    role: "CUSTOMER" | "SELLER";
    marketingConsent: boolean;
    nighttimeConsent: boolean;
  }) =>
    request<{ id: number }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        type: payload.role,
        marketingConsent: payload.marketingConsent,
        nighttimeConsent: payload.nighttimeConsent,
      }),
    }),
  me: (token: string) => request<MemberProfile>("/api/v1/me", { token }),
  updateMe: (
    token: string,
    payload: Pick<MemberProfile, "notification_type" | "marketing_consent" | "nighttime_consent">,
  ) =>
    request<MemberProfile>("/api/v1/me", {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),
};
