import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { returnsApi } from "@/lib/returns-api";
import { returnedRequest } from "@/test/returns-fixture";
import { CustomerOrderReturns } from "./customer-order-returns";
import { OrderReturnManagement } from "./order-return-management";

const home = { id: 1, receiver: "홍길동", phone: "01012345678", zip_code: "06236", line1: "서울시 집 주소", line2: "101호", is_default: true };
const office = { ...home, id: 2, receiver: "회사 수령인", line1: "서울시 회사 주소", line2: "201호", is_default: false };
const pickup = { recipient_name: office.receiver, phone: office.phone, postal_code: office.zip_code, address: office.line1, address_detail: office.line2 };
const market = { id: 7, name: "마켓", items: [{ id: 9, name: "셔츠", quantity: 2, price: 10000, status: "DELIVERED" }] };
const clients: QueryClient[] = [];
beforeEach(() => {
  vi.spyOn(api, "listAddresses").mockResolvedValue([home, office]);
  vi.spyOn(returnsApi, "requests").mockResolvedValue([]);
  vi.spyOn(returnsApi, "create").mockResolvedValue(returnedRequest());
});
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); vi.restoreAllMocks(); });
function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function expectAddressSummary(scope: ReturnType<typeof within>, address: typeof home) {
  expect(scope.getByText(`${address.receiver} · ${address.phone}`)).toBeVisible();
  expect(scope.getByText(`[${address.zip_code}] ${address.line1} ${address.line2}`)).toBeVisible();
  expect(scope.queryByRole("textbox")).not.toBeInTheDocument();
}
async function openForm() {
  render(<CustomerOrderReturns token="buyer" orderCode="ORD-3" markets={[market]} />, { wrapper });
  const opener = await screen.findByRole("button", { name: "마켓 반품 신청" });
  opener.focus();
  fireEvent.click(opener);
  fireEvent.click(screen.getByRole("checkbox", { name: "셔츠" }));
  return within(screen.getByRole("region", { name: "반품 수거지" }));
}
it("defaults to the saved default address and submits a different saved address as a snapshot", async () => {
  const section = await openForm();
  await section.findByText(`[${home.zip_code}] ${home.line1} ${home.line2}`);
  fireEvent.change(section.getByRole("combobox", { name: "주소록에서 선택" }), { target: { value: "2" } });
  expectAddressSummary(section, office);
  fireEvent.click(screen.getByRole("button", { name: "선택 상품 반품 신청" }));
  await waitFor(() => expect(returnsApi.create).toHaveBeenCalledWith("buyer", "ORD-3", {
    market_id: 7, items: [{ order_line_item_id: 9, quantity: 1, reason: "CHANGE_OF_MIND" }], pickup,
  }));
  expect(api.listAddresses).toHaveBeenCalledWith("buyer");
});
it("allows manual input without an address book and blocks invalid postal codes", async () => {
  vi.mocked(api.listAddresses).mockResolvedValue([]);
  const section = await openForm();
  await section.findByText("저장된 주소가 없습니다. 아래에 수거지를 입력해주세요.");
  for (const [name, value] of [["수령인", "새 수령인"], ["연락처", "01012345678"], ["우편번호", "1234"], ["주소", "새 수거 주소"]]) {
    fireEvent.change(section.getByRole("textbox", { name }), { target: { value } });
  }
  expect(screen.getByRole("button", { name: "선택 상품 반품 신청" })).toBeDisabled();
  fireEvent.change(section.getByRole("textbox", { name: "우편번호" }), { target: { value: "12345" } });
  expect(screen.getByRole("button", { name: "선택 상품 반품 신청" })).toBeEnabled();
});
it("keeps submission errors beside the fixed action and retries with the selected items and pickup", async () => {
  vi.mocked(returnsApi.create).mockRejectedValueOnce(new Error("반품 신청에 실패했습니다. 다시 시도해주세요."));
  const section = await openForm();
  await section.findByText(`[${home.zip_code}] ${home.line1} ${home.line2}`);
  fireEvent.change(section.getByRole("combobox", { name: "주소록에서 선택" }), { target: { value: "2" } });
  const dialog = screen.getByRole("dialog", { name: "마켓 반품 신청" });
  fireEvent.click(within(dialog).getByRole("button", { name: "선택 상품 반품 신청" }));
  const error = await within(dialog).findByRole("alert");
  expect(error).toHaveTextContent("반품 신청에 실패했습니다.");
  expect(within(dialog).getByRole("region", { name: "반품 신청 내용" })).not.toContainElement(error);
  expect(error.parentElement).toContainElement(within(dialog).getByRole("button", { name: "선택 상품 반품 신청" }));
  expectAddressSummary(section, office);
  expect(within(dialog).getByRole("checkbox", { name: "셔츠" })).toBeChecked();
  expect(returnsApi.create).toHaveBeenCalledTimes(1);
  fireEvent.click(within(dialog).getByRole("button", { name: "선택 상품 반품 신청" }));
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(returnsApi.create).toHaveBeenCalledTimes(2);
  expect(vi.mocked(returnsApi.create).mock.calls[1]).toEqual(vi.mocked(returnsApi.create).mock.calls[0]);
});
it("offers manual input and retry when the address book fails", async () => {
  vi.mocked(api.listAddresses).mockRejectedValue(new Error("offline"));
  const section = await openForm();
  expect(await section.findByRole("button", { name: "주소록 다시 불러오기" })).toBeEnabled();
  expect(section.getByRole("textbox", { name: "주소" })).toBeEnabled();
  vi.mocked(api.listAddresses).mockResolvedValue([home]);
  fireEvent.click(section.getByRole("button", { name: "주소록 다시 불러오기" }));
  await section.findByText(`[${home.zip_code}] ${home.line1} ${home.line2}`);
});
it("prefills the buyer's chosen pickup for the seller without replacing it with the original delivery", async () => {
  vi.mocked(returnsApi.requests).mockResolvedValue([{ ...returnedRequest(), status: "REQUESTED", pickup }]);
  vi.spyOn(returnsApi, "collections").mockResolvedValue([]);
  vi.spyOn(returnsApi, "address").mockResolvedValue({ ...pickup, address: "판매자 반품지" });
  render(<OrderReturnManagement token="seller" orderCode="ORD-3" role="SELLER" markets={[market]} pickupDefault={{ address: "예전 배송지" }} />, { wrapper });
  const fields = within(await screen.findByRole("group", { name: "고객 수거지" }));
  expectAddressSummary(fields, office);
});

