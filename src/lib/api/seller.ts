import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";
import { getApiBaseUrl } from "../api-base-url";
import type { InventorySourceForm, Product, SettlementAccountInput } from "../types";
import { fallbackProduct, isNotFound } from "../pdp-fallback";
import {
  dateStringSchema,
  deliverySchema,
  inventorySourceSchema,
  inventorySyncLogSchema,
  orderSchema,
  reviewSchema,
} from "./contracts/schemas";
import {
  rawExternalInventoryMappingSchema,
  rawInventoryDetailSchema,
  rawInventoryLocationSchema,
  rawSellerSettlementDashboardSchema,
  rawSellerProductSchema,
  rawSettlementAccountSchema,
  rawSettlementLineSchema,
  rawSettlementSchema,
  rawSuppliedProductOptionSchema,
  sellerContextSchema,
  sellerDashboardSchema,
} from "./contracts/raw";
import {
  encodeSellerProduct,
  encodeSettlementAccount,
  normalizeExternalInventoryMapping,
  normalizeInventoryDetail,
  normalizeInventoryLocation,
  normalizeSellerProduct,
  normalizeSellerSettlementDashboard,
  normalizeSettlement,
  normalizeSettlementAccount,
  normalizeSettlementLine,
  normalizeSuppliedProductOption,
} from "./normalizers/contracts";
import { collectAllUniquePages } from "./pagination";

function marketQuery(marketID?: number | null) {
  return marketID ? `?market_id=${marketID}` : "";
}

const carriersSchema = z.object({
  carriers: z.array(z.object({ code: z.string(), name: z.string(), tracking_key: z.string() })),
});
const sellerReviewSchema = reviewSchema.extend({
  created_at: dateStringSchema,
});
const settlementLinesResponseSchema = z.object({
  items: z.array(rawSettlementLineSchema),
});
const externalOrderResultSchema = z.object({
  external_order_id: z.string().min(1),
  external_name: z.string().optional(),
});

const productWorkbookResultSchema = z.object({
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  errors: z.array(z.object({ row: z.number().int().positive(), message: z.string() })),
});

async function downloadProductWorkbook(token: string, path: string): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error((await response.text()) || `Workbook download failed (${response.status})`);
  }
  return response.blob();
}

async function uploadProductWorkbook(token: string, marketID: number, file: File) {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(`${getApiBaseUrl()}/api/v1/seller/products/bulk.xlsx?market_id=${marketID}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Workbook import failed (${response.status})`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Workbook import returned invalid JSON.");
  }
  return productWorkbookResultSchema.parse(payload);
}

export const sellerApi = {
  sellerContext: (token: string, marketID?: number | null) =>
    requestParsed(sellerContextSchema, `/api/v1/seller/context${marketQuery(marketID)}`, { token }),
  sellerDashboard: (token: string, marketID?: number | null) =>
    requestParsed(sellerDashboardSchema, `/api/v1/seller/dashboard${marketQuery(marketID)}`, { token }),
  sellerProducts: async (token: string, marketID?: number | null) =>
    requestParsed(z.array(rawSellerProductSchema), `/api/v1/seller/products${marketQuery(marketID)}`, { token })
      .then((products) => products.map(normalizeSellerProduct))
      .catch((error) => {
        if (isNotFound(error)) return [fallbackProduct(900001, marketID ?? 1)];
        throw error;
      }),
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
    requestParsed(z.array(sellerReviewSchema), `/api/v1/seller/reviews${marketQuery(marketID)}`, { token }),
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
  sellerProductTemplate: (token: string, marketID: number) =>
    downloadProductWorkbook(token, `/api/v1/seller/products/template.xlsx?market_id=${marketID}`),
  exportSellerProducts: (token: string, marketID: number) =>
    downloadProductWorkbook(token, `/api/v1/seller/products/export.xlsx?market_id=${marketID}`),
  importSellerProducts: (token: string, marketID: number, file: File) =>
    uploadProductWorkbook(token, marketID, file),
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
  registerSuppliedProductOption: async (
    token: string,
    payload: { product_option_id: number; provider: string; sku_code: string; supplier_code: string },
  ) =>
    normalizeSuppliedProductOption(await requestParsed(
      rawSuppliedProductOptionSchema,
      "/api/v1/fulfillment/supplied-product-options",
      { method: "POST", token, body: JSON.stringify(payload) },
    )),
  upsertInventoryLocation: async (
    token: string,
    payload: { location_id: number; name: string; channel_type: string },
  ) =>
    normalizeInventoryLocation(await requestParsed(
      rawInventoryLocationSchema,
      "/api/v1/fulfillment/locations",
      { method: "PUT", token, body: JSON.stringify(payload) },
    )),
  adjustInventory: async (
    token: string,
    payload: {
      product_option_id: number;
      supplied_option_id?: number;
      location_id: number;
      inbound_reference: string;
      available_quantity_delta: number;
      allocated_quantity_delta: number;
      transaction_type: string;
      reference_type: string;
      reference_id: string;
      memo: string;
    },
  ) =>
    normalizeInventoryDetail(await requestParsed(
      rawInventoryDetailSchema,
      "/api/v1/fulfillment/inventory/adjust",
      { method: "POST", token, body: JSON.stringify(payload) },
    )),
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
  getSameDayDispatchAvailability: (token: string, optionID: number) =>
    requestParsed(z.object({
      available: z.boolean(),
      cutoff_time: z.string().optional(),
      expected_shipping_date: z.string().optional(),
      reason: z.string().optional(),
    }), `/api/v1/fulfillment/options/${optionID}/same-day-dispatch`, { token }),
  syncOutboundOrder: (token: string, orderCode: string, payload: { market_id: number; provider: string }) =>
    requestParsed(externalOrderResultSchema, `/api/v1/fulfillment/orders/${orderCode}/outbound`, { method: "POST", token, body: JSON.stringify(payload) }),
  syncOutboundOrderStatus: (
    token: string,
    orderCode: string,
    payload: { market_id: number; provider: string; external_order_id: string; status: string },
  ) =>
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
    collectAllUniquePages(
      (limit, offset) => requestParsed(
        z.array(orderSchema),
        `/api/v1/seller/markets/${marketID}/orders?limit=${limit}&offset=${offset}`,
        { token },
      ),
      (order) => order.id,
    ),
  sellerMarketOrder: (token: string, marketID: number, orderCode: string) =>
    requestParsed(orderSchema, `/api/v1/seller/markets/${marketID}/orders/${orderCode}`, { token }),
  sellerMarketSettlements: async (token: string, marketID: number) =>
    normalizeSellerSettlementDashboard(await requestParsed(
      rawSellerSettlementDashboardSchema,
      `/api/v1/seller/markets/${marketID}/settlements`,
      { token },
    )),
  sellerMarketSettlementLines: async (token: string, marketID: number) =>
    (await requestParsed(
      settlementLinesResponseSchema,
      `/api/v1/seller/markets/${marketID}/settlement-lines`,
      { token },
    )).items.map(normalizeSettlementLine),
  getSettlementAccount: async (token: string, marketID: number) =>
    normalizeSettlementAccount(await requestParsed(
      rawSettlementAccountSchema,
      `/api/v1/seller/markets/${marketID}/settlement-account`,
      { token },
    )),
  upsertSettlementAccount: (token: string, marketID: number, payload: SettlementAccountInput) =>
    requestVoid(`/api/v1/seller/markets/${marketID}/settlement-account`, {
      method: "PUT",
      token,
      body: JSON.stringify(encodeSettlementAccount(payload)),
    }),
};
