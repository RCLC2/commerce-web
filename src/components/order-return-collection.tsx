"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  returnsApi,
  returnAddressSchema,
  collectionStatusLabels,
  type ReturnCollection,
  type ReturnRequest,
  type ReturnMarket,
} from "@/lib/returns-api";
import { apiErrorMessage } from "@/lib/api-client";
import {
  ReturnAddressFields,
  returnKeys,
  useReturnRefresh,
} from "./order-return-shared";
import { ReturnInspectionForm, ReturnRestock } from "./order-return-inspection";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field } from "./ui/field";
import { Notice } from "./ui/notice";

export function ReturnCollectionWorkspace({
  token,
  collection,
  requests,
  markets,
}: {
  token: string;
  collection: ReturnCollection;
  requests: ReturnRequest[];
  markets: ReturnMarket[];
}) {
  const refresh = useReturnRefresh();
  const [carrier, setCarrier] = useState(collection.carrier);
  const [tracking, setTracking] = useState(collection.tracking_number);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [pickup, setPickup] = useState(collection.pickup);
  const [destination, setDestination] = useState(collection.destination);
  const history = useQuery({
    queryKey: returnKeys.inspections(token, collection.id),
    queryFn: () => returnsApi.inspections(token, collection.id),
    enabled: collection.status === "RECEIVED",
  });
  const update = useMutation({
    mutationFn: (body: Parameters<typeof returnsApi.updateCollection>[2]) =>
      returnsApi.updateCollection(token, collection.id, body),
    onSuccess: refresh,
  });
  const orderLines = new Map(
    markets.flatMap((market) =>
      market.items.map((item) => [item.id, item] as const),
    ),
  );
  const refundItems = new Map(
    requests.flatMap((request) =>
      request.items.map((item) => [item.id, item] as const),
    ),
  );
  const nextStatus =
    collection.status === "DRAFT"
      ? "REQUESTED"
      : collection.status === "REQUESTED"
        ? "COLLECTED"
        : collection.status === "COLLECTED"
          ? "RECEIVED"
          : undefined;
  const nextLabel =
    collection.status === "DRAFT"
      ? "수거 접수 저장"
      : collection.status === "REQUESTED"
        ? "수거 완료 확인"
        : "반품 입고 확인";
  return (
    <section
      data-return-collection={collection.id}
      tabIndex={-1}
      className="scroll-mt-4 grid min-w-0 gap-4 rounded-control border border-border-subtle p-4"
      aria-label={`수거 건 ${collection.id}`}
    >
      <h4 className="font-bold">
        수거 #{collection.id} · {collectionStatusLabels[collection.status]}
      </h4>
      <details
        open={collection.status !== "RECEIVED"}
        className="rounded-control bg-surface-subtle p-3"
      >
        <summary className="cursor-pointer text-sm font-bold">
          수거·입고 내역 · {collectionStatusLabels[collection.status]}
        </summary>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="font-bold">고객 수거지</p>
              <p className="mt-1 break-words">
                {collection.pickup.address} {collection.pickup.address_detail}
              </p>
              <p className="text-xs text-content-secondary">
                {collection.pickup.recipient_name} · {collection.pickup.phone}
              </p>
            </div>
            <div>
              <p className="font-bold">반품 도착지</p>
              <p className="mt-1 break-words">
                {collection.destination.address}{" "}
                {collection.destination.address_detail}
              </p>
              <p className="text-xs text-content-secondary">
                {collection.destination.recipient_name} ·{" "}
                {collection.destination.phone}
              </p>
            </div>
          </div>
          {collection.tracking_number ? (
            <p className="break-all text-sm">
              택배사 {collection.carrier} · 송장 {collection.tracking_number}
            </p>
          ) : null}
          {collection.collected_at ? (
            <p className="text-xs text-content-secondary">
              수거가 완료되어 주소를 변경할 수 없습니다.
            </p>
          ) : null}
        </div>
      </details>
      {update.isError ? (
        <Notice tone="error">{apiErrorMessage(update.error)}</Notice>
      ) : null}
      {nextStatus ? (
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (collection.status === "DRAFT")
              update.mutate({
                status: nextStatus,
                carrier,
                tracking_number: tracking,
              });
            else setConfirmStatus(true);
          }}
        >
          {collection.status === "DRAFT" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="수거 택배사" htmlFor={`carrier-${collection.id}`}>
                <Input
                  id={`carrier-${collection.id}`}
                  required
                  maxLength={50}
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                />
              </Field>
              <Field
                label="수거 송장번호"
                htmlFor={`tracking-${collection.id}`}
              >
                <Input
                  id={`tracking-${collection.id}`}
                  required
                  maxLength={100}
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
              </Field>
            </div>
          ) : null}
          {confirmStatus ? (
            <Notice tone="warning">
              <p>
                실제{" "}
                {nextStatus === "COLLECTED"
                  ? "택배사 수거가 완료되었나요? 이후 주소를 바꿀 수 없습니다."
                  : "반품 상품을 입고했나요? 수령 수량은 검수에서 별도로 확인합니다."}
              </p>
              <div className="mt-3 flex gap-3">
                <Button
                  variant="secondary"
                  disabled={update.isPending}
                  onClick={() => setConfirmStatus(false)}
                >
                  돌아가기
                </Button>
                <Button
                  disabled={update.isPending}
                  onClick={() => update.mutate({ status: nextStatus })}
                >
                  {nextLabel} 확정
                </Button>
              </div>
            </Notice>
          ) : (
            <Button
              className="justify-self-start"
              type="submit"
              disabled={update.isPending}
            >
              {nextLabel}
            </Button>
          )}
          <p className="text-xs text-content-secondary">
            {collection.status === "DRAFT"
              ? "택배사에 수거를 접수한 뒤 택배사와 송장번호를 입력해주세요."
              : collection.status === "REQUESTED"
                ? "택배기사가 상품을 가져간 뒤 수거 완료를 확인해주세요."
                : "반품 상품이 도착한 뒤 입고를 확인해주세요."}
          </p>
        </form>
      ) : null}
      {!collection.collected_at ? (
        <details className="border-t border-border-subtle pt-3">
          <summary className="cursor-pointer text-sm font-bold">
            수거 전 주소 변경
          </summary>
          <form
            className="mt-4 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              update.mutate({ pickup, destination });
            }}
          >
            <ReturnAddressFields
              label="고객 수거지 변경"
              value={pickup}
              onChange={setPickup}
              disabled={update.isPending}
            />
            <ReturnAddressFields
              label="반품 도착지 변경"
              value={destination}
              onChange={setDestination}
              disabled={update.isPending}
            />
            <Notice>
              주소를 변경하면 기존 송장은 초기화됩니다. 택배사에 기존 접수를
              취소한 뒤 새 송장을 등록해주세요.
            </Notice>
            <Button
              type="submit"
              disabled={
                update.isPending ||
                !returnAddressSchema.safeParse(pickup).success ||
                !returnAddressSchema.safeParse(destination).success
              }
            >
              변경 주소 저장
            </Button>
          </form>
        </details>
      ) : null}
      {collection.status === "RECEIVED" ? (
        <div className="grid gap-5">
          <h4 className="font-bold">상품 검수·재입고</h4>
          {history.isPending ? (
            <p role="status">검수 이력을 확인하는 중입니다.</p>
          ) : history.isError ? (
            <Notice tone="error">
              {apiErrorMessage(history.error)}
              <Button
                variant="secondary"
                onClick={() => void history.refetch()}
              >
                검수 이력 다시 확인
              </Button>
            </Notice>
          ) : (
            collection.items.map((item) => {
              const refunded = refundItems.get(item.refund_item_id);
              const orderLine = refunded
                ? orderLines.get(refunded.order_line_item_id)
                : undefined;
              const productName =
                orderLine?.name ??
                (refunded
                  ? `주문 상품 #${refunded.order_line_item_id}`
                  : `수거 상품 #${item.id}`);
              const versions = history.data.filter(
                (record) => record.return_collection_item_id === item.id,
              );
              const latest = versions.reduce<
                (typeof versions)[number] | undefined
              >(
                (old, current) =>
                  !old || current.version > old.version ? current : old,
                undefined,
              );
              const inspectionForm = (
                <ReturnInspectionForm
                  key={`${item.id}:${latest?.id ?? 0}`}
                  token={token}
                  itemID={item.id}
                  quantity={item.quantity}
                  latest={latest}
                  locked={
                    Boolean(collection.fee_refund_id) ||
                    requests.some(
                      (request) =>
                        request.items.some(
                          (line) => line.id === item.refund_item_id,
                        ) &&
                        (request.quoted_at !== null ||
                          request.status === "WITHDRAWN"),
                    )
                  }
                />
              );
              return (
                <article
                  key={item.id}
                  data-return-inspection-item={item.id}
                  tabIndex={-1}
                  className="scroll-mt-4 grid gap-3 border-t border-border-subtle pt-4"
                >
                  <h5 className="text-sm font-bold">
                    {productName}
                    <span className="mt-1 block text-xs font-normal text-content-secondary">
                      {orderLine?.optionLabel || "선택 옵션 정보 없음"}
                    </span>
                  </h5>
                  <p className="text-xs text-content-secondary">
                    수거 요청 {item.quantity}개
                    {latest ? ` · 수령 ${latest.received_quantity}개` : ""}
                  </p>
                  {latest ? (
                    <details
                      key={`inspection-summary-${latest.id}`}
                      className="rounded-control bg-surface-subtle p-3"
                    >
                      <summary className="cursor-pointer text-sm font-bold">
                        검수 완료 · 수령 {latest.received_quantity}개 / 환불
                        승인 {latest.refundable_quantity}개 / 재판매 가능{" "}
                        {latest.restockable_quantity}개
                      </summary>
                      <div className="mt-4 grid gap-4">
                        {inspectionForm}
                        <details>
                          <summary className="cursor-pointer text-xs font-bold">
                            검수 이력 {versions.length}건
                          </summary>
                          <ul className="mt-2 grid gap-2 text-xs text-content-secondary">
                            {versions.map((v) => (
                              <li key={v.id}>
                                {v.version}차 검수 · 수령 {v.received_quantity} /
                                환불 승인 {v.refundable_quantity} / 재판매 가능{" "}
                                {v.restockable_quantity} ·{" "}
                                {v.responsibility === "SELLER"
                                  ? "판매자"
                                  : "구매자"}{" "}
                                부담 · 재입고 {v.restocked_quantity}개
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    </details>
                  ) : (
                    inspectionForm
                  )}
                  {latest ? (
                    <ReturnRestock
                      key={latest.id}
                      token={token}
                      inspection={latest}
                      productName={productName}
                      optionLabel={orderLine?.optionLabel}
                      totalRestockedQuantity={versions.reduce(
                        (sum, record) => sum + record.restocked_quantity,
                        0,
                      )}
                    />
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </section>
  );
}
