"use client";

import { useQuery } from "@tanstack/react-query";
import { shippingPolicyApi } from "@/lib/shipping-policy-api";
import { apiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";
import { Notice } from "./ui/notice";

export function OrderCashReceipts({ token, orderCode, method, memberID }: { token: string; orderCode: string; method?: string; memberID?: number }) {
  const eligible = ["가상계좌", "계좌이체", "간편결제", "VIRTUAL_ACCOUNT", "TRANSFER", "EASY_PAY"].includes(method ?? "");
  const receipts = useQuery({
    queryKey: ["order-cash-receipts", memberID, orderCode],
    queryFn: () => shippingPolicyApi.cashReceipts(token, orderCode),
    enabled: Boolean(token && eligible),
    retry: false,
  });
  if (!eligible || (!receipts.isError && !receipts.data?.cash_receipts.length && (!receipts.data?.bank_refund_status || receipts.data.bank_refund_status === "NONE"))) return null;
  return <section className="mt-4 grid gap-3 border-t border-border-subtle pt-4" aria-label="결제 증빙 및 계좌 환불">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold">현금영수증</h2>
      <Button variant="secondary" size="sm" disabled={receipts.isFetching} onClick={() => void receipts.refetch()}>발급 상태 확인</Button>
    </div>
    {receipts.data?.bank_refund_status && receipts.data.bank_refund_status !== "NONE" ? (
      <Notice tone={["FAILED", "PARTIAL_FAILED"].includes(receipts.data.bank_refund_status) ? "error" : "info"} title="가상계좌 환불">
        {receipts.data.bank_refund_status === "COMPLETED" ? "결제사에서 계좌 환불 완료를 확인했습니다." : ["FAILED", "PARTIAL_FAILED"].includes(receipts.data.bank_refund_status) ? "결제사에서 계좌 환불 실패를 확인했습니다. 고객센터에 문의해주세요." : "결제 취소가 접수되어 계좌 환불을 처리하고 있습니다. 실제 입금까지 약 2일이 걸릴 수 있습니다."}
      </Notice>
    ) : null}
    {receipts.isError ? <Notice tone="error">{apiErrorMessage(receipts.error)}</Notice> : null}
    {receipts.data?.cash_receipts.map((receipt) => <div key={receipt.receipt_key} className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <div><p>{receipt.transaction_type === "CANCEL" ? "취소" : "발급"} · {receipt.type} · {formatPrice(receipt.amount)}</p>
        <p className="text-xs text-content-secondary">{receipt.issue_status === "COMPLETED" ? "처리 완료" : receipt.issue_status === "FAILED" ? "처리 실패" : "처리 중"}{receipt.issue_number ? ` · 승인번호 ${receipt.issue_number}` : ""}</p>
      </div>
      {receipt.receipt_url.startsWith("https://") ? <a className="text-action-primary underline underline-offset-4" href={receipt.receipt_url} target="_blank" rel="noopener noreferrer">{receipt.transaction_type === "CANCEL" ? "취소 영수증 보기" : "영수증 보기"}</a> : null}
    </div>)}
    <p className="text-xs leading-5 text-content-secondary">현금영수증 신청은 결제창에서 진행합니다. 발급 접수 후 최종 상태 반영까지 1~2일이 걸릴 수 있습니다.</p>
  </section>;
}
