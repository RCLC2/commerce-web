import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import type { CartItem, Product } from "@/lib/types";
import { CartPage } from "./cart-page";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./safe-image", () => ({ SafeImage: () => null }));
vi.mock("@/lib/api", () => ({ api: { listCart: vi.fn(), getProduct: vi.fn(), updateCartItems: vi.fn() } }));
const product: Product = { id: 1, market_id: 1, category_id: 1, name: "셔츠", description: "", shipping_type: "NORMAL", popularity_score: 0, base_price: 10000, discount_price: 0, status: "SELLING", options: [
  { id: 10, product_id: 1, option_name: "색상", option_value: "화이트", quantity: 10, additional_price: 0, is_active: true },
  { id: 20, product_id: 1, option_name: "색상", option_value: "블랙", quantity: 3, additional_price: 2000, is_active: true },
  { id: 30, product_id: 1, option_name: "색상", option_value: "블루", quantity: 0, additional_price: 0, is_active: true },
] };
let rows: CartItem[];

beforeEach(() => {
  vi.clearAllMocks();
  rows = [1,2].map(id => ({ id, member_id: 1, product_id: 1, option_id: 10, quantity: 1, price_at_added: 10000 }));
  useSessionStore.setState({ accessToken: "token", memberID: 1, role: "MEMBER", hydrated: true });
  vi.mocked(api.listCart).mockImplementation(async () => rows);
  vi.mocked(api.getProduct).mockResolvedValue(product);
  vi.mocked(api.updateCartItems).mockImplementation(async (_, payload) => {
    rows = [{ ...rows[0], option_id: payload.option_id, quantity: payload.quantity, price_at_added: payload.option_id === 20 ? 12000 : 10000 }];
    return rows[0];
  });
});
afterEach(cleanup);
function mountCart() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><CartPage /></QueryClientProvider>);
}

describe("cart editing", () => {
  it("uses the shared guest login state without requesting cart data", () => {
    useSessionStore.setState({ accessToken: null, memberID: null, role: null, hydrated: true });
    mountCart();

    expect(screen.getByText("로그인이 필요합니다")).toBeInTheDocument();
    expect(screen.getByText("장바구니에 담은 상품을 확인하려면 로그인해주세요.")).toBeInTheDocument();
    const login = screen.getByRole("link", { name: "로그인하기" });
    expect(login).toHaveAttribute("href", "/login?next=/cart");
    expect(login.querySelector("button")).toBeNull();
    expect(api.listCart).not.toHaveBeenCalled();
    expect(api.getProduct).not.toHaveBeenCalled();
  });

  it("updates grouped quantities atomically and uses the persisted ID for checkout", async () => {
    mountCart();
    const increase = await screen.findByRole("button", { name: "셔츠 수량 늘리기" });
    await waitFor(() => expect(increase).toBeEnabled());
    fireEvent.click(increase);
    await screen.findByText("장바구니를 변경했습니다.");
    expect(api.updateCartItems).toHaveBeenCalledWith("token", { cart_item_ids: [1,2], option_id: 10, quantity: 3 });
    expect(screen.getByText("선택 수량 3개")).toBeInTheDocument();
    const checkout = screen.getByRole("button", { name: "선택 상품 주문하기" });
    await waitFor(() => expect(checkout).toBeEnabled());
    fireEvent.click(checkout);
    expect(push).toHaveBeenCalledWith("/checkout?cartItemIDs=1");
  });

  it("changes options, excludes sold-out options, and refreshes the server price", async () => {
    mountCart();
    const edit = await screen.findByRole("button", { name: "옵션 변경" });
    await waitFor(() => expect(edit).toBeEnabled());
    fireEvent.click(edit);
    const dialog = screen.getByRole("dialog", { name: "옵션 변경" });
    expect(within(dialog).getByRole("option", { name: /블루.*품절/ })).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("combobox"), { target: { value: "20" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "변경 저장" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.updateCartItems).toHaveBeenCalledWith("token", { cart_item_ids: [1,2], option_id: 20, quantity: 1 });
    expect(screen.getByText(/색상 · 블랙/)).toBeInTheDocument();
    expect(screen.getAllByText("12,000원").length).toBeGreaterThan(0);
  });

  it("keeps stored quantities on failure and shows a retry path", async () => {
    vi.mocked(api.updateCartItems).mockRejectedValue(new Error("재고가 부족합니다."));
    mountCart();
    const increase = await screen.findByRole("button", { name: "셔츠 수량 늘리기" });
    await waitFor(() => expect(increase).toBeEnabled());
    fireEvent.click(increase);
    await screen.findByRole("alert");
    expect(screen.getByText("선택 수량 2개")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "목록 새로고침" })).toBeEnabled();
    expect(screen.queryByText("장바구니를 변경했습니다.")).not.toBeInTheDocument();
  });
});
