import { z } from "zod";
import { requestParsed } from "./api-client";
import { productSchema } from "./api/contracts/schemas";
import { normalizePublicProduct } from "./api/normalizers/contracts";
import { fallbackProduct, isNotFound } from "./pdp-fallback";
import type { PdpMerchandising, Product } from "./types";

const cardAdSchema = z.object({
  campaign_id: z.number().int().positive(),
  title: z.string(),
  image_url: z.string().optional(),
  link_url: z.string(),
  disclosure: z.string(),
});

const sponsoredMarketSchema = z.object({
  campaign_id: z.number().int().positive(),
  market: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    description: z.string().default(""),
    profile_image_url: z.string().optional(),
  }),
  products: z.array(productSchema),
  disclosure: z.string(),
});

const merchandisingSchema = z.object({
  also_viewed: z.array(productSchema),
  card_ad: cardAdSchema.nullable(),
  sponsored_market: sponsoredMarketSchema.nullable(),
});

export async function getPdpMerchandising(productID: number): Promise<PdpMerchandising> {
  try {
    const payload = await requestParsed(
      merchandisingSchema,
      `/api/v1/products/${productID}/pdp-merchandising`,
      { cache: "no-store" },
    );
    return {
      ...payload,
      also_viewed: payload.also_viewed.map(normalizePublicProduct),
      sponsored_market: payload.sponsored_market ? {
        ...payload.sponsored_market,
        products: payload.sponsored_market.products.map(normalizePublicProduct),
      } : null,
    };
  } catch (error) {
    if (!isNotFound(error)) throw error;
    return fallbackMerchandising(productID);
  }
}

function previewProduct(id: number, name: string, price: number): Product {
  return {
    ...fallbackProduct(id),
    name,
    base_price: price,
    discount_price: Math.round(price * 0.8),
    is_fallback: undefined,
  };
}

function fallbackMerchandising(productID: number): PdpMerchandising {
  const alsoViewed = [
    previewProduct(productID + 101, "여름 코튼 오버 셔츠", 59000),
    previewProduct(productID + 102, "린넨 와이드 밴딩 팬츠", 49000),
    previewProduct(productID + 103, "데일리 라운드 니트", 42000),
    previewProduct(productID + 104, "가벼운 미니 크로스백", 39000),
    previewProduct(productID + 105, "클래식 스트랩 샌들", 72000),
  ];
  return {
    also_viewed: alsoViewed,
    card_ad: {
      campaign_id: 990001,
      title: "이번 주 스타일 쿠폰 혜택",
      image_url: "/images/fashion-placeholder-detail.svg",
      link_url: `/products/${productID}`,
      disclosure: "AD",
    },
    sponsored_market: {
      campaign_id: 990002,
      market: {
        id: 1,
        name: "디어마켓",
        description: "편안한 일상을 위한 데일리웨어",
      },
      products: alsoViewed.slice(0, 4).map((product) => ({ ...product, market_name: "디어마켓" })),
      disclosure: "SPONSORED",
    },
    is_fallback: true,
  };
}