it("does not silently combine requests with different buyer pickup addresses", async () => {
  vi.mocked(returnsApi.requests).mockResolvedValue([
    { ...returnedRequest(), status: "REQUESTED", pickup },
    { ...returnedRequest(), id: 13, status: "REQUESTED", pickup: { ...pickup, address: home.line1 }, items: [{ ...returnedRequest().items[0], id: 11, refund_id: 13 }] },
  ]);
  vi.spyOn(returnsApi, "collections").mockResolvedValue([]);
  vi.spyOn(returnsApi, "address").mockResolvedValue({ ...pickup, address: "판매자 반품지" });
  render(<OrderReturnManagement token="seller" orderCode="ORD-3" role="SELLER" markets={[market]} />, { wrapper });
  expect(await screen.findByRole("checkbox", { name: /반품 요청 #13.*수거지가 달라/ })).toBeDisabled();
});

it("lets the seller choose their own saved address and save it as the market return destination", async () => {
  vi.mocked(returnsApi.requests).mockResolvedValue([]);
  vi.spyOn(returnsApi, "collections").mockResolvedValue([]);
  vi.spyOn(returnsApi, "address").mockResolvedValue(null);
  vi.spyOn(returnsApi, "saveAddress").mockImplementation(async () => {
    vi.mocked(returnsApi.address).mockResolvedValue(pickup);
    return { saved: true };
  });
  render(<OrderReturnManagement token="seller" orderCode="ORD-3" role="SELLER" markets={[market]} />, { wrapper });
  fireEvent.click((await screen.findByText("마켓 기본 반품 도착지 등록 필요")).closest("summary")!);
  const select = await screen.findByRole("combobox", { name: "내 주소록에서 선택" });
  await screen.findByRole("option", { name: /회사 수령인/ });
  fireEvent.change(select, { target: { value: "2" } });
  const fields = within(screen.getByRole("group", { name: "기본 반품 도착지" }));
  expectAddressSummary(fields, office);
  fireEvent.click(screen.getByRole("button", { name: "기본 반품 도착지 저장" }));
  await screen.findByText("반품 도착지를 저장했습니다.");
  expect(returnsApi.saveAddress).toHaveBeenCalledWith("seller", market.id, pickup);
  expect(api.listAddresses).toHaveBeenCalledWith("seller");
});

it("does not use the admin's personal address book for another market", async () => {
  vi.mocked(returnsApi.requests).mockResolvedValue([]);
  vi.spyOn(returnsApi, "collections").mockResolvedValue([]);
  vi.spyOn(returnsApi, "address").mockResolvedValue(null);
  render(<OrderReturnManagement token="admin" orderCode="ORD-3" role="ADMIN" markets={[market]} />, { wrapper });
  fireEvent.click((await screen.findByText("마켓 기본 반품 도착지 등록 필요")).closest("summary")!);
  expect(screen.queryByRole("combobox", { name: "내 주소록에서 선택" })).not.toBeInTheDocument();
  expect(api.listAddresses).not.toHaveBeenCalled();
});

it("blocks an open form after a failed refresh and preserves inputs through retry", async () => {
  const section = await openForm();
  await section.findByText(`[${home.zip_code}] ${home.line1} ${home.line2}`);
  fireEvent.change(section.getByRole("combobox", { name: "주소록에서 선택" }), { target: { value: "2" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "셔츠 반품 수량" }), { target: { value: "2" } });
  fireEvent.change(screen.getByRole("combobox", { name: "셔츠 반품 사유" }), { target: { value: "ITEM_DEFECTIVE" } });
  vi.mocked(returnsApi.requests).mockRejectedValue(new Error("offline"));
  await clients[0].refetchQueries({ queryKey: ["order-returns"] });
  const dialog = within(screen.getByRole("dialog", { name: "마켓 반품 신청" }));
  const submit = dialog.getByRole("button", { name: "선택 상품 반품 신청" });
  expect(await dialog.findByText(/최신 반품 내역을 확인하지 못했습니다/)).toBeVisible();
  expect(submit).toBeDisabled();
  fireEvent.submit(submit.closest("form")!);
  expect(returnsApi.create).not.toHaveBeenCalled();
  let resolveRefresh!: (value: Awaited<ReturnType<typeof returnsApi.requests>>) => void;
  vi.mocked(returnsApi.requests).mockImplementation(() => new Promise((resolve) => { resolveRefresh = resolve; }));
  fireEvent.click(dialog.getByRole("button", { name: "신청 가능 수량 다시 확인" }));
  expect(await dialog.findByRole("button", { name: "최신 상태 확인 중" })).toBeDisabled();
  expect(submit).toBeDisabled();
  resolveRefresh([]);
  vi.mocked(returnsApi.requests).mockResolvedValue([]);
  await waitFor(() => expect(submit).toBeEnabled());
  expect(dialog.getByRole("spinbutton", { name: "셔츠 반품 수량" })).toHaveValue(2);
  expect(dialog.getByRole("combobox", { name: "셔츠 반품 사유" })).toHaveValue("ITEM_DEFECTIVE");
  expectAddressSummary(section, office);
  fireEvent.click(submit);
  await waitFor(() => expect(returnsApi.create).toHaveBeenCalledWith("buyer", "ORD-3", {
    market_id: 7, items: [{ order_line_item_id: 9, quantity: 2, reason: "ITEM_DEFECTIVE" }], pickup,
  }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "마켓 반품 신청" })).not.toBeInTheDocument());
});

it("reconciles availability after retry instead of submitting the cached selection", async () => {
  await openForm();
  vi.mocked(returnsApi.requests).mockRejectedValue(new Error("offline"));
  await clients[0].refetchQueries({ queryKey: ["order-returns"] });
  const dialog = within(screen.getByRole("dialog", { name: "마켓 반품 신청" }));
  vi.mocked(returnsApi.requests).mockResolvedValue([{ ...returnedRequest(), status: "REQUESTED" }]);
  fireEvent.click(await dialog.findByRole("button", { name: "신청 가능 수량 다시 확인" }));
  expect(await dialog.findByText("이미 반품 신청된 상품입니다.")).toBeVisible();
  expect(dialog.queryByRole("button", { name: "선택 상품 반품 신청" })).not.toBeInTheDocument();
  expect(returnsApi.create).not.toHaveBeenCalled();
});

it("distinguishes quantity and reason inputs for different options of the same product", async () => {
  render(<CustomerOrderReturns token="buyer" orderCode="ORD-3" markets={[{ ...market, items: [
    { ...market.items[0], optionLabel: "색상: 네이비" },
    { ...market.items[0], id: 10, optionLabel: "색상: 블랙" },
  ] }]} />, { wrapper });
  fireEvent.click(await screen.findByRole("button", { name: "마켓 반품 신청" }));
  for (const option of ["네이비", "블랙"]) {
    fireEvent.click(screen.getByRole("checkbox", { name: `셔츠 색상: ${option}` }));
    expect(screen.getByRole("spinbutton", { name: `셔츠 · 색상: ${option} 반품 수량` })).toBeVisible();
    expect(screen.getByRole("combobox", { name: `셔츠 · 색상: ${option} 반품 사유` })).toBeVisible();
  }
});


it("focuses return history after the submitted quantities remove the original opener", async () => {
  vi.mocked(returnsApi.create).mockImplementation(async () => {
    const request = { ...returnedRequest(), status: "REQUESTED" as const };
    vi.mocked(returnsApi.requests).mockResolvedValue([request]);
    return request;
  });
  await openForm();
  fireEvent.change(screen.getByRole("spinbutton", { name: "셔츠 반품 수량" }), { target: { value: "2" } });
  const submit = screen.getByRole("button", { name: "선택 상품 반품 신청" });
  await waitFor(() => expect(submit).toBeEnabled());
  submit.focus();
  fireEvent.click(submit);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.queryByRole("button", { name: "마켓 반품 신청" })).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("region", { name: "반품 신청 및 내역" })).toHaveFocus());
  await clients[0].refetchQueries({ queryKey: ["order-returns"] });
  expect(screen.getByRole("region", { name: "반품 신청 및 내역" })).toHaveFocus();
});

