"use client";

import { useCallback, useId, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { returnAddressSchema, type ReturnAddress } from "@/lib/returns-api";
import { Field } from "./ui/field";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export const returnKeys = {
  requests: (token: string, code: string) =>
    ["order-returns", token, code] as const,
  collections: (token: string, code: string) =>
    ["return-collections", token, code] as const,
  inspections: (token: string, id: number) =>
    ["return-inspections", token, id] as const,
};
export function useReturnRefresh() {
  const client = useQueryClient();
  return useCallback(async () => {
    await Promise.all(
      [
        "order-returns",
        "return-collections",
        "return-inspections",
        "return-quote",
        "order",
        "orders",
        "admin-orders-v2",
        "admin-order-v2",
        "seller-orders-v2",
        "seller-order-v2",
        "seller-inventory-v2",
        "seller-inventory-options",
        "seller-products-v2",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  }, [client]);
}
export function ReturnAddressFields({
  label,
  value,
  onChange,
  disabled,
  errors,
  onBlur,
}: {
  label: string;
  value: ReturnAddress;
  onChange: (value: ReturnAddress) => void;
  disabled?: boolean;
  errors?: Partial<Record<keyof ReturnAddress, string>>;
  onBlur?: (field: keyof ReturnAddress) => void;
}) {
  const prefix = useId();
  return (
    <fieldset disabled={disabled} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <legend className="mb-3 text-sm font-bold">{label}</legend>
      {(
        [
          ["recipient_name", "수령인", 100],
          ["phone", "연락처", 20],
          ["postal_code", "우편번호", 5],
          ["address", "주소", 255],
          ["address_detail", "상세 주소", 255],
        ] as const
      ).map(([key, name, max]) => (
        <Field
          key={key}
          htmlFor={`${prefix}-${key}`}
          label={name}
          required={key !== "address_detail"}
          error={errors?.[key]}
          hint={key === "postal_code" ? "숫자 5자리로 입력해주세요." : undefined}
          className={
            key === "address" || key === "address_detail"
              ? "sm:col-span-2"
              : undefined
          }
        >
          <Input
            id={`${prefix}-${key}`}
            required={key !== "address_detail"}
            value={value[key]}
            maxLength={max}
            inputMode={
              key === "postal_code"
                ? "numeric"
                : key === "phone"
                  ? "tel"
                  : undefined
            }
            pattern={key === "postal_code" ? "[0-9]{5}" : undefined}
            autoComplete="off"
            state={errors?.[key] ? "error" : undefined}
            aria-invalid={errors?.[key] ? true : undefined}
            onBlur={() => onBlur?.(key)}
            onChange={(event) =>
              onChange({ ...value, [key]: event.target.value })
            }
          />
        </Field>
      ))}
    </fieldset>
  );
}


export function ReturnAddressDetails({ editing, onEdit, onDone, ...fields }: Parameters<typeof ReturnAddressFields>[0] & {
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const editorID = useId();
  const validAddress = returnAddressSchema.safeParse(fields.value).success;
  const expanded = editing || !validAddress;
  return (
    <div ref={container} id={editorID} className="grid min-w-0 gap-3">
      {expanded ? (
        <>
          <ReturnAddressFields {...fields} />
          <Button type="button" size="sm" variant="secondary" className="justify-self-start"
            disabled={fields.disabled || !validAddress}
            aria-expanded="true" aria-controls={editorID}
            onClick={() => {
              onDone();
              requestAnimationFrame(() => container.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }));
            }}>
            입력 완료
          </Button>
        </>
      ) : (
        <fieldset disabled={fields.disabled} className="grid min-w-0 gap-2 rounded-control border border-border-subtle bg-surface-subtle p-3">
          <legend className="px-1 text-sm font-bold">{fields.label}</legend>
          <p className="break-words text-sm font-medium">{fields.value.recipient_name} · {fields.value.phone}</p>
          <p className="break-words text-sm leading-6">[{fields.value.postal_code}] {fields.value.address} {fields.value.address_detail}</p>
          <Button type="button" size="sm" variant="secondary" className="justify-self-start"
            aria-expanded="false" aria-controls={editorID}
            onClick={() => {
              onEdit();
              requestAnimationFrame(() => container.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }));
            }}>
            주소 수정
          </Button>
        </fieldset>
      )}
    </div>
  );
}
