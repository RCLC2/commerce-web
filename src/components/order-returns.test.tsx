import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  useQuery,
} from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { returnsApi } from "@/lib/returns-api";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { refundQuoteSchema } from "@/lib/shipping-policy-api";
import { returnedInspection, returnedRequest } from "@/test/returns-fixture";
import { OrderRefundControls } from "./order-refund-controls";
import { OrderReturnManagement } from "./order-return-management";
import { CustomerOrderReturns } from "./customer-order-returns";
import { ReturnRestock } from "./order-return-inspection";
import { ReturnCollectionWorkspace } from "./order-return-collection";
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
    saveAddress: vi.fn(),
    collect: vi.fn(),
    inspections: vi.fn(),
    inspect: vi.fn(),
    restock: vi.fn(),
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
  vi.resetAllMocks();
  vi.spyOn(api, "listAddresses").mockResolvedValue([{ id: 1, receiver: "구매자", phone: "01012345678", zip_code: "12345", line1: "서울시 수거로 1", line2: "101호", is_default: true }]);
});
afterEach(() => {
  cleanup();
  focusManager.setFocused(undefined);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("never offers a receipt-checkbox bypass before inspection", () => {
  render(
    <OrderRefundControls
      token="admin"
      request={{ ...returnedRequest(), status: "REQUESTED" }}
      markets={[]}
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
it("hides a cached quote while a bundled item's inspection is still pending", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(["return-quote", "admin", 12], quote());
  render(
    <QueryClientProvider client={client}>
      <OrderRefundControls
        token="admin"
        request={returnedRequest()}
        markets={[]}
        canExecute
        inspectionReady={false}
      />
    </QueryClientProvider>,
  );
  expect(returnsApi.quote).not.toHaveBeenCalled();
  expect(screen.queryByText("4,000원")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "검수한 수량 환불" }),
  ).not.toBeInTheDocument();
});
it("confirms an inspected request with each product's approved quantity and separated shipping costs", async () => {
  vi.mocked(returnsApi.quote).mockResolvedValue(quote());
  vi.mocked(returnsApi.execute).mockResolvedValue({
    ...quote(),
    completed: true,
  });
  render(
    <OrderRefundControls
      token="admin"
      request={{
        ...returnedRequest(),
        items: [
          returnedRequest().items[0],
          {
            ...returnedRequest().items[0],
            id: 11,
            order_line_item_id: 19,
            quantity: 3,
            approved_quantity: 2,
          },
          {
            ...returnedRequest().items[0],
            id: 12,
            order_line_item_id: 29,
            approved_quantity: 0,
          },
        ],
      }}
      markets={[
        {
          id: 7,
          name: "마켓",
          items: [
            {
              id: 9,
              name: "셔츠",
              optionLabel: "색상: 네이비",
              quantity: 2,
              price: 10000,
              status: "DELIVERED",
            },
            {
              id: 19,
              name: "셔츠",
              optionLabel: "색상: 블랙",
              quantity: 3,
              price: 20000,
              status: "DELIVERED",
            },
          ],
        },
      ]}
      canExecute
    />,
    { wrapper },
  );
  await screen.findByText("4,000원");
  expect(screen.getByText("결제수단 환불액")).toBeInTheDocument();
  expect(screen.queryByText("현금 환불액")).not.toBeInTheDocument();
  expect(screen.getByText("반품 수거비")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "검수한 수량 환불" }));
  const dialog = screen.getByRole("dialog", { name: "검수한 수량 환불" });
  expect(within(dialog).getByText(/반품 요청 #12/)).toBeInTheDocument();
  expect(within(dialog).getByText("결제수단 환불액")).toBeInTheDocument();
  expect(within(dialog).getByText(/승인 수량 3개/)).toBeInTheDocument();
  const items = within(dialog).getByLabelText("상품별 환불 승인 수량");
  for (const [name, requested, approved] of [
    ["색상: 네이비", 2, 1],
    ["색상: 블랙", 3, 2],
    ["주문 상품 #29", 2, 0],
  ] as const) {
    const row = within(items).getByText(name).closest("div")!;
    expect(within(row).getByText(`신청 ${requested}개`)).toBeInTheDocument();
    expect(
      within(row).getByText(`환불 승인 ${approved}개`),
    ).toBeInTheDocument();
  }
  expect(within(items).getAllByText("셔츠")).toHaveLength(2);
  expect(within(items).getByText("선택 옵션 정보 없음")).toBeInTheDocument();
  const fees = within(dialog).getByLabelText("배송비 반영 내역");
  for (const label of ["무료배송 발송비 차감", "반품 회수비 차감"]) {
    const row = within(fees).getByText(label).parentElement!;
    expect(within(row).getByText("3,000원")).toBeInTheDocument();
  }
  expect(within(dialog).getByText("4,000원")).toBeInTheDocument();
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
      markets={[]}
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
      markets={[]}
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
      markets={[]}
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
  await waitFor(() => expect(screen.getByRole("button", { name: "선택 상품 반품 신청" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "선택 상품 반품 신청" }));
  await waitFor(() =>
    expect(returnsApi.create).toHaveBeenCalledWith("buyer", "ORD-3", {
      market_id: 7,
      items: [{ order_line_item_id: 9, quantity: 2, reason: "ITEM_DEFECTIVE" }],
      pickup: { recipient_name: "구매자", phone: "01012345678", postal_code: "12345", address: "서울시 수거로 1", address_detail: "101호" },
    }),
  );
});

it.each([false, true])(
  "refreshes buyer order details and return status together (retry after error: %s)",
  async (initialError) => {
    const orderRead = vi
      .fn()
      .mockResolvedValue({ status: "배송 완료", refund: 0 });
    function OrderHeader() {
      const result = useQuery({
        queryKey: queryKeys.order("ORD-3", 3),
        queryFn: orderRead,
      });
      return (
        <p>
          주문 상태: {result.data?.status} · 환불액: {result.data?.refund}
        </p>
      );
    }
    if (initialError)
      vi.mocked(returnsApi.requests).mockRejectedValueOnce(
        new Error("조회 실패"),
      );
    else
      vi.mocked(returnsApi.requests).mockResolvedValue([
        { ...returnedRequest(), status: "INSPECTED" },
      ]);
    render(
      <>
        <OrderHeader />
        <CustomerOrderReturns token="buyer" orderCode="ORD-3" markets={[]} />
      </>,
      { wrapper },
    );
    await screen.findByText("주문 상태: 배송 완료 · 환불액: 0");
    const button = await screen.findByRole("button", {
      name: initialError ? "반품 내역 다시 확인" : "반품 상태 새로고침",
    });
    await waitFor(() => expect(button).toBeEnabled());
    vi.mocked(returnsApi.requests).mockResolvedValue([
      { ...returnedRequest(), status: "COMPLETED", amount: 17000 },
    ]);
    let completeOrder!: (value: { status: string; refund: number }) => void;
    orderRead.mockReturnValueOnce(
      new Promise((resolve) => {
        completeOrder = resolve;
      }),
    ).mockResolvedValue({ status: "반품 완료", refund: 17000 });
    fireEvent.click(button);
    expect(await screen.findByText("17,000원")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "최신 상태 확인 중" }),
    ).toBeDisabled();
    await act(async () =>
      completeOrder({ status: "반품 완료", refund: 17000 }),
    );
    expect(
      await screen.findByText("주문 상태: 반품 완료 · 환불액: 17000"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "반품 상태 새로고침" }),
      ).toBeEnabled(),
    );
    // Completion received during the manual refresh needs one reconciliation
    // after that refresh, because its order response may predate completion.
    await waitFor(() => expect(orderRead).toHaveBeenCalledTimes(3));
    expect(returnsApi.requests).toHaveBeenCalledTimes(3);
  },
);

