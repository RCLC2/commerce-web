import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";
import type { CMSCarousel, CMSHomeSection } from "../types";
import {
  carouselSchema,
  categorySchema,
  homeSectionSchema,
} from "./contracts/schemas";
import {
  adminDashboardRawSchema,
  rawAdminCouponSchema,
} from "./contracts/raw";
import {
  normalizeAdminDashboard,
  normalizeAdminCoupon,
} from "./normalizers/contracts";

const impersonationSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_at: z.string(),
  market_id: z.number().int().positive(),
  market_name: z.string(),
  issued_for: z.string(),
});
const notificationCampaignSchema = z.object({
  id: z.number().int().positive(), created_by_member_id: z.number().int().positive(), target_type: z.enum(["MEMBER", "SEGMENT"]), target_member_id: z.number().int().positive().nullable().optional(), segment_key: z.string().nullable().optional(), message_id: z.number().int().positive(), status: z.string(), candidate_count: z.number().int().nonnegative(), delivered_count: z.number().int().nonnegative(), excluded_count: z.number().int().nonnegative(), failed_count: z.number().int().nonnegative(), last_error: z.string().optional(), workflow_id: z.string().optional(), created_at: z.string(), started_at: z.string().nullable().optional(), completed_at: z.string().nullable().optional(),
});
const notificationDeliverySchema = z.object({ id: z.number().int().positive(), notification_segment_id: z.number().int().positive(), member_id: z.number().int().positive(), inbox_id: z.number().int().positive().nullable().optional(), status: z.string(), failure_code: z.string().optional(), failure_detail: z.string().optional(), attempt_count: z.number().int().nonnegative(), created_at: z.string(), delivered_at: z.string().nullable().optional(), failed_at: z.string().nullable().optional() });

export const adminApi = {

  notificationCampaigns: (token: string) => requestParsed(z.object({ items: z.array(notificationCampaignSchema) }), "/api/v1/admin/notification-campaigns?limit=50", { token }),
  notificationCampaignDeliveries: (token: string, campaignID: number) => requestParsed(z.object({ items: z.array(notificationDeliverySchema) }), `/api/v1/admin/notification-campaigns/${campaignID}/deliveries?limit=100`, { token }),
  createNotificationCampaign: (token: string, payload: { target_type: "MEMBER" | "SEGMENT"; target_member_id?: number; segment_key?: string; kind: "INFORMATION" | "MARKETING"; title: string; body: string; destination_path: string; toast_enabled: boolean; toast_expires_at?: string }) => requestParsed(notificationCampaignSchema, "/api/v1/admin/notification-campaigns", { method: "POST", token, body: JSON.stringify(payload) }),
  adminDashboard: async (token: string) =>
    normalizeAdminDashboard(await requestParsed(adminDashboardRawSchema, "/api/v1/admin/dashboard", { token })),
  adminCoupons: async (token: string, memberID?: number | null) =>
    (await requestParsed(
      z.array(rawAdminCouponSchema),
      `/api/v1/admin/coupons${memberID ? `?member_id=${memberID}` : ""}`,
      { token },
    )).map(normalizeAdminCoupon),
  adminCarousels: (token: string) => requestParsed(z.array(carouselSchema), "/api/v1/admin/carousels", { token }),
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
};
