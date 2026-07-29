import { z } from "zod";
import type { CommerceCategory } from "../../types";

export const identifierSchema = z.number().int().positive();
export const nonNegativeIntSchema = z.number().int().nonnegative();
export const dateStringSchema = z.string().min(1).refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "유효한 날짜 문자열이어야 합니다.",
);

export const metricSchema = z.object({
  label: z.string(),
  value: z.string(),
  delta: z.string().optional(),
});

export const consoleAlertSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
});

export const productOptionSchema = z.object({
  id: identifierSchema,
  product_id: identifierSchema,
  option_name: z.string(),
  option_value: z.string(),
  additional_price: z.number().int(),
  quantity: z.number().int(),
  reserved_quantity: z.number().int().optional(),
  safety_quantity: z.number().int().optional(),
  is_active: z.boolean(),
});

export const productSchema = z.object({
  id: identifierSchema,
  market_id: identifierSchema,
  category_id: identifierSchema,
  name: z.string(),
  description: z.string(),
  base_price: nonNegativeIntSchema,
  discount_price: nonNegativeIntSchema.default(0),
  shipping_type: z.string().default("NORMAL"),
  delivery_type: z.string().optional(),
  delivery_label: z.string().optional(),
  today_shipping_available: z.boolean().optional(),
  popularity_score: z.number().default(0),
  status: z.enum(["SELLING", "SOLD_OUT"]),
  options: z.array(productOptionSchema).optional(),
  image_url: z.string().optional(),
  detail_html: z.string().optional(),
  market_name: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const marketSchema = z.object({
  id: identifierSchema,
  member_id: identifierSchema.optional(),
  name: z.string(),
  description: z.string(),
  business_number: z.string().optional(),
  profile_image_url: z.string().optional(),
  cover_image_url: z.string().optional(),
  follower_count: nonNegativeIntSchema.optional(),
  status: z.string(),
  tags: z.array(z.string()).optional(),
});

export const categorySchema: z.ZodType<CommerceCategory> = z.lazy(() =>
  z.object({
    id: identifierSchema,
    parent_id: identifierSchema.optional(),
    name: z.string(),
    slug: z.string(),
    href: z.string(),
    depth: z.number().int(),
    level: z.number().int(),
    sort_order: z.number().int(),
    category_ids: z.array(identifierSchema).optional(),
    children: z.array(categorySchema).optional(),
  }),
);

export const homeSectionSchema = z.object({
  id: identifierSchema,
  sequence: z.number().int(),
  title: z.string(),
  description: z.string().optional(),
  api_url: z.string(),
  status: z.string(),
  created_at: dateStringSchema.optional(),
  updated_at: dateStringSchema.optional(),
});

export const instagramTrendItemSchema = z.object({
  id: z.string(),
  platform: z.string(),
  content_type: z.string(),
  sns_url: z.string(),
  media_url: z.string().optional(),
  caption: z.string().optional(),
  tags: z.array(z.string()).optional(),
  username: z.string().optional(),
  timestamp: dateStringSchema.optional(),
});

export const instagramTrendPageSchema = z.object({
  hashtag: z.string(),
  items: z.array(instagramTrendItemSchema),
  paging: z.object({
    next_cursor: z.string().optional(),
    has_next: z.boolean(),
  }),
});

export const reviewImageSchema = z.object({
  id: identifierSchema,
  media_asset_id: identifierSchema,
  url: z.string().optional(),
  detail_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  sort_order: z.number().int(),
  is_representative: z.boolean(),
  content_type: z.string(),
  size_bytes: nonNegativeIntSchema,
});

export const reviewSchema = z.object({
  id: identifierSchema,
  product_id: identifierSchema,
  option_id: identifierSchema.optional(),
  member_id: identifierSchema.optional(),
  order_id: identifierSchema.optional(),
  order_line_item_id: identifierSchema.optional(),
  rating_x2: z.number().int().optional(),
  rating: z.number(),
  content: z.string(),
  is_photo_review: z.boolean().optional(),
  image_count: nonNegativeIntSchema.optional(),
  status: z.string().optional(),
  images: z.array(reviewImageSchema).optional(),
  created_at: dateStringSchema,
  updated_at: dateStringSchema.optional(),
  product: z.object({ id: identifierSchema, name: z.string(), image_url: z.string().optional() }).optional(),
});

export const deliverySchema = z.object({
  id: identifierSchema,
  order_id: identifierSchema,
  tracking_number: z.string().optional(),
  carrier: z.string().optional(),
  status: z.string(),
  receiver_name: z.string().optional(),
  receiver_phone: z.string().optional(),
  address: z.string().optional(),
});

export const orderStatusSchema = z.enum([
  "PAYMENT_PENDING",
  "PAID",
  "PLACED",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);

export const orderLineSchema = z.object({
  id: identifierSchema,
  cart_id: identifierSchema.optional(),
  product_id: identifierSchema,
  option_id: identifierSchema,
  quantity: z.number().int().positive(),
  price: nonNegativeIntSchema,
  status: z.string(),
  reviewable: z.boolean().optional(),
  purchase_confirmed_at: dateStringSchema.optional(),
  product: productSchema.optional(),
});

export const marketOrderSchema = z.object({
  id: identifierSchema,
  market_id: identifierSchema,
  shipping_fee: nonNegativeIntSchema,
  status: z.string(),
  expected_settlement_amount: z.number().int(),
  line_items: z.array(orderLineSchema).default([]),
});

export const orderSchema = z.object({
  id: identifierSchema,
  order_code: z.string().min(1),
  member_id: identifierSchema.optional(),
  total_order_price: nonNegativeIntSchema,
  total_discount_price: nonNegativeIntSchema,
  used_point: nonNegativeIntSchema,
  used_coupon_id: identifierSchema.optional(),
  payment_method: z.string().optional(),
  payment_key: z.string().optional(),
  status: orderStatusSchema,
  ordered_at: dateStringSchema.optional(),
  CreatedAt: dateStringSchema.optional(),
  market_orders: z.array(marketOrderSchema).optional(),
  delivery: deliverySchema.optional(),
}).transform(({ CreatedAt, ...order }) => ({ ...order, ordered_at: order.ordered_at ?? CreatedAt }));

export const couponDefinitionSchema = z.object({
  id: identifierSchema,
  code: z.string(),
  name: z.string(),
  discount_type: z.enum(["PERCENT", "AMOUNT"]),
  discount_value: nonNegativeIntSchema,
  max_discount: nonNegativeIntSchema.default(0),
  min_order_amount: nonNegativeIntSchema.default(0),
  expires_at: dateStringSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  condition_text: z.string().optional(),
});

export const ownedCouponSchema = z.object({
  id: identifierSchema,
  coupon_id: identifierSchema,
  expires_at: dateStringSchema,
  status: z.enum(["AVAILABLE", "USED", "EXPIRED"]),
  coupon: couponDefinitionSchema,
});

export const issuableCouponQuoteSchema = z.object({
  coupon: couponDefinitionSchema,
  discount_amount: nonNegativeIntSchema,
  discounted_amount: nonNegativeIntSchema,
});

export const notificationSchema = z.looseObject({
  id: identifierSchema,
  user_id: identifierSchema.optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  content: z.string().optional(),
  type: z.string().optional(),
  is_read: z.boolean().optional(),
  read_at: dateStringSchema.optional(),
  created_at: dateStringSchema.optional(),
});

export const recommendationSchema = z.looseObject({
  id: identifierSchema.optional(),
  user_id: identifierSchema.optional(),
  product_id: identifierSchema.optional(),
  product: productSchema.optional(),
  score: z.number().optional(),
  reason: z.string().optional(),
  created_at: dateStringSchema.optional(),
});

export const carouselSchema = z.object({
  id: identifierSchema,
  title: z.string(),
  image_url: z.string(),
  target_type: z.string().optional(),
  target_id: identifierSchema.optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  starts_at: dateStringSchema.optional(),
  ends_at: dateStringSchema.optional(),
  created_at: dateStringSchema.optional(),
  link_url: z.string().default(""),
  status: z.string(),
});

export const eventSchema = z.object({
  id: identifierSchema,
  title: z.string(),
  subtitle: z.string(),
  image_url: z.string(),
  link_url: z.string(),
  status: z.string(),
  starts_at: dateStringSchema,
  ends_at: dateStringSchema,
});

export const trackingInfoSchema = z.looseObject({
  CarrierCode: z.string().optional(),
  carrier_code: z.string().optional(),
  Invoice: z.string().optional(),
  invoice: z.string().optional(),
  Status: z.string().optional(),
  status: z.string().optional(),
  Location: z.string().optional(),
  location: z.string().optional(),
  Description: z.string().optional(),
  description: z.string().optional(),
});

export const statusResponseSchema = z.object({ status: z.string() });

export const inventorySourceSchema = z.looseObject({
  id: identifierSchema,
  market_id: identifierSchema,
  provider: z.string(),
  display_name: z.string(),
  shop_name: z.string().optional(),
  status: z.string(),
  access_token_expires_at: dateStringSchema.optional(),
  refresh_token_expires_at: dateStringSchema.optional(),
  last_synced_at: dateStringSchema.optional(),
  updated_at: dateStringSchema.optional(),
});

export const inventorySyncLogSchema = z.looseObject({
  id: identifierSchema,
  provider: z.string().optional(),
  product_option_id: identifierSchema.optional(),
  external_reference: z.string().optional(),
  previous_quantity: z.number().int().optional(),
  new_quantity: z.number().int().optional(),
  status: z.string(),
  error_message: z.string().optional(),
  message: z.string().optional(),
  created_at: dateStringSchema,
});

export const externalInventoryMappingSchema = z.looseObject({
  id: identifierSchema,
  inventory_source_id: identifierSchema,
  provider: z.string(),
  product_option_id: identifierSchema,
  external_product_id: z.string().optional(),
  external_variant_id: z.string().optional(),
  external_inventory_item_id: z.string().optional(),
  external_location_id: z.string().optional(),
  disconnect_if_necessary: z.boolean().optional(),
  created_at: dateStringSchema.optional(),
});