it.each([false, true])(
  "keeps cached buyer returns visible after a background error (empty: %s)",
  async (empty) => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(returnsApi.requests).mockResolvedValue(
      empty ? [] : [returnedRequest()],
    );
    render(
      <QueryClientProvider client={client}>
        <CustomerOrderReturns token="buyer" orderCode="ORD-3" markets={[]} />
      </QueryClientProvider>,
    );
    const visibleText = empty
      ? "아직 신청한 반품이 없습니다."
      : "검수 완료";
    await screen.findByText(visibleText);
    vi.mocked(returnsApi.requests).mockRejectedValue(
      new Error("temporary connection failure"),
    );
    await act(() => client.refetchQueries({ queryKey: ["order-returns"] }));
    expect(
      await screen.findByText(
        "반품 상태를 갱신하지 못했습니다. 마지막으로 확인한 내역을 표시합니다.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(visibleText)).toBeInTheDocument();
    let resolveRequest!: (value: ReturnType<typeof returnedRequest>[]) => void;
    vi.mocked(returnsApi.requests).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "반품 내역 다시 확인" }),
    );
    await waitFor(() => expect(returnsApi.requests).toHaveBeenCalledTimes(3));
    expect(screen.getByText(visibleText)).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", {
      name: "최신 상태 확인 중",
    }))
      expect(button).toBeDisabled();
    await act(async () => resolveRequest(empty ? [] : [returnedRequest()]));
    await waitFor(() =>
      expect(
        screen.queryByText(
          "반품 상태를 갱신하지 못했습니다. 마지막으로 확인한 내역을 표시합니다.",
        ),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText(visibleText)).toBeInTheDocument();
    expect(returnsApi.execute).not.toHaveBeenCalled();
  },
);

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
    await screen.findByRole("button", { name: "수거 정보 저장" }),
  );
  expect(
    await screen.findByRole("heading", { name: "수거 #1 · 수거 준비" }),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.queryByRole("region", { name: "수거 준비" }),
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

it("restores completed restock from the server after reopening the view", () => {
  const props = {
    token: "admin",
    inspection: {
      ...returnedInspection(),
      restocked_quantity: 1,
      restocked_at: "2026-10-18T00:01:00Z",
    },
    totalRestockedQuantity: 1,
    productName: "셔츠",
    optionLabel: "색상: 네이비",
  };
  const view = render(<ReturnRestock {...props} />, { wrapper });
  expect(screen.getByText("재입고 완료")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "선택 수량 재입고" }),
  ).not.toBeInTheDocument();
  view.unmount();
  render(<ReturnRestock {...props} />, { wrapper });
  expect(screen.getByText("재입고 완료")).toBeInTheDocument();
  expect(returnsApi.restock).not.toHaveBeenCalled();
});

