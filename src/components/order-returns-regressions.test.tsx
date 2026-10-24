import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { returnsApi, type ReturnMarket } from "@/lib/returns-api";
import { refundQuoteSchema } from "@/lib/shipping-policy-api";
import { returnedInspection, returnedRequest } from "@/test/returns-fixture";
import { CustomerOrderReturns } from "./customer-order-returns";
import { OrderRefundControls } from "./order-refund-controls";
import { OrderReturnManagement } from "./order-return-management";
import { ReturnCollectionWorkspace } from "./order-return-collection";
import { ReturnRestock } from "./order-return-inspection";

vi.mock("@/lib/returns-api", async (original) => ({
  ...(await original<typeof import("@/lib/returns-api")>()),
  returnsApi: {
    requests: vi.fn(), create: vi.fn(), quote: vi.fn(), execute: vi.fn(),
    collections: vi.fn(), address: vi.fn(), saveAddress: vi.fn(),
    inspections: vi.fn(), restock: vi.fn(),
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const completed = () => ({ ...returnedRequest(), status: "COMPLETED" as const, amount: 17000 });
const staleOrder = { status: "배송 완료", refund: 0 };
const freshOrder = { status: "반품 완료", refund: 17000 };
const address = {
  recipient_name: "반품팀", phone: "01012345678", postal_code: "12345",
  address: "서울시 반품로 1", address_detail: "101호",
};
const market: ReturnMarket = {
  id: 7, name: "마켓",
  items: [{ id: 9, name: "셔츠", optionLabel: "색상: 네이비", quantity: 1, price: 20000, status: "DELIVERED" }],
};
function provider() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { client, wrapper: ({ children }: { children: React.ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}
const clients: QueryClient[] = [];
beforeEach(() => { vi.resetAllMocks(); vi.spyOn(api, "listAddresses").mockResolvedValue([]); });
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});
function orderHarness(orderRead: () => Promise<typeof staleOrder>) {
  const context = provider();
  clients.push(context.client);
  function OrderHeader() {
    const query = useQuery({ queryKey: queryKeys.order("ORD-3", 3), queryFn: orderRead });
    return <p>주문 상태: {query.data?.status} · 환불액: {query.data?.refund}</p>;
  }
  render(<><OrderHeader /><CustomerOrderReturns token="buyer" orderCode="ORD-3" markets={[]} /></>, context);
  return context.client;
}

it("reconciles completion after an overlapping manual refresh and its stale order response", async () => {
  const oldOrder = deferred<typeof staleOrder>();
  const laterReturns = deferred<ReturnType<typeof returnedRequest>[]>();
  const orderRead = vi.fn().mockResolvedValueOnce(staleOrder).mockReturnValueOnce(oldOrder.promise).mockResolvedValue(freshOrder);
  vi.mocked(returnsApi.requests).mockResolvedValueOnce([returnedRequest()]).mockReturnValueOnce(laterReturns.promise).mockResolvedValue([completed()]);
  const client = orderHarness(orderRead);
  await screen.findByText("주문 상태: 배송 완료 · 환불액: 0");
  const refresh = await screen.findByRole("button", { name: "반품 상태 새로고침" });
  await waitFor(() => expect(refresh).toBeEnabled());
  fireEvent.click(refresh);
  await waitFor(() => expect(orderRead).toHaveBeenCalledTimes(2));
  await act(async () => laterReturns.resolve([completed()]));
  await screen.findByText("환불 완료");
  await act(async () => oldOrder.resolve(staleOrder));
  await screen.findByText("주문 상태: 반품 완료 · 환불액: 17000");
  expect(orderRead).toHaveBeenCalledTimes(3);
  await act(() => client.refetchQueries({ queryKey: ["order-returns"] }));
  expect(orderRead).toHaveBeenCalledTimes(3);
});

it.each([false, true])("reconciles an initially completed return when the first order read is pending: %s", async (orderPending) => {
  const initialOrder = deferred<typeof staleOrder>();
  const laterReturns = deferred<ReturnType<typeof returnedRequest>[]>();
  const orderRead = vi.fn().mockReturnValueOnce(orderPending ? initialOrder.promise : Promise.resolve(staleOrder)).mockResolvedValue(freshOrder);
  vi.mocked(returnsApi.requests).mockReturnValueOnce(laterReturns.promise).mockResolvedValue([completed()]);
  orderHarness(orderRead);
  if (!orderPending) await screen.findByText("주문 상태: 배송 완료 · 환불액: 0");
  await act(async () => laterReturns.resolve([completed()]));
  await screen.findByText("환불 완료");
  if (orderPending) await act(async () => initialOrder.resolve(staleOrder));
  await screen.findByText("주문 상태: 반품 완료 · 환불액: 17000");
  expect(orderRead).toHaveBeenCalledTimes(2);
});

it("shows retained original paid shipping separately from pickup fees in the refund confirmation", async () => {
  const context = provider();
  clients.push(context.client);
  vi.mocked(returnsApi.quote).mockResolvedValue(refundQuoteSchema.parse({
    refund_id: 12, cash_refund_amount: 17000, retained_shipping_fee: 3000, restored_point: 0,
    reason: "", shipping_refund_amount: 0, outbound_shipping_fee_deduction: 0,
    return_shipping_fee: 3000, shipping_fee_waived_amount: 0,
  }));
  const paidMarket = { ...market, shippingFee: 3000 };
  render(<OrderRefundControls token="admin" request={returnedRequest()} markets={[paidMarket]} canExecute />, context);
  const confirm = await screen.findByRole("button", { name: "검수한 수량 환불" });
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm);
  const breakdown = within(screen.getByRole("dialog")).getByLabelText("배송비 반영 내역");
  const original = within(breakdown).getByText("최초 배송비 환불 제외").closest("div")!;
  const pickup = within(breakdown).getByText("반품 회수비 차감").closest("div")!;
  expect(within(original).getByText("3,000원")).toBeInTheDocument();
  expect(within(pickup).getByText("3,000원")).toBeInTheDocument();
  expect(returnsApi.execute).not.toHaveBeenCalled();
});

it.each([
  { shippingRefund: 3000, previousShippingRefund: 0 },
  { shippingRefund: 0, previousShippingRefund: 3000 },
])("does not retain shipping already refunded in this or a previous request: %j", async ({ shippingRefund, previousShippingRefund }) => {
  const context = provider();
  clients.push(context.client);
  vi.mocked(returnsApi.quote).mockResolvedValue(refundQuoteSchema.parse({
    refund_id: 12, cash_refund_amount: 20000 + shippingRefund,
    retained_shipping_fee: 0, restored_point: 0, reason: "",
    shipping_refund_amount: shippingRefund, outbound_shipping_fee_deduction: 0,
    return_shipping_fee: 0, shipping_fee_waived_amount: 0,
  }));
  const paidMarket = { ...market, shippingFee: 3000 };
  render(<OrderRefundControls token="admin" request={returnedRequest()} markets={[paidMarket]}
    previousShippingRefundAmount={previousShippingRefund} canExecute />, context);
  const confirm = await screen.findByRole("button", { name: "검수한 수량 환불" });
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm);
  const breakdown = within(screen.getByRole("dialog")).getByLabelText("배송비 반영 내역");
  expect(within(breakdown).queryByText("최초 배송비 환불 제외")).not.toBeInTheDocument();
  if (shippingRefund) expect(within(breakdown).getByText("최초 배송비 환불")).toBeInTheDocument();
});

it("keeps a remounted address editor locked until the save's reread finishes", async () => {
  const context = provider();
  clients.push(context.client);
  const reread = deferred<typeof address>();
  vi.mocked(returnsApi.requests).mockResolvedValue([]);
  vi.mocked(returnsApi.collections).mockResolvedValue([]);
  vi.mocked(returnsApi.address).mockResolvedValueOnce(null).mockReturnValue(reread.promise);
  vi.mocked(returnsApi.saveAddress).mockResolvedValue({ saved: true });
  render(<OrderReturnManagement token="seller" orderCode="ORD-3" markets={[market]} role="SELLER" />, context);
  const summary = (await screen.findByText("마켓 기본 반품 도착지 등록 필요")).closest("summary")!;
  fireEvent.click(summary);
  const details = summary.closest("details")!;
  details.open = true;
  const fields = screen.getByRole("group", { name: "기본 반품 도착지" });
  for (const [name, value] of [["수령인", address.recipient_name], ["연락처", address.phone], ["우편번호", address.postal_code], ["주소", address.address]])
    fireEvent.change(within(fields).getByRole("textbox", { name }), { target: { value } });
  const save = screen.getByRole("button", { name: "기본 반품 도착지 저장" });
  fireEvent.click(save);
  await waitFor(() => expect(returnsApi.address).toHaveBeenCalledTimes(2));
  const pendingSave = screen.getByRole("button", { name: "저장 내용 확인 중…" });
  expect(pendingSave).toBeDisabled();
  expect(pendingSave.closest("form")).toHaveAttribute("aria-busy", "true");
  expect(screen.getByText("반품 도착지를 저장하고 있습니다. 잠시만 기다려주세요.")).toHaveAttribute("role", "status");
  expect(screen.getByRole("group", { name: "기본 반품 도착지" })).toBeDisabled();
  fireEvent.submit(pendingSave.closest("form")!);
  expect(returnsApi.saveAddress).toHaveBeenCalledTimes(1);
  await act(async () => reread.resolve(address));
  await screen.findByText("반품 도착지를 저장했습니다.");
  expect(details).not.toHaveAttribute("open");
});

it("drops hidden selections after a refreshed request reserves the last available item", async () => {
  const context = provider();
  clients.push(context.client);
  vi.mocked(returnsApi.requests).mockResolvedValue([]);
  render(<CustomerOrderReturns token="buyer" orderCode="ORD-3" markets={[market]} />, context);
  fireEvent.click(await screen.findByRole("button", { name: "마켓 반품 신청" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /셔츠/ }));
  const reserved = [{ ...returnedRequest(), status: "REQUESTED" as const, items: [{ ...returnedRequest().items[0], quantity: 1 }] }];
  vi.mocked(returnsApi.requests).mockResolvedValue(reserved);
  await act(async () => context.client.setQueryData(["order-returns", "buyer", "ORD-3"], reserved));
  await waitFor(() => expect(screen.queryByRole("checkbox")).not.toBeInTheDocument());
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("이미 반품 신청된 상품입니다.")).toBeInTheDocument();
  expect(within(dialog).queryByRole("button", { name: "선택 상품 반품 신청" })).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "반품 내역으로 돌아가기" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("region", { name: "반품 신청 및 내역" })).toHaveFocus());
  expect(returnsApi.create).not.toHaveBeenCalled();
});

