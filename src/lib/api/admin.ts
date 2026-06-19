import { request } from "../api-client";
import type { AdminDashboard, AuditLog, CMSCarousel, CMSCarouselMutation, Coupon, Market, MemberProfile, OrderResponse, Product, Settlement } from "../types";

export const adminApi = {
  adminDashboard: (token: string) => request<AdminDashboard>("/api/v1/admin/dashboard", { token }),
  adminMembers: (token: string) => request<unknown[]>("/api/v1/admin/members", { token }).then((items) => items.map(normalizeMember)),
  adminMarkets: (token: string) => request<Market[]>("/api/v1/admin/markets", { token }),
  adminProducts: (token: string) => request<Product[]>("/api/v1/admin/products", { token }),
  adminOrders: (token: string) => request<OrderResponse[]>("/api/v1/admin/orders", { token }),
  adminSettlements: (token: string) => request<Settlement[]>("/api/v1/admin/settlements", { token }),
  adminCoupons: (token: string) => request<Coupon[]>("/api/v1/admin/coupons", { token }),
  adminAuditLogs: (token: string) => request<AuditLog[]>("/api/v1/admin/audit-logs", { token }),
  adminCarousels: (token: string) => request<unknown[]>("/api/v1/admin/carousels", { token }).then((items) => items.map(normalizeCarousel)),
  createCarousel: (token: string, payload: CMSCarouselMutation) =>
    request<unknown>("/api/v1/carousels", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }).then(normalizeCarousel),
  updateCarousel: (token: string, carouselID: number, payload: CMSCarouselMutation) =>
    request<unknown>(`/api/v1/carousels/${carouselID}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }).then(normalizeCarousel),
  deactivateCarousel: (token: string, carouselID: number) =>
    request<void>(`/api/v1/carousels/${carouselID}`, {
      method: "DELETE",
      token,
    }),
  adminMutation: (token: string, path: string, payload: { reason: string; [key: string]: unknown }) =>
    request<{ status: string }>(path, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  approveSeller: (token: string, memberID: number) =>
    request<{ status: string }>(`/api/v1/admin/members/${memberID}/approve-seller`, {
      method: "POST",
      token,
    }),
  rejectSeller: (token: string, memberID: number) =>
    request<{ status: string }>(`/api/v1/admin/members/${memberID}/reject-seller`, {
      method: "POST",
      token,
    }),
  cancelAdminOrder: (token: string, orderCode: string, reason: string) =>
    request<{ order_code?: string; status: string }>(`/api/v1/admin/orders/${orderCode}/cancel`, {
      method: "POST",
      token,
      body: JSON.stringify({ reason }),
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

function normalizeCarousel(raw: unknown): CMSCarousel {
  const record = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
  const startsAt = nullableString(record.starts_at ?? record.StartsAt);
  const endsAt = nullableString(record.ends_at ?? record.EndsAt);
  return {
    id: numberValue(record.id ?? record.ID),
    title: stringValue(record.title ?? record.Title),
    image_url: nullableString(record.image_url ?? record.ImageURL),
    target_type: stringValue(record.target_type ?? record.TargetType, "PRODUCT"),
    target_id: numberValue(record.target_id ?? record.TargetID),
    display_order: numberValue(record.display_order ?? record.DisplayOrder),
    is_active: booleanValue(record.is_active ?? record.IsActive, true),
    starts_at: startsAt,
    ends_at: endsAt,
  };
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}
