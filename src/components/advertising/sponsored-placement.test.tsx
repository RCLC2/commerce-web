import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { api } from "@/lib/api";
import type { AdDecision } from "@/lib/api/advertising";
import { resetAdImpressionRegistryForTests } from "@/hooks/use-ad-impression";
import { useSessionStore } from "@/lib/session-store";
import { SponsoredDecision, SponsoredPlacement } from "./sponsored-placement";

class NoopIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0.5];
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();
}

beforeEach(() => {
  resetAdImpressionRegistryForTests();
  useSessionStore.setState({ hydrated: true, accessToken: null, memberID: null, role: null, sellerContext: null });
  vi.stubGlobal("IntersectionObserver", NoopIntersectionObserver);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SponsoredPlacement", () => {
  it("waits for session hydration and then sends the optional member token", async () => {
    useSessionStore.setState({ hydrated: false, accessToken: "member-token" });
    const decision = vi.spyOn(api, "adDecision").mockResolvedValue(null);
    renderPlacement("home.main_banner");

    expect(decision).not.toHaveBeenCalled();
    useSessionStore.setState({ hydrated: true });

    await waitFor(() => expect(decision).toHaveBeenCalledWith(expect.objectContaining({ placement_key: "home.main_banner" }), "member-token"));
  });

  it("isolates no-fill and decision failures without hiding surrounding content", async () => {
    const decision = vi.spyOn(api, "adDecision")
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new ApiError("광고 결정 실패", "http", 500, undefined, "AD_DECISION_FAILED", "request-7"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const first = renderPlacement("home_feed.sponsored_card");
    await waitFor(() => expect(decision).toHaveBeenCalledTimes(1));
    expect(first.container).toBeEmptyDOMElement();
    first.unmount();

    const second = renderPlacement("search.sponsored_top");
    await waitFor(() => expect(consoleError).toHaveBeenCalledWith("[commerce-advertising-error]", expect.objectContaining({
      placement_key: "search.sponsored_top",
      code: "AD_DECISION_FAILED",
      request_id: "request-7",
    })));
    expect(second.container).toBeEmptyDOMElement();
  });
});

describe("SponsoredDecision", () => {
  it.each([
    ["PRODUCT_CARD", productCardDecision()],
    ["BANNER", bannerDecision()],
    ["MARKET_SHELF", marketShelfDecision()],
    ["IN_APP", inAppDecision()],
  ])("renders %s with exactly one top-right SPONSORED disclosure", (_format, decision) => {
    render(<SponsoredDecision decision={decision} />);

    expect(screen.getAllByText("SPONSORED")).toHaveLength(1);
    expect(screen.getByText("SPONSORED")).toHaveClass("right-3", "top-3");
  });

  it("renders a responsive banner with descriptive alt text and Pexels attribution links", () => {
    render(<SponsoredDecision decision={bannerDecision()} />);

    expect(screen.getByRole("img", { name: "테스트 상품 스폰서드 배너" })).toHaveClass("object-cover");
    expect(screen.getByRole("link", { name: "Jane Doe" })).toHaveAttribute("href", "https://www.pexels.com/@jane");
    expect(screen.getByRole("link", { name: "Pexels" })).toHaveAttribute("href", "https://www.pexels.com/photo/88");
  });

  it("keeps market carousel controls separate and keyboard-labelled", () => {
    render(<SponsoredDecision decision={marketShelfDecision()} />);

    expect(screen.getByRole("button", { name: "테스트 마켓 이전 상품" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "테스트 마켓 다음 상품" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /마켓 상품/ })).toHaveAttribute("href", "/products/9");
  });
});

function renderPlacement(placementKey: "home.main_banner" | "home_feed.sponsored_card" | "search.sponsored_top") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SponsoredPlacement placementKey={placementKey} />
    </QueryClientProvider>,
  );
}

function productCardDecision(): AdDecision {
  return baseDecision({
    placement_key: "home_feed.sponsored_card",
    target: productTarget(),
    creative: { id: 1, format: "PRODUCT_CARD", landing_url: "/products/7" },
  });
}

function bannerDecision(): AdDecision {
  return baseDecision({
    placement_key: "home.main_banner",
    target: productTarget(),
    creative: {
      id: 2,
      format: "BANNER",
      headline: "주간 추천",
      image_url: "https://images.pexels.com/banner.jpg",
      landing_url: "/products/7",
      cta_label: "자세히 보기",
      pexels_photo_id: 88,
      pexels_photographer: "Jane Doe",
      pexels_photographer_url: "https://www.pexels.com/@jane",
      pexels_photo_url: "https://www.pexels.com/photo/88",
    },
  });
}

function marketShelfDecision(): AdDecision {
  return baseDecision({
    placement_key: "pdp.sponsored_market",
    target: {
      type: "MARKET",
      market: {
        id: 3,
        name: "테스트 마켓",
        description: "테스트 설명",
        products: [{
          id: 9,
          market_id: 3,
          market_name: "테스트 마켓",
          name: "마켓 상품",
          base_price: 30_000,
          discount_price: 25_000,
        }],
      },
    },
    creative: { id: 3, format: "MARKET_SHELF", landing_url: "/markets/3" },
  });
}

function inAppDecision(): AdDecision {
  return baseDecision({
    placement_key: "crm.in_app_notification",
    target: productTarget(),
    creative: { id: 4, format: "IN_APP", headline: "새 소식", body: "추천 상품을 확인하세요", landing_url: "/products/7" },
  });
}

function productTarget(): Extract<AdDecision["target"], { type: "PRODUCT" }> {
  return {
    type: "PRODUCT",
    product: {
      id: 7,
      market_id: 3,
      market_name: "테스트 마켓",
      name: "테스트 상품",
      image_url: "https://images.pexels.com/product.jpg",
      base_price: 50_000,
      discount_price: 40_000,
    },
  };
}

function baseDecision(overrides: Pick<AdDecision, "placement_key" | "target" | "creative">): AdDecision {
  return {
    decision_id: `decision-${overrides.creative.id}`,
    request_id: `request-${overrides.creative.id}`,
    campaign_id: overrides.creative.id,
    decided_at: "2026-08-29T00:00:00Z",
    expires_at: "2026-08-29T00:15:00Z",
    ...overrides,
  };
}