it("announces automatic completion without moving keyboard focus", async () => {
  const context = provider();
  clients.push(context.client);
  vi.mocked(returnsApi.requests).mockResolvedValue([returnedRequest()]);
  render(<><button>계속 보던 위치</button><CustomerOrderReturns token="buyer" orderCode="ORD-3" markets={[]} /></>, context);
  await screen.findByText("검수 완료");
  const focused = screen.getByRole("button", { name: "계속 보던 위치" });
  focused.focus();
  vi.mocked(returnsApi.requests).mockResolvedValue([completed()]);
  await act(() => context.client.refetchQueries({ queryKey: ["order-returns"] }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/환불.*완료/));
  expect(focused).toHaveFocus();
});

it("uses all inspection versions when the collection offers the next restock quantity", async () => {
  const context = provider();
  clients.push(context.client);
  vi.mocked(returnsApi.inspections).mockResolvedValue([
    { ...returnedInspection(), restocked_quantity: 2, restocked_at: "2026-10-22T01:00:00Z", received_quantity: 3, restockable_quantity: 3 },
    { ...returnedInspection(), id: 22, version: 2, received_quantity: 3, restockable_quantity: 3 },
  ]);
  render(<ReturnCollectionWorkspace token="seller" collection={{
    id: 1, order_id: 3, market_id: 7, status: "RECEIVED", pickup: address, destination: address,
    carrier: "CJ", tracking_number: "R-1", collected_at: "2026-10-22T00:00:00Z",
    items: [{ id: 1, return_collection_id: 1, refund_item_id: 10, quantity: 3 }],
  }} requests={[returnedRequest()]} markets={[market]} />, context);
  const quantity = await screen.findByRole("spinbutton", { name: "재입고 수량" });
  expect(quantity).toHaveValue(1);
  expect(quantity).toHaveAttribute("max", "1");
  fireEvent.change(quantity, { target: { value: "2" } });
  expect(screen.getByRole("button", { name: "선택 수량 재입고" })).toBeDisabled();
  expect(returnsApi.restock).not.toHaveBeenCalled();
});

it("distinguishes this inspection's restock from the cumulative stock before and after rereading", async () => {
  const context = provider();
  clients.push(context.client);
  const inspection = { ...returnedInspection(), restockable_quantity: 3, received_quantity: 3, version: 2 };
  vi.mocked(returnsApi.restock).mockResolvedValue({ restocked: true });
  const view = render(<ReturnRestock token="seller" inspection={inspection} totalRestockedQuantity={2} productName="셔츠" />, context);
  fireEvent.click(screen.getByRole("button", { name: "선택 수량 재입고" }));
  fireEvent.click(screen.getByRole("button", { name: "재입고 확정" }));
  expect(await screen.findByText("이번 재입고 1개 · 누적 재입고 3개")).toBeInTheDocument();
  view.rerender(<ReturnRestock token="seller" inspection={{ ...inspection, restocked_quantity: 1, restocked_at: "2026-10-22T01:00:00Z" }} totalRestockedQuantity={3} productName="셔츠" />);
  expect(screen.getByText("이번 재입고 1개 · 누적 재입고 3개")).toBeInTheDocument();
  expect(screen.queryByText(/누적 재입고 4개/)).not.toBeInTheDocument();
  expect(returnsApi.restock).toHaveBeenCalledTimes(1);
});
