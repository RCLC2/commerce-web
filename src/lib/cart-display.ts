import type { CartItem } from "./types";

export type CartDisplayGroup<T extends CartItem = CartItem> = {
  key: string;
  product_id: number;
  option_id: number;
  cartItemIDs: number[];
  quantity: number;
  totalPrice: number;
  items: T[];
};

export function cartDisplayGroupKey(item: Pick<CartItem, "product_id" | "option_id">): string {
  return `${item.product_id}:${item.option_id}`;
}

export function groupCartItemsForDisplay<T extends CartItem>(
  items: readonly T[],
): CartDisplayGroup<T>[] {
  const groups = new Map<string, CartDisplayGroup<T>>();
  for (const item of items) {
    const key = cartDisplayGroupKey(item);
    const existing = groups.get(key);
    if (existing) {
      existing.cartItemIDs.push(item.id);
      existing.quantity += item.quantity;
      existing.totalPrice += item.price_at_added * item.quantity;
      existing.items.push(item);
      continue;
    }
    groups.set(key, {
      key,
      product_id: item.product_id,
      option_id: item.option_id,
      cartItemIDs: [item.id],
      quantity: item.quantity,
      totalPrice: item.price_at_added * item.quantity,
      items: [item],
    });
  }
  return [...groups.values()];
}

export function selectedCartItemIDsForGroups<T extends CartItem>(
  groups: readonly CartDisplayGroup<T>[],
  selectedGroupKeys: ReadonlySet<string>,
): number[] {
  return groups.flatMap((group) => selectedGroupKeys.has(group.key) ? group.cartItemIDs : []);
}