it("subtracts earlier inspection restocks before offering another selected receipt", async () => {
  vi.mocked(returnsApi.restock).mockResolvedValue({ restocked: true });
  render(
    <ReturnRestock
      token="seller"
      inspection={{
        ...returnedInspection(),
        restockable_quantity: 3,
        received_quantity: 3,
        version: 2,
      }}
      totalRestockedQuantity={2}
      productName="셔츠"
      optionLabel="색상: 네이비"
    />,
    { wrapper },
  );
  const input = screen.getByRole("spinbutton", { name: "재입고 수량" });
  expect(input).toHaveValue(1);
  expect(input).toHaveAttribute("max", "1");
  fireEvent.change(input, { target: { value: "2" } });
  expect(
    screen.getByRole("button", { name: "선택 수량 재입고" }),
  ).toBeDisabled();
  fireEvent.change(input, { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "선택 수량 재입고" }));
  fireEvent.click(screen.getByRole("button", { name: "재입고 확정" }));
  expect(await screen.findByText("재입고 완료")).toBeInTheDocument();
  expect(returnsApi.restock).toHaveBeenCalledWith("seller", 21, 1);
});

it("explains that fully reserved quantities are being returned instead of being unavailable", async () => {
  vi.mocked(returnsApi.requests).mockResolvedValue([
    { ...returnedRequest(), status: "REQUESTED" },
  ]);
  render(
    <CustomerOrderReturns
      token="buyer"
      orderCode="ORD-3"
      markets={[
        {
          id: 7,
          name: "마켓",
          items: [
            {
              id: 9,
              name: "셔츠",
              quantity: 2,
              price: 10000,
              status: "DELIVERED",
            },
          ],
        },
      ]}
    />,
    { wrapper },
  );
  expect(
    await screen.findByText("신청한 반품을 처리 중입니다."),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("신청 가능한 남은 수량이 없습니다."),
  ).not.toBeInTheDocument();
});

