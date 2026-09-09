import { describe, expect, it } from "vitest";
import { formatFollowerCount } from "./utils";

describe("formatFollowerCount", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1_000, "1,000"],
    [1_999, "1,999"],
    [2_000, "2,000"],
    [10_000, "1만"],
    [12_999, "1.2만"],
  ])("formats %i followers as %s", (count, expected) => {
    expect(formatFollowerCount(count)).toBe(expected);
  });

  it("normalizes negative and fractional values", () => {
    expect(formatFollowerCount(-1)).toBe("0");
    expect(formatFollowerCount(1_999.9)).toBe("1,999");
  });
});
