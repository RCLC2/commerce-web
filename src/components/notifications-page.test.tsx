import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { NotificationsPage } from "./notifications-page";

vi.mock("@/lib/api", () => ({ api: { getNotificationPage: vi.fn(), markAllNotificationsRead: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: true });
});
afterEach(cleanup);

describe("notification guest state", () => {
  it("uses the shared login state without requesting notifications", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><NotificationsPage /></QueryClientProvider>);

    expect(screen.getByText("로그인이 필요합니다")).toBeInTheDocument();
    expect(screen.getByText("새로운 알림을 확인하려면 로그인해주세요.")).toBeInTheDocument();
    const login = screen.getByRole("link", { name: "로그인하기" });
    expect(login).toHaveAttribute("href", "/login?next=/notifications");
    expect(login.querySelector("button")).toBeNull();
    expect(api.getNotificationPage).not.toHaveBeenCalled();
  });

  it("does not mark cached notifications as read after a session expires", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(["notification-inbox"], { read_through: "2026-09-12T13:00:00Z", items: [] });
    render(<QueryClientProvider client={client}><NotificationsPage /></QueryClientProvider>);

    expect(api.markAllNotificationsRead).not.toHaveBeenCalled();
  });
});
