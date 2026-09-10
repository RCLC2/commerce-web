import { describe, expect, it } from "vitest";
import { shipmentFormIsDirty } from "./seller-operations-v2";

describe("shipmentFormIsDirty", () => {
  it("detects edits when an order has no delivery record yet", () => {
    expect(shipmentFormIsDirty(true, "CJ", "1234")).toBe(true);
  });

  it("does not mark untouched empty shipment fields as dirty", () => {
    expect(shipmentFormIsDirty(true, "", "")).toBe(false);
  });

  it("compares edits against existing delivery information", () => {
    const delivery = { carrier: "CJ", tracking_number: "1234" };
    expect(shipmentFormIsDirty(true, "CJ", "1234", delivery)).toBe(false);
    expect(shipmentFormIsDirty(true, "CJ", "5678", delivery)).toBe(true);
  });
});
