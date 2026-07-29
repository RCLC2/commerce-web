import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";
import type { InventorySourceForm, Product, SettlementAccount } from "../types";
import {
  deliverySchema,
  externalInventoryMappingSchema,
  inventorySourceSchema,
  inventorySyncLogSchema,
  orderSchema,
  reviewSchema,
  statusResponseSchema,
} from "./contracts/schemas";
import {
  rawSellerProductSchema,
  rawSettlementSchema,
  sellerContextSchema,
  sellerDashboardSchema,
} from "./contracts/raw";
import { encodeSellerProduct, normalizeSellerProduct, normalizeSettlement } from "./normalizers/contracts";

function marketQuery(marketID?: number | null) {
  return marketID ? `?market_id=${marketID}` : "";
}

const carriersSchema = z.object({
  carriers: z.array(z.object({ code: z.string(), name: z.string(), tracking_key: z.string() })),
});
const settlementLineSchema = z.looseObject({
  id: z.number().int().positive(),
  settlement_id: z.number().int().positive().optional(),
  order_id: z.number().int().positive().optional(),
  order_code: z.string().optional(),
  product_name: z.string().optional(),
  sales_amount: z.number().optional(),
  commission_amount: z.number().optional(),
  settlement_amount: z.number().optional(),
  status: z.string().optional(),
  created_at: z.string().optional(),
});
const settlementAccountSchema = z.looseObject({
  market_id: z.number().int().positive(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_holder: z.string().optional(),
  depositor_name: z.string().optional(),
  business_registration_number: z.string().optional(),
});

export const sellerApi = {
  sellerContext: (token: string, marketID?: number | null) =>
    requestParsed(sellerContextSchema, `/api/v1/seller/context${marketQuery(marketID)}`, { token }),
  sellerDashboard: (token: string, marketID?: number | null) =>
    requestParsed(sellerDashboardSchema, `/api/v1/seller/dashboard${marketQuery(marketID)}`, { token }),
  sellerProducts: async (token: string, marketID?: number | null) =>
    (await requestParsed(z.array(rawSellerProductSchema), `/api/v1/seller/products${marketQuery(marketID)}`, { token }))
      .map(normalizeSellerProduct),
  sellerInventorySources: (token: string, marketID?: number | null) =>
    requestParsed(z.array(inventorySourceSchema), `/api/v1/seller/inventory/sources${marketQuery(marketID)}`, { token }),
  sellerInventoryLogs: (token: string, marketID?: number | null) =>
    requestParsed(z.array(inventorySyncLogSchema), `/api/v1/seller/inventory/sync-logs${marketQuery(marketID)}`, { token }),
  sellerOrders: (token: string, marketID?: number | null) =>
    requestParsed(z.array(orderSchema), `/api/v1/seller/orders${marketQuery(marketID)}`, { token }),
  sellerSettlements: async (token: string, marketID?: number | null) =>
    (await requestParsed(z.array(rawSettlementSchema), `/api/v1/seller/settlements${marketQuery(marketID)}`, { token }))
      .map(normalizeSettlement),
  sellerReviews: (token: string, marketID?: number | null) =>
    requestParsed(z.array(reviewSchema), `/api/v1/seller/reviews${marketQuery(marketID)}`, { token }),
  updateSellerProduct: (token: string, product: Product) =>
    requestVoid(`/api/v1/products/${product.id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(encodeSellerProduct(product)),
    }),
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
  getInventorySource: (token: string, sourceID: number) =>
    requestParsed(inventorySourceSchema, `/api/v1/fulfillment/sources/${sourceID}`, { token }),
  deactivateInventorySource: (token: string, sourceID: number) =>
    requestVoid(`/api/v1/fulfillment/sources/${sourceID}`, { method: "DELETE", token }),
  replaceInventorySourceTokens: (token: string, sourceID: number, payload: { access_token?: string; refresh_token?: string; client_secret?: string; webhook_secret?: string }) =>
    requestVoid(`/api/v1/fulfillment/sources/${sourceID}/tokens`, { method: "PATCH", token, body: JSON.stringify(payload) }),
  registerSuppliedProductOption: (token: string, payload: { inventory_source_id: number; product_option_id: number; external_product_id?: string; external_variant_id?: string; external_inventory_item_id?: string; external_location_id?: string }) =>
    requestParsed(statusResponseSchema, "/api/v1/fulfillment/supplied-product-options", { method: "POST", token, body: JSON.stringify(payload) }),
  upsertInventoryLocation: (token: string, payload: { market_id: number; provider: string; external_location_id: string; name?: string; priority?: number }) =>
    requestParsed(statusResponseSchema, "/api/v1/fulfillment/locations", { method: "PUT", token, body: JSON.stringify(payload) }),
  adjustInventory: (token: string, payload: { product_option_id: number; quantity_delta: number; reason?: string }) =>
    requestParsed(z.object({ quantity: z.number().int() }), "/api/v1/fulfillment/inventory/adjust", { method: "POST", token, body: JSON.stringify(payload) }),
  registerInventoryMapping: (token: string, payload: { inventory_source_id: number; provider?: string; product_option_id: number; external_product_id?: string; external_variant_id?: string; external_inventory_item_id?: string; external_location_id?: string; disconnect_if_necessary?: boolean }) =>
    requestParsed(externalInventoryMappingSchema, "/api/v1/fulfillment/mappings", { method: "POST", token, body: JSON.stringify(payload) }),
  pullInventoryOptionStock: (token: string, optionID: number) =>
    requestParsed(z.object({ quantity: z.number().int() }), `/api/v1/fulfillment/options/${optionID}/pull`, { method: "POST", token }),
  pushInventoryOptionStock: (token: string, optionID: number, quantity: number) =>
    requestVoid(`/api/v1/fulfillment/options/${optionID}/push`, { method: "POST", token, body: JSON.stringify({ quantity }) }),
  getSameDayDispatchAvailability: (token: string, optionID: number) =>
    requestParsed(z.object({
      available: z.boolean(),
      cutoff_time: z.string().optional(),
      expected_shipping_date: z.string().optional(),
      reason: z.string().optional(),
    }), `/api/v1/fulfillment/options/${optionID}/same-day-dispatch`, { token }),
  syncOutboundOrder: (token: string, orderCode: string, payload: { market_id?: number; provider?: string }) =>
    requestParsed(statusResponseSchema, `/api/v1/fulfillment/orders/${orderCode}/outbound`, { method: "POST", token, body: JSON.stringify(payload) }),
  syncOutboundOrderStatus: (token: string, orderCode: string, payload: { market_id?: number; provider?: string }) =>
    requestVoid(`/api/v1/fulfillment/orders/${orderCode}/outbound-status`, { method: "POST", token, body: JSON.stringify(payload) }),
  retryInventorySyncLog: (token: string, logID: number) =>
    requestVoid(`/api/v1/fulfillment/sync-logs/${logID}/retry`, { method: "POST", token }),
  deliveryCarriers: (token: string) => requestParsed(carriersSchema, "/api/v1/deliveries/carriers", { token }),
  getDeliveryByOrder: (token: string, orderID: number) =>
    requestParsed(deliverySchema, `/api/v1/deliveries/by-order/${orderID}`, { token }),
  getDelivery: (token: string, deliveryID: number) =>
    requestParsed(deliverySchema, `/api/v1/deliveries/${deliveryID}`, { token }),
  registerSellerInvoices: (token: string, payload: { market_id: number; invoices: Array<{ order_id: number; carrier: string; invoice_number: string; is_fake_invoice?: boolean }> }) =>
    requestVoid("/api/v1/seller/deliveries/invoices", { method: "POST", token, body: JSON.stringify(payload) }),
  startSellerDelivery: (token: string, marketID: number, deliveryID: number, payload: { carrier: string; tracking_number: string }) =>
    requestVoid(`/api/v1/seller/markets/${marketID}/deliveries/${deliveryID}/start`, { method: "POST", token, body: JSON.stringify(payload) }),
  completeSellerDelivery: (token: string, marketID: number, deliveryID: number) =>
    requestVoid(`/api/v1/seller/markets/${marketID}/deliveries/${deliveryID}/complete`, { method: "POST", token }),
  sellerMarketOrders: (token: string, marketID: number) =>
    requestParsed(z.array(orderSchema), `/api/v1/seller/markets/${marketID}/orders`, { token }),
  sellerMarketOrder: (token: string, marketID: number, orderCode: string) =>
    requestParsed(orderSchema, `/api/v1/seller/markets/${marketID}/orders/${orderCode}`, { token }),
  sellerMarketSettlements: async (token: string, marketID: number) =>
    (await requestParsed(z.array(rawSettlementSchema), `/api/v1/seller/markets/${marketID}/settlements`, { token }))
      .map(normalizeSettlement),
  sellerMarketSettlementLines: (token: string, marketID: number) =>
    requestParsed(z.array(settlementLineSchema), `/api/v1/seller/markets/${marketID}/settlement-lines`, { token }),
  getSettlementAccount: (token: string, marketID: number) =>
    requestParsed(settlementAccountSchema, `/api/v1/seller/markets/${marketID}/settlement-account`, { token }),
  upsertSettlementAccount: (token: string, marketID: number, payload: SettlementAccount) =>
    requestParsed(settlementAccountSchema, `/api/v1/seller/markets/${marketID}/settlement-account`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
};
