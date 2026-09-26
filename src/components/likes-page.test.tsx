import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import type { Product } from "@/lib/types";
import { ControlledIntersectionObserver } from "@/test/controlled-intersection-observer";
import { LikesPage } from "./likes-page";

vi.mock("@/lib/api", () => ({
  api: {
    listLikedProducts: vi.fn(),
    listWishlistedProducts: vi.fn(),
  },
}));
vi.mock("./product-card", () => ({ ProductCard: ({ product }: { product: Product }) => <article>{product.name}</article> }));

beforeEach(() => {
  vi.clearAllMocks();
  ControlledIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", ControlledIntersectionObserver);
  useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: true });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mountLikesPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><LikesPage /></QueryClientProvider>);
}

describe("likes guest state", () => {
  it("shows the shared heart-marked login card without requesting saved products", () => {
    mountLikesPage();

    const title = screen.getByText("로그인이 필요합니다");
    const card = title.parentElement;
    expect(card).toHaveClass("rounded-surface", "border-dashed");
    expect(card?.querySelector("svg.lucide-heart")).toBeInTheDocument();
    expect(screen.getByText("좋아요한 상품과 찜한 상품을 확인하려면 로그인해주세요.")).toBeInTheDocument();
    const login = screen.getByRole("link", { name: "로그인하기" });
    expect(login).toHaveAttribute("href", "/login?next=/likes");
    expect(login.querySelector("button")).toBeNull();
    expect(api.listLikedProducts).not.toHaveBeenCalled();
    expect(api.listWishlistedProducts).not.toHaveBeenCalled();
  });
});

it("reveals the rest of saved products on scroll while preserving the first set", async () => {
  useSessionStore.setState({ accessToken: "token", memberID: 1, role: "USER", hydrated: true });
  const products = Array.from({ length: 21 }, (_, index) => ({
    id: index + 1, market_id: 1, category_id: 1, name: `저장 상품 ${index + 1}`,
    description: "", base_price: 1000, discount_price: 0, coupon_lowest_price: 0, shipping_type: "NORMAL",
    popularity_score: 1, status: "SELLING" as const,
  }));
  vi.mocked(api.listLikedProducts).mockResolvedValue(products);
  vi.mocked(api.listWishlistedProducts).mockResolvedValue([]);

  mountLikesPage();
  expect(await screen.findByText("저장 상품 20")).toBeVisible();
  expect(screen.queryByText("저장 상품 21")).not.toBeInTheDocument();
  await waitFor(() => expect(ControlledIntersectionObserver.forLabel("저장한 상품")).toBeDefined());
  ControlledIntersectionObserver.forLabel("저장한 상품")?.intersect();

  expect(await screen.findByText("저장 상품 21")).toBeVisible();
  expect(screen.getByText("저장 상품 1")).toBeVisible();
  expect(screen.queryByRole("button", { name: "다음" })).not.toBeInTheDocument();
});
