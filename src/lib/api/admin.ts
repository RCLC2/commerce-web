import { request } from "../api-client";
import type { AdminDashboard, AuditLog, CMSCarousel, Coupon, Market, MemberProfile, OrderResponse, Product, Settlement } from "../types";

export const adminApi = {
  adminDashboard: (token: string) => request<AdminDashboard>("/api/v1/admin/dashboard", { token }),
  adminMembers: (token: string) => request<MemberProfile[]>("/api/v1/admin/members", { token }),
  adminMarkets: (token: string) => request<Market[]>("/api/v1/admin/markets", { token }),
  adminProducts: (token: string) => request<Product[]>("/api/v1/admin/products", { token }),
  adminOrders: (token: string) => request<OrderResponse[]>("/api/v1/admin/orders", { token }),
  adminSettlements: (token: string) => request<Settlement[]>("/api/v1/admin/settlements", { token }),
  adminCoupons: (token: string) => request<Coupon[]>("/api/v1/admin/coupons", { token }),
  adminAuditLogs: (token: string) => request<AuditLog[]>("/api/v1/admin/audit-logs", { token }),
  adminCarousels: (token: string) => request<CMSCarousel[]>("/api/v1/admin/carousels", { token }),
  adminMutation: (token: string, path: string, payload: { reason: string; [key: string]: unknown }) =>
    request<{ status: string }>(path, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
};
