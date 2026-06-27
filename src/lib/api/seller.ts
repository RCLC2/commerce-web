import { request } from "../api-client";
import type { Delivery, DeliveryCarriersResponse, ExternalInventoryMapping, InventorySource, InventorySourceForm, InventorySyncLog, OrderResponse, Product, Review, SameDayDispatchAvailability, SellerContext, SellerDashboard, Settlement, SettlementAccount, SettlementLine } from "../types";

function marketQuery(marketID?: number | null) {
  return marketID ? `?market_id=${marketID}` : "";
}

export const sellerApi = {
  sellerContext: (token: string, marketID?: number | null) => request<SellerContext>(`/api/v1/seller/context${marketQuery(marketID)}`, { token }),
  sellerDashboard: (token: string, marketID?: number | null) => request<SellerDashboard>(`/api/v1/seller/dashboard${marketQuery(marketID)}`, { token }),
  sellerProducts: (token: string, marketID?: number | null) => request<Product[]>(`/api/v1/seller/products${marketQuery(marketID)}`, { token }),
  sellerInventorySources: (token: string, marketID?: number | null) => request<InventorySource[]>(`/api/v1/seller/inventory/sources${marketQuery(marketID)}`, { token }),
  sellerInventoryLogs: (token: string, marketID?: number | null) => request<InventorySyncLog[]>(`/api/v1/seller/inventory/sync-logs${marketQuery(marketID)}`, { token }),
  sellerOrders: (token: string, marketID?: number | null) => request<OrderResponse[]>(`/api/v1/seller/orders${marketQuery(marketID)}`, { token }),
  sellerSettlements: (token: string, marketID?: number | null) => request<Settlement[]>(`/api/v1/seller/settlements${marketQuery(marketID)}`, { token }),
  sellerReviews: (token: string, marketID?: number | null) => request<Review[]>(`/api/v1/seller/reviews${marketQuery(marketID)}`, { token }),
  updateSellerProduct: (token: string, product: Product) =>
    request<void>(`/api/v1/products/${product.id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(product),
    }),
  createSellerProduct: (token: string, product: Product) =>
    request<void>("/api/v1/products", {
      method: "POST",
      token,
      body: JSON.stringify(product),
    }),
  registerInventorySource: (token: string, payload: InventorySourceForm) =>
    request<InventorySource>("/api/v1/fulfillment/sources", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  getInventorySource: (token: string, sourceID: number) => request<InventorySource>(`/api/v1/fulfillment/sources/${sourceID}`, { token }),
  deactivateInventorySource: (token: string, sourceID: number) =>
    request<void>(`/api/v1/fulfillment/sources/${sourceID}`, { method: "DELETE", token }),
  replaceInventorySourceTokens: (token: string, sourceID: number, payload: { access_token?: string; refresh_token?: string; client_secret?: string; webhook_secret?: string }) =>
    request<void>(`/api/v1/fulfillment/sources/${sourceID}/tokens`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),
  registerSuppliedProductOption: (token: string, payload: { inventory_source_id: number; product_option_id: number; external_product_id?: string; external_variant_id?: string; external_inventory_item_id?: string; external_location_id?: string }) =>
    request<{ status: string }>("/api/v1/fulfillment/supplied-product-options", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  upsertInventoryLocation: (token: string, payload: { market_id: number; provider: string; external_location_id: string; name?: string; priority?: number }) =>
    request<{ status: string }>("/api/v1/fulfillment/locations", {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  adjustInventory: (token: string, payload: { product_option_id: number; quantity_delta: number; reason?: string }) =>
    request<{ quantity: number }>("/api/v1/fulfillment/inventory/adjust", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  registerInventoryMapping: (token: string, payload: { inventory_source_id: number; provider?: string; product_option_id: number; external_product_id?: string; external_variant_id?: string; external_inventory_item_id?: string; external_location_id?: string; disconnect_if_necessary?: boolean }) =>
    request<ExternalInventoryMapping>("/api/v1/fulfillment/mappings", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  pullInventoryOptionStock: (token: string, optionID: number) =>
    request<{ quantity: number }>(`/api/v1/fulfillment/options/${optionID}/pull`, { method: "POST", token }),
  pushInventoryOptionStock: (token: string, optionID: number, quantity: number) =>
    request<void>(`/api/v1/fulfillment/options/${optionID}/push`, {
      method: "POST",
      token,
      body: JSON.stringify({ quantity }),
    }),
  getSameDayDispatchAvailability: (token: string, optionID: number) =>
    request<SameDayDispatchAvailability>(`/api/v1/fulfillment/options/${optionID}/same-day-dispatch`, { token }),
  syncOutboundOrder: (token: string, orderCode: string, payload: { market_id?: number; provider?: string }) =>
    request<{ status: string }>(`/api/v1/fulfillment/orders/${orderCode}/outbound`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  syncOutboundOrderStatus: (token: string, orderCode: string, payload: { market_id?: number; provider?: string }) =>
    request<{ status: string }>(`/api/v1/fulfillment/orders/${orderCode}/outbound-status`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  retryInventorySyncLog: (token: string, logID: number) =>
    request<{ status: string }>(`/api/v1/fulfillment/sync-logs/${logID}/retry`, { method: "POST", token }),
  deliveryCarriers: (token: string) => request<DeliveryCarriersResponse>("/api/v1/deliveries/carriers", { token }),
  getDeliveryByOrder: (token: string, orderID: number) => request<Delivery>(`/api/v1/deliveries/by-order/${orderID}`, { token }),
  getDelivery: (token: string, deliveryID: number) => request<Delivery>(`/api/v1/deliveries/${deliveryID}`, { token }),
  registerSellerInvoices: (token: string, payload: { market_id: number; invoices: Array<{ order_id: number; carrier: string; invoice_number: string; is_fake_invoice?: boolean }> }) =>
    request<void>("/api/v1/seller/deliveries/invoices", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  startSellerDelivery: (token: string, marketID: number, deliveryID: number, payload: { carrier: string; tracking_number: string }) =>
    request<void>(`/api/v1/seller/markets/${marketID}/deliveries/${deliveryID}/start`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  completeSellerDelivery: (token: string, marketID: number, deliveryID: number) =>
    request<void>(`/api/v1/seller/markets/${marketID}/deliveries/${deliveryID}/complete`, { method: "POST", token }),
  sellerMarketOrders: (token: string, marketID: number) => request<OrderResponse[]>(`/api/v1/seller/markets/${marketID}/orders`, { token }),
  sellerMarketOrder: (token: string, marketID: number, orderCode: string) => request<OrderResponse>(`/api/v1/seller/markets/${marketID}/orders/${orderCode}`, { token }),
  sellerMarketSettlements: (token: string, marketID: number) => request<Settlement[]>(`/api/v1/seller/markets/${marketID}/settlements`, { token }),
  sellerMarketSettlementLines: (token: string, marketID: number) => request<SettlementLine[]>(`/api/v1/seller/markets/${marketID}/settlement-lines`, { token }),
  getSettlementAccount: (token: string, marketID: number) => request<SettlementAccount>(`/api/v1/seller/markets/${marketID}/settlement-account`, { token }),
  upsertSettlementAccount: (token: string, marketID: number, payload: SettlementAccount) =>
    request<SettlementAccount>(`/api/v1/seller/markets/${marketID}/settlement-account`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
};
