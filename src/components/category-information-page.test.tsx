import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoryInformation, Product } from "@/lib/types";
import { api } from "@/lib/api";
import { ControlledIntersectionObserver } from "@/test/controlled-intersection-observer";
import { CategoryInformationPage } from "./category-information-page";

let currentSearchParams = "";
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(currentSearchParams),
}));

vi.mock("@/lib/api", () => ({
  api: {
    getCategoryInformation: vi.fn(),
  },
}));

vi.mock("./product-card", () => ({
  ProductCard: ({ product }: { product: Product }) => <article>{product.name}</article>,
}));

const categoryProduct: Product = {
  id: 99,
  market_id: 1,
  category_id: 1,
  name: "전환 유지 상품",
  description: "",
  base_price: 29_900,
  discount_price: 0,
  shipping_type: "NORMAL",
  popularity_score: 1,
  status: "SELLING",
};

const categoryInformation: CategoryInformation = {
  categories: [{
    id: 1,
    name: "상의",
    slug: "tops",
    href: "/categories?category=tops",
    depth: 1,
    level: 1,
    sort_order: 1,
  }],
  selected_category: {
    id: 1,
    name: "상의",
    slug: "tops",
    href: "/categories?category=tops",
    depth: 1,
    level: 1,
    sort_order: 1,
  },
  bundle_label: "상의",
  products: [categoryProduct],
  pagination: { page: 1, page_size: 8, has_next: false, total_pages: 1 },
  realtime_popular_carousel: { title: "실시간 인기", description: "", insert_after: 0, captured_at: "2026-01-01T00:00:00Z", products: [] },
};

function mountCategoryPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    view: render(<QueryClientProvider client={client}><CategoryInformationPage /></QueryClientProvider>),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentSearchParams = "";
  ControlledIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", ControlledIntersectionObserver);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("CategoryInformationPage loading feedback", () => {
  it("pairs the initial category skeleton with an actual spinner", async () => {
    vi.mocked(api.getCategoryInformation).mockImplementation(() => new Promise<CategoryInformation>(() => {}));

    mountCategoryPage();

    const loading = await screen.findByRole("status", { name: "카테고리를 불러오는 중입니다." });
    expect(loading.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
  });

  it("keeps previous products visible and adds a spinner while an internal category changes", async () => {
    vi.mocked(api.getCategoryInformation)
      .mockResolvedValueOnce(categoryInformation)
      .mockImplementationOnce(() => new Promise<CategoryInformation>(() => {}));
    const { client, view } = mountCategoryPage();

    expect(await screen.findByRole("heading", { name: "상의 상품" })).toBeVisible();

    currentSearchParams = "category=outer";
    view.rerender(<QueryClientProvider client={client}><CategoryInformationPage /></QueryClientProvider>);

    const update = await screen.findByRole("status", { name: "카테고리 상품을 업데이트하는 중입니다." });
    expect(update.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
    expect(screen.getByRole("heading", { name: "상의 상품" })).toBeVisible();
    expect(screen.getByText("전환 유지 상품")).toBeVisible();
  });

  it("renders the shared empty-state pattern when the selected category has no products", async () => {
    vi.mocked(api.getCategoryInformation).mockResolvedValue({ ...categoryInformation, products: [] });

    mountCategoryPage();

    expect(await screen.findByText("이 카테고리에 등록된 상품이 없습니다")).toBeVisible();
    expect(screen.getByText("다른 카테고리를 선택하거나 새 상품이 등록된 뒤 다시 확인해주세요.")).toBeVisible();
    expect(screen.getByText("이 카테고리에 등록된 상품이 없습니다").parentElement?.querySelector("svg")).toHaveClass("lucide-package");
  });

  it("appends the next category page when the product list reaches the viewport", async () => {
    vi.mocked(api.getCategoryInformation)
      .mockResolvedValueOnce({ ...categoryInformation, pagination: { page: 1, page_size: 8, has_next: true, total_pages: 2 } })
      .mockResolvedValueOnce({
        ...categoryInformation,
        products: [{ ...categoryProduct, id: 100, name: "두 번째 묶음 상품" }],
        pagination: { page: 2, page_size: 8, has_next: false, total_pages: 2 },
      });

    mountCategoryPage();
    expect(await screen.findByText("전환 유지 상품")).toBeVisible();
    await waitFor(() => expect(ControlledIntersectionObserver.forLabel("카테고리 상품")).toBeDefined());
    ControlledIntersectionObserver.forLabel("카테고리 상품")?.intersect();

    expect(await screen.findByText("두 번째 묶음 상품")).toBeVisible();
    expect(screen.getByText("전환 유지 상품")).toBeVisible();
    expect(api.getCategoryInformation).toHaveBeenLastCalledWith({ category: undefined, page: 2, pageSize: 8 });
    expect(screen.queryByRole("navigation", { name: "상품 페이지" })).not.toBeInTheDocument();
  });
});
