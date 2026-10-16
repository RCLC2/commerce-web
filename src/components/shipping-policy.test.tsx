import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { shippingPolicyApi } from "@/lib/shipping-policy-api";
import { MarketShippingSettings } from "./market-shipping-settings";
import { OrderRefundSummary } from "./order-refund-summary";
import { OrderRefundControls } from "./order-refund-controls";
vi.mock("@/lib/shipping-policy-api", async (importOriginal) => ({...await importOriginal<typeof import("@/lib/shipping-policy-api")>(),shippingPolicyApi:{settings:vi.fn(),update:vi.fn(),refundQuote:vi.fn(),refund:vi.fn(),withdrawRefund:vi.fn()}}));
function wrapper({children}:{children:React.ReactNode}) { return <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{children}</QueryClientProvider>; }
beforeEach(()=>{cleanup();vi.clearAllMocks();});
describe("shipping policy screens",()=>{
 it("saves configured paid shipping and rejects base fees other than zero or 3,000 won",async()=>{
  const settings={market_id:7,shipping_fee:0,additional_shipping_fee:0,additional_shipping_fee_reason:"NONE" as const};
  vi.mocked(shippingPolicyApi.settings).mockResolvedValue(settings);
  vi.mocked(shippingPolicyApi.update).mockResolvedValue({...settings,shipping_fee:3000});
  render(<MarketShippingSettings token="seller" marketID={7}/>,{wrapper});
  const input=await screen.findByLabelText("기본 배송비 (원)");fireEvent.change(input,{target:{value:"1000"}});expect(screen.getByRole("button",{name:"배송 설정 저장"})).toBeDisabled();
  fireEvent.change(input,{target:{value:"3000"}});fireEvent.click(screen.getByRole("button",{name:"배송 설정 저장"}));
  await waitFor(()=>expect(shippingPolicyApi.update).toHaveBeenCalledWith("seller",{...settings,shipping_fee:3000}));
  expect(await screen.findByText("배송 설정을 저장했습니다.")).toBeInTheDocument();
 });
 it("shows the server refund amounts and requires confirmation of receipt",async()=>{
  vi.mocked(shippingPolicyApi.refundQuote).mockResolvedValue({cash_refund_amount:18000,retained_shipping_fee:6000,restored_point:6000,reason:"CHANGE_OF_MIND"});
  vi.mocked(shippingPolicyApi.refund).mockResolvedValue({cash_refund_amount:18000,retained_shipping_fee:6000,restored_point:6000,reason:"CHANGE_OF_MIND"});
  render(<OrderRefundControls token="admin" orderCode="ORD-1"/>,{wrapper});
  expect(await screen.findByText("18,000원")).toBeInTheDocument();expect(screen.getByText("환불하지 않는 최초 배송비")).toBeInTheDocument();expect(screen.getByRole("button",{name:"전체 환불 확정"})).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));fireEvent.click(screen.getByRole("button",{name:"전체 환불 확정"}));
  expect(await screen.findByRole("dialog", {name:"전체 상품 환불"})).toBeInTheDocument();
  const dialog = screen.getByRole("dialog", {name:"전체 상품 환불"});
  expect(within(dialog).getByText("18,000원")).toBeInTheDocument();
  expect(within(dialog).getByText("6,000P")).toBeInTheDocument();
  expect(within(dialog).getByText("단순변심")).toBeInTheDocument();
  expect(shippingPolicyApi.refund).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", {name:"취소"}));
  expect(screen.queryByRole("dialog", {name:"전체 상품 환불"})).not.toBeInTheDocument();
  expect(shippingPolicyApi.refund).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name:"전체 환불 확정"}));
  fireEvent.click(screen.getByRole("button", {name:/^환불 확정$/}));
  await waitFor(()=>expect(shippingPolicyApi.refund).toHaveBeenCalledWith("admin","ORD-1","CHANGE_OF_MIND"));
 });
});

it("reveals the completed refund above the old modal scroll position", () => {
 const refund = {reason:"CHANGE_OF_MIND" as const, cash_refund_amount:25910, retained_shipping_fee:3000, restored_point:1000, coupon_status:"RESTORED" as const, completed_at:"2026-10-11T04:15:28+09:00"};
 const view = render(<div style={{overflowY:"auto"}}><button>환불 확정</button></div>);
 const scrollArea = view.container.firstElementChild as HTMLElement;
 scrollArea.scrollTop = 280;
 view.rerender(<div style={{overflowY:"auto"}}><OrderRefundSummary refund={refund} revealOnMount /></div>);
 expect(scrollArea.scrollTop).toBe(0);
 expect(screen.getByLabelText("환불 완료 내역")).toHaveFocus();
 expect(screen.getByText("25,910원")).toBeInTheDocument();
});

