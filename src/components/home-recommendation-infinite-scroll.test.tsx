import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import type { Product } from "@/lib/types";
import { HomePage } from "./home-page";

vi.mock("./advertising/sponsored-placement", () => ({ SponsoredPlacement: () => null }));
vi.mock("./product-card", () => ({ ProductCard: ({ product }: { product: Product }) => <div>{product.name}</div> }));
vi.mock("./safe-image", () => ({ SafeImage: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} /> }));

class ControlledIntersectionObserver implements IntersectionObserver {
  static instances: ControlledIntersectionObserver[] = [];
  readonly root = null;
  readonly rootMargin = "320px";
  readonly thresholds = [0];
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();

  constructor(private readonly callback: IntersectionObserverCallback) {
    ControlledIntersectionObserver.instances.push(this);
  }

  intersect() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this);
  }
}

beforeEach(() => {
  ControlledIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", ControlledIntersectionObserver);
  useSessionStore.setState({ hydrated: true, accessToken: null, memberID: null, role: null, sellerContext: null });
  vi.spyOn(api, "listEvents").mockResolvedValue([]);
  vi.spyOn(api, "listHomeCategoryChips").mockResolvedValue([]);
  vi.spyOn(api, "listHomeSections").mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("HomePage recommendations", () => {
  it("loads the next recommendation page when the sentinel enters the viewport", async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => product(index + 1));
    const listPopularProducts = vi.spyOn(api, "listPopularProducts")
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([product(13)]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <HomePage />
      </QueryClientProvider>,
    );

    await screen.findByText("상품 12");
    expect(listPopularProducts).toHaveBeenNthCalledWith(1, { limit: 12, offset: 0 });

    ControlledIntersectionObserver.instances.at(-1)?.intersect();

    await screen.findByText("상품 13");
    await waitFor(() => expect(listPopularProducts).toHaveBeenNthCalledWith(2, { limit: 12, offset: 12 }));
  });

  it("stops when an older backend repeats the first page", async () => {
    const firstPage = Array.from({ length: 12 }, (_, index) => product(index + 1));
    const listPopularProducts = vi.spyOn(api, "listPopularProducts")
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(firstPage);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <HomePage />
      </QueryClientProvider>,
    );

    await screen.findByText("상품 12");
    ControlledIntersectionObserver.instances.at(-1)?.intersect();

    await waitFor(() => expect(listPopularProducts).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByText(/^상품 \d+$/)).toHaveLength(12));
    ControlledIntersectionObserver.instances.at(-1)?.intersect();
    await waitFor(() => expect(listPopularProducts).toHaveBeenCalledTimes(2));
  });
});

function product(id: number): Product {
  return {
    id,
    market_id: 1,
    category_id: 1,
    name: `상품 ${id}`,
    description: "",
    base_price: 10_000,
    discount_price: 0,
    shipping_type: "NORMAL",
    popularity_score: id,
    status: "SELLING",
  };
}
