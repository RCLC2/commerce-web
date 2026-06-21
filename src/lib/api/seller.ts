import { request } from "../api-client";
import type { InventorySource, InventorySyncLog, OrderResponse, Product, Review, SellerDashboard, Settlement } from "../types";

export const sellerApi = {
  sellerDashboard: (token: string) => request<SellerDashboard>("/api/v1/seller/dashboard", { token }),
  sellerProducts: (token: string) => request<Product[]>("/api/v1/seller/products", { token }),
  sellerInventorySources: (token: string) => request<InventorySource[]>("/api/v1/seller/inventory/sources", { token }),
  sellerInventoryLogs: (token: string) => request<InventorySyncLog[]>("/api/v1/seller/inventory/sync-logs", { token }),
  sellerOrders: (token: string) => request<OrderResponse[]>("/api/v1/seller/orders", { token }),
  sellerSettlements: (token: string) => request<Settlement[]>("/api/v1/seller/settlements", { token }),
  sellerReviews: (token: string) => request<Review[]>("/api/v1/seller/reviews", { token }),
  registerInventorySource: (token: string, payload: { market_id: number; provider: string; display_name: string }) =>
    request<InventorySource>("/api/v1/fulfillment/sources", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
};
