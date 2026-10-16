"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shippingPolicyApi, refundReceiveAccountSchema, type RefundReason } from "@/lib/shipping-policy-api";
import { ApiError, apiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input, Select } from "./ui/input";
import { Notice } from "./ui/notice";
import { OrderSummary } from "./ui/order-summary";
import { Surface } from "./ui/surface";
import { InlineLoadingState } from "./ui/feedback";
import { Dialog } from "./ui/overlay";

export function OrderRefundControls({ token, orderCode }: { token: string; orderCode: string }) {
  const reasonID = useId();
 const bankID = useId();
 const accountID = useId();
 const holderID = useId();
 const [refundAccount, setRefundAccount] = useState({ bank: "", accountNumber: "", holderName: "" });
  const [reason, setReason] = useState<RefundReason>("CHANGE_OF_MIND");
  const [received, setReceived] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const queryClient = useQueryClient();
  const completionRef = useRef<string | null>(null);
  const quote = useQuery({
    queryKey: ["order-refund-quote", orderCode, reason],
    queryFn: () => shippingPolicyApi.refundQuote(token, orderCode, reason),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data && !data.completed && !data.withdrawn && data.operation_status && ["PENDING", "RUNNING", "UNKNOWN", "SUCCEEDED"].includes(data.operation_status) ? 2000 : false;
    },
  });
  const completed = quote.data?.completed === true;
  useEffect(() => {
    if (!completed || completionRef.current === orderCode) return;
    completionRef.current = orderCode;
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-orders-v2"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-order-v2", orderCode] }),
      queryClient.invalidateQueries({ queryKey: ["admin-settlements-v2"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-settlement-v2"] }),
    ]);
  }, [completed, orderCode, queryClient]);
  const refund = useMutation({
    mutationFn: () => quote.data?.requires_refund_account ? shippingPolicyApi.refund(token, orderCode, reason, refundAccount) : shippingPolicyApi.refund(token, orderCode, reason),
    onError: async () => {
      await quote.refetch();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-orders-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-order-v2", orderCode] }),
      queryClient.invalidateQueries({ queryKey: ["admin-settlements-v2"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-settlement-v2"] }),
      ]);
    },
  });
  const withdraw = useMutation({
    mutationFn: () => shippingPolicyApi.withdrawRefund(token, orderCode),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-order-v2", orderCode] });
    },
  });
  const withdrawn = withdraw.isSuccess || quote.data?.withdrawn === true;
  const rejected = quote.data?.operation_status === "FAILED" || (refund.error instanceof ApiError && refund.error.code === "ORDER_REFUND_REJECTED");
  const processing = !completed && !withdrawn && Boolean(quote.data?.operation_status && ["PENDING", "RUNNING", "UNKNOWN", "SUCCEEDED"].includes(quote.data.operation_status));
  const accountValid = !quote.data?.requires_refund_account || refundReceiveAccountSchema.safeParse(refundAccount).success;
  const refundReady = accountValid && received && quote.data && !quote.isFetching && !quote.isError && !refund.isPending && !refund.isSuccess && !withdraw.isPending && !withdrawn && !completed && !processing;

  return (
    <section aria-label="전체 상품 환불" className="grid gap-5">
      <h3 className="text-lg font-bold text-content-primary">전체 상품 환불</h3>
      <Notice tone="info" title="환불 후 정산 처리">확정·지급된 정산이 있어도 전체 상품을 환불할 수 있습니다. 셀러 회수액은 지급 예정 정산에서 차감하고, 부족한 금액은 다음 정산으로 이월합니다.</Notice>
      <Field label="환불 사유" htmlFor={reasonID}>
        <Select
          id={reasonID}
          disabled={refund.isPending || refund.isSuccess || withdraw.isPending || withdrawn || completed || processing}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value === "SELLER_FAULT" ? "SELLER_FAULT" : "CHANGE_OF_MIND");
            setReceived(false);
            refund.reset();
          }}
        >
          <option value="CHANGE_OF_MIND">단순변심</option>
          <option value="SELLER_FAULT">불량·오배송 등 판매자 귀책</option>
        </Select>
      </Field>
      {quote.data ? (
        <OrderSummary
          title="환불 금액"
          items={[
            { label: "환불하지 않는 최초 배송비", value: formatPrice(quote.data.retained_shipping_fee) },
            { label: "복원 포인트", value: `${quote.data.restored_point.toLocaleString()}P`, emphasis: "positive" },
          ]}
          totalLabel="현금 환불액"
          total={formatPrice(quote.data.cash_refund_amount)}
          footer={<p className="text-xs leading-5 text-content-secondary">쿠폰은 기존 복원·만료 정책을 적용합니다. 별도 회수비는 청구하지 않습니다.</p>}
        />
      ) : quote.isError ? null : <InlineLoadingState label="환불 금액을 확인하는 중입니다." />}
      {quote.data?.requires_refund_account ? (
        <fieldset disabled={processing || completed || refund.isPending} className="grid gap-3 rounded-xl border border-border-subtle p-4">
          <legend className="px-1 text-sm font-bold">구매자 환불 계좌</legend>
          <Field label="은행" htmlFor={bankID}>
            <Select id={bankID} value={refundAccount.bank} onChange={(event) => { refund.reset(); setRefundAccount({ ...refundAccount, bank: event.target.value }); }}>
              <option value="">은행 선택</option>
              {[ ["02","산업"],["03","기업"],["04","국민"],["07","수협"],["11","농협"],["12","지역농축협"],["20","우리"],["23","SC제일"],["27","씨티"],["31","대구(iM)"],["32","부산"],["34","광주"],["35","제주"],["37","전북"],["39","경남"],["45","새마을"],["48","신협"],["50","저축은행"],["64","산림조합"],["71","우체국"],["81","하나"],["88","신한"],["89","케이뱅크"],["90","카카오뱅크"],["92","토스뱅크"] ].map(([code,name]) => <option key={code} value={code}>{name}</option>)}
            </Select>
          </Field>
          <Field label="계좌번호" htmlFor={accountID}><Input id={accountID} inputMode="numeric" autoComplete="off" maxLength={20} value={refundAccount.accountNumber} onChange={(event) => { refund.reset(); setRefundAccount({ ...refundAccount, accountNumber: event.target.value.replace(/[^0-9]/g, "") }); }} /></Field>
          <Field label="예금주" htmlFor={holderID}><Input id={holderID} autoComplete="off" maxLength={60} value={refundAccount.holderName} onChange={(event) => { refund.reset(); setRefundAccount({ ...refundAccount, holderName: event.target.value }); }} /></Field>
          <p className="text-xs leading-5 text-content-secondary">구매자가 제공한 환불 계좌를 입력해주세요. 계좌 환불은 결제 취소 접수 후 약 2일이 걸릴 수 있습니다.</p>
        </fieldset>
      ) : null}
      <Surface tone="subtle" padding="sm">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-content-primary">
        <input className="mt-1 size-4 shrink-0 accent-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary" type="checkbox" checked={received} disabled={refund.isPending || refund.isSuccess || withdraw.isPending || withdrawn || completed || processing} onChange={(event) => setReceived(event.target.checked)} />
        전체 반품 상품의 회수를 확인했습니다.
        </label>
      </Surface>
      {!withdrawn && !completed && !processing && (quote.isError || (refund.isError && !rejected)) ? <Notice tone="error" title="환불을 처리하지 못했습니다">{apiErrorMessage(refund.error ?? quote.error)}{quote.isError ? <Button className="mt-3" size="sm" variant="secondary" onClick={() => void quote.refetch()}>환불 금액 다시 확인</Button> : null}</Notice> : null}
      {processing ? <Notice tone="info" title="환불 처리 상태를 확인하고 있습니다">결제사 처리와 내부 기록이 모두 완료될 때까지 확인합니다. 이 화면에서 완료 결과를 자동으로 갱신합니다.</Notice> : null}
      {rejected && !withdrawn && !completed ? (
        <Notice tone="warning" title="환불 요청 확인이 필요합니다">
          결제사 거절로 자동 재시도를 중단했습니다. 원인을 해결한 뒤 같은 사유로 다시 요청하거나, 반품·환불 요청을 철회한 경우에만 정산 차단을 해제해주세요.
          <Button type="button" className="mt-3" variant="secondary" disabled={refund.isPending || withdraw.isPending} onClick={() => setWithdrawOpen(true)}>환불 요청 철회</Button>
        </Notice>
      ) : null}
      {withdraw.isError ? <Notice tone="error" title="환불 요청을 철회하지 못했습니다">{apiErrorMessage(withdraw.error)}</Notice> : null}
      {withdrawn ? <Notice tone="success">환불 요청을 철회했습니다. 정산 차단이 해제되며, 환불이나 혜택 복원은 실행하지 않습니다.</Notice> : null}
      {refund.isSuccess || completed ? <Notice tone="success">{(quote.data?.bank_refund || quote.data?.requires_refund_account) ? "전체 상품의 결제 취소가 접수되었습니다. 가상계좌의 실제 환불 입금까지 약 2일이 걸릴 수 있습니다." : "전체 상품 환불을 완료했습니다."}</Notice> : null}
      <Button
        type="button"
        className="w-full sm:w-auto sm:justify-self-end"
        variant="primary"
        disabled={!refundReady}
        onClick={() => setConfirmOpen(true)}
      >
        {refund.isPending ? "환불 처리 중" : "전체 환불 확정"}
      </Button>
      <Dialog open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="환불 요청 철회" description="반품·환불 요청이 철회된 주문인지 확인해주세요.">
        <p className="text-sm leading-6 text-content-secondary">결제사에 환불이 실행되지 않았는지 다시 확인합니다. 확인되면 정산 차단만 해제하며, 현금 환불·포인트·쿠폰 복원은 하지 않습니다.</p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setWithdrawOpen(false)}>돌아가기</Button>
          <Button type="button" variant="primary" disabled={withdraw.isPending || refund.isPending} onClick={() => { setWithdrawOpen(false); withdraw.mutate(); }}>철회 확인</Button>
        </div>
      </Dialog>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="전체 상품 환불"
        description="환불 사유와 금액을 확인한 뒤 확정해주세요."
      >
        <dl className="grid gap-3 rounded-control bg-surface-subtle p-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-content-secondary">환불 사유</dt><dd className="text-right font-bold">{reason === "SELLER_FAULT" ? "불량·오배송 등 판매자 귀책" : "단순변심"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-content-secondary">환불하지 않는 배송비</dt><dd className="shrink-0 font-bold tabular-nums">{formatPrice(quote.data?.retained_shipping_fee ?? 0)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-content-secondary">복원 포인트</dt><dd className="shrink-0 font-bold tabular-nums">{(quote.data?.restored_point ?? 0).toLocaleString()}P</dd></div>
          <div className="flex items-center justify-between gap-4 border-t border-border-subtle pt-3"><dt className="font-bold">현금 환불액</dt><dd className="shrink-0 text-xl font-bold tabular-nums">{formatPrice(quote.data?.cash_refund_amount ?? 0)}</dd></div>
        </dl>
        {quote.data?.requires_refund_account ? <p className="mt-4 text-sm">환불 계좌: {refundAccount.holderName} · 끝자리 {refundAccount.accountNumber.slice(-4)}</p> : null}
        <p className="mt-4 text-xs leading-5 text-content-secondary">전체 상품의 회수가 확인된 주문입니다. 쿠폰은 기존 복원·만료 정책을 적용하며, 별도 회수비는 청구하지 않습니다.</p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>취소</Button>
          <Button type="button" variant="primary" disabled={!refundReady} onClick={() => { setConfirmOpen(false); refund.mutate(); }}>환불 확정</Button>
        </div>
      </Dialog>
    </section>
  );
}
