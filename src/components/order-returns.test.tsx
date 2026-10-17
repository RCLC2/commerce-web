import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { returnsApi } from "@/lib/returns-api";
import { refundQuoteSchema } from "@/lib/shipping-policy-api";
import { returnedRequest } from "@/test/returns-fixture";
import { OrderRefundControls } from "./order-refund-controls";
import { OrderReturnManagement } from "./order-return-management";
import { CustomerOrderReturns } from "./customer-order-returns";
vi.mock("@/lib/returns-api", async (original) => ({
  ...(await original<typeof import("@/lib/returns-api")>()),
  returnsApi: {
    requests: vi.fn(),
    create: vi.fn(),
    quote: vi.fn(),
    execute: vi.fn(),
    withdraw: vi.fn(),
    collections: vi.fn(),
    address: vi.fn(),
    collect: vi.fn(),
    inspections: vi.fn(),
  },
}));
const quote = () =>
  refundQuoteSchema.parse({
    refund_id: 12,
    cash_refund_amount: 4000,
    retained_shipping_fee: 6000,
    restored_point: 333,
    reason: "",
    shipping_refund_amount: 0,
    outbound_shipping_fee_deduction: 3000,
    return_shipping_fee: 3000,
    shipping_fee_waived_amount: 0,
  });
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
  vi.resetAllMocks();
});
it("never offers a receipt-checkbox bypass before inspection", () => {
  render(
    <OrderRefundControls
      token="admin"
      request={{ ...returnedRequest(), status: "REQUESTED" }}
      canExecute
    />,
    { wrapper },
  );
  expect(returnsApi.quote).not.toHaveBeenCalled();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "검수한 수량 환불" }),
  ).not.toBeInTheDocument();
});
it("confirms one inspected request with separated shipping costs", async () => {
  vi.mocked(returnsApi.quote).mockResolvedValue(quote());
  vi.mocked(returnsApi.execute).mockResolvedValue({
    ...quote(),
    completed: true,
  });
  render(
    <OrderRefundControls
      token="admin"
      request={returnedRequest()}
      canExecute
    />,
    { wrapper },
  );
  await screen.findByText("4,000원");
  expect(screen.getByText("회수비 차감 기준액")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "검수한 수량 환불" }));
  const dialog = screen.getByRole("dialog", { name: "검수한 수량 환불" });
  expect(within(dialog).getByText(/반품 요청 #12/)).toBeInTheDocument();
  expect(returnsApi.execute).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "환불 확정" }));
  await waitFor(() =>
    expect(returnsApi.execute).toHaveBeenCalledWith("admin", 12, undefined),
  );
});
it("lets sellers preview but never execute refunds", async () => {
  vi.mocked(returnsApi.quote).mockResolvedValue(quote());
  render(
    <OrderRefundControls
      token="seller"
      request={returnedRequest()}
      canExecute={false}
    />,
    { wrapper },
  );
  await screen.findByText("4,000원");
  expect(
    screen.queryByRole("button", { name: "검수한 수량 환불" }),
  ).not.toBeInTheDocument();
});
it("keeps PG success with local completion pending disabled", async () => {
  vi.mocked(returnsApi.quote).mockResolvedValue({
    ...quote(),
    operation_status: "SUCCEEDED",
    completed: false,
  });
  render(
    <OrderRefundControls
      token="admin"
      request={{ ...returnedRequest(), status: "PROCESSING" }}
      canExecute
    />,
    { wrapper },
  );
  await screen.findByText("환불 처리 상태를 확인하고 있습니다");
  expect(
    screen.getByRole("button", { name: "검수한 수량 환불" }),
  ).toBeDisabled();
});
it("requires a complete bank account for virtual-account refunds", async () => {
  vi.mocked(returnsApi.quote).mockResolvedValue({
    ...quote(),
    requires_refund_account: true,
  });
  render(
    <OrderRefundControls
      token="admin"
      request={returnedRequest()}
      canExecute
    />,
    { wrapper },
  );
  await screen.findByLabelText("계좌번호");
  expect(
    screen.getByRole("button", { name: "검수한 수량 환불" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("은행"), { target: { value: "90" } });
  fireEvent.change(screen.getByLabelText("계좌번호"), {
    target: { value: "1234567890" },
  });
  fireEvent.change(screen.getByLabelText("예금주"), {
    target: { value: "테스트" },
  });
  expect(
    screen.getByRole("button", { name: "검수한 수량 환불" }),
  ).toBeEnabled();
});
it("submits only the buyer's selected remaining quantity and reason", async () => {
  vi.mocked(returnsApi.requests).mockResolvedValue([]);
  vi.mocked(returnsApi.create).mockResolvedValue(returnedRequest());
  render(
    <CustomerOrderReturns
      token="buyer"
      orderCode="ORD-3"
      markets={[
        {
          id: 7,
          name: "테스트 마켓",
          items: [
            {
              id: 9,
              name: "셔츠",
              quantity: 3,
              price: 10000,
              status: "DELIVERED",
            },
          ],
        },
      ]}
    />,
    { wrapper },
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "테스트 마켓 반품 신청" }),
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "셔츠" }));
  fireEvent.change(screen.getByLabelText("셔츠 반품 수량"), {
    target: { value: "2" },
  });
  fireEvent.change(screen.getByLabelText("셔츠 반품 사유"), {
    target: { value: "ITEM_DEFECTIVE" },
  });
  fireEvent.click(screen.getByRole("button", { name: "선택 상품 반품 신청" }));
  await waitFor(() =>
    expect(returnsApi.create).toHaveBeenCalledWith("buyer", "ORD-3", {
      market_id: 7,
      items: [{ order_line_item_id: 9, quantity: 2, reason: "ITEM_DEFECTIVE" }],
    }),
  );
});

