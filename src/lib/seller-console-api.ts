import { z } from "zod";
import { requestParsed, requestVoid } from "./api-client";
import { pageSchema, withQuery } from "./console-contracts";

const dateSchema = z.string();

export const sellerDashboardSchemaV2 = z.object({
  metrics: z.object({
    order_count: z.number().int().nonnegative(),
    ready_to_ship_count: z.number().int().nonnegative(),
    shipping_count: z.number().int().nonnegative(),
    pending_settlement_count: z.number().int().nonnegative(),
    selling_product_count: z.number().int().nonnegative(),
  }),
  recent_orders: z.array(z.object({
    order_code: z.string(),
    representative_product: z.string(),
    item_count: z.number().int().nonnegative(),
    status: z.string(),
    created_at: dateSchema,
  })),
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    severity: z.string(),
  })),
});

export const sellerProductListItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  category_id: z.number().int().positive(),
  category_name: z.string(),
  image_url: z.string().optional(),
  base_price: z.number().int(),
  discount_price: z.number().int(),
  available_quantity: z.number().int(),
  status: z.string(),
  updated_at: dateSchema,
});
const sellerProductOptionSchema = z.object({
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
const sellerProductImageSchema = z.object({
  id: z.number().int().positive(),
  url: z.string(),
  alt_text: z.string(),
  sort_order: z.number().int(),
});
export const sellerProductDetailSchema = z.object({
  id: z.number().int().positive(),
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
  options: z.array(sellerProductOptionSchema),
  images: z.array(sellerProductImageSchema),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export const sellerInventoryOptionListItemSchema = z.object({
  id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  product_name: z.string(),
  option_name: z.string(),
  option_value: z.string(),
  additional_price: z.number().int(),
  quantity: z.number().int(),
  reserved_quantity: z.number().int(),
  available_quantity: z.number().int(),
  is_active: z.boolean(),
});
export const sellerOrderListItemSchema = z.object({
  market_order_id: z.number().int().positive(),
  order_code: z.string(),
  buyer_email: z.string(),
  representative_product: z.string(),
  item_count: z.number().int().nonnegative(),
  market_total_amount: z.number().int(),
  expected_settlement_amount: z.number().int(),
  status: z.string(),
  delivery_status: z.string().optional(),
  created_at: dateSchema,
});
const sellerOrderLineSchema = z.object({
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
export const sellerOrderDetailSchema = z.object({
  market_order_id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  order_code: z.string(),
  buyer_email: z.string(),
  market_total_amount: z.number().int(),
  shipping_fee: z.number().int(),
  expected_settlement_amount: z.number().int(),
  payment_method: z.string(),
  status: z.string(),
  items: z.array(sellerOrderLineSchema),
  delivery: z.object({
    id: z.number().int().positive().optional(),
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

export const sellerSettlementListItemSchema = z.object({
  id: z.number().int().positive(),
  target_month: z.string(),
  total_sales_amount: z.number().int(),
  commission_amount: z.number().int(),
  final_settlement_amount: z.number().int(),
  status: z.string(),
  payment_due_date: dateSchema.optional(),
  paid_at: dateSchema.optional(),
  updated_at: dateSchema,
});
const sellerSettlementLineSchema = z.object({
  id: z.number().int().positive(),
  order_code: z.string(),
  product_id: z.number().int().positive(),
  product_name: z.string(),
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
export const sellerSettlementDetailSchema = z.object({
  id: z.number().int().positive(),
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
  lines: pageSchema(sellerSettlementLineSchema),
});

export const sellerReviewListItemSchema = z.object({
  id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  product_name: z.string(),
  product_image_url: z.string().optional(),
  buyer_email: z.string(),
  rating_x2: z.number().int(),
  rating: z.number(),
  content_preview: z.string(),
  status: z.string(),
  created_at: dateSchema,
});
export const sellerReviewDetailSchema = z.object({
  id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  product_name: z.string(),
  product_image_url: z.string().optional(),
  option_id: z.number().int().positive(),
  option_name: z.string(),
  option_value: z.string(),
  member_id: z.number().int().positive(),
  buyer_email: z.string(),
  order_id: z.number().int().positive(),
  order_code: z.string(),
  order_line_item_id: z.number().int().positive(),
  rating_x2: z.number().int(),
  rating: z.number(),
  content: z.string(),
  height_at_time: z.number().optional(),
  weight_at_time: z.number().optional(),
  status: z.string(),
  created_at: dateSchema,
  updated_at: dateSchema,
});

export type SellerDashboard = z.infer<typeof sellerDashboardSchemaV2>;
export type SellerProductListItem = z.infer<typeof sellerProductListItemSchema>;
export type SellerProductDetail = z.infer<typeof sellerProductDetailSchema>;
export type SellerOrderListItem = z.infer<typeof sellerOrderListItemSchema>;
export type SellerInventoryOptionListItem = z.infer<typeof sellerInventoryOptionListItemSchema>;
export type SellerOrderDetail = z.infer<typeof sellerOrderDetailSchema>;
export type SellerSettlementListItem = z.infer<typeof sellerSettlementListItemSchema>;
export type SellerSettlementDetail = z.infer<typeof sellerSettlementDetailSchema>;
export type SellerReviewListItem = z.infer<typeof sellerReviewListItemSchema>;
export type SellerReviewDetail = z.infer<typeof sellerReviewDetailSchema>;

type BaseParams = {
  market_id?: number | null;
};

type ListParams = BaseParams & {
  page: number;
  page_size?: number;
  q?: string;
  status?: string;
};

export type SellerProductUpdate = {
  name: string;
  category_id: number;
  base_price: number;
  discount_price: number;
  shipping_type: string;
  status: string;
  summary_description?: string;
  description?: string;
  image_url?: string;
  images?: Array<{ url: string; alt_text?: string; sort_order: number }>;
  options: Array<{ id: number; quantity: number; additional_price: number; is_active: boolean }>;
};

function encodeProductUpdate(payload: SellerProductUpdate) {
  const images = payload.images?.map((image) => ({
    URL: image.url,
    AltText: image.alt_text ?? "",
    SortOrder: image.sort_order,
  }));
  return {
    Name: payload.name,
    CategoryID: payload.category_id,
    BasePrice: payload.base_price,
    DiscountPrice: payload.discount_price,
    ShippingType: payload.shipping_type,
    Status: payload.status,
    SummaryDescription: payload.summary_description ?? "",
    Description: payload.description ?? "",
    ImageURL: payload.image_url ?? "",
    Images: images,
    Options: payload.options.map((option) => ({
      ID: option.id,
      Quantity: option.quantity,
      AdditionalPrice: option.additional_price,
      IsActive: option.is_active,
    })),
    summary_description: payload.summary_description ?? "",
    description: payload.description ?? "",
    image_url: payload.image_url ?? "",
    images,
  };
}
export const sellerConsoleApi = {
  dashboard: (token: string, marketID?: number | null) =>
    requestParsed(sellerDashboardSchemaV2, withQuery("/api/v1/seller/dashboard", { market_id: marketID }), { token }),

  products: (token: string, params: ListParams & { category_id?: number }) =>
    requestParsed(pageSchema(sellerProductListItemSchema), withQuery("/api/v1/seller/products", params), { token }),
  product: (token: string, productID: number, marketID?: number | null) =>
    requestParsed(sellerProductDetailSchema, withQuery(`/api/v1/seller/products/${productID}`, { market_id: marketID }), { token }),
  updateProduct: (token: string, productID: number, payload: SellerProductUpdate) =>
    requestVoid(`/api/v1/products/${productID}`, { method: "PUT", token, body: JSON.stringify(encodeProductUpdate(payload)) }),

  inventoryOptions: (token: string, params: ListParams) =>
    requestParsed(pageSchema(sellerInventoryOptionListItemSchema), withQuery("/api/v1/seller/inventory/product-options", params), { token }),

  orders: (token: string, params: ListParams & { from?: string; to?: string }) =>
    requestParsed(pageSchema(sellerOrderListItemSchema), withQuery("/api/v1/seller/orders", params), { token }),
  order: (token: string, orderCode: string, marketID?: number | null) =>
    requestParsed(sellerOrderDetailSchema, withQuery(`/api/v1/seller/orders/${encodeURIComponent(orderCode)}`, { market_id: marketID }), { token }),

  settlements: (token: string, params: ListParams & { target_month?: string }) =>
    requestParsed(pageSchema(sellerSettlementListItemSchema), withQuery("/api/v1/seller/settlements", params), { token }),
  settlement: (token: string, settlementID: number, marketID?: number | null, linePage = 1) =>
    requestParsed(sellerSettlementDetailSchema, withQuery(`/api/v1/seller/settlements/${settlementID}`, { market_id: marketID, page: linePage, page_size: 20 }), { token }),

  reviews: (token: string, params: ListParams & { rating_x2?: number }) =>
    requestParsed(pageSchema(sellerReviewListItemSchema), withQuery("/api/v1/seller/reviews", params), { token }),
  review: (token: string, reviewID: number, marketID?: number | null) =>
    requestParsed(sellerReviewDetailSchema, withQuery(`/api/v1/seller/reviews/${reviewID}`, { market_id: marketID }), { token }),
};
