import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventDetail } from "@/lib/event-detail-types";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { EventDetailPage } from "./event-detail-page";

class NoopIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [] as number[];
  constructor(callback: IntersectionObserverCallback) { void callback; }
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
}

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api", () => ({
  api: {
    getEvent: vi.fn(),
    listEventProducts: vi.fn(),
    listCoupons: vi.fn(),
    claimEventReward: vi.fn(),
  },
}));

vi.mock("./product-card", () => ({ ProductCard: () => <article>상품</article> }));

const event: EventDetail = {
  id: 7,
  title: "가을 기획전",
  subtitle: "가을 신상품",
  image_url: "/event.jpg",
  link_url: "",
  status: "ACTIVE",
  starts_at: null,
  ends_at: null,
  design_variant: "BENEFIT_FOCUS",
  rewards: [],
  product_display: {
    enabled: true,
    mode: "PRODUCT_GRID",
    section_title: "기획전 상품",
    default_sort: "RECOMMENDED",
    sort_options: [
      { value: "RECOMMENDED", label: "추천순" },
      { value: "PRICE_ASC", label: "낮은 가격순" },
    ],
    markets: [{ id: 1, name: "서울 마켓" }, { id: 2, name: "부산 마켓" }],
    categories: [{ id: 10, name: "상의" }, { id: 20, name: "아우터" }],
  },
};

function mountEventPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><EventDetailPage eventId={event.id} /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IntersectionObserver", NoopIntersectionObserver);
  useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: true });
  vi.mocked(api.getEvent).mockResolvedValue(event);
  vi.mocked(api.listEventProducts).mockResolvedValue({ mode: "PRODUCT_GRID", items: [], paging: { limit: 12, offset: 0, has_next: false } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("EventDetailPage product controls", () => {
  it("uses filter chips for market and category while retaining the compact sort control", async () => {
    mountEventPage();

    expect(await screen.findByRole("heading", { name: "기획전 상품" })).toBeVisible();
    const categoryFilters = screen.getByRole("group", { name: "이벤트 카테고리 필터" });
    const marketFilters = screen.getByRole("group", { name: "이벤트 마켓 필터" });
    expect(within(categoryFilters).getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
    expect(within(categoryFilters).getByRole("button", { name: "아우터" })).toHaveAttribute("aria-pressed", "false");
    expect(categoryFilters.parentElement?.parentElement).toHaveClass("rounded-surface", "shadow-card");

    fireEvent.click(within(marketFilters).getByRole("button", { name: "부산 마켓" }));
    await waitFor(() => expect(api.listEventProducts).toHaveBeenLastCalledWith(expect.objectContaining({ marketID: 2 })));

    fireEvent.click(within(categoryFilters).getByRole("button", { name: "아우터" }));
    fireEvent.change(screen.getByLabelText("이벤트 상품 정렬"), { target: { value: "PRICE_ASC" } });

    await waitFor(() => expect(api.listEventProducts).toHaveBeenLastCalledWith(expect.objectContaining({ marketID: 2, categoryID: 20, sort: "PRICE_ASC" })));

    fireEvent.click(within(marketFilters).getByRole("button", { name: "전체" }));
    await waitFor(() => expect(api.listEventProducts).toHaveBeenLastCalledWith(expect.objectContaining({ marketID: undefined, categoryID: 20, sort: "PRICE_ASC" })));
    fireEvent.click(within(categoryFilters).getByRole("button", { name: "전체" }));
    await waitFor(() => expect(api.listEventProducts).toHaveBeenLastCalledWith(expect.objectContaining({ marketID: undefined, categoryID: undefined, sort: "PRICE_ASC" })));

    expect(screen.getByLabelText("이벤트 상품 정렬")).toHaveClass("h-10", "rounded-full", "appearance-none");
  });
});
