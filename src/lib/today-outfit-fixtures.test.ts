import { describe, expect, it } from "vitest";
import { outfitLooksByGender, outfitSlotOrder } from "./today-outfit-fixtures";

describe("today outfit fixtures", () => {
  it.each(["female", "male"] as const)("provides ten complete %s looks", (gender) => {
    const looks = outfitLooksByGender[gender];
    expect(looks).toHaveLength(10);
    expect(new Set(looks.map((look) => look.id)).size).toBe(10);
    for (const look of looks) {
      expect(look.gender).toBe(gender);
      expect(Object.keys(look.slots).sort()).toEqual([...outfitSlotOrder].sort());
      expect(Object.values(look.slots).every((slot) => slot.name.length > 0 && slot.price > 0)).toBe(true);
    }
  });
});
