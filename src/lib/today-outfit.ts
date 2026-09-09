import type { Product } from "./types";

export const outfitSlotOrder = ["head", "accessory", "outer", "top", "bottom", "bag", "shoes"] as const;

export type OutfitSlotKind = (typeof outfitSlotOrder)[number];
export type OutfitWeatherProfile = "HOT" | "WARM" | "MILD" | "COOL" | "COLD" | "RAIN" | "SNOW";

export type OutfitItem = {
  slot: OutfitSlotKind;
  slot_label: string;
  product: Product;
};

export type OutfitLook = {
  id: number;
  title: string;
  reason: string;
  image_url: string;
  image_disclosure: string;
  items: OutfitItem[];
};

export type TodayOutfitResponse = {
  weather_profile: OutfitWeatherProfile;
  generated_at: string;
  looks: OutfitLook[];
};

export type TodayOutfitWeather = {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  precipitationProbability: number;
};

export function outfitProductAnchorID(lookID: number, productID: number): string {
  return `outfit-${lookID}-product-${productID}`;
}
