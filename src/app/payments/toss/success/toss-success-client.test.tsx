import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import type { OrderResponse } from "@/lib/types";
import { TossSuccessClient } from "./toss-success-client";

const params = new URLSearchParams({ paymentKey: "payment-key", orderId: "ORD-TEST-1", amount: "23000" });
vi.mock("next/navigation", () => ({ useSearchParams: () => params }));
vi.mock("@/lib/api", () => ({ api: { completePayment: vi.fn(), getOrder: vi.fn() } }));

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
  useSessionStore.getState().setSession({ accessToken: "buyer", memberID: 1, role: "USER" });
  vi.mocked(api.completePayment).mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  useSessionStore.getState().logout();
});

it.each<OrderResponse["status"]>([
  "PAID", "PLACED", "SHIPPED", "DELIVERED", "COMPLETED",
  "RETURN_REQUESTED", "RETURN_APPROVED", "RETURN_REJECTED",
])("opens the confirmed order when revisiting its payment callback at %s", async (status) => {
  vi.mocked(api.getOrder).mockResolvedValue({
    id: 1, order_code: "ORD-TEST-1", total_order_price: 20000,
    total_discount_price: 0, used_point: 0, ordered_at: "2026-10-22T12:00:00Z", status,
  });
  render(<TossSuccessClient />);

  expect(await screen.findByRole("heading", { name: "결제 완료" })).toBeVisible();
  expect(screen.getByRole("link", { name: "주문 상세 보기" })).toHaveAttribute("href", "/orders/ORD-TEST-1");
  expect(screen.queryByRole("link", { name: "결제 다시 시도" })).not.toBeInTheDocument();
  expect(api.completePayment).toHaveBeenCalledExactlyOnceWith("buyer", "ORD-TEST-1", {
    payment_key: "payment-key", order_id: "ORD-TEST-1", amount: 23000,
  });
  expect(api.getOrder).toHaveBeenCalledTimes(1);
});

it("keeps a rejected confirmation in the error state instead of claiming payment succeeded", async () => {
  vi.mocked(api.completePayment).mockRejectedValue(new Error("이미 다른 결제로 완료된 주문입니다"));
  render(<TossSuccessClient />);

  expect(await screen.findByText("이미 다른 결제로 완료된 주문입니다")).toBeVisible();
  expect(screen.queryByRole("heading", { name: "결제 완료" })).not.toBeInTheDocument();
  expect(api.getOrder).not.toHaveBeenCalled();
});
