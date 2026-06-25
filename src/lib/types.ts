export type ProductOption = {
  id: number;
  product_id: number;
  option_name: string;
  option_value: string;
  additional_price: number;
  quantity: number;
  reserved_quantity?: number;
  safety_quantity?: number;
  is_active: boolean;
};

export type Market = {
  id: number;
  member_id?: number;
  name: string;
  description: string;
  business_number?: string;
  profile_image_url?: string;
  cover_image_url?: string;
  follower_count?: number;
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | string;
  tags?: string[];
};

export type CommerceCategory = {
  id: number;
  parent_id?: number;
  name: string;
  slug: string;
  href: string;
  sort_order: number;
  category_ids?: number[];
};

export type Metric = {
  label: string;
  value: string;
  delta?: string;
};

export type ConsoleAlert = {
  id: number;
  title: string;
  description: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
};

export type SellerDashboard = {
  metrics: Metric[];
  tasks: ConsoleAlert[];
};

export type AdminDashboard = {
  metrics: Metric[];
  alerts: ConsoleAlert[];
  recent_actions: AuditLog[];
};

export type Product = {
  id: number;
  market_id: number;
  category_id: number;
  name: string;
  description: string;
  base_price: number;
  discount_price: number;
  shipping_type: "NORMAL" | "FREE" | string;
  delivery_type?: string;
  delivery_label?: string;
  today_shipping_available?: boolean;
  popularity_score: number;
  status: "SELLING" | "SOLD_OUT" | string;
  options?: ProductOption[];
  image_url?: string;
  detail_html?: string;
  market_name?: string;
  tags?: string[];
};

export type SearchSuggestion = {
  id: string;
  type: "PRODUCT" | "MARKET" | "KEYWORD";
  label: string;
  href: string;
};

export type SearchResponse = {
  q: string;
  products: Product[];
  markets: Market[];
  suggestions: SearchSuggestion[];
};

export type TrendingSearchItem = {
  rank: number;
  keyword: string;
  trend: "UP" | "DOWN" | "SAME";
};

export type TrendingSearchResponse = {
  segment: string;
  captured_at: string;
  segments: string[];
  items: TrendingSearchItem[];
};

export type MemberProfile = {
  id: number;
  user_name?: string;
  email: string;
  role: string;
  status: string;
  notification_type: string;
  marketing_consent: boolean;
  nighttime_consent: boolean;
  point_balance: number;
  created_at: string;
};

export type Review = {
  id: number;
  product_id: number;
  option_id?: number;
  member_id?: number;
  order_id?: number;
  order_line_item_id?: number;
  rating_x2?: number;
  rating: number;
  content: string;
  is_photo_review?: boolean;
  image_count?: number;
  status?: string;
  images?: ReviewImage[];
  created_at: string;
  updated_at?: string;
};

export type ReviewImage = {
  id: number;
  media_asset_id: number;
  url?: string;
  detail_url?: string;
  thumbnail_url?: string;
  sort_order: number;
  is_representative: boolean;
  content_type: string;
  size_bytes: number;
};

export type MediaImageDomain = string;

export type MediaImageUpload = {
  s3_key: string;
  upload_url: string;
  headers: Record<string, string>;
  expires_at: string;
  content_type: string;
  size_bytes: number;
};

export type MediaImageAsset = {
  id: number;
  s3_key: string;
  url?: string;
  detail_url?: string;
  thumbnail_url?: string;
  content_type: string;
  size_bytes: number;
};

export type Coupon = {
  id: number;
  name: string;
  discount_amount: number;
  min_order_amount: number;
  expires_at?: string;
  status?: "ISSUED" | "ISSUABLE" | "USED" | string;
  condition_text?: string;
};

export type Address = {
  id: number;
  receiver: string;
  phone: string;
  line1: string;
  line2: string;
  zip_code: string;
  is_default: boolean;
};

export type LoginResponse = {
  memberID: number;
  role: string;
  accessToken: string;
};

export type CartItem = {
  id: number;
  member_id: number;
  product_id: number;
  option_id: number;
  quantity: number;
  price_at_added: number;
  product?: Product;
};

