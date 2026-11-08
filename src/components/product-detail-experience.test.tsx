import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import { useSessionStore } from "@/lib/session-store";
import { ProductDetailExperience } from "./product-detail-experience";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./safe-image", () => ({ SafeImage: () => <span /> }));
vi.mock("./collapsible-product-detail", () => ({ CollapsibleProductDetail: () => <div /> }));
vi.mock("./home-placement-cards", () => ({ PDPReviewBanner: () => null }));
vi.mock("./page-jump-controls", () => ({ PageJumpControls: () => null }));
vi.mock("./pdp-merchandising-sections", () => ({ PDPShelfSection: () => null }));
vi.mock("@/lib/api", () => ({
  api: {
    getProduct: vi.fn(),
    getProductReviews: vi.fn(),
    getProductReviewSummary: vi.fn(),
    getProductMarketShelf: vi.fn(),
    getSimilarProducts: vi.fn(),
    pdpReviewBanner: vi.fn(),
    listLikedProducts: vi.fn(),
    listWishlistedProducts: vi.fn(),
  },
}));

const product: Product = {
  id: 1,
  market_id: 1,
  category_id: 1,
  name: "레이어 테스트 상품",
  description: "",
  base_price: 29_900,
  discount_price: 0,
  shipping_type: "NORMAL",
  popularity_score: 1,
  status: "SELLING",
  in_stock: true,
  options: [{ id: 1, product_id: 1, option_name: "색상", option_value: "검정", additional_price: 0, quantity: 10, is_active: true }],
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
  useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: false });
  vi.mocked(api.getProduct).mockResolvedValue(product);
  vi.mocked(api.getProductReviews).mockResolvedValue([]);
  vi.mocked(api.getProductReviewSummary).mockResolvedValue({ product_id: product.id, review_count: 0, average_rating: 0 });
  vi.mocked(api.getProductMarketShelf).mockResolvedValue({ mode: "PLATFORM_RECOMMENDED", items: [] });
  vi.mocked(api.getSimilarProducts).mockResolvedValue({ items: [] });
});
afterEach(cleanup);

describe("ProductDetailExperience quick purchase layer", () => {
  it("returns guests to the same product after login for cart actions", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ProductDetailExperience productId={product.id} initialProduct={product} /></QueryClientProvider>);

    fireEvent.click(screen.getAllByRole("button", { name: "로그인 후 담기" })[0]);
    expect(push).toHaveBeenCalledWith("/login?next=%2Fproducts%2F1");
  });

  it("shows a back action above the product gallery", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ProductDetailExperience productId={product.id} initialProduct={product} /></QueryClientProvider>);

    const backButton = await screen.findByRole("button", { name: "뒤로가기" });
    expect(screen.getByRole("main").firstElementChild).toBe(backButton);
  });

  it("uses a spinner-only status while the review summary is loading", async () => {
    vi.mocked(api.getProductReviewSummary).mockReturnValue(new Promise(() => {}));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ProductDetailExperience productId={product.id} initialProduct={product} /></QueryClientProvider>);

    const loading = await screen.findByRole("status", { name: "별점을 불러오는 중입니다." });
    expect(loading.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
    expect(loading).not.toHaveTextContent("별점을 불러오는 중입니다.");
  });

  it("docks above the bottom navigation while remaining below its interaction layer", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ProductDetailExperience productId={product.id} initialProduct={product} /></QueryClientProvider>);

    const quickPurchase = await screen.findByRole("group", { name: "빠른 구매" });
    expect(quickPurchase).toHaveClass(
      "bottom-[var(--commerce-bottom-nav-height)]",
      "z-[var(--commerce-z-sticky)]",
    );
    expect(quickPurchase).not.toHaveClass("z-[var(--commerce-z-dropdown)]");
  });
});
