import { z } from "zod";
import { requestParsed } from "./api-client";
import { productSchema } from "./api/contracts/schemas";
import { normalizePublicProduct } from "./api/normalizers/contracts";
import type { PdpMerchandising } from "./types";

const merchandisingSchema = z.object({
  also_viewed: z.array(productSchema),
});

export async function getPdpMerchandising(productID: number): Promise<PdpMerchandising> {
  const payload = await requestParsed(
    merchandisingSchema,
    `/api/v1/products/${productID}/pdp-merchandising`,
    { cache: "no-store" },
  );
  return {
    also_viewed: payload.also_viewed.map(normalizePublicProduct),
  };
}
