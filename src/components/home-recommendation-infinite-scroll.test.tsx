import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import type { HomeCategoryChip, Product } from "@/lib/types";
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
  vi.spyOn(api, "homePlacements").mockResolvedValue({
    context_text: { status: "EMPTY" },
    feature_card: { status: "EMPTY" },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("HomePage recommendations", () => {
  it("groups 12 sorted mobile category chips into fixed-height snap pages with accessible page dots", async () => {
    const categoryChips = [
      categoryChip({ id: 3, sequence: 3, title: "과일", href: "/categories/fruit" }),
      categoryChip({ id: 1, sequence: 1, title: "채소", href: "/categories/vegetable" }),
      categoryChip({ id: 2, sequence: 2, title: "가을 행사", href: "/events/autumn", chip_type: "CATEGORY_EVENT" }),
      ...Array.from({ length: 9 }, (_, index) => categoryChip({ id: index + 4, sequence: index + 4, title: `카테고리 ${index + 4}`, href: `/categories/${index + 4}` })),
    ];
    vi.spyOn(api, "listHomeCategoryChips").mockResolvedValue(categoryChips);
    vi.spyOn(api, "listPopularProducts").mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <HomePage />
      </QueryClientProvider>,
    );

    const slider = await screen.findByRole("region", { name: "홈 카테고리 페이지 슬라이드" });
    expect(slider).toHaveClass("snap-x", "snap-mandatory", "overflow-x-auto");
    expect(slider.parentElement).toHaveClass("sm:hidden");
    const pages = within(slider).getAllByRole("group");
    expect(pages).toHaveLength(2);
    expect(within(pages[0]).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "채소", "이벤트가을 행사", "과일", ...Array.from({ length: 5 }, (_, index) => `카테고리 ${index + 4}`),
    ]);
    expect(within(pages[1]).getAllByRole("link").map((link) => link.textContent)).toEqual(
      Array.from({ length: 4 }, (_, index) => `카테고리 ${index + 9}`),
    );
    pages.forEach((page) => expect(page).toHaveClass("grid-cols-4", "grid-rows-[repeat(2,5rem)]", "h-[10.375rem]"));
    expect(within(pages[0]).getAllByRole("link")[0]).toHaveAttribute("href", "/categories/vegetable");
    expect(within(pages[0]).getAllByRole("link")[1]).toHaveAttribute("href", "/events/autumn");
    expect(within(pages[0]).getByText("이벤트")).toBeVisible();
    const desktopGrid = slider.parentElement?.nextElementSibling;
    expect(desktopGrid).toHaveClass("hidden", "sm:grid");
    expect(within(desktopGrid as HTMLElement).getAllByRole("link")).toHaveLength(12);

    const pageControls = screen.getByRole("navigation", { name: "홈 카테고리 페이지 위치" });
    const firstDot = within(pageControls).getByRole("button", { name: "카테고리 페이지 1로 이동" });
    const secondDot = within(pageControls).getByRole("button", { name: "카테고리 페이지 2로 이동" });
    expect(within(pageControls).getByText("카테고리 페이지 1 / 2")).toHaveAttribute("aria-live", "polite");
    expect(firstDot).toHaveAttribute("aria-current", "page");
    expect(secondDot).not.toHaveAttribute("aria-current");
    expect(firstDot).toHaveClass("h-11", "w-11");
    expect(secondDot).toHaveClass("h-11", "w-11");

    Object.defineProperty(slider, "clientWidth", { configurable: true, value: 320 });
    const scrollTo = vi.fn();
    Object.assign(slider, { scrollTo });
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    fireEvent.click(secondDot);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 320, behavior: "auto" }));
    expect(firstDot).toHaveAttribute("aria-current", "page");

    Object.defineProperty(slider, "scrollLeft", { configurable: true, value: 320, writable: true });
    fireEvent.scroll(slider);
    expect(secondDot).toHaveAttribute("aria-current", "page");

    Object.defineProperty(slider, "scrollLeft", { configurable: true, value: 0, writable: true });
    fireEvent.scroll(slider);
    expect(firstDot).toHaveAttribute("aria-current", "page");
  });

  it("keeps 11 sorted category chips in sequence while grouping them as eight and three", async () => {
    const categoryChips = Array.from({ length: 11 }, (_, index) => categoryChip({
      id: index + 1,
      sequence: 11 - index,
      title: `카테고리 ${11 - index}`,
      href: `/categories/${11 - index}`,
    }));
    categoryChips[0] = categoryChip({
      id: 1,
      sequence: 11,
      title: "마지막 행사",
      href: "/events/last",
      chip_type: "CATEGORY_EVENT",
    });
    vi.spyOn(api, "listHomeCategoryChips").mockResolvedValue(categoryChips);
    vi.spyOn(api, "listPopularProducts").mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <HomePage />
      </QueryClientProvider>,
    );

    const slider = await screen.findByRole("region", { name: "홈 카테고리 페이지 슬라이드" });
    const pages = within(slider).getAllByRole("group");

    expect(pages.map((page) => within(page).getAllByRole("link").map((link) => link.textContent))).toEqual([
      Array.from({ length: 8 }, (_, index) => `카테고리 ${index + 1}`),
      ["카테고리 9", "카테고리 10", "이벤트마지막 행사"],
    ]);
    pages.forEach((page) => expect(page).toHaveClass("grid-cols-4", "grid-rows-[repeat(2,5rem)]", "h-[10.375rem]"));
    expect(within(pages[1]).getByRole("link", { name: "이벤트 마지막 행사" })).toHaveAttribute("href", "/events/last");
    expect(within(pages[1]).getByText("이벤트")).toBeVisible();
  });

  it("keeps a single fixed two-row stage without page controls for up to eight category chips", async () => {
    vi.spyOn(api, "listHomeCategoryChips").mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => categoryChip({ id: index + 1, sequence: index + 1, title: `카테고리 ${index + 1}` })),
    );
    vi.spyOn(api, "listPopularProducts").mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <HomePage />
      </QueryClientProvider>,
    );

    const slider = await screen.findByRole("region", { name: "홈 카테고리 페이지 슬라이드" });
    const [page] = within(slider).getAllByRole("group");
    expect(within(slider).getAllByRole("group")).toHaveLength(1);
    expect(page).toHaveClass("grid-cols-4", "grid-rows-[repeat(2,5rem)]", "h-[10.375rem]");
    expect(screen.queryByRole("navigation", { name: "홈 카테고리 페이지 위치" })).not.toBeInTheDocument();
  });

  it("fills every leading page with eight chips before leaving the final remainder page", async () => {
    vi.spyOn(api, "listHomeCategoryChips").mockResolvedValue(
      Array.from({ length: 17 }, (_, index) => categoryChip({ id: index + 1, sequence: index + 1, title: `카테고리 ${index + 1}` })),
    );
    vi.spyOn(api, "listPopularProducts").mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <HomePage />
      </QueryClientProvider>,
    );

    const slider = await screen.findByRole("region", { name: "홈 카테고리 페이지 슬라이드" });
    const pages = within(slider).getAllByRole("group");
    expect(pages.map((page) => within(page).getAllByRole("link"))).toHaveLength(3);
    expect(pages.map((page) => within(page).getAllByRole("link").length)).toEqual([8, 8, 1]);
    pages.forEach((page) => expect(page).toHaveClass("grid-cols-4", "grid-rows-[repeat(2,5rem)]", "h-[10.375rem]"));

    const thirdDot = screen.getByRole("button", { name: "카테고리 페이지 3로 이동" });
    Object.defineProperty(slider, "clientWidth", { configurable: true, value: 320 });
    const scrollTo = vi.fn();
    Object.assign(slider, { scrollTo });
    fireEvent.click(thirdDot);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ left: 640 }));
    Object.defineProperty(slider, "scrollLeft", { configurable: true, value: 640, writable: true });
    fireEvent.scroll(slider);
    expect(thirdDot).toHaveAttribute("aria-current", "page");
  });

  it("does not expose a category slider or page controls when the category response is empty", async () => {
    vi.spyOn(api, "listPopularProducts").mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <HomePage />
      </QueryClientProvider>,
    );

    await screen.findByText("표시할 홈 카테고리가 없습니다.");

    expect(screen.queryByRole("region", { name: "홈 카테고리 페이지 슬라이드" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "홈 카테고리 페이지 위치" })).not.toBeInTheDocument();
  });

  it("does not expose a category slider or page controls when the category request fails", async () => {
    vi.spyOn(api, "listHomeCategoryChips").mockRejectedValue(new Error("category request failed"));
    vi.spyOn(api, "listPopularProducts").mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <HomePage />
      </QueryClientProvider>,
    );

    await screen.findByRole("alert");

    expect(screen.queryByRole("region", { name: "홈 카테고리 페이지 슬라이드" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "홈 카테고리 페이지 위치" })).not.toBeInTheDocument();
  });

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

function categoryChip(overrides: Partial<HomeCategoryChip>): HomeCategoryChip {
  return {
    id: 1,
    sequence: 1,
    chip_type: "CATEGORY",
    icon_url: "/category.svg",
    status: "ACTIVE",
    title: "카테고리",
    href: "/categories/1",
    ...overrides,
  };
}
