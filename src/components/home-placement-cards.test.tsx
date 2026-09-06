import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ResolvedHomeCard } from "@/lib/api/home-placements";
import { HomeFeatureCard } from "./home-placement-cards";

describe("HomeFeatureCard", () => {
  it("renders an eligible coupon from the shared platform card slot", () => {
    const card: ResolvedHomeCard = {
      source: "PLATFORM",
      id: 12,
      card_type: "SIGNUP_COUPON",
      headline: "가입 축하 쿠폰이 도착했어요",
      body: "회원님에게만 보이는 혜택이에요",
      coupon_id: 3,
      cta_label: "쿠폰 받기",
      landing_url: "/mypage/coupons",
    };

    render(
      <QueryClientProvider client={new QueryClient()}>
        <HomeFeatureCard card={card} token="member-token" memberID={7} />
      </QueryClientProvider>,
    );

    expect(screen.getByText("가입 축하 쿠폰이 도착했어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "쿠폰 받기" })).toBeInTheDocument();
  });
});
