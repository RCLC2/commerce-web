import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shippingPolicyApi } from "@/lib/shipping-policy-api";
import { ApiHttpError } from "@/lib/api-client";
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
  vi.clearAllMocks();
});
afterEach(cleanup);
describe("shipping policy screens", () => {
  it.each([0, 3000])("requires an explicit first shipping fee selection before saving %i won", async (fee) => {
    vi.mocked(shippingPolicyApi.settings).mockResolvedValue(null);
    const settings = {
      market_id: 7,
      shipping_fee: fee,
      return_shipping_fee: 3000,
      additional_shipping_fee: 0,
      additional_shipping_fee_reason: "NONE" as const,
    };
    vi.mocked(shippingPolicyApi.update).mockResolvedValue(settings);
    render(<MarketShippingSettings token="seller" marketID={7} />, { wrapper });
    const input = await screen.findByLabelText("기본 배송비 (원)");
    expect(input).toHaveValue("");
    expect(screen.getByText("배송비가 아직 설정되지 않았습니다.")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "배송 설정 저장" });
    expect(save).toBeDisabled();
    expect(shippingPolicyApi.update).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: String(fee) } });
    fireEvent.click(save);
    await waitFor(() => expect(shippingPolicyApi.update).toHaveBeenCalledWith("seller", settings));
    expect(await screen.findByText("배송 설정을 저장했습니다.")).toBeInTheDocument();
    expect(screen.queryByText("배송비가 아직 설정되지 않았습니다.")).not.toBeInTheDocument();
    expect(input).toHaveValue(String(fee));
  });

  it("does not show an unconfigured form while loading", () => {
    vi.mocked(shippingPolicyApi.settings).mockReturnValue(new Promise(() => {}));
    render(<MarketShippingSettings token="seller" marketID={7} />, { wrapper });
    expect(screen.getByRole("status")).toHaveTextContent("배송 설정을 불러오는 중입니다.");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it.each([401, 403, 500])("does not treat a %i error as missing settings and permits retry", async (status) => {
    vi.mocked(shippingPolicyApi.settings)
      .mockRejectedValueOnce(new ApiHttpError("조회 실패", status))
      .mockResolvedValue(null);
    render(<MarketShippingSettings token="seller" marketID={7} />, { wrapper });
    expect(await screen.findByRole("alert")).toHaveTextContent("배송 설정을 불러오지 못했습니다.");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByText("배송비가 아직 설정되지 않았습니다.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "배송 설정 다시 불러오기" }));
    expect(await screen.findByRole("form", { name: "마켓 배송비 설정" })).toBeInTheDocument();
  });

  it("preserves a configured zero fee without requiring a new first selection", async () => {
    const settings = { market_id: 7, shipping_fee: 0, return_shipping_fee: 3000, additional_shipping_fee: 0, additional_shipping_fee_reason: "NONE" as const };
    vi.mocked(shippingPolicyApi.settings).mockResolvedValue(settings);
    vi.mocked(shippingPolicyApi.update).mockResolvedValue(settings);
    render(<MarketShippingSettings token="seller" marketID={7} />, { wrapper });
    expect(await screen.findByLabelText("기본 배송비 (원)")).toHaveValue("0");
    expect(screen.queryByText("배송비가 아직 설정되지 않았습니다.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "배송 설정 저장" }));
    await waitFor(() => expect(shippingPolicyApi.update).toHaveBeenCalledWith("seller", settings));
  });

  it("retains the first fee selection when saving fails so it can be retried", async () => {
    vi.mocked(shippingPolicyApi.settings).mockResolvedValue(null);
    const settings = {
      market_id: 7,
      shipping_fee: 3000,
      return_shipping_fee: 3000,
      additional_shipping_fee: 0,
      additional_shipping_fee_reason: "NONE" as const,
    };
    vi.mocked(shippingPolicyApi.update)
      .mockRejectedValueOnce(new ApiHttpError("저장 실패", 500))
      .mockResolvedValueOnce(settings);
    render(<MarketShippingSettings token="seller" marketID={7} />, { wrapper });
    const input = await screen.findByLabelText("기본 배송비 (원)");
    fireEvent.change(input, { target: { value: "3000" } });
    fireEvent.click(screen.getByRole("button", { name: "배송 설정 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("저장 실패");
    expect(input).toHaveValue("3000");
    fireEvent.click(screen.getByRole("button", { name: "배송 설정 저장" }));
    expect(await screen.findByText("배송 설정을 저장했습니다.")).toBeInTheDocument();
    expect(shippingPolicyApi.update).toHaveBeenNthCalledWith(2, "seller", settings);
  });

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

it("separates retained outbound delivery from the return pickup fee", () => {
  render(
    <OrderRefundSummary
      refund={{
        reason: "CHANGE_OF_MIND",
        cash_refund_amount: 17000,
        retained_shipping_fee: 6000,
        shipping_refund_amount: 0,
        outbound_shipping_fee_deduction: 0,
        return_shipping_fee: 3000,
        shipping_fee_waived_amount: 0,
        restored_point: 0,
        coupon_status: "NOT_USED",
        completed_at: "2026-10-18T00:00:00Z",
      }}
    />,
  );
  for (const label of ["최초 배송비 환불 제외", "반품 회수비 차감"]) {
    expect(
      within(screen.getByText(label).parentElement!).getByText("3,000원"),
    ).toBeInTheDocument();
  }
  expect(screen.queryByText("유지·차감된 배송비 합계")).not.toBeInTheDocument();
  expect(screen.getByText("17,000원")).toBeInTheDocument();
});

it("shows shipping fee waivers separately without turning them into extra charges", () => {
  render(
    <OrderRefundSummary
      refund={{
        reason: "CHANGE_OF_MIND",
        cash_refund_amount: 0,
        retained_shipping_fee: 4000,
        shipping_refund_amount: 0,
        outbound_shipping_fee_deduction: 3000,
        return_shipping_fee: 3000,
        shipping_fee_waived_amount: 2000,
        restored_point: 0,
        coupon_status: "NOT_USED",
        completed_at: "2026-10-18T00:00:00Z",
      }}
    />,
  );
  expect(screen.getByText("무료배송 발송비 차감")).toBeInTheDocument();
  expect(screen.getByText("반품 회수비 차감")).toBeInTheDocument();
  expect(
    within(screen.getByText("반품비 초과액 면제").parentElement!).getByText(
      "-2,000원",
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("0원")).toBeInTheDocument();
  expect(screen.queryByText("최초 배송비 환불 제외")).not.toBeInTheDocument();
});

it("includes returned original shipping as a refund rather than a deduction", () => {
  render(
    <OrderRefundSummary
      refund={{
        reason: "SELLER_FAULT",
        cash_refund_amount: 23000,
        retained_shipping_fee: 0,
        shipping_refund_amount: 3000,
        outbound_shipping_fee_deduction: 0,
        return_shipping_fee: 0,
        shipping_fee_waived_amount: 0,
        restored_point: 0,
        coupon_status: "NOT_USED",
        completed_at: "2026-10-18T00:00:00Z",
      }}
    />,
  );
  expect(
    within(screen.getByText("최초 배송비 환불").parentElement!).getByText(
      "3,000원",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText("반품 회수비 차감")).not.toBeInTheDocument();
  expect(screen.getByText("23,000원")).toBeInTheDocument();
});
