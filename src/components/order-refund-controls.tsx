"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  returnsApi,
  type ReturnMarket,
  type ReturnRequest,
} from "@/lib/returns-api";
import { refundReceiveAccountSchema } from "@/lib/shipping-policy-api";
import { apiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { useReturnRefresh } from "./order-return-shared";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input, Select } from "./ui/input";
import { Notice } from "./ui/notice";
import { OrderSummary } from "./ui/order-summary";
import { Dialog } from "./ui/overlay";
import { refundShippingItems } from "./order-refund-summary";

export function OrderRefundControls({
  token,
  request,
  markets,
  canExecute,
  sectionRef,
  inspectionReady = true,
  previousShippingRefundAmount = 0,
}: {
  token: string;
  request: ReturnRequest;
  markets: ReturnMarket[];
  canExecute: boolean;
  sectionRef?: Ref<HTMLElement>;
  inspectionReady?: boolean;
  previousShippingRefundAmount?: number;
}) {
  const refresh = useReturnRefresh();
  const orderLines = new Map(
    markets.flatMap((market) =>
      market.items.map((item) => [item.id, item] as const),
    ),
  );
  const prefix = useId();
  const [account, setAccount] = useState({
    bank: "",
    accountNumber: "",
    holderName: "",
  });
  const [confirmation, setConfirmation] = useState<"refund" | "withdraw">();
  const observedCompletion = useRef(false);
  const eligible =
    ["PROCESSING", "COMPLETED"].includes(request.status) ||
    (request.status === "INSPECTED" && inspectionReady);
  const quote = useQuery({
    queryKey: ["return-quote", token, request.id],
    queryFn: () => returnsApi.quote(token, request.id),
    enabled: eligible,
    refetchInterval: (q) => {
      const data = q.state.data;
      return data &&
        !data.completed &&
        !data.withdrawn &&
        data.operation_status &&
        ["PENDING", "RUNNING", "UNKNOWN", "SUCCEEDED"].includes(
          data.operation_status,
        )
        ? 2000
        : false;
    },
  });
  const completed =
    quote.data?.completed === true || request.status === "COMPLETED";
  useEffect(() => {
    if (quote.data?.completed && !observedCompletion.current) {
      observedCompletion.current = true;
      void refresh();
    }
  }, [quote.data?.completed, refresh]);
  const execute = useMutation({
    mutationFn: () =>
      returnsApi.execute(
        token,
        request.id,
        quote.data?.requires_refund_account ? account : undefined,
      ),
    onSuccess: async () => {
      setAccount({ bank: "", accountNumber: "", holderName: "" });
      await refresh();
    },
    onError: () => quote.refetch(),
  });
  const withdraw = useMutation({
    mutationFn: () => returnsApi.withdraw(token, request.id),
    onSuccess: refresh,
  });
  const data = eligible ? quote.data : undefined;
  const originalShippingFee = markets.find((market) => market.id === request.market_id)?.shippingFee;
  const originalShippingFeeRetained = originalShippingFee === undefined || !data
    ? undefined
    : Math.max(0, originalShippingFee - previousShippingRefundAmount - data.shipping_refund_amount);
  const processing =
    !completed &&
    Boolean(
      data?.operation_status &&
      ["PENDING", "RUNNING", "UNKNOWN", "SUCCEEDED"].includes(
        data.operation_status,
      ),
    );
  const withdrawn =
    request.status === "WITHDRAWN" || data?.withdrawn || withdraw.isSuccess;
  const rejected = data?.operation_status === "FAILED";
  const ready =
    eligible &&
    canExecute &&
    data &&
    !quote.isFetching &&
    !quote.isError &&
    !execute.isPending &&
    !withdraw.isPending &&
    !completed &&
    !processing &&
    !withdrawn &&
    (!data.requires_refund_account ||
      refundReceiveAccountSchema.safeParse(account).success);
  const canWithdraw =
    canExecute &&
    !completed &&
    !processing &&
    !withdrawn &&
    (request.status === "REQUESTED" ||
      request.status === "INSPECTED" ||
      rejected);
  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      className="scroll-mt-4 grid gap-4"
      aria-label="환불 금액 안내"
    >
      <h4 className="font-bold">환불 금액 안내</h4>
      {!eligible && !withdrawn ? (
        <Notice tone="info">
          반품 상품이 도착하고 모든 상품의 검수가 끝나면 환불 금액을 확인할 수 있습니다.
        </Notice>
      ) : null}
      {eligible && quote.isPending ? (
        <p role="status">환불 금액을 확인하는 중입니다.</p>
      ) : null}
      {eligible && quote.isError ? (
        <Notice tone="error">
          {apiErrorMessage(quote.error)} 같은 수거 건의 검수가 모두 완료되었는지
          확인해주세요.
          <Button
            size="sm"
            className="mt-3"
            variant="secondary"
            onClick={() => void quote.refetch()}
          >
            환불 금액 다시 확인
          </Button>
        </Notice>
      ) : null}
      {data ? (
        <OrderSummary
          title="차감·복원 내역"
          items={[
            {
              label: "최초 배송비 환불",
              value: formatPrice(data.shipping_refund_amount),
            },
            {
              label: "최초 발송비",
              value: formatPrice(data.outbound_shipping_fee_deduction),
            },
            {
              label: "반품 수거비",
              value: formatPrice(data.return_shipping_fee),
            },
            {
              label: "초과 반품비 면제",
              value: formatPrice(data.shipping_fee_waived_amount),
              emphasis: "positive",
            },
            {
              label: "복원 포인트",
              value: `${data.restored_point.toLocaleString()}P`,
              emphasis: "positive",
            },
          ]}
          totalLabel="결제수단 환불액"
          total={formatPrice(data.cash_refund_amount)}
          footer={
            <p className="text-xs leading-5 text-content-secondary">
              발송비·수거비 합계에서 면제액을 뺀 금액만 차감합니다. 배송비에는 포인트를 사용할 수 없습니다. 쿠폰은 주문 전체가 환불되면 유효기간에 따라 돌려드립니다.
            </p>
          }
        />
      ) : null}
      {data?.requires_refund_account && canExecute && !completed ? (
        <fieldset
          disabled={processing || execute.isPending}
          className="grid gap-3 rounded-control border border-border-subtle p-4"
        >
          <legend className="px-1 text-sm font-bold">구매자 환불 계좌</legend>
          <Field label="은행" htmlFor={`${prefix}-bank`}>
            <Select
              id={`${prefix}-bank`}
              value={account.bank}
              onChange={(e) => {
                execute.reset();
                setAccount({ ...account, bank: e.target.value });
              }}
            >
              <option value="">은행 선택</option>
              {[
                ["02", "산업"],
                ["03", "기업"],
                ["04", "국민"],
                ["07", "수협"],
                ["11", "농협"],
                ["12", "지역농축협"],
                ["20", "우리"],
                ["23", "SC제일"],
                ["27", "씨티"],
                ["31", "iM"],
                ["32", "부산"],
                ["34", "광주"],
                ["35", "제주"],
                ["37", "전북"],
                ["39", "경남"],
                ["45", "새마을"],
                ["48", "신협"],
                ["50", "저축은행"],
                ["64", "산림조합"],
                ["71", "우체국"],
                ["81", "하나"],
                ["88", "신한"],
                ["89", "케이뱅크"],
                ["90", "카카오뱅크"],
                ["92", "토스뱅크"],
              ].map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="계좌번호" htmlFor={`${prefix}-number`}>
            <Input
              id={`${prefix}-number`}
              inputMode="numeric"
              autoComplete="off"
              maxLength={20}
              value={account.accountNumber}
              onChange={(e) => {
                execute.reset();
                setAccount({
                  ...account,
                  accountNumber: e.target.value.replace(/[^0-9]/g, ""),
                });
              }}
            />
          </Field>
          <Field label="예금주" htmlFor={`${prefix}-holder`}>
            <Input
              id={`${prefix}-holder`}
              autoComplete="off"
              maxLength={60}
              value={account.holderName}
              onChange={(e) => {
                execute.reset();
                setAccount({ ...account, holderName: e.target.value });
              }}
            />
          </Field>
          <p className="text-xs text-content-secondary">
            구매자가 제공한 계좌를 입력해주세요. 계좌 정보는 저장 후 화면에 다시 표시되지 않습니다.
          </p>
        </fieldset>
      ) : null}
      {processing ? (
        <Notice tone="info" title="환불 처리 상태를 확인하고 있습니다">
          환불이 완료되면 자동으로 알려드립니다. 다시 요청하지 않아도 됩니다.
        </Notice>
      ) : null}
      {execute.isError && !processing && !completed ? (
        <Notice tone="error">
          {apiErrorMessage(execute.error)}
          {rejected
            ? " 원인을 해결한 뒤 다시 요청하거나 환불이 필요 없다면 철회해주세요."
            : ""}
        </Notice>
      ) : null}
      {withdraw.isError ? (
        <Notice tone="error">{apiErrorMessage(withdraw.error)}</Notice>
      ) : null}
      {completed ? (
        <Notice tone="success">
          {data?.bank_refund
            ? "결제 취소가 접수되었습니다. 실제 계좌 입금 상태는 별도로 확인해주세요."
            : "이 요청의 환불이 완료되었습니다."}
        </Notice>
      ) : null}
      {withdrawn ? (
        <Notice tone="info">
          반품 신청을 철회했습니다. 환불은 진행되지 않습니다.
        </Notice>
      ) : null}
      {canExecute ? (
        <div className="flex flex-wrap justify-end gap-3">
          {canWithdraw ? (
            <Button
              variant="secondary"
              disabled={execute.isPending || withdraw.isPending}
              onClick={() => setConfirmation("withdraw")}
            >
              반품 요청 철회
            </Button>
          ) : null}
          {eligible && !completed && !withdrawn ? (
            <Button disabled={!ready} onClick={() => setConfirmation("refund")}>
              {execute.isPending
                ? "환불 처리 중"
                : rejected
                  ? "환불 다시 요청"
                  : "검수한 수량 환불"}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-content-secondary">
          실제 환불은 관리자가 검수 결과와 금액을 확인한 뒤 실행합니다.
        </p>
      )}
      <Dialog
        open={confirmation !== undefined}
        onClose={() => setConfirmation(undefined)}
        title={
          confirmation === "refund" ? "검수한 수량 환불" : "반품 요청 철회"
        }
        description={
          confirmation === "refund"
            ? "선택한 반품 요청의 확정 금액을 확인해주세요."
            : "환불 진행 여부를 확인한 뒤 반품 신청을 철회합니다."
        }
      >
        {confirmation === "refund" && data ? (
          <>
            <p className="text-sm">
              반품 요청 #{request.id} · 승인 수량{" "}
              {request.items.reduce(
                (sum, item) => sum + item.approved_quantity,
                0,
              )}
              개
            </p>
            <dl
              aria-label="상품별 환불 승인 수량"
              className="mt-3 divide-y divide-border-subtle rounded-control border border-border-subtle px-3"
            >
              {request.items.map((item) => (
                <div key={item.id} className="grid min-w-0 gap-1 py-3 text-sm">
                  <dt className="break-words font-medium">
                    {orderLines.get(item.order_line_item_id)?.name ??
                      `주문 상품 #${item.order_line_item_id}`}
                    <span className="mt-1 block text-xs font-normal text-content-secondary">
                      {orderLines.get(item.order_line_item_id)?.optionLabel ||
                        "선택 옵션 정보 없음"}
                    </span>
                  </dt>
                  <dd className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span className="text-content-secondary">
                      신청 {item.quantity}개
                    </span>
                    <span className="font-bold">
                      환불 승인 {item.approved_quantity}개
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 rounded-control bg-surface-subtle p-3">
              <p className="text-sm font-bold">배송비 반영 내역</p>
              <dl
                aria-label="배송비 반영 내역"
                className="mt-2 grid gap-2 text-sm"
              >
                {refundShippingItems(data, originalShippingFeeRetained).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt className="min-w-0 text-content-secondary">
                      {item.label}
                    </dt>
                    <dd className="shrink-0 font-medium tabular-nums">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
              {data.shipping_fee_waived_amount > 0 ? (
                <p className="mt-2 text-xs leading-5 text-content-secondary">
                  발송비·수거비 합계에서 면제액을 뺀 금액만 차감합니다.
                </p>
              ) : null}
            </div>
            <p className="mt-4 text-xs font-bold text-content-secondary">
              결제수단 환불액
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-action-primary">
              {formatPrice(data.cash_refund_amount)}
            </p>
            <p className="mt-2 text-sm">
              복원 포인트 {data.restored_point.toLocaleString()}P
            </p>
            <p className="mt-3 text-xs text-content-secondary">
              이 요청에서 승인한 상품만 환불됩니다.
            </p>
          </>
        ) : (
          <p className="text-sm leading-6">
            철회하면 이 반품의 환불은 진행되지 않습니다. 환불 처리 중이거나 완료된 요청은 철회할 수 없습니다.
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => setConfirmation(undefined)}
          >
            돌아가기
          </Button>
          <Button
            disabled={
              confirmation === "refund"
                ? !ready
                : !canWithdraw || withdraw.isPending
            }
            onClick={() => {
              const action = confirmation;
              setConfirmation(undefined);
              if (action === "refund") execute.mutate();
              else withdraw.mutate();
            }}
          >
            {confirmation === "refund" ? "환불 확정" : "철회 확인"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