it("collapses completed collection and inspection details while preserving their records", async () => {
  const address = {
    recipient_name: "수령인",
    phone: "01012345678",
    postal_code: "12345",
    address: "테스트 주소",
    address_detail: "",
  };
  vi.mocked(returnsApi.inspections).mockResolvedValue([
    {
      ...returnedInspection(),
      restocked_quantity: 1,
      restocked_at: "2026-10-18T00:01:00Z",
    },
  ]);
  render(
    <ReturnCollectionWorkspace
      token="admin"
      collection={{
        id: 1,
        order_id: 3,
        market_id: 7,
        status: "RECEIVED",
        pickup: address,
        destination: address,
        carrier: "CJ",
        tracking_number: "R-1",
        collected_at: "2026-10-18T00:00:00Z",
        items: [
          { id: 1, return_collection_id: 1, refund_item_id: 10, quantity: 2 },
        ],
      }}
      requests={[{ ...returnedRequest(), quoted_at: "2026-10-18T00:00:00Z" }]}
      markets={[{ id: 7, name: "마켓", items: [] }]}
    />,
    { wrapper },
  );
  const summary = await screen.findByText(
    "검수 완료 · 수령 2개 / 환불 승인 2개 / 재판매 가능 2개",
  );
  expect(screen.getByText(/수거 요청 2개 · 수령 2개/)).toBeInTheDocument();
  expect(screen.queryByText(/수거 예정/)).not.toBeInTheDocument();
  expect(summary.closest("details")).not.toHaveAttribute("open");
  expect(
    screen.getByText("수거·입고 내역 · 반품 입고").closest("details"),
  ).not.toHaveAttribute("open");
  expect(
    screen.getByRole("spinbutton", { name: "환불 승인 수량", hidden: true }),
  ).not.toBeVisible();
  fireEvent.click(summary);
  expect(
    screen.getByRole("spinbutton", { name: "환불 승인 수량" }),
  ).toBeVisible();
  expect(
    screen.getByRole("spinbutton", { name: "환불 승인 수량" }),
  ).toBeDisabled();
  expect(screen.getByText("재입고 완료")).toBeInTheDocument();
});

function setupInspectedWorkspace(pending = false) {
  const address = {
    recipient_name: "수령인",
    phone: "01012345678",
    postal_code: "12345",
    address: "테스트 주소",
    address_detail: "",
  };
  vi.mocked(returnsApi.requests).mockResolvedValue([
    {
      ...returnedRequest(),
      items: pending
        ? [
            ...returnedRequest().items,
            {
              ...returnedRequest().items[0],
              id: 11,
              responsibility: "UNDETERMINED",
            },
          ]
        : returnedRequest().items,
    },
  ]);
  vi.mocked(returnsApi.collections).mockResolvedValue([
    {
      id: 1,
      order_id: 3,
      market_id: 7,
      status: "RECEIVED",
      pickup: address,
      destination: address,
      carrier: "CJ",
      tracking_number: "R-1",
      collected_at: "2026-10-18T00:00:00Z",
      items: [
        { id: 1, return_collection_id: 1, refund_item_id: 10, quantity: 2 },
        ...(pending
          ? [
              {
                id: 2,
                return_collection_id: 1,
                refund_item_id: 11,
                quantity: 2,
              },
            ]
          : []),
      ],
    },
  ]);
  vi.mocked(returnsApi.inspections).mockResolvedValue([returnedInspection()]);
  vi.mocked(returnsApi.address).mockResolvedValue(address);
  vi.mocked(returnsApi.quote).mockResolvedValue(quote());
  render(
    <OrderReturnManagement
      token="admin"
      orderCode="ORD-3"
      role="ADMIN"
      markets={[
        {
          id: 7,
          name: "마켓",
          items: [
            {
              id: 9,
              name: "셔츠",
              quantity: 2,
              price: 10000,
              status: "DELIVERED",
            },
          ],
        },
      ]}
    />,
    { wrapper },
  );
}