it("edits a saved pickup without changing the address book and can return to its summary", async () => {
  const section = await openForm();
  await section.findByText(`[${home.zip_code}] ${home.line1} ${home.line2}`);
  fireEvent.click(section.getByRole("button", { name: "주소 수정" }));
  const recipient = section.getByRole("textbox", { name: "수령인" });
  await waitFor(() => expect(recipient).toHaveFocus());
  const postal = section.getByRole("textbox", { name: "우편번호" });
  fireEvent.change(postal, { target: { value: "1234" } });
  fireEvent.blur(postal);
  expect(postal).toHaveAttribute("aria-invalid", "true");
  expect(section.getByRole("button", { name: "입력 완료" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "선택 상품 반품 신청" })).toBeDisabled();
  fireEvent.change(postal, { target: { value: home.zip_code } });
  fireEvent.change(section.getByRole("textbox", { name: "상세 주소" }), { target: { value: "202호" } });
  expect(section.getByRole("textbox", { name: "주소" })).toHaveValue(home.line1);
  fireEvent.click(section.getByRole("button", { name: "입력 완료" }));
  await waitFor(() => expect(section.getByRole("button", { name: "주소 수정" })).toHaveFocus());
  expectAddressSummary(section, { ...home, line2: "202호" });
  fireEvent.click(screen.getByRole("button", { name: "선택 상품 반품 신청" }));
  await waitFor(() => expect(returnsApi.create).toHaveBeenCalledWith("buyer", "ORD-3", expect.objectContaining({
    pickup: { recipient_name: home.receiver, phone: home.phone, postal_code: home.zip_code, address: home.line1, address_detail: "202호" },
  })));
});

