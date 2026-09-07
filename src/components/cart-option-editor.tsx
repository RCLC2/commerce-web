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
  const otherQuantity = groups.filter((item) => item.key !== group.key && item.product_id === group.product_id && item.option_id === optionID).reduce((sum, item) => sum + item.quantity, 0);
  const available = Math.max(0, availableCartQuantity(product, optionID) - otherQuantity);
  const selectedOption = product.options?.find((option) => option.id === optionID);
  const valid = selectedOption?.is_active && quantity >= 1 && quantity <= available;

  return (
    <Dialog open title="옵션 변경" description={product.name} onClose={() => { if (!pending) onClose(); }}>
      <div className="space-y-5">
        <Field label="상품 옵션" htmlFor="cart-product-option">
          <Select id="cart-product-option" value={optionID} disabled={pending} onChange={(event) => { setOptionID(Number(event.target.value)); setQuantity(1); }}>
            {(product.options ?? []).map((option) => {
              const stock = availableCartQuantity(product, option.id);
              return <option key={option.id} value={option.id} disabled={!stock}>{option.option_name} · {option.option_value}{option.additional_price ? ` (+${formatPrice(option.additional_price)})` : ""}{!stock ? " · 품절" : ""}</option>;
            })}
          </Select>
        </Field>
        <div><p className="mb-2 text-sm font-bold">수량</p><QuantityStepper value={quantity} max={available} disabled={pending} onValueChange={setQuantity} /><p className="mt-2 text-xs text-content-secondary">{available ? `추가로 선택할 수 있는 수량 ${available}개` : "선택한 옵션의 재고가 부족합니다."}</p></div>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <p className="text-xs leading-5 text-content-secondary">변경한 옵션과 현재 판매가를 기준으로 주문 금액을 다시 계산합니다.</p>
        <div className="flex justify-end gap-2"><Button variant="secondary" disabled={pending} onClick={onClose}>취소</Button><Button disabled={pending || !valid} onClick={() => onSave(optionID, quantity)}>{pending ? "저장 중" : "변경 저장"}</Button></div>
      </div>
    </Dialog>
  );
}
