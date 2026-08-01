import { z } from "zod";
import { requestParsed } from "../api-client";
import type { EventProduct, EventSort } from "../event-detail-types";
import { productSchema } from "./contracts/schemas";
import { normalizePublicProduct } from "./normalizers/contracts";

const identifier = z.number().int().positive();
const eventSortSchema = z.enum(["RECOMMENDED", "POPULAR", "NEWEST", "PRICE_ASC", "PRICE_DESC"]);
const eventRewardSchema = z.object({
  id: identifier,
  event_id: identifier,
  reward_type: z.enum(["COUPON", "POINT_EVENT"]),
  reward_id: identifier,
  title: z.string(),
  description: z.string(),
  button_label: z.string(),
  sequence: z.number().int(),
});
const eventFilterSchema = z.object({ id: identifier, name: z.string() });
const eventDetailSchema = z.object({
  id: identifier,
  title: z.string(),
  subtitle: z.string(),
  image_url: z.string(),
  link_url: z.string(),
  status: z.string(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  design_variant: z.string(),
  product_display: z.object({
    enabled: z.boolean(),
    mode: z.enum(["PRODUCT_GRID", "MARKET_CAROUSELS"]),
    section_title: z.string(),
    default_sort: eventSortSchema,
    sort_options: z.array(z.object({ value: eventSortSchema, label: z.string() })),
    markets: z.array(eventFilterSchema),
    categories: z.array(eventFilterSchema),
  }),
  rewards: z.array(eventRewardSchema),
});
const eventProductPageSchema = z.object({
  mode: z.enum(["PRODUCT_GRID", "MARKET_CAROUSELS"]),
  items: z.array(productSchema.extend({
    category_name: z.string().optional(),
    market_profile_image_url: z.string().optional(),
    market_description: z.string().optional(),
    market_follower_count: z.number().int().nonnegative().optional(),
  })),
  paging: z.object({ limit: z.number().int().positive(), offset: z.number().int().nonnegative(), has_next: z.boolean() }),
});
const eventRewardClaimSchema = z.object({
  status: z.string(), event_id: identifier, reward_row_id: identifier,
  reward_type: z.enum(["COUPON", "POINT_EVENT"]), reward_id: identifier,
});

export const eventDetailApi = {
  getEvent: (eventID: number) => requestParsed(eventDetailSchema, `/api/v1/events/${eventID}`),
  listEventProducts: async (params: {
    eventID: number; limit: number; offset: number; sort: EventSort; marketID?: number; categoryID?: number;
  }) => {
    const search = new URLSearchParams({
      limit: String(params.limit), offset: String(params.offset), sort: params.sort,
    });
    if (params.marketID) search.set("market_id", String(params.marketID));
    if (params.categoryID) search.set("category_id", String(params.categoryID));
    const page = await requestParsed(eventProductPageSchema, `/api/v1/events/${params.eventID}/products?${search}`);
    return { ...page, items: page.items.map((product) => normalizePublicProduct(product) as EventProduct) };
  },
  claimEventReward: (token: string, eventID: number, rewardRowID: number) =>
    requestParsed(eventRewardClaimSchema, `/api/v1/events/${eventID}/rewards/${rewardRowID}/claim`, { method: "POST", token }),
};
