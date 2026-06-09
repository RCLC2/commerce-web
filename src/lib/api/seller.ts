import { request } from "../api-client";
import type { InventorySource, InventorySyncLog, OrderResponse, Product, Review, SellerDashboard, Settlement } from "../types";

export const sellerApi = {
  sellerDashboard: (token: string) => request<SellerDashboard>("/api/v1/seller/dashboard", { token }),
  sellerProducts: (token: string) => request<Product[]>("/api/v1/seller/products", { token }),
  sellerInventorySources: (token: string, marketID?: number) =>
    request<InventorySource[]>(`/api/v1/inventory/sources${marketID ? `?market_id=${marketID}` : ""}`, { token }),
  sellerInventoryLogs: (token: string, params?: { productOptionID?: number; status?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.productOptionID) {
      search.set("product_option_id", String(params.productOptionID));
    }
    if (params?.status && params.status !== "ALL") {
      search.set("status", params.status);
    }
    if (params?.limit) {
      search.set("limit", String(params.limit));
    }
    const query = search.toString();
    return request<InventorySyncLog[]>(`/api/v1/inventory/sync-logs${query ? `?${query}` : ""}`, { token });
  },
  sellerOrders: (token: string, marketID?: number) =>
    request<OrderResponse[]>(marketID ? `/api/v1/seller/markets/${marketID}/orders` : "/api/v1/seller/orders", { token }),
  sellerSettlements: (token: string) => request<Settlement[]>("/api/v1/seller/settlements", { token }),
  sellerReviews: (token: string) => request<Review[]>("/api/v1/seller/reviews", { token }),
  registerInventorySource: (token: string, payload: { market_id?: number; provider: string; display_name: string; shop_name?: string }) =>
    request<InventorySource>("/api/v1/inventory/sources", {
      method: "POST",
      token,
      body: JSON.stringify({
        market_id: payload.market_id,
        provider: payload.provider,
        name: payload.display_name,
        display_name: payload.display_name,
        shop_name: payload.shop_name,
      }),
    }),
  replaceInventorySourceTokens: (
    token: string,
    sourceID: number,
    payload: { access_token?: string; refresh_token?: string; client_secret?: string; webhook_secret?: string },
  ) =>
    request<void>(`/api/v1/inventory/sources/${sourceID}/tokens`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),
  pullOptionStock: (token: string, optionID: number) =>
    request<{ quantity: number }>(`/api/v1/inventory/options/${optionID}/pull`, {
      method: "POST",
      token,
    }),
  retryInventorySyncLog: (token: string, logID: number) =>
    request<void>(`/api/v1/inventory/sync-logs/${logID}/retry`, {
      method: "POST",
      token,
    }),
  registerSellerInvoices: (
    token: string,
    payload: { market_id: number; invoices: { order_id: number; carrier: string; invoice_number: string; is_fake_invoice?: boolean }[] },
  ) =>
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
    request<void>(`/api/v1/seller/markets/${marketID}/deliveries/${deliveryID}/complete`, {
      method: "POST",
      token,
    }),
};
