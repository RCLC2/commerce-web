"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input } from "./ui/input";

export type CheckoutAddressInput = {
  receiver: string;
  phone: string;
  zip_code: string;
  line1: string;
  line2: string;
  is_default: boolean;
};

export function CheckoutAddressForm({ onSave, onCancel, pending, error, firstAddress }: {
  onSave: (address: CheckoutAddressInput) => void;
  onCancel?: () => void;
  pending: boolean;
  error?: string;
  firstAddress: boolean;
}) {
  const [draft, setDraft] = useState({ receiver: "", phone: "", zip_code: "", line1: "", line2: "" });
  const change = (field: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [field]: value }));

  return (
    <form className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="배송지 등록" onSubmit={(event) => {
      event.preventDefault();
      onSave({
        receiver: draft.receiver.trim(), phone: draft.phone.trim(), zip_code: draft.zip_code.trim(),
        line1: draft.line1.trim(), line2: draft.line2.trim(), is_default: firstAddress,
      });
    }}>
      <Field label="받는 분" htmlFor="checkout-receiver" required><Input id="checkout-receiver" value={draft.receiver} onChange={(event) => change("receiver", event.target.value)} autoComplete="name" maxLength={50} required /></Field>
      <Field label="연락처" htmlFor="checkout-phone" required><Input id="checkout-phone" type="tel" value={draft.phone} onChange={(event) => change("phone", event.target.value)} autoComplete="tel" maxLength={20} required /></Field>
      <Field label="우편번호" htmlFor="checkout-zip" required><Input id="checkout-zip" value={draft.zip_code} onChange={(event) => change("zip_code", event.target.value)} autoComplete="postal-code" maxLength={10} required /></Field>
      <Field label="기본 주소" htmlFor="checkout-line1" required><Input id="checkout-line1" value={draft.line1} onChange={(event) => change("line1", event.target.value)} autoComplete="address-line1" maxLength={255} required /></Field>
      <Field className="sm:col-span-2" label="상세 주소" htmlFor="checkout-line2"><Input id="checkout-line2" value={draft.line2} onChange={(event) => change("line2", event.target.value)} autoComplete="address-line2" maxLength={255} /></Field>
      {error ? <p className="text-sm text-status-negative sm:col-span-2" role="alert">{error}</p> : null}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "저장 중" : "배송지 저장하고 사용"}</Button>
        {onCancel ? <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={onCancel}>취소</Button> : null}
      </div>
    </form>
  );
}
