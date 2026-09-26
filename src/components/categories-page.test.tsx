import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { CommerceCategory, Product } from "@/lib/types";
import { CategoriesPage } from "./categories-page";

vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentPropsWithoutRef<"a">) => <a {...props}>{children}</a> }));
vi.mock("@/lib/api", () => ({ api: { listCategoryTree: vi.fn(), listProducts: vi.fn() } }));
vi.mock("./product-card", () => ({ ProductCard: ({ product }: { product: Product }) => <article>{product.name}</article> }));

const category: CommerceCategory = {
  id: 1,
  name: "상의",
  slug: "tops",
  href: "/categories?category=tops",
  depth: 1,
  level: 1,
  sort_order: 1,
};

function mountCategoriesPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><CategoriesPage /></QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it("renders an empty-state card when a category has no matching products", async () => {
  vi.mocked(api.listCategoryTree).mockResolvedValue([category]);
  vi.mocked(api.listProducts).mockResolvedValue([]);

  mountCategoriesPage();

  expect(await screen.findByText("연결된 상품이 없습니다")).toBeVisible();
  expect(screen.getByText("다른 카테고리를 선택하거나 잠시 후 다시 확인해주세요.")).toBeVisible();
  expect(screen.getByText("연결된 상품이 없습니다").parentElement?.querySelector("svg")).toHaveClass("lucide-package");
});

it("renders an empty-state card when no categories are available", async () => {
  vi.mocked(api.listCategoryTree).mockResolvedValue([]);
  vi.mocked(api.listProducts).mockResolvedValue([]);

  mountCategoriesPage();

  expect(await screen.findByText("표시할 카테고리가 없습니다")).toBeVisible();
  expect(screen.getByText("카테고리를 준비하고 있으니 잠시 후 다시 확인해주세요.")).toBeVisible();
});