it("requires confirmation before withdrawing a rejected refund", async () => {
 const { ApiHttpError } = await import("@/lib/api-client");
 vi.mocked(shippingPolicyApi.refundQuote).mockResolvedValue({cash_refund_amount:4000,retained_shipping_fee:3000,restored_point:0,reason:"CHANGE_OF_MIND"});
 vi.mocked(shippingPolicyApi.refund).mockRejectedValue(new ApiHttpError("결제사가 환불 요청을 거절했습니다.",409,undefined,"ORDER_REFUND_REJECTED"));
 vi.mocked(shippingPolicyApi.withdrawRefund).mockResolvedValue({withdrawn:true});
 render(<OrderRefundControls token="admin" orderCode="ORD-rejected"/>,{wrapper});
 await screen.findByText("4,000원");
 fireEvent.click(screen.getByRole("checkbox"));
 fireEvent.click(screen.getByRole("button",{name:"전체 환불 확정"}));
 fireEvent.click(screen.getByRole("button",{name:"환불 확정"}));
 const withdrawButton = await screen.findByRole("button",{name:"환불 요청 철회"});
 fireEvent.click(withdrawButton);
 expect(shippingPolicyApi.withdrawRefund).not.toHaveBeenCalled();
 const dialog = screen.getByRole("dialog",{name:"환불 요청 철회"});
 fireEvent.click(within(dialog).getByRole("button",{name:"철회 확인"}));
 await waitFor(()=>expect(shippingPolicyApi.withdrawRefund).toHaveBeenCalledWith("admin","ORD-rejected"));
 expect(await screen.findByText(/환불 요청을 철회했습니다/)).toBeInTheDocument();
 expect(screen.getByRole("button",{name:"전체 환불 확정"})).toBeDisabled();
});

it("offers withdrawal for a persisted rejection after reloading", async () => {
 vi.mocked(shippingPolicyApi.refundQuote).mockResolvedValue({cash_refund_amount:4000,retained_shipping_fee:3000,restored_point:0,reason:"CHANGE_OF_MIND",operation_status:"FAILED"});
 render(<OrderRefundControls token="admin" orderCode="ORD-failed"/>,{wrapper});
 expect(await screen.findByRole("button",{name:"환불 요청 철회"})).toBeInTheDocument();
 expect(shippingPolicyApi.refund).not.toHaveBeenCalled();
});

it("keeps a withdrawn refund disabled after reloading", async () => {
 vi.mocked(shippingPolicyApi.refundQuote).mockResolvedValue({cash_refund_amount:4000,retained_shipping_fee:3000,restored_point:0,reason:"CHANGE_OF_MIND",operation_status:"FAILED",withdrawn:true});
 render(<OrderRefundControls token="admin" orderCode="ORD-withdrawn"/>,{wrapper});
 expect(await screen.findByText(/환불 요청을 철회했습니다/)).toBeInTheDocument();
 expect(screen.getByRole("button",{name:"전체 환불 확정"})).toBeDisabled();
 expect(screen.queryByRole("button",{name:"환불 요청 철회"})).not.toBeInTheDocument();
});

it("polls an ambiguous refund until local completion and refreshes the parent order", async () => {
 const base = {cash_refund_amount:4000,retained_shipping_fee:3000,restored_point:0,reason:"CHANGE_OF_MIND" as const};
 vi.mocked(shippingPolicyApi.refundQuote)
  .mockResolvedValueOnce({...base,operation_status:"UNKNOWN"})
  .mockResolvedValueOnce({...base,operation_status:"SUCCEEDED"})
  .mockResolvedValue({...base,operation_status:"SUCCEEDED",completed:true});
 const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
 const invalidate = vi.spyOn(client,"invalidateQueries");
 const view = render(<QueryClientProvider client={client}><OrderRefundControls token="admin" orderCode="ORD-poll"/></QueryClientProvider>);
 await screen.findByText("환불 처리 상태를 확인하고 있습니다");
 expect(screen.getByRole("button",{name:"전체 환불 확정"})).toBeDisabled();
 await waitFor(()=>expect(shippingPolicyApi.refundQuote).toHaveBeenCalledTimes(2),{timeout:3000});
 expect(screen.queryByText("전체 상품 환불을 완료했습니다.")).not.toBeInTheDocument();
 // PG success alone must not be presented as completed before benefits/order state commit.
 expect(invalidate).not.toHaveBeenCalled();
 expect(screen.getByText("4,000원")).toBeInTheDocument();
 await screen.findByText("전체 상품 환불을 완료했습니다.",{},{timeout:3000});
 await waitFor(()=>{
  expect(invalidate).toHaveBeenCalledWith({queryKey:["admin-orders-v2"]});
  expect(invalidate).toHaveBeenCalledWith({queryKey:["admin-order-v2","ORD-poll"]});
  expect(invalidate).toHaveBeenCalledWith({queryKey:["admin-settlements-v2"]});
  expect(invalidate).toHaveBeenCalledWith({queryKey:["admin-settlement-v2"]});
 });
 expect(screen.getByRole("button",{name:"전체 환불 확정"})).toBeDisabled();
 await new Promise(resolve=>setTimeout(resolve,2200));
 expect(shippingPolicyApi.refundQuote).toHaveBeenCalledTimes(3);
 view.unmount();client.clear();
},10000);

