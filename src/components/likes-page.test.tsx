import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { LikesPage } from "./likes-page";

vi.mock("@/lib/api", () => ({
  api: {
    listLikedProducts: vi.fn(),
    listWishlistedProducts: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: true });
});
afterEach(cleanup);

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
