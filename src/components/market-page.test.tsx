import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import type { Market } from "@/lib/types";
import { MarketPage } from "./market-page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api", () => ({
  api: {
    getMarket: vi.fn(),
    listPLPProducts: vi.fn(),
    getMarketFollowStatus: vi.fn(),
    followMarket: vi.fn(),
    unfollowMarket: vi.fn(),
  },
}));
vi.mock("./safe-image", () => ({
  SafeImage: ({ alt }: { alt: string }) => <span aria-label={alt || undefined} role="img" />,
}));
vi.mock("./product-card", () => ({ ProductCard: () => <article>상품</article> }));

const market: Market = {
  id: 11,
  name: "K-Trend Select",
  description: "서울의 감각적인 스타일을 소개합니다.",
  cover_image_url: "/market-cover.jpg",
  profile_image_url: "/market-profile.jpg",
  follower_count: 25,
  status: "OPEN",
};

beforeEach(() => {
  vi.clearAllMocks();
  useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: true });
  vi.mocked(api.getMarket).mockResolvedValue(market);
  vi.mocked(api.listPLPProducts).mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0, total_pages: 0 });
});

afterEach(cleanup);

describe("MarketPage layout", () => {
  it("uses the common detail hero structure without a feature-card wrapper", async () => {
    renderPage();

    const heading = await screen.findByRole("heading", { name: market.name });
    const main = screen.getByRole("main");
    const header = heading.closest("header");
    const images = screen.getAllByRole("img");
    const cover = images[0];

    expect(main.firstElementChild).toBe(header);
    expect(header).toHaveClass("pt-5");
    expect(cover.parentElement).toHaveClass("rounded-md", "overflow-hidden");
    expect(header).not.toHaveClass("rounded-feature", "shadow-card");
    expect(cover.closest(".rounded-feature")).toBeNull();
    expect(screen.getByRole("heading", { name: "마켓 상품" })).toBeVisible();
  });
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MarketPage marketId={market.id} />
    </QueryClientProvider>,
  );
}