it("replaces the collection form after saving and keeps sibling keys distinct", async () => {
  const address = {
    recipient_name: "수령인",
    phone: "01012345678",
    postal_code: "12345",
    address: "테스트 주소",
    address_detail: "",
  };
  const request = { ...returnedRequest(), status: "REQUESTED" as const };
  const collection = {
    id: 1,
    order_id: 3,
    market_id: 7,
    status: "DRAFT" as const,
    pickup: address,
    destination: address,
    carrier: "",
    tracking_number: "",
    items: [
      { id: 1, return_collection_id: 1, refund_item_id: 10, quantity: 2 },
    ],
  };
  vi.mocked(returnsApi.requests).mockResolvedValue([request]);
  vi.mocked(returnsApi.collections).mockResolvedValue([]);
  vi.mocked(returnsApi.address).mockResolvedValue(address);
  vi.mocked(returnsApi.collect).mockImplementation(async () => {
    vi.mocked(returnsApi.collections).mockResolvedValue([collection]);
    return collection;
  });
  render(
    <OrderReturnManagement
      token="seller"
      orderCode="ORD-3"
      role="SELLER"
      markets={[{ id: 7, name: "마켓", items: [] }]}
      pickupDefault={address}
    />,
    { wrapper },
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "수거 묶음 저장" }),
  );
  expect(
    await screen.findByRole("heading", { name: "수거 #1 · 수거 준비" }),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: "수거 묶음 만들기" }),
    ).not.toBeInTheDocument(),
  );
});

it("keeps the seller workspace on its selected market when the owner has several markets", async () => {
  vi.mocked(returnsApi.requests).mockResolvedValue([
    { ...returnedRequest(), id: 99, market_id: 8, status: "COMPLETED" },
    { ...returnedRequest(), status: "COMPLETED" },
  ]);
  vi.mocked(returnsApi.collections).mockResolvedValue([]);
  vi.mocked(returnsApi.address).mockResolvedValue({
    recipient_name: "반품팀",
    phone: "01012345678",
    postal_code: "12345",
    address: "테스트 주소",
    address_detail: "",
  });
  vi.mocked(returnsApi.quote).mockResolvedValue({
    ...quote(),
    completed: true,
  });
  render(
    <OrderReturnManagement
      token="seller"
      orderCode="ORD-3"
      role="SELLER"
      markets={[{ id: 7, name: "선택한 마켓", items: [] }]}
    />,
    { wrapper },
  );
  const select = await screen.findByRole("combobox", {
    name: "처리할 반품 요청",
  });
  expect(within(select).getAllByRole("option")).toHaveLength(1);
  expect(select).toHaveValue("12");
  expect(returnsApi.quote).not.toHaveBeenCalledWith("seller", 99);
});
