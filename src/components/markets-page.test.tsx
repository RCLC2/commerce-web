import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import type { Market } from "@/lib/types";
import { MarketsPage } from "./markets-page";

vi.mock("./safe-image", () => ({
  SafeImage: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

vi.mock("./product-card", () => ({
  ProductCard: ({ product }: { product: { name: string } }) => <div>{product.name}</div>,
}));

beforeEach(() => {
  useSessionStore.setState({ hydrated: true, accessToken: null, memberID: null, role: null, sellerContext: null });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MarketsPage", () => {
  it("keeps public market discovery as the primary experience for guests", async () => {
    const trending = market({ id: 1, name: "지금 뜨는 곳", recent_follower_count: 23 });
    const active = market({ id: 2, name: "신상 맛집", new_product_count: 11 });
    const listMarkets = vi.spyOn(api, "listMarkets").mockImplementation(async ({ sort } = {}) => (
      sort === "trending" ? [trending] : [active]
    ));
    const listMarketFeed = vi.spyOn(api, "listMarketFeed");

    renderPage();

    expect(await screen.findByRole("heading", { name: "마켓" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "지금 뜨는 마켓" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "신상이 활발한 마켓" })).toBeVisible();
    expect(await screen.findByText("지금 뜨는 곳")).toBeVisible();
    expect(await screen.findByText("신상 맛집")).toBeVisible();
    expect(screen.getByText("이번 주 +23명")).toBeVisible();
    expect(screen.getByText("신상품 11개")).toBeVisible();
    expect(listMarkets).toHaveBeenCalledWith({ sort: "trending", limit: 12 });
    expect(listMarkets).toHaveBeenCalledWith({ sort: "new-products", limit: 12 });
    expect(listMarketFeed).not.toHaveBeenCalled();
  });

  it("shows followed-market products in a secondary section without replacing discovery", async () => {
    useSessionStore.setState({ hydrated: true, accessToken: "member-token", memberID: 7 });
    vi.spyOn(api, "listMarkets").mockResolvedValue([market({ id: 1, name: "공개 마켓" })]);
    vi.spyOn(api, "listMarketFeed").mockResolvedValue({
      items: [{
        market: { id: 3, name: "팔로우 마켓", follower_count: 120 },
        product: {
          id: 9,
          market_id: 3,
          category_id: 1,
          name: "팔로우 신상품",
          description: "",
          base_price: 30_000,
          discount_price: 0,
          shipping_type: "NORMAL",
          popularity_score: 0,
          status: "SELLING",
        },
        published_at: "2026-09-06T00:00:00Z",
      }],
    });

    renderPage();

    const trendingHeading = await screen.findByRole("heading", { name: "지금 뜨는 마켓" });
    expect(trendingHeading).toBeVisible();
    expect(screen.getByRole("heading", { name: "신상이 활발한 마켓" })).toBeVisible();
    const followingHeading = await screen.findByRole("heading", { name: "내가 팔로우중인 마켓의 신상품" });
    expect(followingHeading).toBeVisible();
    expect(followingHeading.compareDocumentPosition(trendingHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("팔로우 신상품")).toBeVisible();
    await waitFor(() => expect(api.listMarketFeed).toHaveBeenCalledWith("member-token", { limit: 8 }));
  });
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MarketsPage />
    </QueryClientProvider>,
  );
}

function market(overrides: Partial<Market> & Pick<Market, "id" | "name">): Market {
  return {
    description: "설명",
    follower_count: 100,
    status: "OPEN",
    ...overrides,
  };
}