it("keeps an old premature INSPECTED request at 1/2 and only quotes after every item is inspected", async () => {
  setupInspectedWorkspace(true);
  expect(await screen.findByText(/검수 1\/2 완료/)).toBeInTheDocument();
  expect(
    screen.queryByText("다음 작업 · 환불 금액 확인"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "환불 금액으로 이동" }),
  ).not.toBeInTheDocument();
  expect(returnsApi.quote).not.toHaveBeenCalled();
  vi.mocked(returnsApi.requests).mockResolvedValue([
    {
      ...returnedRequest(),
      items: [
        ...returnedRequest().items,
        { ...returnedRequest().items[0], id: 11 },
      ],
    },
  ]);
  fireEvent.click(screen.getByRole("button", { name: "반품 상태 새로고침" }));
  expect(await screen.findByText("4,000원")).toBeInTheDocument();
  expect(screen.getByText("다음 작업 · 환불 금액 확인")).toBeInTheDocument();
  expect(returnsApi.quote).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("button", { name: "다음 미검수 상품으로 이동" }),
  ).not.toBeInTheDocument();
});

it("skips the inspected product and moves focus to the next inspection without changing quantities or stock", async () => {
  setupInspectedWorkspace(true);
  const button = await screen.findByRole("button", {
    name: "다음 미검수 상품으로 이동",
  });
  const collection = screen.getByRole("region", { name: "수거 건 1" });
  await waitFor(() =>
    expect(within(collection).getAllByRole("article")).toHaveLength(2),
  );
  const [inspected, pending] = within(collection).getAllByRole("article");
  const scroll = vi.fn();
  const inspectedScroll = vi.fn();
  Object.defineProperty(pending, "scrollIntoView", { value: scroll });
  Object.defineProperty(inspected, "scrollIntoView", {
    value: inspectedScroll,
  });
  const motion = { matches: false };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => motion),
  );
  fireEvent.click(button);
  expect(pending).toHaveFocus();
  expect(scroll).toHaveBeenLastCalledWith({
    block: "start",
    behavior: "smooth",
  });
  expect(inspectedScroll).not.toHaveBeenCalled();
  motion.matches = true;
  fireEvent.click(button);
  expect(scroll).toHaveBeenLastCalledWith({
    block: "start",
    behavior: "instant",
  });
  for (const api of [
    returnsApi.inspect,
    returnsApi.restock,
    returnsApi.execute,
    returnsApi.quote,
  ])
    expect(api).not.toHaveBeenCalled();
});

function setupMissingReturnAddress(error?: ApiError) {
  vi.mocked(returnsApi.requests).mockResolvedValue([
    { ...returnedRequest(), status: "REQUESTED" },
  ]);
  vi.mocked(returnsApi.collections).mockResolvedValue([]);
  if (error) vi.mocked(returnsApi.address).mockRejectedValue(error);
  else vi.mocked(returnsApi.address).mockResolvedValue(null);
  render(
    <OrderReturnManagement
      token="seller"
      orderCode="ORD-3"
      role="SELLER"
      markets={[{ id: 7, name: "마켓", items: [] }]}
    />,
    { wrapper },
  );
}

