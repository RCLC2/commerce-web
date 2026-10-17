"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  returnsApi,
  returnableQuantity,
  returnReasonLabels,
  returnStatusLabels,
  type ReturnMarket,
  type ReturnReason,
  type ReturnRequest,
} from "@/lib/returns-api";
import { apiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { returnKeys, useReturnRefresh } from "./order-return-shared";
import { Button } from "./ui/button";
import { Select, Input } from "./ui/input";
import { Notice } from "./ui/notice";
import { Dialog } from "./ui/overlay";
import { Badge } from "./ui/badge";

export function CustomerOrderReturns({
  token,
  orderCode,
  markets,
}: {
  token: string;
  orderCode: string;
  markets: ReturnMarket[];
}) {
  const query = useQuery({
    queryKey: returnKeys.requests(token, orderCode),
    queryFn: () => returnsApi.requests(token, orderCode),
    refetchInterval: (q) =>
      q.state.data?.some((r) => r.status === "PROCESSING") ? 2000 : false,
  });
  const [marketID, setMarketID] = useState<number>();
  const market = markets.find((m) => m.id === marketID);
  return (
    <section className="grid min-w-0 gap-4" aria-label="반품 신청 및 내역">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">반품 신청 및 내역</h2>
        <Button
          size="sm"
          variant="secondary"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          반품 상태 새로고침
        </Button>
      </div>
      {query.isPending ? (
        <p role="status">반품 내역을 확인하는 중입니다.</p>
      ) : query.isError ? (
        <Notice tone="error">
          {apiErrorMessage(query.error)}
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => void query.refetch()}
          >
            반품 내역 다시 확인
          </Button>
        </Notice>
      ) : (
        <>
          {markets.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <p className="text-sm font-bold">{m.name}</p>
              {m.items.some(
                (line) => returnableQuantity(line, query.data) > 0,
              ) ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setMarketID(m.id)}
                >
                  {m.name} 반품 신청
                </Button>
              ) : (
                <p className="text-xs text-content-secondary">
                  신청 가능한 남은 수량이 없습니다.
                </p>
              )}
            </div>
          ))}
          <p className="text-xs leading-5 text-content-secondary">
            구매확정 전 상품만 신청할 수 있습니다. 판매자가 수거지와 상품을
            확인한 뒤, 검수 결과에 따라 환불 금액을 안내합니다.
          </p>
          {query.data.length === 0 ? (
            <p className="text-sm text-content-secondary">
              아직 신청한 반품이 없습니다.
            </p>
          ) : (
            query.data.map((request) => (
              <ReturnRequestSummary
                key={request.id}
                request={request}
                markets={markets}
              />
            ))
          )}
        </>
      )}
      <Dialog
        open={Boolean(market)}
        onClose={() => setMarketID(undefined)}
        title={`${market?.name ?? ""} 반품 신청`}
        description="반품할 상품과 수량, 사유를 선택해주세요."
        className="max-w-xl"
      >
        {market && query.data ? (
          <ReturnRequestForm
            key={market.id}
            token={token}
            code={orderCode}
            market={market}
            requests={query.data}
            onComplete={() => setMarketID(undefined)}
          />
        ) : null}
      </Dialog>
    </section>
  );
}
function ReturnRequestForm({
  token,
  code,
  market,
  requests,
  onComplete,
}: {
  token: string;
  code: string;
  market: ReturnMarket;
  requests: ReturnRequest[];
  onComplete: () => void;
}) {
  const refresh = useReturnRefresh();
  const [selection, setSelection] = useState<
    Record<number, { quantity: number; reason: ReturnReason }>
  >({});
  const mutation = useMutation({
    mutationFn: () =>
      returnsApi.create(token, code, {
        market_id: market.id,
        items: Object.entries(selection).map(([id, item]) => ({
          order_line_item_id: Number(id),
          ...item,
        })),
      }),
    onSuccess: async () => {
      await refresh();
      onComplete();
    },
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (Object.keys(selection).length && !mutation.isPending)
          mutation.mutate();
      }}
    >
      <fieldset disabled={mutation.isPending} className="grid gap-4">
        {market.items.map((line) => {
          const remaining = returnableQuantity(line, requests);
          return remaining > 0 ? (
            <div
              className="grid gap-3 rounded-control border border-border-subtle p-4"
              key={line.id}
            >
              <label className="flex items-start gap-3 text-sm font-bold">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-action-primary"
                  checked={Boolean(selection[line.id])}
                  onChange={(event) =>
                    setSelection((old) => {
                      const next = { ...old };
                      if (event.target.checked)
                        next[line.id] = {
                          quantity: 1,
                          reason: "CHANGE_OF_MIND",
                        };
                      else delete next[line.id];
                      return next;
                    })
                  }
                />
                {line.name}
              </label>
              <p className="text-xs text-content-secondary">
                신청 가능한 수량 {remaining}개 · 원 주문 {line.quantity}개
              </p>
              {selection[line.id] ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    반품 수량
                    <Input
                      aria-label={`${line.name} 반품 수량`}
                      type="number"
                      min={1}
                      max={remaining}
                      required
                      value={
                        Number.isNaN(selection[line.id].quantity)
                          ? ""
                          : selection[line.id].quantity
                      }
                      onChange={(event) =>
                        setSelection({
                          ...selection,
                          [line.id]: {
                            ...selection[line.id],
                            quantity: event.target.valueAsNumber,
                          },
                        })
                      }
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    반품 사유
                    <Select
                      aria-label={`${line.name} 반품 사유`}
                      value={selection[line.id].reason}
                      onChange={(event) =>
                        setSelection({
                          ...selection,
                          [line.id]: {
                            ...selection[line.id],
                            reason: event.target.value as ReturnReason,
                          },
                        })
                      }
                    >
                      {Object.entries(returnReasonLabels).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ),
                      )}
                    </Select>
                  </label>
                </div>
              ) : null}
            </div>
          ) : null;
        })}
      </fieldset>
      <Notice tone="info">
        단순변심은 최초 배송비와 회수비가 반영될 수 있습니다. 쿠폰·포인트는 상품
        금액에만 적용되며 최종 환불액은 검수 후 확인됩니다.
      </Notice>
      {mutation.isError ? (
        <Notice tone="error">{apiErrorMessage(mutation.error)}</Notice>
      ) : null}
      <Button
        type="submit"
        disabled={!Object.keys(selection).length || mutation.isPending}
      >
        {mutation.isPending ? "신청 중" : "선택 상품 반품 신청"}
      </Button>
    </form>
  );
}
export function ReturnRequestSummary({
  request,
  markets,
}: {
  request: ReturnRequest;
  markets: ReturnMarket[];
}) {
  const names = new Map(
    markets.flatMap((m) =>
      m.items.map((line) => [line.id, line.name] as const),
    ),
  );
  return (
    <article
      className="grid min-w-0 gap-3 rounded-control border border-border-subtle bg-surface-raised p-4"
      aria-label={`반품 요청 ${request.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">반품 요청 #{request.id}</h3>
        <Badge>{returnStatusLabels[request.status]}</Badge>
      </div>
      {request.items.map((item) => (
        <div key={item.id} className="text-sm">
          <p className="font-medium">
            {names.get(item.order_line_item_id) ??
              `주문 상품 #${item.order_line_item_id}`}{" "}
            · {item.quantity}개 신청
          </p>
          <p className="mt-1 text-xs text-content-secondary">
            {returnReasonLabels[item.reason]}
            {request.status !== "REQUESTED" &&
            item.responsibility !== "UNDETERMINED"
              ? ` · 환불 승인 ${item.approved_quantity}개 · ${item.responsibility === "SELLER" ? "판매자" : "구매자"} 귀책`
              : ""}
          </p>
        </div>
      ))}
      {request.status === "COMPLETED" ? (
        <dl className="grid gap-2 border-t border-border-subtle pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt>현금 환불액</dt>
            <dd className="font-bold tabular-nums text-action-primary">
              {formatPrice(request.amount)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>복원 포인트</dt>
            <dd>{request.point_refund_amount.toLocaleString()}P</dd>
          </div>
        </dl>
      ) : null}
    </article>
  );
}
