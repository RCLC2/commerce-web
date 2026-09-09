import { describe, expect, it } from "vitest";
import {
  couponRewardIsOwned,
  eventRewardIsConfirmed,
} from "./event-rewards";

describe("event reward recovery", () => {
  it("uses coupon definition identity as the server-owned claim signal", () => {
    expect(couponRewardIsOwned(
      { reward_type: "COUPON", reward_id: 17 },
      [{ coupon_id: 17 }],
    )).toBe(true);
    expect(couponRewardIsOwned(
      { reward_type: "POINT_EVENT", reward_id: 17 },
      [{ coupon_id: 17 }],
    )).toBe(false);
  });

  it("never lets local point confirmations prove coupon ownership", () => {
    const confirmedRows = new Set([4, 5]);
    expect(eventRewardIsConfirmed(
      { id: 4, reward_type: "COUPON", reward_id: 17 },
      [],
      confirmedRows,
    )).toBe(false);
    expect(eventRewardIsConfirmed(
      { id: 4, reward_type: "POINT_EVENT", reward_id: 17 },
      [],
      confirmedRows,
    )).toBe(true);
  });
});
