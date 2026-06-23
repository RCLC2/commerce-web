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
  createCarousel: (token: string, payload: Partial<CMSCarousel>) =>
    request<CMSCarousel>("/api/v1/carousels", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  createSellerImpersonationToken: (token: string, marketID: number) =>
    request<{ access_token: string; token_type: string; expires_at: string; market_id: number; market_name: string; issued_for: string }>(`/api/v1/admin/markets/${marketID}/impersonation-token`, { method: "POST", token }),
  approveSeller: (token: string, memberID: number) =>
    request<void>(`/api/v1/admin/members/${memberID}/approve-seller`, { method: "POST", token }),
  rejectSeller: (token: string, memberID: number) =>
    request<void>(`/api/v1/admin/members/${memberID}/reject-seller`, { method: "POST", token }),
  forceCancelOrder: (token: string, orderCode: string, payload: { reason: string }) =>
    request<{ status: string }>(`/api/v1/admin/orders/${orderCode}/force-cancel`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  markSettlementPaid: (token: string, settlementID: number, payload: { reason: string }) =>
    request<{ status: string }>(`/api/v1/admin/settlements/${settlementID}/mark-paid`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  issueCouponToMember: (token: string, couponID: number, memberID: number) =>
    request<{ status: string; coupon_id: number; member_id: number }>(`/api/v1/admin/coupons/${couponID}/issue`, {
      method: "POST",
      token,
      body: JSON.stringify({ member_id: memberID }),
    }),
  updateCarousel: (token: string, carouselID: number, payload: Partial<CMSCarousel>) =>
    request<CMSCarousel>(`/api/v1/carousels/${carouselID}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  deactivateCarousel: (token: string, carouselID: number) =>
    request<void>(`/api/v1/carousels/${carouselID}`, { method: "DELETE", token }),
  adminMutation: (token: string, path: string, payload: { reason: string; [key: string]: unknown }) =>
    request<{ status: string }>(path, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
};
