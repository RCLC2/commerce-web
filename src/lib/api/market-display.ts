import { z } from "zod";
import { requestParsed } from "../api-client";

export const pdpShelfModeSchema = z.enum(["PLATFORM_RECOMMENDED", "NEWEST"]);
export const marketDisplaySettingsSchema = z.object({
  market_id: z.number().int().positive(),
  pdp_shelf_mode: pdpShelfModeSchema,
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type PDPShelfMode = z.infer<typeof pdpShelfModeSchema>;

export const marketDisplayApi = {
  sellerMarketDisplaySettings: (token: string, marketID: number) =>
    requestParsed(marketDisplaySettingsSchema, `/api/v1/seller/markets/${marketID}/display-settings`, { token }),
  updateSellerMarketDisplaySettings: (token: string, marketID: number, mode: PDPShelfMode) =>
    requestParsed(marketDisplaySettingsSchema, `/api/v1/seller/markets/${marketID}/display-settings`, {
      method: "PUT",
      token,
      body: JSON.stringify({ pdp_shelf_mode: mode }),
    }),
};
