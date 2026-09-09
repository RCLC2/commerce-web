import { z } from "zod";
import type { TodayOutfitResponse, TodayOutfitWeather } from "../today-outfit";
import { outfitSlotOrder } from "../today-outfit";
import { requestParsed } from "../api-client";
import { dateStringSchema, identifierSchema, plpProductSchema } from "./contracts/schemas";
import { normalizePublicProduct } from "./normalizers/contracts";

const outfitSlotSchema = z.enum(outfitSlotOrder);

const outfitLookSchema = z.object({
  id: identifierSchema,
  title: z.string().min(1),
  reason: z.string().min(1),
  image_url: z.string().min(1),
  image_disclosure: z.string().min(1),
  items: z.array(z.object({
    slot: outfitSlotSchema,
    slot_label: z.string().min(1),
    product: plpProductSchema,
  })).length(outfitSlotOrder.length),
}).superRefine((look, context) => {
  const slots = new Set(look.items.map((item) => item.slot));
  const productIDs = new Set(look.items.map((item) => item.product.id));
  if (slots.size !== outfitSlotOrder.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "코디 슬롯은 중복 없이 모두 포함되어야 합니다." });
  }
  if (productIDs.size !== outfitSlotOrder.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "코디 상품은 중복될 수 없습니다." });
  }
});

const todayOutfitSchema = z.object({
  weather_profile: z.enum(["HOT", "WARM", "MILD", "COOL", "COLD", "RAIN", "SNOW"]),
  generated_at: dateStringSchema,
  looks: z.array(outfitLookSchema).min(1).max(10),
});

export const outfitApi = {
  getTodayOutfit: async (weather: TodayOutfitWeather): Promise<TodayOutfitResponse> => {
    const path = todayOutfitPath(weather);
    const response = await requestParsed(todayOutfitSchema, path);
    return normalizeTodayOutfit(response);
  },
};

export function parseTodayOutfitResponse(input: unknown): TodayOutfitResponse {
  return normalizeTodayOutfit(todayOutfitSchema.parse(input));
}

function normalizeTodayOutfit(response: z.infer<typeof todayOutfitSchema>): TodayOutfitResponse {
  const slotRank = new Map(outfitSlotOrder.map((slot, index) => [slot, index]));
  return {
    ...response,
    looks: response.looks.map((look) => ({
      ...look,
      items: look.items
        .map((item) => ({ ...item, product: normalizePublicProduct(item.product) }))
        .sort((left, right) => (slotRank.get(left.slot) ?? 0) - (slotRank.get(right.slot) ?? 0)),
    })),
  };
}

function todayOutfitPath(weather: TodayOutfitWeather): string {
  const search = new URLSearchParams({
    temperature: String(weather.temperature),
    apparent_temperature: String(weather.apparentTemperature),
    weather_code: String(weather.weatherCode),
    precipitation_probability: String(weather.precipitationProbability),
  });
  return `/api/v1/outfits/today?${search.toString()}`;
}
