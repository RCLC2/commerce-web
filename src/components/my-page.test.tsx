import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { MyPage } from "./my-page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api", () => ({
  api: {
    me: vi.fn(),
    listAllOrders: vi.fn(),
    listCoupons: vi.fn(),
    listIssuableCoupons: vi.fn(),
    listAddresses: vi.fn(),
    getProduct: vi.fn(),
    updateAddress: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: true });
});
afterEach(cleanup);

function mountMyPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MyPage /></QueryClientProvider>);
}

describe("my page guest state", () => {
  it("shows the shared user-marked login card without requesting member data", () => {
    mountMyPage();

    expect(screen.getByRole("heading", { name: "마이페이지" })).toBeInTheDocument();
    const title = screen.getByText("로그인이 필요합니다");
    const card = title.parentElement;
    expect(card).toHaveClass("rounded-surface", "border-dashed");
    expect(card?.querySelector("svg.lucide-user-round")).toBeInTheDocument();
    expect(screen.getByText("로그인하고 주문과 혜택을 확인하세요.")).toBeInTheDocument();
    const login = screen.getByRole("link", { name: "로그인하기" });
    expect(login).toHaveAttribute("href", "/login?next=/mypage");
    expect(login.querySelector("button")).toBeNull();
    expect(api.me).not.toHaveBeenCalled();
    expect(api.listAllOrders).not.toHaveBeenCalled();
    expect(api.listCoupons).not.toHaveBeenCalled();
    expect(api.listIssuableCoupons).not.toHaveBeenCalled();
    expect(api.listAddresses).not.toHaveBeenCalled();
    expect(api.getProduct).not.toHaveBeenCalled();
  });
});

describe("my page loading state", () => {
  it("uses spinners instead of placeholder copy while the summary is loading", () => {
    useSessionStore.setState({ accessToken: "token", memberID: 1, role: "MEMBER", hydrated: true });
    vi.mocked(api.me).mockImplementation(() => new Promise(() => {}));
    vi.mocked(api.listAllOrders).mockImplementation(() => new Promise(() => {}));
    vi.mocked(api.listCoupons).mockImplementation(() => new Promise(() => {}));
    vi.mocked(api.listIssuableCoupons).mockImplementation(() => new Promise(() => {}));
    vi.mocked(api.listAddresses).mockImplementation(() => new Promise(() => {}));

    mountMyPage();

    expect(screen.getByRole("status", { name: "포인트를 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "보유 쿠폰을 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "전체 주문을 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "발급 가능한 쿠폰을 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "발급한 쿠폰을 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "주문 내역을 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.queryByText("확인 필요")).not.toBeInTheDocument();
  });
});
