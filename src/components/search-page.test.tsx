import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { Product, TrendingSearchResponse } from "@/lib/types";
import { ControlledIntersectionObserver } from "@/test/controlled-intersection-observer";
import { SearchPage } from "./search-page";

const push = vi.hoisted(() => vi.fn());
let currentSearchParams = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(currentSearchParams),
}));

vi.mock("@/lib/api", () => ({
  api: {
    search: vi.fn(),
    searchSuggestions: vi.fn(),
    trendingSearches: vi.fn(),
  },
}));
vi.mock("./advertising/sponsored-placement", () => ({ SponsoredPlacement: () => null }));
vi.mock("./product-card", () => ({ ProductCard: ({ product }: { product: Product }) => <article>{product.name}</article> }));
vi.mock("./safe-image", () => ({ SafeImage: () => <span /> }));

function mountSearchPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><SearchPage /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentSearchParams = "";
  ControlledIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", ControlledIntersectionObserver);
  vi.mocked(api.searchSuggestions).mockResolvedValue([]);
});

it("offers live suggestions and opens the keyboard-selected keyword", async () => {
  vi.mocked(api.trendingSearches).mockResolvedValue({ segment: "women", segments: [], items: [] });
  vi.mocked(api.searchSuggestions).mockResolvedValue([
    { id: "one", type: "KEYWORD", label: "린넨 셔츠", href: "/search?q=linen" },
    { id: "two", type: "KEYWORD", label: "린넨 팬츠", href: "/search?q=pants" },
  ]);
  mountSearchPage();

  const input = screen.getByRole("combobox", { name: "검색어 입력" });
  fireEvent.change(input, { target: { value: "린넨" } });
  expect(await screen.findByRole("option", { name: "린넨 팬츠 검색어" })).toBeVisible();
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(screen.getByRole("option", { name: "린넨 팬츠 검색어" })).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(input, { key: "Enter" });
  expect(push).toHaveBeenCalledWith(`/search?q=${encodeURIComponent("린넨 팬츠")}&audience=women`);
});

it("shows suggestion loading and failure feedback while keeping text search available", async () => {
  vi.mocked(api.trendingSearches).mockResolvedValue({ segment: "women", segments: [], items: [] });
  vi.mocked(api.searchSuggestions).mockRejectedValue(new Error("offline"));
  mountSearchPage();

  const input = screen.getByRole("combobox", { name: "검색어 입력" });
  fireEvent.change(input, { target: { value: "셔츠" } });
  expect(await screen.findByText("추천 검색어를 찾는 중입니다.")).toBeVisible();
  expect(await screen.findByText(/추천 검색어를 불러오지 못했습니다/)).toBeVisible();
  fireEvent.submit(input.closest("form")!);
  expect(push).toHaveBeenCalledWith(`/search?q=${encodeURIComponent("셔츠")}&audience=women`);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("SearchPage trending-search feedback", () => {
  it("uses the shared spinner while popular searches are loading", async () => {
    vi.mocked(api.trendingSearches).mockImplementation(() => new Promise<TrendingSearchResponse>(() => {}));

    mountSearchPage();

    const loading = await screen.findByRole("status", { name: "인기 검색어를 불러오는 중입니다." });
    expect(loading.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
  });

  it("uses the search-marked empty state when popular searches are empty", async () => {
    vi.mocked(api.trendingSearches).mockResolvedValue({
      segment: "women",
      segments: [{ id: "women", label: "여성" }, { id: "men", label: "남성" }],
      items: [],
    });

    mountSearchPage();

    expect(await screen.findByText("표시할 인기 검색어가 없습니다")).toBeVisible();
    expect(screen.getByText("다른 검색어를 입력해 원하는 상품과 마켓을 찾아보세요.")).toBeVisible();
    expect(screen.getByText("표시할 인기 검색어가 없습니다").parentElement?.querySelector("svg")).toHaveClass("lucide-search");
  });
});

it("appends product and market search results independently as each list scrolls", async () => {
  currentSearchParams = "q=shirt";
  const product = {
    id: 1, market_id: 1, category_id: 1, name: "첫 검색 상품", description: "",
    base_price: 1000, discount_price: 0, coupon_lowest_price: 0, shipping_type: "NORMAL", popularity_score: 1, status: "SELLING" as const,
  } satisfies Product;
  vi.mocked(api.search).mockImplementation(async ({ productPage, marketPage }) => ({
    q: "shirt",
    products: { items: [{ ...product, id: productPage ?? 1, name: productPage === 2 ? "다음 검색 상품" : product.name }], page: productPage ?? 1, page_size: 1, total: 2, total_pages: 2 },
    markets: { items: [{ id: marketPage ?? 1, name: marketPage === 2 ? "다음 검색 마켓" : "첫 검색 마켓", description: "", status: "OPEN" }], page: marketPage ?? 1, page_size: 1, total: 2, total_pages: 2 },
    suggestions: [], related_keywords: [], sections: [],
  }));

  mountSearchPage();
  expect(await screen.findByText("첫 검색 상품")).toBeVisible();
  await waitFor(() => expect(ControlledIntersectionObserver.forLabel("검색 상품")).toBeDefined());
  ControlledIntersectionObserver.forLabel("검색 상품")?.intersect();
  expect(await screen.findByText("다음 검색 상품")).toBeVisible();
  expect(screen.getByText("첫 검색 상품")).toBeVisible();

  await waitFor(() => expect(ControlledIntersectionObserver.forLabel("검색 마켓")).toBeDefined());
  ControlledIntersectionObserver.forLabel("검색 마켓")?.intersect();
  expect(await screen.findByText("다음 검색 마켓")).toBeVisible();
  expect(screen.getByText("첫 검색 마켓")).toBeVisible();
  expect(api.search).toHaveBeenCalledWith(expect.objectContaining({ productPage: 2, marketPage: 1 }));
  expect(api.search).toHaveBeenCalledWith(expect.objectContaining({ productPage: 1, marketPage: 2 }));
  expect(screen.queryByRole("navigation", { name: "상품" })).not.toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "마켓" })).not.toBeInTheDocument();
});

it("offers related keywords when a search has no products", async () => {
  currentSearchParams = "q=없는상품";
  vi.mocked(api.search).mockResolvedValue({
    q: "없는상품",
    products: { items: [], page: 1, page_size: 8, total: 0, total_pages: 0 },
    markets: { items: [], page: 1, page_size: 8, total: 0, total_pages: 0 },
    suggestions: [{ id: "keyword-1", type: "KEYWORD", label: "가을 재킷", href: "/search?q=가을%20재킷" }],
    related_keywords: ["가을 재킷", "니트"],
    sections: [],
  });

  mountSearchPage();

  expect(await screen.findByText("검색된 상품이 없습니다")).toBeVisible();
  expect(screen.getAllByRole("button", { name: "가을 재킷" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "가을 재킷" }));
  expect(push).toHaveBeenCalledWith("/search?q=%EA%B0%80%EC%9D%84%20%EC%9E%AC%ED%82%B7&audience=women");
});
