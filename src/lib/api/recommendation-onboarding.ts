import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";

export const recommendationOnboardingStatusSchema = z.enum([
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

export const recommendationOnboardingSchema = z.object({
  session_id: z.number().int().positive().optional(),
  generation: z.number().int().positive().optional(),
  status: recommendationOnboardingStatusSchema,
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

export type RecommendationOnboarding = z.infer<typeof recommendationOnboardingSchema>;
export type RecommendationOnboardingItem = z.infer<typeof itemSchema>;
export type RecommendationOnboardingStatus = z.infer<typeof recommendationOnboardingStatusSchema>;
export type RecommendationChoice = "LIKE" | "DISLIKE";
export type RecommendationInputMethod = "SWIPE" | "BUTTON" | "KEYBOARD";

const root = "/api/v1/me/recommendation-onboarding";

export const recommendationOnboardingApi = {
  getRecommendationOnboarding: (token: string) => requestParsed(recommendationOnboardingSchema, root, { token }),
  saveRecommendationOnboardingResponse: (
    token: string,
    productID: number,
    choice: RecommendationChoice,
    inputMethod: RecommendationInputMethod,
  ) => requestParsed(recommendationOnboardingSchema, `${root}/responses/${productID}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ choice, input_method: inputMethod }),
  }),
  undoRecommendationOnboardingResponse: (token: string, productID: number) =>
    requestParsed(recommendationOnboardingSchema, `${root}/responses/${productID}`, { method: "DELETE", token }),
  finishRecommendationOnboarding: (token: string, status: "COMPLETED" | "SKIPPED") =>
    requestParsed(finishSchema, `${root}/finish`, {
      method: "POST",
      token,
      body: JSON.stringify({ status }),
    }),
  restartRecommendationOnboarding: (token: string) =>
    requestParsed(recommendationOnboardingSchema, `${root}/restart`, { method: "POST", token }),
  recordRecommendationOnboardingEvent: (
    token: string,
    payload: { event: string; product_id?: number; position?: number },
  ) => requestVoid(`${root}/events`, { method: "POST", token, body: JSON.stringify(payload) }),
};
