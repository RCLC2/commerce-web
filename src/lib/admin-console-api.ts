import { z } from "zod";
import { requestParsed, requestVoid } from "./api-client";
import { pageSchema, withQuery } from "./console-contracts";

const dateSchema = z.string();

export const adminMemberListItemSchema = z.object({
  id: z.number().int().positive(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
  created_at: dateSchema,
  updated_at: dateSchema,
});
export const adminMemberDetailSchema = adminMemberListItemSchema.extend({
  notification_type: z.string(),
  marketing_consent: z.boolean(),
  nighttime_consent: z.boolean(),
  height: z.number(),
  weight: z.number(),
  social_providers: z.array(z.string()),
});
export const memberOrderListItemSchema = z.object({
  order_code: z.string(),
  representative_product: z.string(),
  item_count: z.number().int().nonnegative(),
  total_amount: z.number().int(),
  discount_amount: z.number().int(),
  status: z.string(),
  created_at: dateSchema,
});

const penaltySchema = z.object({
  id: z.number().int().positive(),
  market_id: z.number().int().positive(),
  score: z.number().int(),
  reason: z.string(),
  created_at: dateSchema,
});
const marketProductPreviewSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  image_url: z.string().optional(),
  base_price: z.number().int(),
  discount_price: z.number().int(),
  status: z.string(),
});
export const adminMarketListItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  business_number: z.string(),
  status: z.string(),
  seller_email: z.string(),
  profile_image_url: z.string().optional(),
  penalty_score: z.number().int(),
  product_count: z.number().int().nonnegative(),
  created_at: dateSchema,
});
export const adminMarketDetailSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  business_number: z.string(),
  status: z.string(),
  description: z.string(),
  profile_image_url: z.string().optional(),
  cover_image_url: z.string().optional(),
  penalty_score: z.number().int(),
  product_count: z.number().int().nonnegative(),
  seller: z.object({
    member_id: z.number().int().positive(),
    email: z.string(),
    role: z.string(),
    status: z.string(),
    created_at: dateSchema,
  }),
  products: z.array(marketProductPreviewSchema),
  recent_penalties: z.array(penaltySchema),
  public_url: z.string(),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const adminProductListItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  market_id: z.number().int().positive(),
  market_name: z.string(),
  category_id: z.number().int().positive(),
  category_name: z.string(),
  image_url: z.string().optional(),
  base_price: z.number().int(),
  discount_price: z.number().int(),
  available_quantity: z.number().int(),
  status: z.string(),
  created_at: dateSchema,
});
const productOptionSchema = z.object({
  id: z.number().int().positive(),
  option_name: z.string(),
  option_value: z.string(),
  additional_price: z.number().int(),
  quantity: z.number().int(),
  reserved_quantity: z.number().int(),
  safety_quantity: z.number().int(),
  available_quantity: z.number().int(),
  is_active: z.boolean(),
});
const productImageSchema = z.object({
  id: z.number().int().positive(),
  url: z.string(),
  alt_text: z.string(),
  sort_order: z.number().int(),
});
export const adminProductDetailSchema = z.object({
  id: z.number().int().positive(),
  market_id: z.number().int().positive(),
  market_name: z.string(),
  category_id: z.number().int().positive(),
  category_name: z.string(),
  name: z.string(),
  summary_description: z.string(),
  description: z.string(),
  image_url: z.string().optional(),
  tags: z.array(z.string()),
  base_price: z.number().int(),
  discount_price: z.number().int(),
  shipping_type: z.string(),
  status: z.string(),
  options: z.array(productOptionSchema),
  images: z.array(productImageSchema),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const adminOrderListItemSchema = z.object({
  id: z.number().int().positive(),
  order_code: z.string(),
  member_id: z.number().int().positive(),
  buyer_email: z.string(),
  total_order_price: z.number().int(),
  discount_amount: z.number().int(),
  status: z.string(),
  market_count: z.number().int().nonnegative(),
  item_count: z.number().int().nonnegative(),
  created_at: dateSchema,
});
const adminOrderLineSchema = z.object({
  id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  product_name: z.string(),
  option_id: z.number().int().positive(),
  option_name: z.string(),
  option_value: z.string(),
  quantity: z.number().int(),
  price: z.number().int(),
  discount_amount: z.number().int(),
  status: z.string(),
});
export const adminOrderDetailSchema = z.object({
  id: z.number().int().positive(),
  order_code: z.string(),
  buyer: z.object({
    member_id: z.number().int().positive(),
    email: z.string(),
    status: z.string(),
  }),
  total_order_price: z.number().int(),
  total_discount_price: z.number().int(),
  used_point: z.number().int(),
  payment_method: z.string(),
  status: z.string(),
  market_orders: z.array(z.object({
    id: z.number().int().positive(),
    market_id: z.number().int().positive(),
    market_name: z.string(),
    shipping_fee: z.number().int(),
    status: z.string(),
    expected_settlement_amount: z.number().int(),
    items: z.array(adminOrderLineSchema),
  })),
  delivery: z.object({
    id: z.number().int().positive(),
    tracking_number: z.string().optional(),
    carrier: z.string().optional(),
    status: z.string(),
    receiver_name: z.string(),
    receiver_phone: z.string(),
    address: z.string(),
  }).optional(),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const adminSettlementListItemSchema = z.object({
  id: z.number().int().positive(),
  market_id: z.number().int().positive(),
  market_name: z.string(),
  target_month: z.string(),
  total_sales_amount: z.number().int(),
  commission_amount: z.number().int(),
  final_settlement_amount: z.number().int(),
  status: z.string(),
  payment_due_date: dateSchema.optional(),
  paid_at: dateSchema.optional(),
  updated_at: dateSchema,
});
const settlementLineSchema = z.object({
  id: z.number().int().positive(),
  order_code: z.string(),
  product_id: z.number().int().positive(),
  product_name: z.string(),
  option_id: z.number().int().positive(),
  option_name: z.string(),
  option_value: z.string(),
  quantity: z.number().int(),
  gross_amount: z.number().int(),
  commission_amount: z.number().int(),
  return_shipping_fee: z.number().int(),
  final_settlement_amount: z.number().int(),
  status: z.string(),
  purchase_confirmed_at: dateSchema,
});
export const adminSettlementDetailSchema = z.object({
  id: z.number().int().positive(),
  market_id: z.number().int().positive(),
  market_name: z.string(),
  target_month: z.string(),
  total_sales_amount: z.number().int(),
  total_return_shipping_fee: z.number().int(),
  commission_amount: z.number().int(),
  final_settlement_amount: z.number().int(),
  status: z.string(),
  settled_at: dateSchema.optional(),
  confirmed_at: dateSchema.optional(),
  payment_due_date: dateSchema.optional(),
  paid_at: dateSchema.optional(),
  created_at: dateSchema,
  updated_at: dateSchema,
  lines: pageSchema(settlementLineSchema),
});

export type AdminMemberListItem = z.infer<typeof adminMemberListItemSchema>;
export type AdminMemberDetail = z.infer<typeof adminMemberDetailSchema>;
export type MemberOrderListItem = z.infer<typeof memberOrderListItemSchema>;
export type AdminMarketListItem = z.infer<typeof adminMarketListItemSchema>;
export type AdminMarketDetail = z.infer<typeof adminMarketDetailSchema>;
export type AdminProductListItem = z.infer<typeof adminProductListItemSchema>;
export type AdminProductDetail = z.infer<typeof adminProductDetailSchema>;
export type AdminOrderListItem = z.infer<typeof adminOrderListItemSchema>;
export type AdminOrderDetail = z.infer<typeof adminOrderDetailSchema>;
export type AdminSettlementListItem = z.infer<typeof adminSettlementListItemSchema>;
export type AdminSettlementDetail = z.infer<typeof adminSettlementDetailSchema>;

type ListParams = {
  page: number;
  page_size?: number;
  q?: string;
  status?: string;
};

export const adminConsoleApi = {
  members: (token: string, params: ListParams & { role?: string }) =>
    requestParsed(pageSchema(adminMemberListItemSchema), withQuery("/api/v1/admin/members", params), { token }),
  member: (token: string, memberID: number) =>
    requestParsed(adminMemberDetailSchema, `/api/v1/admin/members/${memberID}`, { token }),
  memberOrders: (token: string, memberID: number, params: { page: number; page_size?: number; status?: string }) =>
    requestParsed(pageSchema(memberOrderListItemSchema), withQuery(`/api/v1/admin/members/${memberID}/orders`, params), { token }),
  updateMemberStatus: (token: string, memberID: number, status: string) =>
    requestVoid(`/api/v1/admin/members/${memberID}/status`, { method: "POST", token, body: JSON.stringify({ status }) }),
  updateMemberRole: (token: string, memberID: number, role: string) =>
    requestVoid(`/api/v1/admin/members/${memberID}/role`, { method: "POST", token, body: JSON.stringify({ role }) }),

  markets: (token: string, params: ListParams) =>
    requestParsed(pageSchema(adminMarketListItemSchema), withQuery("/api/v1/admin/markets", params), { token }),
  market: (token: string, marketID: number) =>
    requestParsed(adminMarketDetailSchema, `/api/v1/admin/markets/${marketID}`, { token }),
  addMarketPenalty: (token: string, marketID: number, payload: { score: number; reason: string }) =>
    requestVoid(`/api/v1/admin/markets/${marketID}/penalties`, { method: "POST", token, body: JSON.stringify(payload) }),
  updateMarketStatus: (token: string, marketID: number, status: string) =>
    requestVoid(`/api/v1/markets/${marketID}/status`, { method: "POST", token, body: JSON.stringify({ status }) }),

  products: (token: string, params: ListParams & { market_id?: number; category_id?: number }) =>
    requestParsed(pageSchema(adminProductListItemSchema), withQuery("/api/v1/admin/products", params), { token }),
  product: (token: string, productID: number) =>
    requestParsed(adminProductDetailSchema, `/api/v1/admin/products/${productID}`, { token }),

  orders: (token: string, params: ListParams & { market_id?: number; from?: string; to?: string }) =>
    requestParsed(pageSchema(adminOrderListItemSchema), withQuery("/api/v1/admin/orders", params), { token }),
  order: (token: string, orderCode: string) =>
    requestParsed(adminOrderDetailSchema, `/api/v1/admin/orders/${encodeURIComponent(orderCode)}`, { token }),
  cancelOrder: (token: string, orderCode: string) =>
    requestVoid(`/api/v1/admin/orders/${encodeURIComponent(orderCode)}/cancel`, { method: "POST", token }),

  settlements: (token: string, params: ListParams & { market_id?: number; target_month?: string }) =>
    requestParsed(pageSchema(adminSettlementListItemSchema), withQuery("/api/v1/admin/settlements", params), { token }),
  settlement: (token: string, settlementID: number, linePage = 1) =>
    requestParsed(adminSettlementDetailSchema, withQuery(`/api/v1/admin/settlements/${settlementID}`, { page: linePage, page_size: 20 }), { token }),
  markSettlementPaid: (token: string, settlementID: number) =>
    requestVoid(`/api/v1/admin/settlements/${settlementID}/mark-paid`, { method: "POST", token }),
};
