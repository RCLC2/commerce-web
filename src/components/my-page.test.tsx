import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
    listMyReviews: vi.fn(),
    listAddresses: vi.fn(),
    getProduct: vi.fn(),
    updateAddress: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_INQUIRY_PREVIEW", "false");
  vi.mocked(api.listMyReviews).mockResolvedValue([]);
  useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: true });
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

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
    expect(api.listMyReviews).not.toHaveBeenCalled();
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
    vi.mocked(api.listMyReviews).mockImplementation(() => new Promise(() => {}));

    mountMyPage();

    expect(screen.getByRole("status", { name: "포인트를 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "보유 쿠폰을 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "전체 주문을 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "작성한 리뷰를 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "발급 가능한 쿠폰을 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "발급한 쿠폰을 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "주문 내역을 불러오는 중입니다." })).toBeInTheDocument();
    expect(screen.queryByText("확인 필요")).not.toBeInTheDocument();
  });
});

describe("inline order history filters", () => {
  it("shows search and status inline and filters immediately", async () => {
    vi.stubEnv("NEXT_PUBLIC_INQUIRY_PREVIEW", "true");
    useSessionStore.setState({ accessToken: "token", memberID: 1, role: "MEMBER", hydrated: true });
    vi.mocked(api.me).mockResolvedValue({ id: 1, email: "member@example.com", role: "MEMBER", status: "ACTIVE", notification_type: "ALL", marketing_consent: false, nighttime_consent: false, height: 0, weight: 0, point_balance: 0, created_at: "2026-11-08T00:00:00Z" });
    vi.mocked(api.listAllOrders).mockResolvedValue([
      { id: 1, order_code: "KNIT-SHIPPED", ordered_at: "2026-11-08T00:00:00Z", status: "SHIPPED", total_order_price: 10000, total_discount_price: 0, used_point: 0 },
      { id: 2, order_code: "SHIRT-PAID", ordered_at: "2026-11-08T00:00:00Z", status: "PAID", total_order_price: 20000, total_discount_price: 0, used_point: 0 },
    ]);
    vi.mocked(api.listCoupons).mockResolvedValue([]);
    vi.mocked(api.listIssuableCoupons).mockResolvedValue([]);
    vi.mocked(api.listAddresses).mockResolvedValue([]);
    vi.mocked(api.listMyReviews).mockResolvedValue([
      { id: 1, product_id: 101, member_id: 1, rating: 5, content: "편안해요." },
      { id: 2, product_id: 102, member_id: 1, rating: 4, content: "좋아요." },
    ]);
    mountMyPage();
    expect(screen.getByRole("region", { name: "commerce money" })).toBeInTheDocument();
    expect(api.listAddresses).not.toHaveBeenCalled();
    const reviews = screen.getByRole("link", { name: "내가 쓴 리뷰" });
    expect(reviews).toHaveAttribute("href", "/mypage/reviews");
    expect(await within(reviews).findByText("2건")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "진행 중인 문의 2건" })).toBeInTheDocument();
    const orders = screen.getByRole("region", { name: "주문 내역" });
    await within(orders).findByRole("link", { name: /KNIT-SHIPPED/ });
    expect(within(orders).getAllByRole("link")).toHaveLength(2);
    const search = within(orders).getByRole("textbox", { name: "주문번호 또는 상품명 검색" });
    const statuses = within(orders).getByRole("group", { name: "주문 상태" });
    expect(screen.queryByRole("button", { name: "주문 내역 필터" })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "KNIT" } });
    expect(within(orders).getAllByRole("link")).toHaveLength(1);
    expect(within(orders).getByRole("link", { name: /KNIT-SHIPPED/ })).toBeInTheDocument();
    fireEvent.click(within(statuses).getByRole("button", { name: "결제 완료" }));
    expect(within(orders).queryByRole("link")).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "" } });
    expect(within(orders).getByRole("link", { name: /SHIRT-PAID/ })).toBeInTheDocument();
    fireEvent.click(within(statuses).getByRole("button", { name: "전체" }));
    expect(within(orders).getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