it("requires a virtual-account refund destination and sends it after confirmation", async () => {
 vi.mocked(shippingPolicyApi.refundQuote).mockResolvedValue({cash_refund_amount:7000,retained_shipping_fee:0,restored_point:0,reason:"CHANGE_OF_MIND",requires_refund_account:true});
 vi.mocked(shippingPolicyApi.refund).mockResolvedValue({cash_refund_amount:7000,retained_shipping_fee:0,restored_point:0,reason:"CHANGE_OF_MIND",completed:true,bank_refund:true});
 render(<OrderRefundControls token="admin" orderCode="ORD-virtual"/>,{wrapper});
 await screen.findByLabelText("은행");
 fireEvent.click(screen.getByRole("checkbox"));
 expect(screen.getByRole("button",{name:"전체 환불 확정"})).toBeDisabled();
 fireEvent.change(screen.getByLabelText("은행"),{target:{value:"90"}});
 fireEvent.change(screen.getByLabelText("계좌번호"),{target:{value:"123-456-7890"}});
 fireEvent.change(screen.getByLabelText("예금주"),{target:{value:"테스트"}});
 fireEvent.click(screen.getByRole("button",{name:"전체 환불 확정"}));
 const dialog=screen.getByRole("dialog",{name:"전체 상품 환불"});
 expect(within(dialog).getByText(/끝자리 7890/)).toBeInTheDocument();
 fireEvent.click(within(dialog).getByRole("button",{name:"환불 확정"}));
 await waitFor(()=>expect(shippingPolicyApi.refund).toHaveBeenCalledWith("admin","ORD-virtual","CHANGE_OF_MIND",{bank:"90",accountNumber:"1234567890",holderName:"테스트"}));
 expect(await screen.findByText(/전체 상품의 결제 취소가 접수되었습니다/)).toBeInTheDocument();
});

it("allows updating the virtual-account destination and retrying after a provider rejection", async () => {
 const { ApiHttpError } = await import("@/lib/api-client");
 vi.mocked(shippingPolicyApi.refundQuote)
  .mockResolvedValueOnce({cash_refund_amount:7000,retained_shipping_fee:0,restored_point:0,reason:"CHANGE_OF_MIND",requires_refund_account:true})
  .mockResolvedValue({cash_refund_amount:7000,retained_shipping_fee:0,restored_point:0,reason:"CHANGE_OF_MIND",requires_refund_account:true,operation_status:"FAILED"});
 vi.mocked(shippingPolicyApi.refund)
  .mockRejectedValueOnce(new ApiHttpError("결제사가 환불 요청을 거절했습니다.",409,undefined,"ORDER_REFUND_REJECTED"))
  .mockResolvedValueOnce({cash_refund_amount:7000,retained_shipping_fee:0,restored_point:0,reason:"CHANGE_OF_MIND",completed:true,bank_refund:true});
 render(<OrderRefundControls token="admin" orderCode="ORD-virtual-retry"/>,{wrapper});
 await screen.findByLabelText("은행");
 fireEvent.click(screen.getByRole("checkbox"));
 fireEvent.change(screen.getByLabelText("은행"),{target:{value:"90"}});
 fireEvent.change(screen.getByLabelText("계좌번호"),{target:{value:"1234567890"}});
 fireEvent.change(screen.getByLabelText("예금주"),{target:{value:"테스트"}});
 fireEvent.click(screen.getByRole("button",{name:"전체 환불 확정"}));
 fireEvent.click(within(screen.getByRole("dialog",{name:"전체 상품 환불"})).getByRole("button",{name:"환불 확정"}));
 expect(await screen.findByText("환불 요청 확인이 필요합니다")).toBeInTheDocument();
 expect(screen.queryByText("환불을 처리하지 못했습니다")).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText("계좌번호"),{target:{value:"9876543210"}});
 fireEvent.click(screen.getByRole("button",{name:"전체 환불 확정"}));
 const retryDialog = screen.getByRole("dialog",{name:"전체 상품 환불"});
 expect(within(retryDialog).getByText(/끝자리 3210/)).toBeInTheDocument();
 fireEvent.click(within(retryDialog).getByRole("button",{name:"환불 확정"}));
 await waitFor(()=>expect(shippingPolicyApi.refund).toHaveBeenLastCalledWith("admin","ORD-virtual-retry","CHANGE_OF_MIND",{bank:"90",accountNumber:"9876543210",holderName:"테스트"}));
 expect(await screen.findByText(/전체 상품의 결제 취소가 접수되었습니다/)).toBeInTheDocument();
});
