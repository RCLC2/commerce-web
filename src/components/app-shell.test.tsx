import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { AppShell } from "./app-shell";

const replace = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push, replace }),
}));
vi.mock("@/lib/api", () => ({
  api: {
    searchSuggestions: vi.fn(),
    listCategories: vi.fn(),
    unreadNotificationCount: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: false });
  vi.mocked(api.searchSuggestions).mockResolvedValue([]);
  vi.mocked(api.listCategories).mockResolvedValue([]);
  vi.mocked(api.unreadNotificationCount).mockResolvedValue({ unread_count: 7 });
});
afterEach(cleanup);

function mountAppShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AppShell><main>페이지 콘텐츠</main></AppShell></QueryClientProvider>);
}

describe("app shell authenticated header shortcuts", () => {
  it("hides cart and notifications before session hydration and does not request the unread count", () => {
    useSessionStore.setState({ accessToken: "stale-token", memberID: 1, role: "MEMBER", hydrated: false });

    mountAppShell();

    expect(screen.queryByRole("link", { name: "장바구니" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "알림함" })).not.toBeInTheDocument();
    expect(api.unreadNotificationCount).not.toHaveBeenCalled();
  });

  it("shows cart, notifications, and the unread badge for a restored token", async () => {
    window.localStorage.setItem("commerce.accessToken", "member-token");
    window.localStorage.setItem("commerce.memberID", "1");
    window.localStorage.setItem("commerce.role", "MEMBER");

    mountAppShell();

    expect(await screen.findByRole("link", { name: "장바구니" })).toHaveAttribute("href", "/cart");
    expect(await screen.findByRole("link", { name: "알림함" })).toHaveAttribute("href", "/notifications");
    await waitFor(() => expect(api.unreadNotificationCount).toHaveBeenCalledWith("member-token"));
    expect(await screen.findByText("7")).toHaveClass("rounded-full");

    useSessionStore.getState().logout();

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "장바구니" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "알림함" })).not.toBeInTheDocument();
    });
  });
});
