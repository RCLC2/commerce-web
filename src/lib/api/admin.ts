import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";
import type { CMSCarousel, CMSHomeSection, Market } from "../types";
import {
  adminCouponSchema,
  carouselSchema,
  categorySchema,
  eventSchema,
  homeSectionSchema,
  marketSchema,
  notificationSchema,
  orderSchema,
  productSchema,
  recommendationSchema,
  statusResponseSchema,
  trackingInfoSchema,
} from "./contracts/schemas";
import {
  adminDashboardRawSchema,
  rawAdminMemberSchema,
  rawAuditLogSchema,
  rawSettlementSchema,
} from "./contracts/raw";
import {
  normalizeAdminDashboard,
  normalizeAdminMember,
  normalizeAuditLog,
  normalizeCouponDefinition,
  normalizeSettlement,
} from "./normalizers/contracts";

const penaltySchema = z.object({
  id: z.number().int().positive(),
  market_id: z.number().int().positive(),
  score: z.number().int(),
  reason: z.string(),
  created_at: z.string(),
});
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

export const adminApi = {
  adminDashboard: async (token: string) =>
    normalizeAdminDashboard(await requestParsed(adminDashboardRawSchema, "/api/v1/admin/dashboard", { token })),
  adminMembers: async (token: string) =>
    (await requestParsed(z.array(rawAdminMemberSchema), "/api/v1/admin/members", { token }))
      .map(normalizeAdminMember),
  adminMember: async (token: string, memberID: number) =>
    normalizeAdminMember(await requestParsed(rawAdminMemberSchema, `/api/v1/admin/members/${memberID}`, { token })),
  updateMemberStatus: (token: string, memberID: number, payload: { status: string }) =>
    requestVoid(`/api/v1/admin/members/${memberID}/status`, { method: "POST", token, body: JSON.stringify(payload) }),
  updateMemberRole: (token: string, memberID: number, payload: { role: string }) =>
    requestVoid(`/api/v1/admin/members/${memberID}/role`, { method: "POST", token, body: JSON.stringify(payload) }),
  adminMarkets: (token: string) => requestParsed(z.array(marketSchema), "/api/v1/admin/markets", { token }),
  adminMarket: (token: string, marketID: number) => requestParsed(marketSchema, `/api/v1/admin/markets/${marketID}`, { token }),
  adminMarketPenalties: (token: string, marketID: number) =>
    requestParsed(z.array(penaltySchema), `/api/v1/admin/markets/${marketID}/penalties`, { token }),
  adminProducts: (token: string) => requestParsed(z.array(productSchema), "/api/v1/admin/products", { token }),
  adminOrders: (token: string) => requestParsed(z.array(orderSchema), "/api/v1/admin/orders", { token }),
  adminOrder: (token: string, orderCode: string) => requestParsed(orderSchema, `/api/v1/admin/orders/${orderCode}`, { token }),
  adminOrderActionLogs: async (token: string) =>
    (await requestParsed(z.array(rawAuditLogSchema), "/api/v1/admin/orders/action-logs", { token }))
      .map(normalizeAuditLog),
  adminSettlements: async (token: string) =>
    (await requestParsed(z.array(rawSettlementSchema), "/api/v1/admin/settlements", { token }))
      .map(normalizeSettlement),
  adminSettlementActionLogs: async (token: string) =>
    (await requestParsed(z.array(rawAuditLogSchema), "/api/v1/admin/settlements/action-logs", { token }))
      .map(normalizeAuditLog),
  adminCoupons: async (token: string, memberID?: number | null) =>
    (await requestParsed(
      z.array(adminCouponSchema),
      `/api/v1/admin/coupons${memberID ? `?member_id=${memberID}` : ""}`,
      { token },
    )).map((coupon) => ({ ...normalizeCouponDefinition(coupon), ...coupon })),
  adminAuditLogs: async (token: string) =>
    (await requestParsed(z.array(rawAuditLogSchema), "/api/v1/admin/audit-logs", { token }))
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
  approveSeller: (token: string, memberID: number) =>
    requestVoid(`/api/v1/admin/members/${memberID}/approve-seller`, { method: "POST", token }),
  rejectSeller: (token: string, memberID: number) =>
    requestVoid(`/api/v1/admin/members/${memberID}/reject-seller`, { method: "POST", token }),
  cancelOrder: (token: string, orderCode: string) =>
    requestParsed(statusResponseSchema, `/api/v1/admin/orders/${orderCode}/cancel`, { method: "POST", token }),
  forceCancelOrder: (token: string, orderCode: string) =>
    requestParsed(statusResponseSchema, `/api/v1/admin/orders/${orderCode}/force-cancel`, { method: "POST", token }),
  markSettlementPaid: (token: string, settlementID: number) =>
    requestParsed(statusResponseSchema, `/api/v1/admin/settlements/${settlementID}/mark-paid`, { method: "POST", token }),
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
  startDelivery: (token: string, deliveryID: number, payload: { carrier: string; tracking_number: string }) =>
    requestVoid(`/api/v1/deliveries/${deliveryID}/start`, { method: "POST", token, body: JSON.stringify(payload) }),
  completeDelivery: (token: string, deliveryID: number) =>
    requestVoid(`/api/v1/deliveries/${deliveryID}/complete`, { method: "POST", token }),
  refreshDeliveryTracking: (token: string, deliveryID: number) =>
    requestParsed(trackingInfoSchema, `/api/v1/deliveries/${deliveryID}/refresh-tracking`, { method: "POST", token }),
  getUserNotifications: (token: string, userID: number) =>
    requestParsed(z.array(notificationSchema), `/api/v1/users/${userID}/notifications`, { token }),
  getUserRecommendations: (token: string, userID: number) =>
    requestParsed(z.array(recommendationSchema), `/api/v1/users/${userID}/recommendations`, { token }),
  createMarket: (token: string, payload: Partial<Market>) =>
    requestVoid("/api/v1/markets", { method: "POST", token, body: JSON.stringify(payload) }),
  changeMarketStatus: (token: string, marketID: number, payload: { status: string }) =>
    requestVoid(`/api/v1/markets/${marketID}/status`, { method: "POST", token, body: JSON.stringify(payload) }),
  adminMutation: (token: string, path: string, payload: Record<string, unknown>) =>
    requestParsed(statusResponseSchema, path, { method: "POST", token, body: JSON.stringify(payload) }),
};
