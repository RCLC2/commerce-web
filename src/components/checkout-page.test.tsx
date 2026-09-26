import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import type { Product } from "@/lib/types";
import { CheckoutPage } from "./checkout-page";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/api", () => ({ api: {
  listCart: vi.fn(), listCoupons: vi.fn(), me: vi.fn(), listAddresses: vi.fn(), createAddress: vi.fn(), quoteOrder: vi.fn(),
  getProduct: vi.fn(), placeOrder: vi.fn(), getOrder: vi.fn(),
  createPaymentRequest: vi.fn(), listAllOrders: vi.fn(),
} }));
vi.mock("./toss-payment-widget", () => ({ TossPaymentWidget: () => null }));

const baseProduct: Product = {
  id: 1, market_id: 1, category_id: 1, name: "첫 상품", description: "",
  base_price: 10_000, discount_price: 0, shipping_type: "NORMAL", popularity_score: 1,
  status: "SELLING", delivery: { expected_ship_date: "2026-09-28", expected_arrival_date: "2026-09-29", expected_arrival_label: "09/29 도착 예정" },
};

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  useSessionStore.setState({ accessToken: "token", memberID: 1, role: "MEMBER", hydrated: true });
  vi.mocked(api.listCart).mockResolvedValue([
    { id: 10, member_id: 1, product_id: 1, option_id: 1, quantity: 1, price_at_added: 10_000 },
    { id: 11, member_id: 1, product_id: 2, option_id: 2, quantity: 1, price_at_added: 20_000 },
  ]);
  vi.mocked(api.listCoupons).mockResolvedValue([]);
  vi.mocked(api.me).mockResolvedValue({ point_balance: 0 } as Awaited<ReturnType<typeof api.me>>);
  vi.mocked(api.listAddresses).mockResolvedValue([
    { id: 1, receiver: "기본", phone: "010-1111-1111", zip_code: "11111", line1: "첫 주소", line2: "1호", is_default: true },
    { id: 2, receiver: "다른 주소", phone: "010-2222-2222", zip_code: "22222", line1: "둘째 주소", line2: "2호", is_default: false },
  ]);
  vi.mocked(api.getProduct).mockImplementation(async (id) => id === 1 ? baseProduct : {
    ...baseProduct, id: 2, name: "둘째 상품", base_price: 20_000,
    delivery: { expected_ship_date: "2026-09-30", expected_arrival_date: "2026-10-01", expected_arrival_label: "10/01 도착 예정" },
  });
  vi.mocked(api.placeOrder).mockResolvedValue({ orderCode: "ORDER-1" });
  vi.mocked(api.quoteOrder).mockResolvedValue({ product_total: 30_000, discount_total: 0, used_point: 0, shipping_fee: 0, payment_amount: 30_000, line_items: [{ cart_item_id: 10, unit_price: 10_000, line_total: 10_000 }, { cart_item_id: 11, unit_price: 20_000, line_total: 20_000 }] });
  vi.mocked(api.getOrder).mockResolvedValue({ id: 1, order_code: "ORDER-1", ordered_at: undefined, total_order_price: 30_000, total_discount_price: 0, used_point: 0, status: "PLACED" });
});
afterEach(cleanup);

it("shows the product arrival range and submits the chosen shipping address", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><CheckoutPage /></QueryClientProvider>);

  expect(await screen.findByText("2026년 9월 29일 ~ 2026년 10월 1일")).toBeVisible();
  fireEvent.change(screen.getByLabelText("배송받을 주소 선택"), { target: { value: "2" } });
  expect(screen.getByText("(22222) 둘째 주소 2호")).toBeVisible();
  await waitFor(() => expect(api.quoteOrder).toHaveBeenCalledWith("token", expect.objectContaining({
    shipping_address: { receiver: "다른 주소", phone: "010-2222-2222", zip_code: "22222", line1: "둘째 주소", line2: "2호" },
  })));
  expect(screen.getByText("배송비")).toBeVisible();
  const submit = screen.getAllByRole("button", { name: "주문 생성 후 결제" })[0];
  await waitFor(() => expect(submit).toBeEnabled());
  fireEvent.click(submit);
  await waitFor(() => expect(api.placeOrder).toHaveBeenCalledWith("token", expect.objectContaining({
    shipping_address: { receiver: "다른 주소", phone: "010-2222-2222", zip_code: "22222", line1: "둘째 주소", line2: "2호" },
  })));
});

it("lets a customer without an address create one and then shows the server quote", async () => {
  const address = { id: 3, receiver: "새 고객", phone: "010-3333-3333", zip_code: "33333", line1: "새 주소", line2: "3호", is_default: true };
  let saved = false;
  vi.mocked(api.listAddresses).mockImplementation(async () => saved ? [address] : []);
  vi.mocked(api.createAddress).mockImplementation(async () => { saved = true; return address; });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><CheckoutPage /></QueryClientProvider>);

  expect(await screen.findByRole("form", { name: "배송지 등록" })).toBeVisible();
  fireEvent.change(screen.getByLabelText(/^받는 분/), { target: { value: "새 고객" } });
  fireEvent.change(screen.getByLabelText(/^연락처/), { target: { value: "010-3333-3333" } });
  fireEvent.change(screen.getByLabelText(/^우편번호/), { target: { value: "33333" } });
  fireEvent.change(screen.getByLabelText(/^기본 주소/), { target: { value: "새 주소" } });
  fireEvent.change(screen.getByLabelText("상세 주소"), { target: { value: "3호" } });
  fireEvent.click(screen.getByRole("button", { name: "배송지 저장하고 사용" }));

  await waitFor(() => expect(api.createAddress).toHaveBeenCalledWith("token", expect.objectContaining({ receiver: "새 고객", is_default: true })));
  await waitFor(() => expect(api.quoteOrder).toHaveBeenCalledWith("token", expect.objectContaining({ shipping_address: expect.objectContaining({ line1: "새 주소" }) })));
  expect(await screen.findByText("(33333) 새 주소 3호")).toBeVisible();
  expect(screen.getByText("결제 예정 금액")).toBeVisible();
});

it("shows current server prices when cart prices have changed", async () => {
  vi.mocked(api.quoteOrder).mockResolvedValue({ product_total: 35_000, discount_total: 0, used_point: 0, shipping_fee: 0, payment_amount: 35_000, line_items: [{ cart_item_id: 10, unit_price: 10_000, line_total: 10_000 }, { cart_item_id: 11, unit_price: 25_000, line_total: 25_000 }] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><CheckoutPage /></QueryClientProvider>);

  expect(await screen.findByText("상품 가격이 변경되어 서버가 확인한 현재 가격을 표시합니다.")).toBeVisible();
  expect(screen.getByText("25,000원")).toBeVisible();
  expect(screen.getAllByText("35,000원").length).toBeGreaterThan(0);
});
