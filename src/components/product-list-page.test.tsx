import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { PLPInformation, Product } from "@/lib/types";
import { ControlledIntersectionObserver } from "@/test/controlled-intersection-observer";
import { ProductListPage } from "./product-list-page";

const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams("category=tops"),
}));
vi.mock("@/lib/api", () => ({ api: { getPLPInformation: vi.fn(), listPLPProducts: vi.fn() } }));
vi.mock("./product-card", () => ({ ProductCard: ({ product, recentlyViewed, onVisit }: { product: Product; recentlyViewed?: boolean; onVisit?: () => void }) => <article><button onClick={onVisit}>{product.name}</button>{recentlyViewed ? <span>최근 본 상품</span> : null}</article> }));

const product: Product = {
  id: 1, market_id: 1, category_id: 1, name: "첫 상품", description: "",
  base_price: 1000, discount_price: 0, shipping_type: "NORMAL", popularity_score: 1, status: "SELLING",
};
const information: PLPInformation = {
  categories: [{ id: 1, name: "상의", slug: "tops", href: "/products?category=tops", depth: 1, level: 1, sort_order: 1, category_ids: [1] }],
  total_product_count: 2,
  price_ranges: [],
  sort_options: [{ code: "popular", label: "인기순" }],
  default_sort: "popular",
  tag_chips: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  ControlledIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", ControlledIntersectionObserver);
  window.sessionStorage.clear();
});

it("marks the product just opened when returning to the same filtered list", async () => {
  vi.mocked(api.getPLPInformation).mockResolvedValue(information);
  vi.mocked(api.listPLPProducts).mockResolvedValue({ items: [product], page: 1, page_size: 1, total: 1, total_pages: 1 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const firstVisit = render(<QueryClientProvider client={client}><ProductListPage /></QueryClientProvider>);

  fireEvent.click(await screen.findByRole("button", { name: "첫 상품" }));
  firstVisit.unmount();
  render(<QueryClientProvider client={client}><ProductListPage /></QueryClientProvider>);

  expect(await screen.findByText("최근 본 상품")).toBeVisible();
});

it("offers a direct filter reset from an empty product list", async () => {
  vi.mocked(api.getPLPInformation).mockResolvedValue(information);
  vi.mocked(api.listPLPProducts).mockResolvedValue({ items: [], page: 1, page_size: 8, total: 0, total_pages: 0 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProductListPage /></QueryClientProvider>);

  const reset = await screen.findByRole("button", { name: "필터 초기화하고 전체 상품 보기" });
  fireEvent.click(reset);
  expect(replace).toHaveBeenCalledWith("/products");
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("keeps category products visible while loading the next result page on scroll", async () => {
  vi.mocked(api.getPLPInformation).mockResolvedValue(information);
  vi.mocked(api.listPLPProducts)
    .mockResolvedValueOnce({ items: [product], page: 1, page_size: 1, total: 2, total_pages: 2 })
    .mockResolvedValueOnce({ items: [{ ...product, id: 2, name: "다음 상품" }], page: 2, page_size: 1, total: 2, total_pages: 2 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProductListPage /></QueryClientProvider>);

  expect(await screen.findByText("첫 상품")).toBeVisible();
  await waitFor(() => expect(ControlledIntersectionObserver.forLabel("상품")).toBeDefined());
  ControlledIntersectionObserver.forLabel("상품")?.intersect();

  expect(await screen.findByText("다음 상품")).toBeVisible();
  expect(screen.getByText("첫 상품")).toBeVisible();
  expect(api.listPLPProducts).toHaveBeenNthCalledWith(2, expect.objectContaining({ categoryIDs: [1], page: 2 }));
  expect(screen.queryByRole("navigation", { name: "상품 페이지" })).not.toBeInTheDocument();
});

it("stages mobile filters and shows the matching count before applying", async () => {
  vi.mocked(api.getPLPInformation).mockResolvedValue(information);
  vi.mocked(api.listPLPProducts).mockImplementation(async ({ onSale, pageSize } = {}) => ({
    items: pageSize === 1 ? [] : [product], page: 1, page_size: pageSize ?? 8,
    total: onSale ? 3 : 12, total_pages: onSale ? 3 : 2,
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProductListPage /></QueryClientProvider>);

  fireEvent.click(await screen.findByRole("button", { name: "조건 선택" }));
  const sheet = screen.getByRole("dialog", { name: "상품 필터" });
  fireEvent.click(within(sheet).getByRole("button", { name: "할인중" }));
  expect(push).not.toHaveBeenCalled();
  expect(await within(sheet).findByRole("button", { name: "상품 3개 보기" })).toBeVisible();
  fireEvent.click(within(sheet).getByRole("button", { name: "상품 3개 보기" }));
  expect(push).toHaveBeenCalledWith("/products?category=tops&sale=on", { scroll: false });
});
