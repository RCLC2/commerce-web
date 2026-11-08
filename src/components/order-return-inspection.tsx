"use client";

import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  inspectionRequestSchema,
  returnsApi,
  type InspectionRequest,
  type ReturnInspection,
} from "@/lib/returns-api";
import { apiErrorMessage } from "@/lib/api-client";
import { useReturnRefresh } from "./order-return-shared";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input, Select } from "./ui/input";
import { Notice } from "./ui/notice";

const inspectionLabels = {
  NORMAL: "정상",
  DAMAGED: "파손",
  DEFECTIVE: "불량",
  USED: "사용 흔적",
  MISSING: "누락",
  WRONG_ITEM: "다른 상품",
};
export function ReturnInspectionForm({
  token,
  itemID,
  quantity,
  latest,
  locked,
}: {
  token: string;
  itemID: number;
  quantity: number;
  latest?: ReturnInspection;
  locked: boolean;
}) {
  const refresh = useReturnRefresh();
  const prefix = useId();
  const [draft, setDraft] = useState({
    received_quantity: latest?.received_quantity ?? quantity,
    refundable_quantity: latest?.refundable_quantity ?? quantity,
    restockable_quantity: latest?.restockable_quantity ?? 0,
    result_code: latest?.result_code ?? "NORMAL",
    responsibility: latest?.responsibility ?? "",
  });
  const inspection = useMutation({
    mutationFn: () =>
      returnsApi.inspect(token, itemID, inspectionRequestSchema.parse(draft)),
    onSuccess: refresh,
  });
  const valid =
    inspectionRequestSchema.safeParse(draft).success &&
    draft.received_quantity <= quantity;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !locked && !inspection.isPending) inspection.mutate();
      }}
      className="grid gap-3"
      aria-label={`수거 상품 ${itemID} 검수`}
    >
      <fieldset
        disabled={locked || inspection.isPending}
        className="grid gap-3 sm:grid-cols-3"
      >
        {(
          [
            ["received_quantity", "수령 수량"],
            ["refundable_quantity", "환불 승인 수량"],
            ["restockable_quantity", "재판매 가능 수량"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label} htmlFor={`${prefix}-${key}`}>
            <Input
              id={`${prefix}-${key}`}
              type="number"
              min={0}
              max={
                key === "received_quantity" ? quantity : draft.received_quantity
              }
              required
              value={Number.isNaN(draft[key]) ? "" : draft[key]}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.valueAsNumber })
              }
            />
          </Field>
        ))}
        <Field label="검수 결과" htmlFor={`${prefix}-result`}>
          <Select
            id={`${prefix}-result`}
            value={draft.result_code}
            onChange={(event) =>
              setDraft({
                ...draft,
                result_code: event.target
                  .value as InspectionRequest["result_code"],
              })
            }
          >
            {Object.entries(inspectionLabels).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="반품 비용 부담" htmlFor={`${prefix}-responsibility`}>
          <Select
            id={`${prefix}-responsibility`}
            required
            value={draft.responsibility}
            onChange={(event) =>
              setDraft({ ...draft, responsibility: event.target.value })
            }
          >
            <option value="">직접 확인 후 선택</option>
            <option value="BUYER">구매자 부담</option>
            <option value="SELLER">판매자 부담</option>
          </Select>
        </Field>
      </fieldset>
      {locked ? (
        <p className="text-xs text-content-secondary">
          환불 금액이 확정되어 검수 내용을 수정할 수 없습니다.
        </p>
      ) : (
        <p className="text-xs leading-5 text-content-secondary">
          수령·환불 승인·재판매 가능 수량을 각각 확인해주세요. 검수 저장만으로
          환불하거나 재입고하지 않습니다.
        </p>
      )}
      {inspection.isError ? (
        <Notice tone="error">{apiErrorMessage(inspection.error)}</Notice>
      ) : null}
      {!locked ? (
        <Button
          className="justify-self-start"
          disabled={!valid || inspection.isPending}
          type="submit"
        >
          {inspection.isPending
            ? "검수 저장 중"
            : latest
              ? "검수 정정 저장"
              : "검수 저장"}
        </Button>
      ) : null}
      {latest ? (
        <p className="text-xs text-content-secondary">
          검수 기록 {latest.version}차 ·{" "}
          {new Date(latest.inspected_at).toLocaleString("ko-KR")}
        </p>
      ) : null}
    </form>
  );
}
export function ReturnRestock({
  token,
  inspection,
  totalRestockedQuantity,
  productName,
  optionLabel,
}: {
  token: string;
  inspection: ReturnInspection;
  totalRestockedQuantity: number;
  productName: string;
  optionLabel?: string;
}) {
  const refresh = useReturnRefresh();
  const prefix = useId();
  const remaining = Math.max(
    0,
    inspection.restockable_quantity - totalRestockedQuantity,
  );
  const [quantity, setQuantity] = useState(remaining);
  const [confirming, setConfirming] = useState(false);
  const restock = useMutation({
    mutationFn: () => returnsApi.restock(token, inspection.id, quantity),
    onSuccess: refresh,
  });
  if (inspection.restocked_quantity > 0 || restock.isSuccess) {
    const restored = inspection.restocked_quantity || quantity;
    const cumulativeRestocked = totalRestockedQuantity + (inspection.restocked_quantity > 0 ? 0 : restored);
    return (
      <Notice tone="success" title="재입고 완료">
        <p className="font-medium">이번 재입고 {restored}개 · 누적 재입고 {cumulativeRestocked}개</p>
        {inspection.restocked_at ? (
          <p>
            {new Date(inspection.restocked_at).toLocaleString("ko-KR")} 처리
          </p>
        ) : null}
        <p>판매 가능한 재고에 반영되었습니다.</p>
      </Notice>
    );
  }
  if (remaining === 0) {
    return (
      <p className="text-xs text-content-secondary">
        추가로 재입고할 수량이 없습니다. 누적 재입고 {totalRestockedQuantity}개
      </p>
    );
  }
  return (
    <section
      className="mt-4 grid gap-3 rounded-control bg-surface-subtle p-4"
      aria-label={`검수 ${inspection.id} 재입고`}
    >
      <h5 className="text-sm font-bold">선택 수량 재입고</h5>
      <p className="text-xs leading-5 text-content-secondary">
        재판매 가능 {inspection.restockable_quantity}개 중 누적 재입고{" "}
        {totalRestockedQuantity}개, 남은 {remaining}개 이내에서 선택합니다.
      </p>
      <Field htmlFor={prefix} label="재입고 수량">
        <Input
          id={prefix}
          type="number"
          min={1}
          max={remaining}
          value={Number.isNaN(quantity) ? "" : quantity}
          disabled={restock.isPending || restock.isSuccess}
          onChange={(event) => {
            setConfirming(false);
            setQuantity(event.target.valueAsNumber);
          }}
        />
      </Field>
      {restock.isError ? (
        <Notice tone="error">
          {apiErrorMessage(restock.error)} 이미 처리된 검수의 수량 변경이나 누적
          재판매 가능 수량 초과 여부를 확인해주세요.
        </Notice>
      ) : null}
      {confirming ? (
        <div className="grid gap-3">
          <div className="text-sm font-medium">
            {productName}
            <p className="mt-1 text-xs font-normal text-content-secondary">
              {optionLabel || "선택 옵션 정보 없음"}
            </p>
          </div>
          <p className="text-sm font-bold">
            판매 가능한 재고에 {quantity}개를 반영할까요?
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              disabled={restock.isPending}
              onClick={() => setConfirming(false)}
            >
              돌아가기
            </Button>
            <Button
              disabled={restock.isPending}
              onClick={() => restock.mutate()}
            >
              재입고 확정
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="justify-self-start"
          variant="secondary"
          disabled={
            !Number.isInteger(quantity) || quantity <= 0 || quantity > remaining
          }
          onClick={() => setConfirming(true)}
        >
          선택 수량 재입고
        </Button>
      )}
    </section>
  );
}
