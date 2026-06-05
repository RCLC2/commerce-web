export type ProductOption = {
  id: number;
  product_id: number;
  option_name: string;
  option_value: string;
  additional_price: number;
  quantity: number;
  is_active: boolean;
};

export type Market = {
  id: number;
  name: string;
  description: string;
  profile_image_url: string;
  cover_image_url: string;
  follower_count: number;
  status: "ACTIVE" | "PENDING" | "SUSPENDED" | string;
  tags: string[];
};

export type CommerceCategory = {
  id: number;
  name: string;
  slug: string;
  href: string;
  sort_order: number;
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
  member_id: number;
  order_id: number;
  rating: number;
  content: string;
  created_at: string;
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
};

export type MarketOrderResponse = {
  id: number;
  market_id: number;
  shipping_fee: number;
  status: string;
  expected_settlement_amount: number;
  line_items: OrderLineItemResponse[];
};

export type OrderLineItemResponse = {
  id: number;
  cart_id?: number;
  product_id: number;
  option_id: number;
  quantity: number;
  price: number;
  status: string;
  product?: Product;
};

export type InventorySource = {
  id: number;
  market_id: number;
  provider: "SHOPIFY" | "CAFE24" | string;
  display_name: string;
  status: "ACTIVE" | "FAILED" | "PAUSED" | string;
  last_synced_at?: string;
};

export type InventorySyncLog = {
  id: number;
  source_id: number;
  product_id: number;
  option_id: number;
  status: "SUCCESS" | "FAILED" | string;
  message: string;
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
  target_id: number;
  action: string;
  reason: string;
  created_at: string;
};

export type CMSCarousel = {
  id: number;
  title: string;
  image_url: string;
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
