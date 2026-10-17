import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { shippingPolicyApi } from "@/lib/shipping-policy-api";
import { MarketShippingSettings } from "./market-shipping-settings";
import { OrderRefundSummary } from "./order-refund-summary";

vi.mock("@/lib/shipping-policy-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/shipping-policy-api")>()),
  shippingPolicyApi: { settings: vi.fn(), update: vi.fn() },
}));
function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );
}
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("shipping policy screens", () => {
  it("saves configured paid shipping and rejects base fees other than zero or 3,000 won", async () => {
    const settings = {
      market_id: 7,
      shipping_fee: 0,
      additional_shipping_fee: 0,
      additional_shipping_fee_reason: "NONE" as const,
    };
    vi.mocked(shippingPolicyApi.settings).mockResolvedValue(settings);
    vi.mocked(shippingPolicyApi.update).mockResolvedValue({
      ...settings,
      shipping_fee: 3000,
    });
    render(<MarketShippingSettings token="seller" marketID={7} />, { wrapper });
    const input = await screen.findByLabelText("기본 배송비 (원)");
    fireEvent.change(input, { target: { value: "1000" } });
    expect(
      screen.getByRole("button", { name: "배송 설정 저장" }),
    ).toBeDisabled();
    fireEvent.change(input, { target: { value: "3000" } });
    fireEvent.click(screen.getByRole("button", { name: "배송 설정 저장" }));
    await waitFor(() =>
      expect(shippingPolicyApi.update).toHaveBeenCalledWith("seller", {
        ...settings,
        shipping_fee: 3000,
      }),
    );
    expect(
      await screen.findByText("배송 설정을 저장했습니다."),
    ).toBeInTheDocument();
  });
});

it("reveals the completed refund above the old modal scroll position", () => {
  const refund = {
    reason: "CHANGE_OF_MIND" as const,
    cash_refund_amount: 25910,
    retained_shipping_fee: 3000,
    restored_point: 1000,
    coupon_status: "RESTORED" as const,
    completed_at: "2026-10-11T04:15:28+09:00",
  };
  const view = render(
    <div style={{ overflowY: "auto" }}>
      <button>환불 확정</button>
    </div>,
  );
  const scrollArea = view.container.firstElementChild as HTMLElement;
  scrollArea.scrollTop = 280;
  view.rerender(
    <div style={{ overflowY: "auto" }}>
      <OrderRefundSummary refund={refund} revealOnMount />
    </div>,
  );
  expect(scrollArea.scrollTop).toBe(0);
  expect(screen.getByLabelText("환불 완료 내역")).toHaveFocus();
  expect(screen.getByText("25,910원")).toBeInTheDocument();
});
