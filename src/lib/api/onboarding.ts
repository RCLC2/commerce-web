import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";

export const onboardingStatusSchema = z.enum([
  "NOT_ELIGIBLE",
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "SKIPPED",
  "UNAVAILABLE",
]);

const productSchema = z.object({
  id: z.number().int().positive(),
  market_id: z.number().int().positive(),
  market_name: z.string(),
  name: z.string(),
  image_url: z.string(),
  base_price: z.number().int().nonnegative(),
  discount_price: z.number().int().nonnegative(),
});

const itemSchema = z.object({
  position: z.number().int().positive(),
  choice: z.enum(["LIKE", "DISLIKE"]).nullable(),
  product: productSchema,
});

export const onboardingSchema = z.object({
  session_id: z.number().int().positive().optional(),
  generation: z.number().int().positive().optional(),
  status: onboardingStatusSchema,
  candidate_version: z.string().optional(),
  total_count: z.number().int().nonnegative(),
  responded_count: z.number().int().nonnegative(),
  items: z.array(itemSchema),
});

const finishSchema = z.object({
  status: z.enum(["COMPLETED", "SKIPPED"]),
  responded_count: z.number().int().nonnegative(),
  recommendation_ready: z.boolean(),
  generation: z.number().int().positive(),
});

export type Onboarding = z.infer<typeof onboardingSchema>;
export type OnboardingItem = z.infer<typeof itemSchema>;
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type OnboardingChoice = "LIKE" | "DISLIKE";
export type OnboardingInputMethod = "SWIPE" | "BUTTON" | "KEYBOARD";

const root = "/api/v1/me/onboarding";

export const onboardingApi = {
  getOnboarding: (token: string) => requestParsed(onboardingSchema, root, { token }),
  saveOnboardingResponse: (
    token: string,
    productID: number,
    choice: OnboardingChoice,
    inputMethod: OnboardingInputMethod,
  ) => requestParsed(onboardingSchema, `${root}/responses/${productID}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ choice, input_method: inputMethod }),
  }),
  undoOnboardingResponse: (token: string, productID: number) =>
    requestParsed(onboardingSchema, `${root}/responses/${productID}`, { method: "DELETE", token }),
  finishOnboarding: (token: string, status: "COMPLETED" | "SKIPPED") =>
    requestParsed(finishSchema, `${root}/finish`, {
      method: "POST",
      token,
      body: JSON.stringify({ status }),
    }),
  restartOnboarding: (token: string) =>
    requestParsed(onboardingSchema, `${root}/restart`, { method: "POST", token }),
  recordOnboardingEvent: (
    token: string,
    payload: { event: string; product_id?: number; position?: number },
  ) => requestVoid(`${root}/events`, { method: "POST", token, body: JSON.stringify(payload) }),
};
