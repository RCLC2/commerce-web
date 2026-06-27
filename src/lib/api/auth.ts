import { request } from "../api-client";
import type { LoginResponse, MemberProfile } from "../types";

const signIn = (payload: { email: string; password: string }) =>
  request<LoginResponse>("/api/v1/auth/signin", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeLoginResponse);

const signUp = (payload: {
  email: string;
  password: string;
  marketingConsent: boolean;
  nighttimeConsent: boolean;
}) =>
  request<{ id: number }>("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const authApi = {
  signin: signIn,
  login: signIn,
  signup: signUp,
  register: signUp,
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

function normalizeLoginResponse(data: LoginResponse): LoginResponse {
  return {
    ...data,
    role: data.role ?? data.type ?? data.member?.role ?? data.member?.type ?? "CUSTOMER",
  };
}
