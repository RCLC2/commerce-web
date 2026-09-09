import { describe, expect, it } from "vitest";
import {
  availableOptionQuantity,
  canWriteOrderLineReview,
  clampOptionQuantity,
  findNewMatchingCartItem,
  firstSellableOption,
  includesProduct,
  reviewedOrderLineItemIDs,
  validCollectionPage,
} from "./product-engagement";

describe("product engagement state", () => {
  it("derives persisted state from the server collection", () => {
    expect(includesProduct([{ id: 1 }, { id: 7 }], 7)).toBe(true);
    expect(includesProduct([{ id: 1 }], 7)).toBe(false);
    expect(includesProduct(undefined, 7)).toBe(false);
  });

  it("clamps a stale collection page after items are removed or tabs change", () => {
    expect(validCollectionPage(3, 20, 20)).toBe(1);
    expect(validCollectionPage(0, 45, 20)).toBe(1);
    expect(validCollectionPage(3, 45, 20)).toBe(3);
  });

  it("rejects invalid page sizes", () => {
    expect(() => validCollectionPage(1, 10, 0)).toThrow(RangeError);
  });

  it("recovers reviewed order lines from persisted reviews", () => {
    expect([...reviewedOrderLineItemIDs([
      { order_line_item_id: 11 },
      {},
      { order_line_item_id: 13 },
    ])]).toEqual([11, 13]);
  });

  it("offers review writing only after status loads and no persisted or local review exists", () => {
    const base = {
      reviewable: true,
      reviewStatusLoaded: true,
      serverReviewed: false,
      submitted: false,
    };
    expect(canWriteOrderLineReview(base)).toBe(true);
    expect(canWriteOrderLineReview({ ...base, reviewStatusLoaded: false })).toBe(false);
    expect(canWriteOrderLineReview({ ...base, serverReviewed: true })).toBe(false);
    expect(canWriteOrderLineReview({ ...base, submitted: true })).toBe(false);
    expect(canWriteOrderLineReview({ ...base, reviewable: undefined })).toBe(false);
  });

  it("selects and clamps against active unreserved inventory", () => {
    const options = [
      { id: 1, quantity: 5, reserved_quantity: 5, is_active: true },
      { id: 2, quantity: 10, reserved_quantity: 3, is_active: false },
      { id: 3, quantity: 4, reserved_quantity: 1, is_active: true },
    ];

    expect(firstSellableOption(options)?.id).toBe(3);
    expect(availableOptionQuantity(options[2])).toBe(3);
    expect(clampOptionQuantity(9, options[2])).toBe(3);
    expect(clampOptionQuantity(0, options[2])).toBe(1);
  });

  it("reconciles only one newly-created matching cart row", () => {
    const before = [{ id: 1, product_id: 7, option_id: 2, quantity: 1 }];
    const input = { product_id: 7, option_id: 3, quantity: 2 };
    const created = { id: 2, ...input };

    expect(findNewMatchingCartItem(before, [...before, created], input)).toEqual(created);
    expect(findNewMatchingCartItem(before, before, input)).toBeUndefined();
    expect(findNewMatchingCartItem(before, [...before, created, { ...created, id: 3 }], input)).toBeUndefined();
  });
});
