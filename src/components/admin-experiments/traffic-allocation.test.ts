import { describe, expect, it } from "vitest";
import { adjustBoundary, allocateAll, cumulativeBoundaries, equalWeights, normalizeWeights } from "./traffic-allocation";

describe("traffic allocation", () => {
  it("changes only adjacent variants and preserves 100 percent", () => {
    expect(adjustBoundary([20, 30, 50], 0, 10)).toEqual([30, 20, 50]);
    expect(adjustBoundary([20, 30, 50], 1, -30)).toEqual([20, 0, 80]);
  });

  it("allows zero and one hundred percent boundaries", () => {
    expect(adjustBoundary([50, 50], 0, 100)).toEqual([100, 0]);
    expect(allocateAll(3, 1)).toEqual([0, 100, 0]);
  });

  it("distributes rounding deterministically", () => {
    expect(equalWeights(3)).toEqual([34, 33, 33]);
    expect(normalizeWeights([1, 1, 1])).toEqual([34, 33, 33]);
    expect(cumulativeBoundaries([20, 30, 50])).toEqual([20, 50]);
  });
});
