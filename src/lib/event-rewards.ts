type CouponReward = { id?: number; reward_type: string; reward_id: number };
type OwnedCouponIdentity = { coupon_id: number };

export function couponRewardIsOwned(
  reward: CouponReward,
  coupons: readonly OwnedCouponIdentity[] | undefined,
): boolean {
  return reward.reward_type === "COUPON"
    && Boolean(coupons?.some((coupon) => coupon.coupon_id === reward.reward_id));
}

export function eventRewardIsConfirmed(
  reward: CouponReward & { id: number },
  coupons: readonly OwnedCouponIdentity[] | undefined,
  confirmedPointRewardRows: ReadonlySet<number>,
): boolean {
  return reward.reward_type === "COUPON"
    ? couponRewardIsOwned(reward, coupons)
    : confirmedPointRewardRows.has(reward.id);
}
