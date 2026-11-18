"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CreateShippingAddressRequest, OrderShippingAddressInput } from "@/lib/api/checkout-contracts";
import { CheckoutAddressSearch } from "./checkout-address-search";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input } from "./ui/input";

export type CheckoutAddressInput = CreateShippingAddressRequest;

type CheckoutAddressFormProps = {
  onCancel?: () => void;
  pending: boolean;
  error?: string;
} & (
  | { firstAddress: boolean; initialAddress?: never; onSave: (address: CheckoutAddressInput) => void }
  | { initialAddress: OrderShippingAddressInput; firstAddress?: never; onSave: (address: OrderShippingAddressInput) => void }
);

export function CheckoutAddressForm(props: CheckoutAddressFormProps) {
  const { onCancel, pending, error, initialAddress } = props;
  const fieldID = useId();
  const [draft, setDraft] = useState(initialAddress ?? { receiver: "", phone: "", zip_code: "", line1: "", line2: "" });
  const [searching, setSearching] = useState(false);
  const detailInput = useRef<HTMLInputElement>(null);
  const receiverInput = useRef<HTMLInputElement>(null);
  const firstAddress = props.firstAddress;
  useEffect(() => {
    if (firstAddress) receiverInput.current?.focus();
  }, [firstAddress]);
  const selectAddress = useCallback((address: { zip_code: string; line1: string }) => {
    setDraft((current) => ({ ...current, ...address, line2: "" }));
    setSearching(false);
    requestAnimationFrame(() => detailInput.current?.focus());
  }, []);
  const change = (field: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [field]: value }));

  return (
    <form className="mt-4 grid gap-3 sm:grid-cols-2" aria-label={initialAddress ? "배송지 수정" : "배송지 등록"} onSubmit={(event) => {
      event.preventDefault();
      if (pending) return;
      const address = {
        receiver: draft.receiver.trim(), phone: draft.phone.trim(), zip_code: draft.zip_code.trim(),
        line1: draft.line1.trim(), line2: draft.line2.trim(),
      };
      if (props.initialAddress) {
        props.onSave(address);
      } else {
        props.onSave({ ...address, is_default: props.firstAddress });
      }
    }}>
      <fieldset disabled={pending} className="contents">
        <Field label="받는 분" htmlFor={fieldID + "-receiver"} required><Input ref={receiverInput} id={fieldID + "-receiver"} value={draft.receiver} onChange={(event) => change("receiver", event.target.value)} autoComplete="name" maxLength={50} required /></Field>
        <Field label="연락처" htmlFor={fieldID + "-phone"} required><Input id={fieldID + "-phone"} type="tel" value={draft.phone} onChange={(event) => change("phone", event.target.value)} autoComplete="tel" maxLength={20} required /></Field>
        <div className="sm:col-span-2">
          <Button type="button" size="sm" variant="secondary" disabled={pending} aria-expanded={searching} onClick={() => setSearching((current) => !current)}>주소 검색</Button>
          <p className="mt-2 text-xs text-content-secondary">주소를 검색하면 우편번호와 기본 주소가 자동으로 입력됩니다.</p>
        </div>
        {searching ? <CheckoutAddressSearch onSelect={selectAddress} onClose={() => setSearching(false)} /> : null}
        <Field label="우편번호" htmlFor={fieldID + "-zip"} required><Input id={fieldID + "-zip"} value={draft.zip_code} onChange={(event) => change("zip_code", event.target.value)} autoComplete="postal-code" maxLength={10} required /></Field>
        <Field label="기본 주소" htmlFor={fieldID + "-line1"} required><Input id={fieldID + "-line1"} value={draft.line1} onChange={(event) => change("line1", event.target.value)} autoComplete="address-line1" maxLength={255} required /></Field>
        <Field className="sm:col-span-2" label="상세 주소" htmlFor={fieldID + "-line2"}><Input ref={detailInput} id={fieldID + "-line2"} value={draft.line2} onChange={(event) => change("line2", event.target.value)} autoComplete="address-line2" placeholder="동·호수 등 상세 주소" maxLength={255} /></Field>
        {error ? <p className="text-sm text-status-negative sm:col-span-2" role="alert">{error}</p> : null}
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>{pending ? "저장 중" : initialAddress ? "변경사항 저장" : "배송지 저장하고 사용"}</Button>
          {onCancel ? <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={onCancel}>취소</Button> : null}
        </div>
      </fieldset>
    </form>
  );
}
