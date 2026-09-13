import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { TrendingSearchResponse } from "@/lib/types";
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
    trendingSearches: vi.fn(),
  },
}));

function mountSearchPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><SearchPage /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentSearchParams = "";
});
afterEach(cleanup);

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
