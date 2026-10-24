// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { shippingPolicyApi } from "@/lib/shipping-policy-api";
import { OrderCashReceipts } from "./order-cash-receipts";
vi.mock("@/lib/shipping-policy-api", () => ({ shippingPolicyApi: { cashReceipts: vi.fn() } }));
afterEach(cleanup);
beforeEach(()=>vi.clearAllMocks());
function show(method: string) {
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 return render(<QueryClientProvider client={client}><OrderCashReceipts token="test" orderCode="ORD" method={method} /></QueryClientProvider>);
}
it("shows receipt cancellation separately and does not claim a bank transfer has completed", async()=>{
 vi.mocked(shippingPolicyApi.cashReceipts).mockResolvedValue({bank_refund_status:"PENDING",cash_receipts:[
  {receipt_key:"issue",type:"소득공제",transaction_type:"CONFIRM",issue_number:"123",receipt_url:"https://example.com/issue",amount:7000,tax_free_amount:0,issue_status:"COMPLETED",requested_at:"2026-10-12T12:00:00Z"},
  {receipt_key:"cancel",type:"소득공제",transaction_type:"CANCEL",issue_number:"",receipt_url:"https://example.com/cancel",amount:4000,tax_free_amount:0,issue_status:"IN_PROGRESS",requested_at:"2026-10-12T13:00:00Z"},
 ]});
 show("가상계좌");
 expect(await screen.findByText(/실제 입금까지/)).toBeInTheDocument();
 expect(screen.getByRole("link",{name:"취소 영수증 보기"})).toHaveAttribute("href","https://example.com/cancel");
 expect(screen.getByText("취소 · 소득공제 · 4,000원")).toBeInTheDocument();
});
it("shows a failed bank refund as requiring customer support", async()=>{
 vi.mocked(shippingPolicyApi.cashReceipts).mockResolvedValue({bank_refund_status:"FAILED",cash_receipts:[]});
 show("가상계좌");
 expect(await screen.findByText(/계좌 환불 실패/)).toBeInTheDocument();
});
it("does not query cash receipts for a card payment",()=>{
 show("카드");
 expect(shippingPolicyApi.cashReceipts).not.toHaveBeenCalled();
});