it("opens and focuses missing return address registration, then collapses into the saved summary", async () => {
  setupMissingReturnAddress();
  const register = await screen.findByRole("button", {
    name: "반품지 등록하기",
  });
  const summary = screen
    .getByText("마켓 기본 반품 도착지 등록 필요")
    .closest("summary")!;
  const details = summary.closest("details")!;
  const scroll = vi.fn();
  Object.defineProperty(details, "scrollIntoView", { value: scroll });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
  fireEvent.click(register);
  expect(details).toHaveAttribute("open");
  expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
  const fields = screen.getByRole("group", { name: "기본 반품 도착지" });
  expect(within(fields).getByRole("textbox", { name: "수령인" })).toHaveFocus();
  const saved = {
    recipient_name: "반품 담당",
    phone: "01012345678",
    postal_code: "12345",
    address: "테스트 반품 주소",
    address_detail: "101호",
  };
  for (const [label, value] of [
    ["수령인", saved.recipient_name],
    ["연락처", saved.phone],
    ["우편번호", saved.postal_code],
    ["주소", saved.address],
    ["상세 주소", saved.address_detail],
  ]) {
    fireEvent.change(within(fields).getByRole("textbox", { name: label }), {
      target: { value },
    });
  }
  vi.mocked(returnsApi.saveAddress).mockResolvedValue({ saved: true });
  vi.mocked(returnsApi.address).mockResolvedValue(saved);
  fireEvent.click(
    screen.getByRole("button", { name: "기본 반품 도착지 저장" }),
  );
  await screen.findByText("반품 도착지를 저장했습니다.");
  expect(returnsApi.saveAddress).toHaveBeenCalledWith("seller", 7, saved);
  expect(details).not.toHaveAttribute("open");
  expect(summary).toHaveFocus();
  expect(
    within(summary).getByText(/반품 담당 · 테스트 반품 주소 101호/),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "반품지 등록하기" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "수거 정보 저장" }),
  ).toBeInTheDocument();
  const collection = screen.getByRole("region", { name: "수거 준비" });
  const collectionScroll = vi.fn();
  Object.defineProperty(collection, "scrollIntoView", {
    value: collectionScroll,
  });
  fireEvent.click(
    screen.getByRole("button", { name: "수거 준비로 이동" }),
  );
  expect(collection).toHaveFocus();
  expect(collectionScroll).toHaveBeenCalledWith({
    block: "start",
    behavior: "instant",
  });
  expect(returnsApi.collect).not.toHaveBeenCalled();
});

it("offers retry rather than registration when the return address lookup actually fails", async () => {
  setupMissingReturnAddress(new ApiError("조회 오류", "http", 500));
  expect(
    await screen.findByRole("button", { name: "기본 반품지 다시 확인" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "반품지 등록하기" }),
  ).not.toBeInTheDocument();
});

it("refreshes inspection receipts and the refund quote with the return status", async () => {
  setupInspectedWorkspace();
  await screen.findByText("4,000원");
  await screen.findByRole("button", { name: "선택 수량 재입고" });
  vi.mocked(returnsApi.inspections).mockResolvedValue([
    {
      ...returnedInspection(),
      restocked_quantity: 1,
      restocked_at: "2026-10-18T00:01:00Z",
    },
  ]);
  let completeQuote!: (value: ReturnType<typeof quote>) => void;
  vi.mocked(returnsApi.quote).mockReturnValue(
    new Promise((resolve) => {
      completeQuote = resolve;
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "반품 상태 새로고침" }));
  expect(
    await screen.findByRole("button", { name: "최신 상태 확인 중" }),
  ).toBeDisabled();
  expect(await screen.findByText("재입고 완료")).toBeInTheDocument();
  await act(async () =>
    completeQuote({ ...quote(), cash_refund_amount: 5000 }),
  );
  expect(await screen.findByText("5,000원")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "선택 수량 재입고" }),
  ).not.toBeInTheDocument();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "반품 상태 새로고침" }),
    ).toBeEnabled(),
  );
  for (const api of [
    returnsApi.requests,
    returnsApi.collections,
    returnsApi.inspections,
    returnsApi.quote,
  ]) {
    expect(api).toHaveBeenCalledTimes(2);
  }
});

it("moves focus and scroll to the refund section without executing a refund", async () => {
  setupInspectedWorkspace();
  const button = await screen.findByRole("button", {
    name: "환불 금액으로 이동",
  });
  const section = screen.getByRole("region", { name: "환불 금액 안내" });
  const scroll = vi.fn();
  Object.defineProperty(section, "scrollIntoView", { value: scroll });
  const motion = { matches: false };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => motion),
  );
  fireEvent.click(button);
  expect(section).toHaveFocus();
  expect(scroll).toHaveBeenLastCalledWith({
    block: "start",
    behavior: "smooth",
  });
  motion.matches = true;
  fireEvent.click(button);
  expect(scroll).toHaveBeenLastCalledWith({
    block: "start",
    behavior: "instant",
  });
  expect(returnsApi.execute).not.toHaveBeenCalled();
});

