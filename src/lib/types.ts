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
  satisfaction_rate?: number;
  average_product_rating?: number;
  product_count?: number;
  new_product_count?: number;
  popular_products?: Product[];
  status: "OPEN" | "CLOSED" | "HIDE" | "EXIT" | string;
  tags?: string[];
};

export type MarketPenalty = {
  id: number;
  market_id: number;
  score: number;
  reason: string;
  created_at: string;
};
export type CommerceCategory = {
  id: number;
  parent_id?: number;
  name: string;
  slug: string;
  href: string;
  depth: number;
  level: number;
  sort_order: number;
  category_ids?: number[];
  children?: CommerceCategory[];
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

export type SellerContext = {
  market_id: number;
  market_name: string;
  status: string;
  profile_image_url?: string;
  permissions: string[];
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

export type ProductImage = {
  id?: number;
  url: string;
  alt_text?: string;
  sort_order: number;
};

export type PLPMarketSummary = {
  id: number;
  name: string;
  profile_image_url?: string;
};

export type PLPTagChip = {
  code: string;
  label: string;
  tone: "shipping" | "delivery" | "exclusive" | "new" | "default" | string;
};

export type Product = {
  id: number;
  market_id: number;
  category_id: number;
  name: string;
  description: string;
  summary_description?: string;
  /** Opaque seller API value retained for lossless updates. */
  description_source?: string;
  base_price: number;
  discount_price: number;
  shipping_type: "NORMAL" | "FREE" | string;
  delivery_type?: string;
  delivery_label?: string;
  today_shipping_available?: boolean;
  popularity_score: number;
  realtime_popularity_score?: number;
  status: "SELLING" | "SOLD_OUT" | string;
  options?: ProductOption[];
  image_url?: string;
  images?: ProductImage[];
  detail_html?: string;
  market_name?: string;
  market_profile_image_url?: string;
  market?: PLPMarketSummary;
  tag_chips?: PLPTagChip[];
  tags?: string[];
  in_stock?: boolean;
};

/** 상품 목록(Product Listing Page)에 노출하는 공통 상품 단위. */
export type PLPProduct = Product;

export type CategoryInformation = {
  categories: CommerceCategory[];
  selected_category: CommerceCategory;
  bundle_label: string;
  products: Product[];
  pagination: {
    page: number;
    page_size: number;
    has_next: boolean;
  };
  realtime_popular_carousel: {
    title: string;
    description: string;
    insert_after: number;
    captured_at: string;
    products: Product[];
  };
};


export type PLPProductPage = {
  items: Product[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type PLPInformation = {
  categories: CommerceCategory[];
  total_product_count: number;
  price_ranges: Array<{ code: string; label: string; min_price: number; max_price: number }>;
  sort_options: Array<{ code: "popular" | "new" | "price-low" | "price-high"; label: string }>;
  default_sort: "popular" | "new" | "price-low" | "price-high";
  tag_chips: PLPTagChip[];
};

export type PLPProductParams = {
  categoryIDs?: number[];
  marketId?: number;
  minPrice?: number;
  maxPrice?: number;
  shipping?: "free";
  onSale?: boolean;
  inStock?: boolean;
  tagChip?: string;
  sort?: "popular" | "new" | "price-low" | "price-high";
  page?: number;
  pageSize?: number;
};

export type PdpCardAd = {
  campaign_id: number;
  title: string;
  image_url?: string;
  link_url: string;
  disclosure: "AD" | string;
};

export type SponsoredMarketShelf = {
  campaign_id: number;
  market: Pick<Market, "id" | "name" | "description" | "profile_image_url">;
  products: Product[];
  disclosure: "SPONSORED" | string;
};

export type PdpMerchandising = {
  also_viewed: Product[];
  card_ad: PdpCardAd | null;
  sponsored_market: SponsoredMarketShelf | null;
};

export type SearchSuggestion = {
  id: string;
  type: "PRODUCT" | "MARKET" | "KEYWORD";
  label: string;
  href: string;
};

export type SearchResponse = {
  q: string;
  products: SearchPage<Product>;
  markets: SearchPage<Market>;
  suggestions: SearchSuggestion[];
  related_keywords: string[];
  sections: SearchResultSection[];
};

export type SearchPage<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type SearchResultSection = {
  id: number;
  sequence: number;
  title: string;
  section_type: "PRODUCT_CAROUSEL" | "MARKET_CAROUSEL";
  products?: Product[];
  markets?: Market[];
};

export type TrendingSearchItem = {
  rank: number;
  keyword: string;
  trend: "UP" | "DOWN" | "SAME";
};

export type TrendingSearchResponse = {
  segment: "all" | "women" | "men";
  segments: Array<{ id: "women" | "men"; label: string }>;
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

export type AdminMember = Omit<MemberProfile, "point_balance">;

export type ReviewProductSummary = {
  id: number;
  name: string;
  image_url?: string;
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
  reviewer_name?: string;
  verified_purchase?: boolean;
  option?: { id: number; name: string; value: string };
  badges?: string[];
  height_at_time?: number | null;
  weight_at_time?: number | null;
  is_photo_review?: boolean;
  image_count?: number;
  status?: string;
  images?: ReviewImage[];
  created_at?: string;
  updated_at?: string;
  product?: ReviewProductSummary;
};

export type ReviewSummary = {
  product_id: number;
  review_count: number;
  average_rating: number;
  photo_review_count?: number;
  rating_distribution?: Record<string, number>;
  latest_review_at?: string;
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
  object_key?: string;
  upload_url: string;
  headers: Record<string, string>;
  expires_at: string;
  content_type: string;
  size_bytes: number;
};

export type CouponDefinition = {
  id: number;
  code: string;
  name: string;
  discount_type: "PERCENT" | "AMOUNT" | string;
  discount_value: number;
  discount_amount: number;
  max_discount: number;
  min_order_amount: number;
  expires_at?: string;
  status: "ACTIVE" | "INACTIVE" | string;
  condition_text?: string;
};

export type OwnedCoupon = {
  id: number;
  coupon_id: number;
  expires_at: string;
  status: "AVAILABLE" | "USED" | "EXPIRED";
  coupon: CouponDefinition;
};

export type IssuableCouponQuote = {
  coupon: CouponDefinition;
  max_discount: number;
  discount_amount: number;
  platform_coupon_amount: number;
  market_coupon_amount: number;
  market_coupon_rate: number;
  discounted_amount: number;
};

export type AdminCoupon = Omit<CouponDefinition, "status" | "max_discount"> & {
  max_discount?: number;
  definition_status?: "ACTIVE" | "INACTIVE";
  issuance_status?: "ISSUABLE" | "SCHEDULED" | "ENDED" | "SOLD_OUT" | "INACTIVE";
  user_coupon_status?: "ISSUED" | "USED";
  user_coupon_id?: number;
  member_id?: number;
};

/** @deprecated Use CouponDefinition, OwnedCoupon, or AdminCoupon at the API boundary. */
export type Coupon = CouponDefinition;

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
  status: "PAYMENT_PENDING" | "PAID" | "PLACED" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CANCELLED";
  ordered_at?: string;
  market_orders?: MarketOrderResponse[];
  delivery?: Delivery;
};

export type PaymentCheckout = {
  order_code: string;
  checkout_url: string;
  amount: number;
};

export type MarketOrderResponse = {
  id: number;
  market_id: number;
  shipping_fee: number;
  status: string;
  expected_settlement_amount: number;
  line_items: OrderLineItemResponse[];
};

export type DeliveryCarrier = {
  code: string;
  name: string;
  tracking_key: string;
};

export type DeliveryCarriersResponse = {
  carriers: DeliveryCarrier[];
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
  height_at_time?: number | null;
  weight_at_time?: number | null;
  is_photo_review: boolean;
  status: string;
  images: ReviewImage[];
  created_at?: string;
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
  last_synced_quantity?: number;
  disconnect_if_necessary?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SuppliedProductOption = {
  id: number;
  product_option_id: number;
  provider: string;
  sku_code: string;
  supplier_code: string;
  created_at?: string;
  updated_at?: string;
};

export type InventoryLocation = {
  id: number;
  location_id: number;
  name: string;
  channel_type: string;
  is_virtual: boolean;
  created_at?: string;
  updated_at?: string;
};

export type InventoryDetail = {
  id: number;
  product_option_id: number;
  supplied_option_id?: number;
  location_id: number;
  inbound_reference: string;
  available_quantity: number;
  allocated_quantity: number;
  created_at?: string;
  updated_at?: string;
};

export type ExternalOrderResult = {
  external_order_id: string;
  external_name?: string;
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
  status: "PREPARED" | "CONFIRMED" | "PAID" | "EXCLUDED" | string;
};

export type SellerSettlementDashboard = {
  market_id: number;
  from?: string;
  to?: string;
  settlements: Settlement[];
  line_count: number;
  gross_sales_amount: number;
  platform_coupon_amount: number;
  market_coupon_amount: number;
  point_discount_amount: number;
  promotion_amount: number;
  customer_payment_amount: number;
  commission_amount: number;
  return_shipping_fee: number;
  final_settlement_amount: number;
  paid_amount: number;
  pending_amount: number;
  status_breakdown: Record<string, number>;
  monthly: Record<string, {
    line_count: number;
    gross_sales_amount: number;
    platform_coupon_amount: number;
    market_coupon_amount: number;
    point_discount_amount: number;
    promotion_amount: number;
    customer_payment_amount: number;
    commission_amount: number;
    return_shipping_fee: number;
    final_settlement_amount: number;
  }>;
};

export type AuditLog = {
  id: number;
  admin_id: number;
  target_type: string;
  settlement_id?: number;
  order_id?: number;
  order_code?: string;
  action: string;
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
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  link_url: string;
  status: "ACTIVE" | "INACTIVE" | string;
};

export type CMSHomeSection = {
  id: number;
  sequence: number;
  title: string;
  description?: string;
  api_url: string;
  status: "ACTIVE" | "INACTIVE" | string;
  created_at?: string;
  updated_at?: string;
};

export type HomeCategoryChip = {
  id: number;
  sequence: number;
  chip_type: "CATEGORY" | "CATEGORY_EVENT";
  category_id?: number;
  category_event_id?: number;
  icon_url: string;
  status: "ACTIVE" | "INACTIVE" | string;
  title: string;
  href: string;
  created_at?: string;
  updated_at?: string;
};


export type InstagramTrendItem = {
  id: string;
  platform: string;
  content_type: "FEED" | "STORY" | "REEL" | "VIDEO" | "IMAGE" | string;
  sns_url: string;
  media_url?: string;
  caption?: string;
  tags?: string[];
  username?: string;
  timestamp?: string;
};

export type InstagramTrendPage = {
  hashtag: string;
  items: InstagramTrendItem[];
  paging: {
    next_cursor?: string;
    has_next: boolean;
  };
};
export type CommerceEvent = {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  status: "ACTIVE" | "ENDED" | string;
  starts_at: string | null;
  ends_at: string | null;
};

export type Notification = {
  id: number;
  user_id?: number;
  title?: string;
  message?: string;
  content?: string;
  type?: string;
  is_read?: boolean;
  read_at?: string;
  created_at?: string;
};

export type Recommendation = {
  id?: number;
  user_id?: number;
  product_id?: number;
  product?: Product;
  score?: number;
  reason?: string;
  created_at?: string;
};

export type SettlementSummary = {
  settlements: Settlement[];
};

export type SettlementLine = {
  id: number;
  settlement_id?: number;
  market_id: number;
  order_id: number;
  order_code: string;
  market_order_id: number;
  order_line_item_id: number;
  target_month: string;
  line_type: string;
  status: string;
  purchase_confirmed_at: string;
  settlement_eligible_at: string;
  product_id: number;
  option_id: number;
  quantity: number;
  unit_price: number;
  gross_amount: number;
  platform_coupon_amount: number;
  market_coupon_amount: number;
  point_discount_amount: number;
  promotion_amount: number;
  customer_payment_amount: number;
  commission_amount: number;
  return_shipping_fee: number;
  final_settlement_amount: number;
  created_at: string;
  updated_at: string;
};

export type SettlementAccount = {
  id: number;
  market_id: number;
  bank_code: string;
  account_number: string;
  account_holder: string;
  created_at?: string;
  updated_at?: string;
};

export type SettlementAccountInput = Pick<
  SettlementAccount,
  "bank_code" | "account_number" | "account_holder"
>;

export type SameDayDispatchAvailability = {
  available: boolean;
  cutoff_time?: string;
  expected_shipping_date?: string;
  reason?: string;
};