export type OrderResponse = {
  id: number;
  order_code: string;
  member_id?: number;
  total_order_price: number;
  total_discount_price: number;
  used_point: number;
  used_coupon_id?: number;
  payment_method?: string;
  payment_key?: string;
  status: string;
  ordered_at?: string;
  shipping_address?: Address;
  market_orders?: MarketOrderResponse[];
  delivery?: Delivery;
};

export type MarketOrderResponse = {
  id: number;
  market_id: number;
  shipping_fee: number;
  status: string;
  expected_settlement_amount: number;
  line_items: OrderLineItemResponse[];
};

export type Delivery = {
  id: number;
  order_id: number;
  tracking_number?: string;
  carrier?: string;
  status: "PENDING" | "SHIPPING" | "DELIVERED" | "CANCELLED" | string;
  receiver_name?: string;
  receiver_phone?: string;
  address?: string;
};

export type OrderLineItemResponse = {
  id: number;
  cart_id?: number;
  product_id: number;
  option_id: number;
  quantity: number;
  price: number;
  status: string;
  reviewable?: boolean;
  purchase_confirmed_at?: string;
  product?: Product;
};

export type TrackingInfo = {
  CarrierCode?: string;
  carrier_code?: string;
  Invoice?: string;
  invoice?: string;
  Status?: string;
  status?: string;
  Location?: string;
  location?: string;
  Description?: string;
  description?: string;
};

export type CreateReviewResponse = {
  id: number;
  product_id: number;
  option_id: number;
  member_id: number;
  order_id: number;
  order_line_item_id: number;
  rating_x2: number;
  rating: number;
  content: string;
  status: string;
  created_at: string;
};

export type InventorySource = {
  id: number;
  market_id: number;
  provider: "SHOPIFY" | "CAFE24" | string;
  display_name: string;
  shop_name?: string;
  status: "ACTIVE" | "FAILED" | "PAUSED" | "INACTIVE" | string;
  access_token_expires_at?: string;
  refresh_token_expires_at?: string;
  last_synced_at?: string;
  updated_at?: string;
};

export type InventorySourceForm = {
  market_id: number;
  provider: "SHOPIFY" | "CAFE24" | string;
  display_name: string;
  shop_name: string;
  access_token: string;
  refresh_token?: string;
  client_id?: string;
  client_secret?: string;
  webhook_secret?: string;
};

export type ExternalInventoryMapping = {
  id: number;
  inventory_source_id: number;
  provider: string;
  product_option_id: number;
  external_product_id?: string;
  external_variant_id?: string;
  external_inventory_item_id?: string;
  external_location_id?: string;
  disconnect_if_necessary?: boolean;
  created_at?: string;
};

export type InventorySyncLog = {
  id: number;
  provider?: string;
  product_option_id?: number;
  external_reference?: string;
  previous_quantity?: number;
  new_quantity?: number;
  status: "SUCCESS" | "FAILED" | string;
  error_message?: string;
  message?: string;
  created_at: string;
};

export type Settlement = {
  id: number;
  market_id: number;
  market_name: string;
  target_month: string;
  total_sales_amount: number;
  commission_amount: number;
  final_settlement_amount: number;
  status: "PREPARED" | "PAID" | "EXCLUDED" | string;
};

export type AuditLog = {
  id: number;
  admin_id: number;
  target_type: string;
  target_id?: number;
  settlement_id?: number;
  action: string;
  reason?: string;
  created_at: string;
};

export type CMSCarousel = {
  id: number;
  title: string;
  image_url: string;
  target_type?: "PRODUCT" | "MARKET" | "URL" | string;
  target_id?: number;
  display_order?: number;
  is_active?: boolean;
  starts_at?: string;
  ends_at?: string;
  created_at?: string;
  link_url: string;
  status: "ACTIVE" | "INACTIVE" | string;
};

export type CommerceEvent = {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  status: "ACTIVE" | "ENDED" | string;
  starts_at: string;
  ends_at: string;
};