it("automatically refreshes order status and totals once when a polled refund completes", async () => {
  focusManager.setFocused(true);
  const orderRead = vi
    .fn()
    .mockResolvedValueOnce({ status: "배송 완료", refund: 0 })
    .mockResolvedValue({ status: "반품 완료", refund: 17000 });
  function OrderHeader() {
    const result = useQuery({
      queryKey: queryKeys.order("ORD-3", 3),
      queryFn: orderRead,
    });
    return (
      <p>
        주문 상태: {result.data?.status} · 환불액: {result.data?.refund}
      </p>
    );
  }
  vi.mocked(returnsApi.requests)
    .mockResolvedValueOnce([{ ...returnedRequest(), status: "PROCESSING" }])
    .mockResolvedValue([
      { ...returnedRequest(), status: "COMPLETED", amount: 17000 },
    ]);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <OrderHeader />
      <CustomerOrderReturns token="buyer" orderCode="ORD-3" markets={[]} />
    </QueryClientProvider>,
  );
  await screen.findByText("환불 처리 중");
  await screen.findByText(
    "주문 상태: 반품 완료 · 환불액: 17000",
    {},
    { timeout: 4000 },
  );
  expect(screen.getByText("환불 완료")).toBeInTheDocument();
  expect(screen.getByText("17,000원")).toBeInTheDocument();
  expect(orderRead).toHaveBeenCalledTimes(2);
  // A subsequent identical response must not trigger a second order refresh.
  await act(() => client.refetchQueries({ queryKey: ["order-returns"] }));
  expect(orderRead).toHaveBeenCalledTimes(2);
});

