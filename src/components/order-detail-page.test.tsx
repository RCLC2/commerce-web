import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { queryKeys } from "@/lib/query-keys";
import type { OrderResponse } from "@/lib/types";
import { OrderDetailPage } from "./order-detail-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));
vi.mock("@/lib/api", () => ({
  api: { getOrder: vi.fn(), listMyReviews: vi.fn() },
}));

const order: Awaited<ReturnType<typeof api.getOrder>> = {
  id: 3,
  order_code: "ORD-3",
  total_order_price: 30000,
  total_discount_price: 0,
  used_point: 1000,
  status: "DELIVERED",
  ordered_at: "2026-10-22T00:00:00Z",
  market_orders: [],
};
const refund: NonNullable<OrderResponse["refund"]> = {
  reason: "CHANGE_OF_MIND",
  cash_refund_amount: 23000,
  retained_shipping_fee: 6000,
  outbound_shipping_fee_deduction: 3000,
  return_shipping_fee: 3000,
  shipping_fee_waived_amount: 0,
  shipping_refund_amount: 0,
  restored_point: 1000,
  coupon_status: "NOT_USED",
  completed_at: "2026-10-22T00:00:00Z",
};

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  render(
    <QueryClientProvider client={client}>
      <OrderDetailPage orderCode="ORD-3" />
    </QueryClientProvider>,
  );
  return client;
}
beforeEach(() => {
  vi.resetAllMocks();
  useSessionStore.setState({
    accessToken: "buyer",
    memberID: 3,
    role: "USER",
    hydrated: true,
  });
  vi.mocked(api.getOrder).mockResolvedValue(order);
  vi.mocked(api.listMyReviews).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useSessionStore.setState({ accessToken: null, memberID: null });
});

it("adds refund details without moving focus", async () => {
  const client = mount();
  await screen.findByRole("heading", { name: "주문 상세" });
  const focusBefore = document.activeElement;
  act(() =>
    client.setQueryData(queryKeys.order("ORD-3", 3), {
      ...order,
      status: "RETURN_COMPLETED",
      refund,
    }),
  );
  const details = await screen.findByLabelText("환불 상세", {
    selector: "div",
  });
  expect(document.activeElement).toBe(focusBefore);
  expect(screen.getByRole("complementary")).not.toContainElement(details);
  expect(screen.getByText("23,000원")).toBeInTheDocument();
  expect(api.getOrder).toHaveBeenCalledTimes(1);
});

it("keeps the cached order and refund amounts visible when a background order refresh fails", async () => {
  vi.mocked(api.getOrder).mockResolvedValue({
    ...order,
    status: "RETURN_COMPLETED",
    refund,
  });
  const client = mount();
  await screen.findByRole("heading", { name: "환불 완료 합계" });
  vi.mocked(api.getOrder).mockRejectedValue(
    new Error("temporary connection failure"),
  );
  await act(() =>
    client.refetchQueries({ queryKey: queryKeys.order("ORD-3", 3) }),
  );
  expect(
    await screen.findByText(
      "주문 정보를 갱신하지 못했습니다. 마지막으로 확인한 내역을 표시합니다.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "주문 상세" }),
  ).toBeInTheDocument();
  expect(screen.getByText("23,000원")).toBeInTheDocument();
  vi.mocked(api.getOrder).mockResolvedValue({
    ...order,
    status: "RETURN_COMPLETED",
    refund,
  });
  fireEvent.click(screen.getByRole("button", { name: "주문 정보 다시 확인" }));
  await waitFor(() =>
    expect(
      screen.queryByText(
        "주문 정보를 갱신하지 못했습니다. 마지막으로 확인한 내역을 표시합니다.",
      ),
    ).not.toBeInTheDocument(),
  );
  expect(screen.getByText("23,000원")).toBeInTheDocument();
});
