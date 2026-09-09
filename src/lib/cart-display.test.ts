import { describe, expect, it } from "vitest";
import { groupCartItemsForDisplay, selectedCartItemIDsForGroups } from "./cart-display";
import type { CartItem } from "./types";

const item = (overrides: Partial<CartItem> & Pick<CartItem, "id">): CartItem => ({
  member_id: 7,
  product_id: 10,
  option_id: 20,
  quantity: 1,
  price_at_added: 15_000,
  ...overrides,
});

describe("groupCartItemsForDisplay", () => {
  it("combines matching product options while retaining every source cart id", () => {
    const groups = groupCartItemsForDisplay([
      item({ id: 1 }),
      item({ id: 2 }),
      item({ id: 3 }),
    ]);

    expect(groups).toEqual([expect.objectContaining({
      key: "10:20",
      cartItemIDs: [1, 2, 3],
      quantity: 3,
      totalPrice: 45_000,
    })]);
  });

  it("keeps different options separate and sums price snapshots exactly", () => {
    const groups = groupCartItemsForDisplay([
      item({ id: 1, price_at_added: 15_000 }),
      item({ id: 2, price_at_added: 17_000, quantity: 2 }),
      item({ id: 3, option_id: 21 }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ quantity: 3, totalPrice: 49_000 });
    expect(groups[1]).toMatchObject({ key: "10:21", quantity: 1 });
  });
});

describe("selectedCartItemIDsForGroups", () => {
  it("expands selected display groups back to original ids", () => {
    const groups = groupCartItemsForDisplay([
      item({ id: 11 }),
      item({ id: 12 }),
      item({ id: 13, option_id: 21 }),
    ]);

    expect(selectedCartItemIDsForGroups(groups, new Set(["10:20"]))).toEqual([11, 12]);
  });
});
