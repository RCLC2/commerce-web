import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";
import type { InventorySourceForm, Product } from "../types";
import {
  inventorySourceSchema,
  inventorySyncLogSchema,
} from "./contracts/schemas";
import {
  rawExternalInventoryMappingSchema,
  sellerContextSchema,
} from "./contracts/raw";
import {
  encodeSellerProduct,
  normalizeExternalInventoryMapping,
} from "./normalizers/contracts";

function marketQuery(marketID?: number | null) {
  return marketID ? `?market_id=${marketID}` : "";
}

const carriersSchema = z.object({
  carriers: z.array(z.object({ code: z.string(), name: z.string(), tracking_key: z.string() })),
});
export const sellerApi = {
  sellerContext: (token: string, marketID?: number | null) =>
    requestParsed(sellerContextSchema, `/api/v1/seller/context${marketQuery(marketID)}`, { token }),
  sellerInventorySources: (token: string, marketID?: number | null) =>
    requestParsed(z.array(inventorySourceSchema), `/api/v1/seller/inventory/sources${marketQuery(marketID)}`, { token }),
  sellerInventoryLogs: (token: string, marketID?: number | null) =>
    requestParsed(z.array(inventorySyncLogSchema), `/api/v1/seller/inventory/sync-logs${marketQuery(marketID)}`, { token }),
  createSellerProduct: (token: string, product: Product) =>
    requestVoid("/api/v1/products", {
      method: "POST",
      token,
      body: JSON.stringify(encodeSellerProduct(product)),
    }),
  registerInventorySource: (token: string, payload: InventorySourceForm) =>
    requestParsed(inventorySourceSchema, "/api/v1/fulfillment/sources", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  deactivateInventorySource: (token: string, sourceID: number) =>
    requestVoid(`/api/v1/fulfillment/sources/${sourceID}`, { method: "DELETE", token }),
  replaceInventorySourceTokens: (token: string, sourceID: number, payload: { access_token?: string; refresh_token?: string; client_secret?: string; webhook_secret?: string }) =>
    requestVoid(`/api/v1/fulfillment/sources/${sourceID}/tokens`, { method: "PATCH", token, body: JSON.stringify(payload) }),
  registerInventoryMapping: async (token: string, payload: { inventory_source_id: number; provider?: string; product_option_id: number; external_product_id?: string; external_variant_id?: string; external_inventory_item_id?: string; external_location_id?: string; disconnect_if_necessary?: boolean }) =>
    normalizeExternalInventoryMapping(await requestParsed(
      rawExternalInventoryMappingSchema,
      "/api/v1/fulfillment/mappings",
      { method: "POST", token, body: JSON.stringify(payload) },
    )),
  pullInventoryOptionStock: (token: string, optionID: number) =>
    requestParsed(z.object({ quantity: z.number().int() }), `/api/v1/fulfillment/options/${optionID}/pull`, { method: "POST", token }),
  pushInventoryOptionStock: (token: string, optionID: number, quantity: number) =>
    requestVoid(`/api/v1/fulfillment/options/${optionID}/push`, { method: "POST", token, body: JSON.stringify({ quantity }) }),
  retryInventorySyncLog: (token: string, logID: number) =>
    requestVoid(`/api/v1/fulfillment/sync-logs/${logID}/retry`, { method: "POST", token }),
  deliveryCarriers: (token: string) => requestParsed(carriersSchema, "/api/v1/deliveries/carriers", { token }),
  registerSellerInvoices: (token: string, payload: { market_id: number; invoices: Array<{ order_id: number; carrier: string; invoice_number: string; is_fake_invoice?: boolean }> }) =>
    requestVoid("/api/v1/seller/deliveries/invoices", { method: "POST", token, body: JSON.stringify(payload) }),
  completeSellerPackage: (token: string, marketID: number, packageID: number) =>
    requestVoid(`/api/v1/seller/markets/${marketID}/shipping-packages/${packageID}/complete`, { method: "POST", token }),
};
