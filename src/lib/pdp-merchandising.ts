import { z } from "zod";
import { requestParsed } from "./api-client";
import { productSchema } from "./api/contracts/schemas";
import { normalizePublicProduct } from "./api/normalizers/contracts";
import type { PdpMerchandising } from "./types";

const cardAdSchema = z.object({
  campaign_id: z.number().int().positive(),
  title: z.string(),
  image_url: z.string().optional(),
  link_url: z.string(),
  disclosure: z.string(),
});

const sponsoredMarketSchema = z.object({
  campaign_id: z.number().int().positive(),
  market: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    description: z.string().default(""),
    profile_image_url: z.string().optional(),
  }),
  products: z.array(productSchema),
  disclosure: z.string(),
});

const merchandisingSchema = z.object({
  also_viewed: z.array(productSchema),
  card_ad: cardAdSchema.nullable(),
  sponsored_market: sponsoredMarketSchema.nullable(),
});

export async function getPdpMerchandising(productID: number): Promise<PdpMerchandising> {
  const payload = await requestParsed(
    merchandisingSchema,
    `/api/v1/products/${productID}/pdp-merchandising`,
    { cache: "no-store" },
  );
  return {
    ...payload,
    also_viewed: payload.also_viewed.map(normalizePublicProduct),
    sponsored_market: payload.sponsored_market ? {
      ...payload.sponsored_market,
      products: payload.sponsored_market.products.map(normalizePublicProduct),
    } : null,
  };
}
