"use client";

import { useEffect, useRef, useState } from "react";
import { useIsFetching, useMutation, useQuery } from "@tanstack/react-query";
import {
  returnsApi,
  returnableQuantity,
  returnReasonLabels,
  returnStatusLabels,
  hasActiveReturnForLine,
  emptyReturnAddress,
  returnAddressSchema,
  type ReturnAddress,
  type ReturnMarket,
  type ReturnReason,
  type ReturnRequest,
} from "@/lib/returns-api";
import { apiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { ReturnAddressDetails, returnKeys, useReturnRefresh } from "./order-return-shared";
import { api } from "@/lib/api";
import type { Address } from "@/lib/types";
import { Button } from "./ui/button";
import { Select, Input } from "./ui/input";
import { Notice } from "./ui/notice";
import { Dialog } from "./ui/overlay";
import { Badge } from "./ui/badge";

function pickupFromAddress(address: Address): ReturnAddress {
  return {
    recipient_name: address.receiver, phone: address.phone,
    postal_code: address.zip_code, address: address.line1,
    address_detail: address.line2,
  };
}

export function CustomerOrderReturns({
  token,
  orderCode,
  markets,
  onShowRefundDetails,
}: {
  token: string;
  orderCode: string;
  markets: ReturnMarket[];
  onShowRefundDetails?: () => void;
}) {
  const refresh = useReturnRefresh();
  const returnsSection = useRef<HTMLElement>(null);
  const refreshAll = useMutation({ mutationFn: refresh });
  const fetchingOrders = useIsFetching({ queryKey: ["order"] });
  const query = useQuery({
    queryKey: returnKeys.requests(token, orderCode),
    queryFn: () => returnsApi.requests(token, orderCode),
    refetchInterval: (q) => {
      const requests = q.state.data ?? [];
      if (requests.some((request) => request.status === "PROCESSING"))
        return 2000;
      return requests.some((request) =>
        ["REQUESTED", "INSPECTED"].includes(request.status),
      )
        ? 10_000
        : false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: "always",
  });
  const observedCompletions = useRef<{
    token: string;
    orderCode: string;
    ids: Set<number>;
  } | null>(null);
  useEffect(() => {
    // Let an earlier order read finish before reconciling the completed return.
    if (!query.data || refreshAll.isPending || fetchingOrders > 0) return;
    const previous = observedCompletions.current;
    const ids = new Set(
      query.data
        .filter((request) => request.status === "COMPLETED")
        .map((request) => request.id),
    );
    observedCompletions.current = { token, orderCode, ids };
    if (
      [...ids].some(
        (id) =>
          previous?.token !== token ||
          previous.orderCode !== orderCode ||
          !previous.ids.has(id),
      )
    ) {
      void refresh();
    }
  }, [query.data, token, orderCode, refresh, refreshAll.isPending, fetchingOrders]);
  const [marketID, setMarketID] = useState<number>();
  const market = markets.find((m) => m.id === marketID);
  const closeToHistory = () => {
    setMarketID(undefined);
    requestAnimationFrame(() => {
      const section = returnsSection.current;
      section?.focus({ preventScroll: true });
      section?.scrollIntoView?.({ block: "nearest", behavior: "instant" });
    });
  };
  const marketStates = markets.map((market) => {
    const requests = query.data ?? [];
    const canRequest = market.items.some(
      (line) => returnableQuantity(line, requests) > 0,
    );
    const processing = market.items.some((line) =>
      hasActiveReturnForLine(line.id, requests),
    );
    const completed =
      !processing &&
      requests.some(
        (request) =>
          request.market_id === market.id && request.status === "COMPLETED",
      );
    return { market, canRequest, processing, completed };
  });
  const allReturnsCompleted =
    marketStates.length > 0 &&
    marketStates.every(({ canRequest, completed }) => !canRequest && completed);
  return (
    <section ref={returnsSection} tabIndex={-1} className="mt-6 grid min-w-0 gap-4" aria-label="반품 신청 및 내역">
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {query.data?.some((request) => request.status === "COMPLETED")
          ? `반품·환불 ${query.data.filter((request) => request.status === "COMPLETED").length}건 처리가 완료되었습니다. 환불 내역을 확인해주세요.`
          : ""}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">반품 신청 및 내역</h2>
        <div className="flex flex-wrap gap-2">
          {onShowRefundDetails ? (
            <Button size="sm" variant="secondary" onClick={onShowRefundDetails}>
              환불 상세 보기
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            disabled={refreshAll.isPending || query.isFetching}
            onClick={() => refreshAll.mutate()}
          >
            {refreshAll.isPending ? "최신 상태 확인 중" : "반품 상태 새로고침"}
          </Button>
        </div>
      </div>
      {query.isPending ? (
        <p role="status">반품 내역을 확인하는 중입니다.</p>
      ) : query.isError && !query.data ? (
        <Notice tone="error">
          {apiErrorMessage(query.error)}
          <Button
            className="mt-3"
            variant="secondary"
            disabled={refreshAll.isPending}
            onClick={() => refreshAll.mutate()}
          >
            반품 내역 다시 확인
          </Button>
        </Notice>
      ) : (
        <>
          {query.isError ? (
            <Notice tone="warning">
              <p>
                반품 상태를 갱신하지 못했습니다. 마지막으로 확인한 내역을
                표시합니다.
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="secondary"
                disabled={refreshAll.isPending || query.isFetching}
                onClick={() => refreshAll.mutate()}
              >
                {refreshAll.isPending || query.isFetching
                  ? "최신 상태 확인 중"
                  : "반품 내역 다시 확인"}
              </Button>
            </Notice>
          ) : null}
          {marketStates.map(
            ({ market: m, canRequest, processing, completed }) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <p className="text-sm font-bold">{m.name}</p>
                {canRequest ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={query.isError}
                    onClick={() => setMarketID(m.id)}
                  >
                    {m.name} 반품 신청
                  </Button>
                ) : (
                  <p
                    className={
                      completed
                        ? "text-sm font-medium leading-6 text-content-primary"
                        : "text-xs text-content-secondary"
                    }
                  >
                    {processing
                      ? "신청한 반품을 처리 중입니다."
                      : completed
                        ? "신청한 상품의 반품·환불이 완료되었습니다."
                        : "신청 가능한 남은 수량이 없습니다."}
                  </p>
                )}
              </div>
            ),
          )}
          {!allReturnsCompleted ? (
            <p className="text-xs leading-5 text-content-secondary">
              구매확정 전 상품만 신청할 수 있습니다. 판매자가 수거지와 상품을
              확인한 뒤, 검수 결과에 따라 환불 금액을 안내합니다.
            </p>
          ) : null}
          {query.data?.length === 0 ? (
            <p className="text-sm text-content-secondary">
              아직 신청한 반품이 없습니다.
            </p>
          ) : (
            query.data?.map((request) => (
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
        description={market?.items.some((line) => returnableQuantity(line, query.data ?? []) > 0)
          ? "반품할 상품과 수량, 사유를 선택해주세요."
          : "변경된 신청 가능 수량과 반품 내역을 확인해주세요."}
        className="max-w-xl"
        fixedHeader
      >
        {market && query.data ? (
          <ReturnRequestForm
            key={market.id}
            token={token}
            code={orderCode}
            market={market}
            requests={query.data}
            requestsFailed={query.isError}
            requestsFetching={query.isFetching}
            onRetryRequests={() => void query.refetch()}
            onComplete={closeToHistory}
            onViewHistory={closeToHistory}
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
  requestsFailed,
  requestsFetching,
  onRetryRequests,
  onComplete,
  onViewHistory,
}: {
  token: string;
  code: string;
  market: ReturnMarket;
  requests: ReturnRequest[];
  requestsFailed: boolean;
  requestsFetching: boolean;
  onRetryRequests: () => void;
  onComplete: () => void;
  onViewHistory: () => void;
}) {
  const refresh = useReturnRefresh();
  const addresses = useQuery({
    queryKey: ["return-pickup-addresses", token],
    queryFn: () => api.listAddresses(token),
  });
  const [selectedAddressID, setSelectedAddressID] = useState<number | "manual">();
  const [editingPickup, setEditingPickup] = useState(false);
  const [pickupDraft, setPickupDraft] = useState<ReturnAddress>();
  const [pickupTouched, setPickupTouched] = useState<Partial<Record<keyof ReturnAddress, boolean>>>({});
  const savedAddresses = addresses.data ?? [];
  const selectedAddress = selectedAddressID === "manual" ? undefined :
    selectedAddressID !== undefined ? savedAddresses.find((address) => address.id === selectedAddressID) :
    savedAddresses.find((address) => address.is_default) ?? savedAddresses[0];
  const pickup = pickupDraft ?? (selectedAddress ? pickupFromAddress(selectedAddress) : emptyReturnAddress());
  const pickupValidation = returnAddressSchema.safeParse(pickup);
  const pickupErrors = pickupValidation.error?.flatten().fieldErrors;
  const visiblePickupErrors: Partial<Record<keyof ReturnAddress, string>> = {};
  for (const field of ["recipient_name", "phone", "postal_code", "address", "address_detail"] as const) {
    if (pickupTouched[field]) visiblePickupErrors[field] = pickupErrors?.[field]?.[0];
  }
  const [selection, setSelection] = useState<
    Record<number, { quantity: number; reason: ReturnReason }>
  >({});
  const remainingByID = new Map(
    market.items.map((line) => [line.id, returnableQuantity(line, requests)]),
  );
  const selectedItems = Object.entries(selection).flatMap(([id, item]) =>
    (remainingByID.get(Number(id)) ?? 0) > 0
      ? [{ order_line_item_id: Number(id), ...item }]
      : [],
  );
  const canSubmit =
    !requestsFailed &&
    !requestsFetching &&
    pickupValidation.success &&
    selectedItems.length > 0 &&
    selectedItems.every(
      (item) =>
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= (remainingByID.get(item.order_line_item_id) ?? 0),
    );
  const mutation = useMutation({
    mutationFn: () =>
      returnsApi.create(token, code, {
        market_id: market.id,
        items: selectedItems,
        pickup,
      }),
    onSuccess: async () => {
      await refresh();
      onComplete();
    },
  });
  if ([...remainingByID.values()].every((quantity) => quantity === 0) && !mutation.isPending && !requestsFailed && !requestsFetching) {
    const alreadyRequested = market.items.some((line) => hasActiveReturnForLine(line.id, requests));
    return (
      <div className="grid gap-4 overflow-y-auto p-5">
        <Notice title={alreadyRequested ? "이미 반품 신청된 상품입니다." : "신청 가능한 상품이 없습니다."}>
          신청 가능한 남은 수량이 없습니다. 반품 내역에서 진행 상태를 확인해주세요.
        </Notice>
        <Button onClick={onViewHistory}>반품 내역으로 돌아가기</Button>
      </div>
    );
  }
  return (
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit && !mutation.isPending) mutation.mutate();
      }}
    >
      <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain p-5" aria-label="반품 신청 내용" role="region">
        <fieldset disabled={mutation.isPending} className="grid gap-4">
          {market.items.map((line) => {
            const remaining = returnableQuantity(line, requests);
            const itemLabel = [line.name, line.optionLabel].filter(Boolean).join(" · ");
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
                  <span>
                    {line.name}
                    {line.optionLabel ? (
                      <span className="mt-1 block text-xs font-normal text-content-secondary">
                        {line.optionLabel}
                      </span>
                    ) : null}
                  </span>
                </label>
                <p className="text-xs text-content-secondary">
                  신청 가능한 수량 {remaining}개 · 주문 수량 {line.quantity}개
                </p>
                {selection[line.id] ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                      반품 수량
                      <Input
                        aria-label={`${itemLabel} 반품 수량`}
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
                        aria-label={`${itemLabel} 반품 사유`}
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
        <section className="grid gap-3 rounded-control border border-border-subtle p-4" aria-label="반품 수거지">
          <h3 className="text-sm font-bold">반품 수거지</h3>
          <p className="text-sm text-content-secondary">택배기사가 방문할 주소를 선택하거나 입력해주세요.</p>
          {addresses.isPending ? <p role="status" className="text-sm">주소록을 불러오는 중입니다.</p> : null}
          {addresses.isError ? (
            <Notice tone="warning">
              주소록을 불러오지 못했습니다. 수거지를 직접 입력하거나 다시 시도해주세요.
              <Button className="mt-2" size="sm" variant="secondary" disabled={addresses.isFetching} onClick={() => void addresses.refetch()}>주소록 다시 불러오기</Button>
            </Notice>
          ) : null}
          {!addresses.isPending && !addresses.isError && !savedAddresses.length ? <p className="text-sm text-content-secondary">저장된 주소가 없습니다. 아래에 수거지를 입력해주세요.</p> : null}
          <label className="grid gap-2 text-sm font-medium">
            주소록에서 선택
            <Select
              value={selectedAddressID === "manual" ? "manual" : selectedAddress?.id ?? "manual"}
              disabled={mutation.isPending}
              onChange={(event) => {
                setSelectedAddressID(event.target.value === "manual" ? "manual" : Number(event.target.value));
                setEditingPickup(event.target.value === "manual");
                setPickupDraft(undefined);
                setPickupTouched({});
              }}
            >
              {savedAddresses.map((address) => <option key={address.id} value={address.id}>{address.is_default ? "[기본] " : ""}{address.receiver} · {address.line1} {address.line2}</option>)}
              <option value="manual">직접 입력</option>
            </Select>
          </label>
          <ReturnAddressDetails editing={editingPickup} onEdit={() => setEditingPickup(true)} onDone={() => setEditingPickup(false)} label="수거지 정보" value={pickup} disabled={mutation.isPending} errors={visiblePickupErrors} onBlur={(field) => setPickupTouched((current) => ({ ...current, [field]: true }))} onChange={(value) => {
            setSelectedAddressID("manual");
            setEditingPickup(true);
            setPickupDraft(value);
          }} />
          {!pickupValidation.success ? <p role="status" className="text-sm text-content-secondary">{pickupValidation.error.issues[0].message}</p> : null}
        </section>
        <Notice tone="info">
          단순변심은 최초 배송비와 회수비가 반영될 수 있습니다. 쿠폰·포인트는 상품
          금액에만 적용되며 최종 환불액은 검수 후 확인됩니다.
        </Notice>
      </div>
      <div className="grid shrink-0 gap-3 border-t border-border-subtle bg-surface-raised p-5">
        {requestsFailed ? (
          <Notice tone="warning">
            <p>최신 반품 내역을 확인하지 못했습니다. 다시 확인한 뒤 신청해주세요. 입력한 내용은 유지됩니다.</p>
            <Button type="button" className="mt-2" size="sm" variant="secondary" disabled={requestsFetching} onClick={onRetryRequests}>
              {requestsFetching ? "최신 상태 확인 중" : "신청 가능 수량 다시 확인"}
            </Button>
          </Notice>
        ) : requestsFetching ? <p role="status" className="text-sm text-content-secondary">신청 가능 수량을 확인하는 중입니다.</p> : null}
        {mutation.isError ? (
          <Notice tone="error" className="max-h-[24dvh] overflow-y-auto">
            {apiErrorMessage(mutation.error)}
          </Notice>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={!canSubmit || mutation.isPending}
        >
          {mutation.isPending ? "신청 중" : "선택 상품 반품 신청"}
        </Button>
      </div>
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
  const lines = new Map(
    markets.flatMap((m) => m.items.map((line) => [line.id, line] as const)),
  );
  return (
    <article
      className="grid min-w-0 gap-3 rounded-control border border-border-subtle bg-surface-raised p-4"
      aria-label={`반품 요청 ${request.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">반품 요청 #{request.id}</h3>
        <Badge
          className={
            request.status === "COMPLETED"
              ? "bg-action-primary text-content-inverse"
              : undefined
          }
        >
          {returnStatusLabels[request.status]}
        </Badge>
      </div>
      {request.items.map((item) => (
        <div key={item.id} className="text-sm">
          <p className="font-medium">
            {lines.get(item.order_line_item_id)?.name ??
              `주문 상품 #${item.order_line_item_id}`}{" "}
            · {item.quantity}개 신청
          </p>
          {lines.get(item.order_line_item_id)?.optionLabel ? (
            <p className="mt-1 break-words text-xs text-content-secondary">
              {lines.get(item.order_line_item_id)?.optionLabel}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-content-secondary">
            {returnReasonLabels[item.reason]}
            {request.status !== "REQUESTED" &&
            item.responsibility !== "UNDETERMINED"
              ? ` · 환불 승인 ${item.approved_quantity}개 · ${item.responsibility === "SELLER" ? "판매자" : "구매자"} 부담`
              : ""}
          </p>
        </div>
      ))}
      {request.pickup ? (
        <div className="border-t border-border-subtle pt-3 text-sm">
          <p className="font-medium">신청한 수거지</p>
          <p className="mt-1 break-words">({request.pickup.postal_code}) {request.pickup.address} {request.pickup.address_detail}</p>
          <p className="text-xs text-content-secondary">{request.pickup.recipient_name} · {request.pickup.phone}</p>
        </div>
      ) : null}
      {request.status === "COMPLETED" ? (
        <dl className="grid gap-2 border-t border-border-subtle pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt>결제수단 환불액</dt>
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
