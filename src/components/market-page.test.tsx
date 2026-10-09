import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import type { Market } from "@/lib/types";
import { MarketPage } from "./market-page";

const { back, push } = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push }) }));
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
  vi.stubGlobal("navigation", { currentEntry: { index: 0 }, entries: () => [{ url: window.location.href }] });
  useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: true });
  vi.mocked(api.getMarket).mockResolvedValue(market);
  vi.mocked(api.listPLPProducts).mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0, total_pages: 0 });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("MarketPage layout", () => {
  it("uses the common detail hero structure without a feature-card wrapper", async () => {
    renderPage();

    const heading = await screen.findByRole("heading", { name: market.name });
    const main = screen.getByRole("main");
    const header = heading.closest("header");
    const images = screen.getAllByRole("img");
    const cover = images[0];

    const backButton = screen.getByRole("button", { name: "뒤로가기" });
    expect(main.firstElementChild).toBe(backButton);
    expect(backButton.nextElementSibling).toBe(header);
    expect(backButton).toBeVisible();
    expect(cover.parentElement).toHaveClass("rounded-md", "overflow-hidden");
    expect(header).not.toHaveClass("rounded-feature", "shadow-card");
    expect(cover.closest(".rounded-feature")).toBeNull();
    expect(screen.getByRole("heading", { name: "마켓 상품" })).toBeVisible();
    fireEvent.click(backButton);
    expect(push).toHaveBeenCalledWith("/markets");
    expect(back).not.toHaveBeenCalled();
  });

  it("returns to the previous site page from the new market layout", async () => {
    vi.stubGlobal("navigation", {
      currentEntry: { index: 1 },
      entries: () => [{ url: `${window.location.origin}/markets` }, { url: window.location.href }],
    });
    renderPage();
    await screen.findByRole("heading", { name: market.name });
    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(back).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps back navigation available while the market is loading", () => {
    vi.mocked(api.getMarket).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("status", { name: "마켓을 불러오는 중입니다." })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(push).toHaveBeenCalledWith("/markets");
  });

  it("keeps back navigation and retry available after a market request fails", async () => {
    vi.mocked(api.getMarket).mockRejectedValue(new Error("market unavailable"));
    renderPage();
    expect(await screen.findByRole("heading", { name: "마켓을 불러오지 못했습니다." })).toBeVisible();
    expect(screen.getByRole("button", { name: "마켓 다시 불러오기" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(push).toHaveBeenCalledWith("/markets");
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
