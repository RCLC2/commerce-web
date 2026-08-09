import { describe, expect, it } from "vitest";
import { formatFollowerCount } from "./utils";

describe("formatFollowerCount", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1_000, "1k"],
    [1_999, "1k"],
    [2_000, "2k"],
    [12_999, "12k"],
  ])("formats %i followers as %s", (count, expected) => {
    expect(formatFollowerCount(count)).toBe(expected);
  });

  it("normalizes negative and fractional values", () => {
    expect(formatFollowerCount(-1)).toBe("0");
    expect(formatFollowerCount(1_999.9)).toBe("1k");
  });
});