it("expands manual pickup entry and keeps an invalid edit open", async () => {
  const section = await openForm();
  await section.findByText(`[${home.zip_code}] ${home.line1} ${home.line2}`);
  fireEvent.change(section.getByRole("combobox", { name: "주소록에서 선택" }), { target: { value: "manual" } });
  expect(section.getByRole("textbox", { name: "주소" })).toHaveValue("");
  expect(section.getByRole("button", { name: "입력 완료" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "선택 상품 반품 신청" })).toBeDisabled();
});

it("lets the seller edit a selected saved destination and saves the edited snapshot", async () => {
  vi.mocked(returnsApi.requests).mockResolvedValue([]);
  vi.spyOn(returnsApi, "collections").mockResolvedValue([]);
  vi.spyOn(returnsApi, "address").mockResolvedValue(null);
  vi.spyOn(returnsApi, "saveAddress").mockResolvedValue({ saved: true });
  render(<OrderReturnManagement token="seller" orderCode="ORD-3" role="SELLER" markets={[market]} />, { wrapper });
  fireEvent.click((await screen.findByText("마켓 기본 반품 도착지 등록 필요")).closest("summary")!);
  const select = await screen.findByRole("combobox", { name: "내 주소록에서 선택" });
  await screen.findByRole("option", { name: /회사 수령인/ });
  fireEvent.change(select, { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "주소 수정" }));
  const fields = within(screen.getByRole("group", { name: "기본 반품 도착지" }));
  fireEvent.change(fields.getByRole("textbox", { name: "상세 주소" }), { target: { value: "반품실" } });
  fireEvent.click(screen.getByRole("button", { name: "입력 완료" }));
  expectAddressSummary(within(screen.getByRole("group", { name: "기본 반품 도착지" })), { ...office, line2: "반품실" });
  fireEvent.click(screen.getByRole("button", { name: "기본 반품 도착지 저장" }));
  await waitFor(() => expect(returnsApi.saveAddress).toHaveBeenCalledWith("seller", market.id, { ...pickup, address_detail: "반품실" }));
});


it("keeps manual collection pickup fields open after completing a legacy request without a pickup", async () => {
  vi.mocked(returnsApi.requests).mockResolvedValue([{ ...returnedRequest(), status: "REQUESTED", pickup: null }]);
  vi.spyOn(returnsApi, "collections").mockResolvedValue([]);
  vi.spyOn(returnsApi, "address").mockResolvedValue(pickup);
  render(<OrderReturnManagement token="seller" orderCode="ORD-3" role="SELLER" markets={[market]} />, { wrapper });
  const fields = within(await screen.findByRole("group", { name: "고객 수거지" }));
  for (const [name, value] of [["수령인", home.receiver], ["연락처", home.phone], ["우편번호", home.zip_code], ["주소", home.line1]]) {
    fireEvent.change(fields.getByRole("textbox", { name }), { target: { value } });
  }
  expect(fields.getByRole("textbox", { name: "주소" })).toHaveValue(home.line1);
  fireEvent.change(fields.getByRole("textbox", { name: "상세 주소" }), { target: { value: home.line2 } });
  expect(screen.getByRole("button", { name: "입력 완료" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "입력 완료" }));
  expectAddressSummary(within(screen.getByRole("group", { name: "고객 수거지" })), home);
});
