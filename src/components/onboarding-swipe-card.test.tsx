import { describe, expect, it } from "vitest";
import { swipeChoiceForDistance } from "./onboarding-swipe-card";

describe("swipeChoiceForDistance", () => {
  it("maps right to O, left to X, and snaps short gestures back", () => {
    expect(swipeChoiceForDistance(100)).toBe("LIKE");
    expect(swipeChoiceForDistance(-100)).toBe("DISLIKE");
    expect(swipeChoiceForDistance(40)).toBeNull();
  });
});
