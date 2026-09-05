import type { OutfitLook, OutfitSlotKind } from "@/lib/today-outfit";
import { outfitSlotOrder } from "@/lib/today-outfit";
import type { Product } from "@/lib/types";

const slotLabels: Record<OutfitSlotKind, string> = {
  head: "모자",
  accessory: "액세서리",
  outer: "아우터",
  top: "상의",
  bottom: "하의",
  bag: "가방",
  shoes: "신발",
};

export function createOutfitLook(index = 1): OutfitLook {
  return {
    id: index,
    title: `실제 상품 코디 ${index}`,
    reason: "가벼운 레이어드와 포인트 컬러를 조합했어요.",
    image_url: `/api/v1/outfits/images/${index}`,
    image_disclosure: "AI 연출 이미지 · 실제 상품과 차이가 있을 수 있습니다",
    items: outfitSlotOrder.map((slot, slotIndex) => ({
      slot,
      slot_label: slotLabels[slot],
      product: createOutfitProduct(index * 100 + slotIndex + 1, `${slotLabels[slot]} 상품 ${index}`),
    })),
  };
}

export function createOutfitProduct(id: number, name = `실제 상품 ${id}`): Product {
  return {
    id,
    market_id: 10,
    category_id: 20,
    name,
    description: "실제 판매 중인 상품",
    base_price: 50_000 + id,
    discount_price: 45_000 + id,
    shipping_type: "NORMAL",
    popularity_score: 1,
    status: "SELLING",
    image_url: "/images/fashion-placeholder.svg",
    in_stock: true,
    market: { id: 10, name: "실제 마켓" },
    tag_chips: [],
  };
}
