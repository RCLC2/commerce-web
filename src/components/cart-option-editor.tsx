"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import type { CartDisplayGroup } from "@/lib/cart-display";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Select } from "./ui/input";
import { Dialog } from "./ui/overlay";
import { QuantityStepper } from "./ui/quantity-stepper";
import { Notice } from "./ui/notice";

export function availableCartQuantity(product: Product | undefined, optionID: number) {
  const option = product?.options?.find((item) => item.id === optionID);
  return option?.is_active ? Math.min(999, Math.max(0, option.quantity - (option.reserved_quantity ?? 0) - (option.safety_quantity ?? 0))) : 0;
}

export function CartOptionEditor({ group, product, groups, pending, error, onClose, onSave }: { group: CartDisplayGroup; product: Product; groups: CartDisplayGroup[]; pending: boolean; error?: string; onClose: () => void; onSave: (optionID: number, quantity: number) => void }) {
  const [optionID, setOptionID] = useState(group.option_id);
  const [quantity, setQuantity] = useState(group.quantity);
  const [quantityAdjustment, setQuantityAdjustment] = useState<string>();
  function maximumCartQuantity(selectedOptionID: number) {
    const otherQuantity = groups.filter((item) => item.key !== group.key && item.product_id === group.product_id && item.option_id === selectedOptionID).reduce((sum, item) => sum + item.quantity, 0);
    return Math.max(0, availableCartQuantity(product, selectedOptionID) - otherQuantity);
  }
  const available = maximumCartQuantity(optionID);
  const selectedOption = product.options?.find((option) => option.id === optionID);
  const valid = selectedOption?.is_active && quantity >= 1 && quantity <= available;

  return (
    <Dialog open title="옵션 변경" description={product.name} onClose={() => { if (!pending) onClose(); }}>
      <div className="space-y-5">
        <Field label="상품 옵션" htmlFor="cart-product-option">
          <Select id="cart-product-option" value={optionID} disabled={pending} onChange={(event) => {
            const nextOptionID = Number(event.target.value);
            const maximumQuantity = maximumCartQuantity(nextOptionID);
            const nextQuantity = maximumQuantity > 0 ? Math.min(quantity, maximumQuantity) : quantity;
            setOptionID(nextOptionID);
            setQuantity(nextQuantity);
            setQuantityAdjustment(nextQuantity < quantity ? `선택한 옵션은 최대 ${maximumQuantity}개까지 주문할 수 있어 수량을 ${quantity}개에서 ${nextQuantity}개로 변경했습니다.` : undefined);
          }}>
            {(product.options ?? []).map((option) => {
              const stock = maximumCartQuantity(option.id);
              return <option key={option.id} value={option.id} disabled={!stock}>{option.option_name} · {option.option_value}{option.additional_price ? ` (+${formatPrice(option.additional_price)})` : ""}{!stock ? " · 품절" : ""}</option>;
            })}
          </Select>
        </Field>
        <div><p className="mb-2 text-sm font-bold">수량</p><QuantityStepper value={quantity} max={available} disabled={pending} onValueChange={(value) => { setQuantity(value); setQuantityAdjustment(undefined); }} /><p className="mt-2 text-xs text-content-secondary">{available ? `최대 주문 가능 수량 ${available}개` : "선택한 옵션의 재고가 부족합니다."}</p></div>
        {quantityAdjustment ? <Notice tone="warning">{quantityAdjustment}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <p className="text-xs leading-5 text-content-secondary">변경한 옵션과 현재 판매가를 기준으로 주문 금액을 다시 계산합니다.</p>
        <div className="flex justify-end gap-2"><Button variant="secondary" disabled={pending} onClick={onClose}>취소</Button><Button disabled={pending || !valid} onClick={() => onSave(optionID, quantity)}>{pending ? "저장 중" : "변경 저장"}</Button></div>
      </div>
    </Dialog>
  );
}
