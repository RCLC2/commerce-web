import type { CommerceEvent, Product } from "./types";

export type EventSort = "RECOMMENDED" | "POPULAR" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC";
export type EventProductDisplayMode = "PRODUCT_GRID" | "MARKET_CAROUSELS";

export type EventReward = {
  id: number;
  event_id: number;
  reward_type: "COUPON" | "POINT_EVENT";
  reward_id: number;
  title: string;
  description: string;
  button_label: string;
  sequence: number;
};

export type EventFilterOption = { id: number; name: string };

export type EventDetail = CommerceEvent & {
  design_variant: string;
  product_display: {
    enabled: boolean;
    mode: EventProductDisplayMode;
    section_title: string;
    default_sort: EventSort;
    sort_options: Array<{ value: EventSort; label: string }>;
    markets: EventFilterOption[];
    categories: EventFilterOption[];
  };
  rewards: EventReward[];
};

export type EventProduct = Product & {
  category_name?: string;
  market_profile_image_url?: string;
  market_description?: string;
  market_follower_count?: number;
};

export type EventProductPage = {
  mode: EventProductDisplayMode;
  items: EventProduct[];
  paging: { limit: number; offset: number; has_next: boolean };
};

export type EventRewardClaim = {
  status: "ISSUED" | "PREVIEW" | string;
  event_id: number;
  reward_row_id: number;
  reward_type: "COUPON" | "POINT_EVENT";
  reward_id: number;
};
