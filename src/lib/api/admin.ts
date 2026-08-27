import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";
import type { CMSCarousel, CMSHomeSection } from "../types";
import {
  carouselSchema,
  categorySchema,
  eventSchema,
  homeSectionSchema,
  recommendationSchema,
  statusResponseSchema,
  trackingInfoSchema,
} from "./contracts/schemas";
import {
  adminDashboardRawSchema,
  rawAdminCouponSchema,
  rawAuditLogSchema,
  rawNotificationSchema,
  rawSettlementSchema,
} from "./contracts/raw";
import {
  normalizeAdminDashboard,
  normalizeAdminCoupon,
  normalizeAuditLog,
  normalizeNotification,
  normalizeSettlement,
} from "./normalizers/contracts";
import { collectAllUniquePages } from "./pagination";

const impersonationSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_at: z.string(),
  market_id: z.number().int().positive(),
  market_name: z.string(),
  issued_for: z.string(),
});
const dailyAccrualSchema = z.object({
  accrued_lines: z.number().int().nonnegative(),
  updated_settlements: z.number().int().nonnegative(),
});
const paidCountSchema = z.object({ paid_count: z.number().int().nonnegative() });
const settlementActionLogsSchema = z.object({ items: z.array(rawAuditLogSchema) });

export const adminApi = {
  adminDashboard: async (token: string) =>
    normalizeAdminDashboard(await requestParsed(adminDashboardRawSchema, "/api/v1/admin/dashboard", { token })),
  adminOrderActionLogs: async (token: string) =>
    (await collectAllUniquePages(
      (limit, offset) => requestParsed(
        z.array(rawAuditLogSchema),
        `/api/v1/admin/orders/action-logs?limit=${limit}&offset=${offset}`,
        { token },
      ),
      (log) => log.ID,
    ))
      .map(normalizeAuditLog),
  adminSettlementActionLogs: async (token: string) =>
    (await collectAllUniquePages(
      async (limit, offset) => (await requestParsed(
        settlementActionLogsSchema,
        `/api/v1/admin/settlements/action-logs?limit=${limit}&offset=${offset}`,
        { token },
      )).items,
      (log) => log.ID,
    ))
      .map(normalizeAuditLog),
  adminCoupons: async (token: string, memberID?: number | null) =>
    (await requestParsed(
      z.array(rawAdminCouponSchema),
      `/api/v1/admin/coupons${memberID ? `?member_id=${memberID}` : ""}`,
      { token },
    )).map(normalizeAdminCoupon),
  adminAuditLogs: async (token: string) =>
    (await collectAllUniquePages(
      (limit, offset) => requestParsed(
        z.array(rawAuditLogSchema),
        `/api/v1/admin/audit-logs?limit=${limit}&offset=${offset}`,
        { token },
      ),
      (log) => log.ID,
    ))
      .map(normalizeAuditLog),
  adminCarousels: (token: string) => requestParsed(z.array(carouselSchema), "/api/v1/admin/carousels", { token }),
  adminEvents: (token: string) =>
    requestParsed(z.array(eventSchema), "/api/v1/admin/events", { token }),
  adminCategories: (token: string) =>
    requestParsed(z.array(categorySchema), "/api/v1/admin/categories", { token }),
  createCategory: (
    token: string,
    payload: { parent_id?: number | null; name: string; slug?: string; display_order: number },
  ) =>
    requestParsed(categorySchema, "/api/v1/admin/categories", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateCategory: (
    token: string,
    categoryID: number,
    payload: { parent_id?: number | null; name: string; slug?: string; display_order: number },
  ) =>
    requestParsed(categorySchema, `/api/v1/admin/categories/${categoryID}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  deleteCategory: (token: string, categoryID: number) =>
    requestVoid(`/api/v1/admin/categories/${categoryID}`, { method: "DELETE", token }),
  reorderCategories: (token: string, items: { id: number; display_order: number }[]) =>
    requestParsed(z.array(categorySchema), "/api/v1/admin/categories/reorder", {
      method: "POST",
      token,
      body: JSON.stringify({ items }),
    }),
  adminHomeSections: (token: string) =>
    requestParsed(z.array(homeSectionSchema), "/api/v1/admin/home-sections", { token }),
  createHomeSection: (token: string, payload: Partial<CMSHomeSection>) =>
    requestParsed(homeSectionSchema, "/api/v1/admin/home-sections", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateHomeSection: (token: string, sectionID: number, payload: Partial<CMSHomeSection>) =>
    requestParsed(homeSectionSchema, `/api/v1/admin/home-sections/${sectionID}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    }),
  deleteHomeSection: (token: string, sectionID: number) =>
    requestVoid(`/api/v1/admin/home-sections/${sectionID}`, { method: "DELETE", token }),
  reorderHomeSections: (token: string, items: { id: number; sequence: number }[]) =>
    requestParsed(z.array(homeSectionSchema), "/api/v1/admin/home-sections/reorder", {
      method: "POST",
      token,
      body: JSON.stringify({ items }),
    }),
  createCarousel: (token: string, payload: Partial<CMSCarousel>) =>
    requestVoid("/api/v1/carousels", { method: "POST", token, body: JSON.stringify(payload) }),
  createSellerImpersonationToken: (token: string, marketID: number) =>
    requestParsed(impersonationSchema, `/api/v1/admin/markets/${marketID}/impersonation-token`, { method: "POST", token }),
  accrueDailySettlements: (token: string) =>
    requestParsed(dailyAccrualSchema, "/api/v1/admin/settlements/accrue-daily", { method: "POST", token }),
  payDueSettlements: (token: string) =>
    requestParsed(paidCountSchema, "/api/v1/admin/settlements/pay-due", { method: "POST", token }),
  confirmSettlement: (token: string, settlementID: number) =>
    requestVoid(`/api/v1/admin/settlements/${settlementID}/confirm`, { method: "POST", token }),
  paySettlement: async (token: string, settlementID: number) =>
    normalizeSettlement(await requestParsed(
      rawSettlementSchema,
      `/api/v1/admin/settlements/${settlementID}/pay`,
      { method: "POST", token },
    )),
  issueCouponToMember: (token: string, couponID: number, memberID: number) =>
    requestParsed(
      z.object({ status: z.string(), coupon_id: z.number().int().positive(), member_id: z.number().int().positive() }),
      `/api/v1/admin/coupons/${couponID}/issue`,
      { method: "POST", token, body: JSON.stringify({ member_id: memberID }) },
    ),
  updateCarousel: (token: string, carouselID: number, payload: Partial<CMSCarousel>) =>
    requestParsed(carouselSchema, `/api/v1/carousels/${carouselID}`, { method: "PUT", token, body: JSON.stringify(payload) }),
  deactivateCarousel: (token: string, carouselID: number) =>
    requestVoid(`/api/v1/carousels/${carouselID}`, { method: "DELETE", token }),
  refreshDeliveryTracking: (token: string, deliveryID: number) =>
    requestParsed(trackingInfoSchema, `/api/v1/deliveries/${deliveryID}/refresh-tracking`, { method: "POST", token }),
  getUserNotifications: (token: string, userID: number) =>
    requestParsed(z.array(rawNotificationSchema), `/api/v1/users/${userID}/notifications`, { token })
      .then((notifications) => notifications.map(normalizeNotification)),
  getUserRecommendations: (token: string, userID: number) =>
    requestParsed(z.array(recommendationSchema), `/api/v1/users/${userID}/recommendations`, { token }),
  adminMutation: (token: string, path: string, payload: Record<string, unknown>) =>
    requestParsed(statusResponseSchema, path, { method: "POST", token, body: JSON.stringify(payload) }),
};
