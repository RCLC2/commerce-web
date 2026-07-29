import { z } from "zod";
import { requestParsed } from "../api-client";

const loginResponseSchema = z.object({
  memberID: z.number().int().positive(),
  role: z.string(),
  accessToken: z.string().min(1),
});

const signupResponseSchema = z.object({ id: z.number().int().positive() });

const memberProfileSchema = z.object({
  id: z.number().int().positive(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
  notification_type: z.string(),
  marketing_consent: z.boolean(),
  nighttime_consent: z.boolean(),
  point_balance: z.number().int().nonnegative(),
  created_at: z.string(),
});

const signIn = (payload: { email: string; password: string }) =>
  requestParsed(loginResponseSchema, "/api/v1/auth/signin", {
    method: "POST",
    body: JSON.stringify(payload),
  });

const signUp = (payload: {
  email: string;
  password: string;
  marketingConsent: boolean;
  nighttimeConsent: boolean;
}) =>
  requestParsed(signupResponseSchema, "/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const authApi = {
  signin: signIn,
  login: signIn,
  signup: signUp,
  register: signUp,
  me: (token: string) => requestParsed(memberProfileSchema, "/api/v1/me", { token }),
};
