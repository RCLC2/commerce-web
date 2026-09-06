import { z } from "zod";
import { requestParsed } from "../api-client";
import { adDecisionSchema } from "./advertising";

export const homePlacementSchema = z.enum(["HOME_CONTEXT_TEXT", "HOME_FEATURE_CARD", "PDP_REVIEW_BANNER"]);
export const homeCardTypeSchema = z.enum([
  "SIGNUP_COUPON",
  "FIRST_PURCHASE_COUPON",
  "PERSONALIZED_EVENT",
  "TEXT_AD",
  "EVENT",
]);
export const homeAudienceSchema = z.enum(["ALL", "AUTHENTICATED", "SEGMENT"]);
export const homeCardStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

const optionalResolvedFields = {
  headline: z.string().optional(),
  body: z.string().optional(),
  image_url: z.string().min(1).optional(),
  cta_label: z.string().min(1).optional(),
  landing_url: z.string().min(1).optional(),
  coupon_id: z.number().int().positive().optional(),
  event_id: z.number().int().positive().optional(),
};
export const resolvedHomeCardSchema = z.discriminatedUnion("source", [
  z.strictObject({
    source: z.literal("PLATFORM"),
    id: z.number().int().positive(),
    card_type: homeCardTypeSchema,
    ...optionalResolvedFields,
  }),
  z.strictObject({
    source: z.literal("AD"),
    card_type: z.enum(["PRODUCT_CARD", "BANNER"]),
    decision: adDecisionSchema,
  }),
]);

export const homeSlotSchema = z.strictObject({
  status: z.enum(["FILLED", "EMPTY", "UNAVAILABLE"]),
  card: resolvedHomeCardSchema.optional(),
  error: z.string().optional(),
}).superRefine((slot, context) => {
  if (slot.status === "FILLED" && !slot.card) {
    context.addIssue({ code: "custom", message: "채워진 홈 구좌에는 카드가 필요합니다.", path: ["card"] });
  }
  if (slot.status !== "FILLED" && slot.card) {
    context.addIssue({ code: "custom", message: "비어 있거나 사용할 수 없는 홈 구좌에는 카드가 없어야 합니다.", path: ["card"] });
  }
});

export const homePlacementsSchema = z.strictObject({
  context_text: homeSlotSchema,
  feature_card: homeSlotSchema,
});

const dateStringSchema = z.string().min(1).refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "유효한 날짜 문자열이어야 합니다.",
);

export const homeCardSchema = z.strictObject({
  id: z.number().int().positive(),
  placement: homePlacementSchema,
  card_type: homeCardTypeSchema,
  headline: z.string().min(1),
  body: z.string().optional(),
  image_url: z.string().min(1).optional(),
  cta_label: z.string().min(1).optional(),
  landing_url: z.string().min(1).optional(),
  coupon_id: z.number().int().positive().optional(),
  event_id: z.number().int().positive().optional(),
  audience_type: homeAudienceSchema,
  segment_key: z.string().min(1).optional(),
  priority: z.number().int(),
  is_takeover: z.boolean(),
  starts_at: dateStringSchema.optional(),
  ends_at: dateStringSchema.optional(),
  status: homeCardStatusSchema,
  created_by_member_id: z.number().int().positive().optional(),
  updated_by_member_id: z.number().int().positive().optional(),
  created_at: dateStringSchema,
  updated_at: dateStringSchema,
});

export type HomePlacements = z.infer<typeof homePlacementsSchema>;
export type ResolvedHomeCard = z.infer<typeof resolvedHomeCardSchema>;
export type HomeCard = z.infer<typeof homeCardSchema>;

export const homePlacementApi = {
  homePlacements: (requestID: string, token?: string | null) =>
    requestParsed(homePlacementsSchema, `/api/v1/home/placements?request_id=${encodeURIComponent(requestID)}`, {
      token: token ?? undefined,
      credentials: "include",
    }),
  pdpReviewBanner: (productID: number, requestID: string, token?: string | null) =>
    requestParsed(homeSlotSchema, `/api/v1/products/${productID}/review-banner?request_id=${encodeURIComponent(requestID)}`, {
      token: token ?? undefined,
      credentials: "include",
    }),
  adminHomeCards: (token: string) =>
    requestParsed(z.array(homeCardSchema), "/api/v1/admin/home-cards", { token }),
  createAdminHomeCard: (token: string, payload: Record<string, unknown>) =>
    requestParsed(homeCardSchema, "/api/v1/admin/home-cards", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateAdminHomeCard: (token: string, cardID: number, payload: Record<string, unknown>) =>
    requestParsed(homeCardSchema, `/api/v1/admin/home-cards/${cardID}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  setAdminHomeCardActive: (token: string, cardID: number, active: boolean) =>
    requestParsed(homeCardSchema, `/api/v1/admin/home-cards/${cardID}/${active ? "activate" : "deactivate"}`, {
      method: "POST",
      token,
    }),
};