it.each(["COMPLETED", "WITHDRAWN"] as const)(
  "polls requested and inspected returns only while visible, refreshes on focus and stops at %s",
  async (terminalStatus) => {
    vi.useFakeTimers();
    focusManager.setFocused(true);
    vi.mocked(returnsApi.requests)
      .mockResolvedValueOnce([{ ...returnedRequest(), status: "REQUESTED" }])
      .mockResolvedValueOnce([returnedRequest()])
      .mockResolvedValueOnce([returnedRequest()])
      .mockResolvedValue([{ ...returnedRequest(), status: terminalStatus }]);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    });
    render(
      <QueryClientProvider client={client}>
        <CustomerOrderReturns token="buyer" orderCode="ORD-3" markets={[]} />
      </QueryClientProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText("반품 접수")).toBeInTheDocument();
    expect(returnsApi.requests).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_001);
    });
    expect(screen.getByText("검수 완료")).toBeInTheDocument();
    expect(returnsApi.requests).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_001);
    });
    expect(screen.getByText("검수 완료")).toBeInTheDocument();
    expect(returnsApi.requests).toHaveBeenCalledTimes(3);
    act(() => focusManager.setFocused(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(returnsApi.requests).toHaveBeenCalledTimes(3);
    await act(async () => {
      focusManager.setFocused(true);
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(
      screen.getByText(
        terminalStatus === "COMPLETED" ? "환불 완료" : "요청 철회",
      ),
    ).toBeInTheDocument();
    const terminalReads = vi.mocked(returnsApi.requests).mock.calls.length;
    expect(terminalReads).toBeGreaterThanOrEqual(4);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(returnsApi.requests).toHaveBeenCalledTimes(terminalReads);
    expect(returnsApi.execute).not.toHaveBeenCalled();
  },
);

it("identifies identical products by option in inspection and restock confirmation", async () => {
  vi.mocked(returnsApi.restock).mockResolvedValue({ restocked: true });
  vi.mocked(returnsApi.inspections).mockResolvedValue([
    returnedInspection(),
    { ...returnedInspection(), id: 22, return_collection_item_id: 2 },
  ]);
  const address = {
    recipient_name: "수령인",
    phone: "01012345678",
    postal_code: "12345",
    address: "테스트 주소",
    address_detail: "",
  };
  render(
    <ReturnCollectionWorkspace
      token="admin"
      collection={{
        id: 1,
        order_id: 3,
        market_id: 7,
        status: "RECEIVED",
        pickup: address,
        destination: address,
        carrier: "CJ",
        tracking_number: "R-1",
        items: [
          { id: 1, return_collection_id: 1, refund_item_id: 10, quantity: 2 },
          { id: 2, return_collection_id: 1, refund_item_id: 11, quantity: 2 },
        ],
      }}
      requests={[
        {
          ...returnedRequest(),
          items: [
            returnedRequest().items[0],
            { ...returnedRequest().items[0], id: 11, order_line_item_id: 19 },
          ],
        },
      ]}
      markets={[
        {
          id: 7,
          name: "마켓",
          items: [
            {
              id: 9,
              name: "셔츠",
              optionLabel: "색상: 네이비",
              quantity: 2,
              price: 10000,
              status: "DELIVERED",
            },
            {
              id: 19,
              name: "셔츠",
              optionLabel: "색상: 블랙",
              quantity: 2,
              price: 10000,
              status: "DELIVERED",
            },
          ],
        },
      ]}
    />,
    { wrapper },
  );
  for (const [option, inspectionID] of [
    ["네이비", 21],
    ["블랙", 22],
  ] as const) {
    const heading = await screen.findByRole("heading", {
      name: `셔츠 색상: ${option}`,
    });
    const article = within(heading.closest("article")!);
    fireEvent.click(article.getByRole("button", { name: "선택 수량 재입고" }));
    const confirmation = article.getByRole("region", {
      name: `검수 ${inspectionID} 재입고`,
    });
    expect(within(confirmation).getByText("셔츠")).toBeInTheDocument();
    expect(
      within(confirmation).getByText(`색상: ${option}`),
    ).toBeInTheDocument();
    fireEvent.click(
      within(confirmation).getByRole("button", { name: "재입고 확정" }),
    );
    await waitFor(() =>
      expect(returnsApi.restock).toHaveBeenCalledWith("admin", inspectionID, 2),
    );
    await article.findByText("재입고 완료");
  }
});

it.each([
  { quantity: 2, otherProcessing: false, completed: true, guidance: false },
  { quantity: 3, otherProcessing: false, completed: false, guidance: true },
  { quantity: 2, otherProcessing: true, completed: true, guidance: true },
])(
  "shows completion guidance without hiding remaining returns: %j",
  async ({ quantity, otherProcessing, completed, guidance }) => {
    const request = {
      ...returnedRequest(),
      status: "COMPLETED" as const,
      items: [{ ...returnedRequest().items[0], approved_quantity: 2 }],
    };
    const processing = {
      ...returnedRequest(),
      id: 13,
      market_id: 8,
      status: "PROCESSING" as const,
      items: [
        { ...returnedRequest().items[0], id: 11, order_line_item_id: 19 },
      ],
    };
    vi.mocked(returnsApi.requests).mockResolvedValue(
      otherProcessing ? [request, processing] : [request],
    );
    const line = {
      id: 9,
      name: "셔츠",
      quantity,
      price: 10000,
      status: "DELIVERED",
    };
    render(
      <CustomerOrderReturns
        token="buyer"
        orderCode="ORD-3"
        markets={[
          { id: 7, name: "첫 마켓", items: [line] },
          ...(otherProcessing
            ? [{ id: 8, name: "다른 마켓", items: [{ ...line, id: 19 }] }]
            : []),
        ]}
      />,
      { wrapper },
    );
    await screen.findByText("환불 완료");
    expect(
      Boolean(screen.queryByText("신청한 상품의 반품·환불이 완료되었습니다.")),
    ).toBe(completed);
    expect(
      Boolean(screen.queryByText(/판매자가 수거지와 상품을 확인한 뒤/)),
    ).toBe(guidance);
    if (quantity > 2)
      expect(
        screen.getByRole("button", { name: "첫 마켓 반품 신청" }),
      ).toBeEnabled();
    if (otherProcessing)
      expect(
        screen.getByText("신청한 반품을 처리 중입니다."),
      ).toBeInTheDocument();
  },
);
