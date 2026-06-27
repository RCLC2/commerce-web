import { request } from "../api-client";
import type { AdminDashboard, AuditLog, CMSCarousel, Coupon, Market, MemberProfile, Notification, OrderResponse, Product, Recommendation, Settlement, TrackingInfo } from "../types";

export const adminApi = {
  adminDashboard: (token: string) => request<AdminDashboard>("/api/v1/admin/dashboard", { token }),
  adminMembers: (token: string) => request<unknown[]>("/api/v1/admin/members", { token }).then((items) => items.map(normalizeMember)),
  adminMember: (token: string, memberID: number) => request<unknown>(`/api/v1/admin/members/${memberID}`, { token }).then(normalizeMember),
  updateMemberStatus: (token: string, memberID: number, payload: { status: string; reason?: string }) =>
    request<{ status: string }>(`/api/v1/admin/members/${memberID}/status`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateMemberRole: (token: string, memberID: number, payload: { role: string; reason?: string }) =>
    request<{ status: string }>(`/api/v1/admin/members/${memberID}/role`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  adminMarkets: (token: string) => request<Market[]>("/api/v1/admin/markets", { token }),
  adminMarket: (token: string, marketID: number) => request<Market>(`/api/v1/admin/markets/${marketID}`, { token }),
  adminProducts: (token: string) => request<Product[]>("/api/v1/admin/products", { token }),
  adminOrders: (token: string) => request<OrderResponse[]>("/api/v1/admin/orders", { token }),
  adminOrder: (token: string, orderCode: string) => request<OrderResponse>(`/api/v1/admin/orders/${orderCode}`, { token }),
  adminOrderActionLogs: (token: string) => request<AuditLog[]>("/api/v1/admin/orders/action-logs", { token }),
  adminSettlements: (token: string) => request<Settlement[]>("/api/v1/admin/settlements", { token }),
  adminSettlementActionLogs: (token: string) => request<AuditLog[]>("/api/v1/admin/settlements/action-logs", { token }),
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
  cancelOrder: (token: string, orderCode: string, payload: { reason: string }) =>
    request<{ status: string }>(`/api/v1/admin/orders/${orderCode}/cancel`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
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
  accrueDailySettlements: (token: string) => request<{ status: string }>("/api/v1/admin/settlements/accrue-daily", { method: "POST", token }),
  payDueSettlements: (token: string) => request<{ status: string }>("/api/v1/admin/settlements/pay-due", { method: "POST", token }),
  confirmSettlement: (token: string, settlementID: number, payload: { reason?: string }) =>
    request<{ status: string }>(`/api/v1/admin/settlements/${settlementID}/confirm`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  paySettlement: (token: string, settlementID: number, payload: { reason?: string }) =>
    request<{ status: string }>(`/api/v1/admin/settlements/${settlementID}/pay`, {
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
  startDelivery: (token: string, deliveryID: number, payload: { carrier: string; tracking_number: string }) =>
    request<void>(`/api/v1/deliveries/${deliveryID}/start`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  completeDelivery: (token: string, deliveryID: number) =>
    request<void>(`/api/v1/deliveries/${deliveryID}/complete`, { method: "POST", token }),
  refreshDeliveryTracking: (token: string, deliveryID: number) =>
    request<TrackingInfo>(`/api/v1/deliveries/${deliveryID}/refresh-tracking`, { method: "POST", token }),
  getUserNotifications: (token: string, userID: number) => request<Notification[]>(`/api/v1/users/${userID}/notifications`, { token }),
  getUserRecommendations: (token: string, userID: number) => request<Recommendation[]>(`/api/v1/users/${userID}/recommendations`, { token }),
  createMarket: (token: string, payload: Partial<Market>) =>
    request<Market>("/api/v1/markets", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  changeMarketStatus: (token: string, marketID: number, payload: { status: string; reason?: string }) =>
    request<{ status: string }>(`/api/v1/markets/${marketID}/status`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  adminMutation: (token: string, path: string, payload: { reason: string; [key: string]: unknown }) =>
    request<{ status: string }>(path, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
};

function normalizeMember(raw: unknown): MemberProfile {
  const record = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
  return {
    id: numberValue(record.id ?? record.ID),
    user_name: stringValue(record.user_name ?? record.UserName ?? record.Email),
    email: stringValue(record.email ?? record.Email),
    role: stringValue(record.role ?? record.type ?? record.Role ?? record.Type, "MEMBER"),
    status: stringValue(record.status ?? record.Status, "ACTIVE"),
    notification_type: stringValue(record.notification_type ?? record.NotificationType, "PUSH"),
    marketing_consent: Boolean(record.marketing_consent ?? record.MarketingConsent),
    nighttime_consent: Boolean(record.nighttime_consent ?? record.NighttimeConsent),
    point_balance: numberValue(record.point_balance ?? record.PointBalance),
    created_at: stringValue(record.created_at ?? record.CreatedAt, new Date().toISOString()),
  };
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
