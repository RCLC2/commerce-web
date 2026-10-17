"use client";

import { useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type ReturnAddress } from "@/lib/returns-api";
import { Field } from "./ui/field";
import { Input } from "./ui/input";

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
  return async () => {
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
  };
}
export function ReturnAddressFields({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: ReturnAddress;
  onChange: (value: ReturnAddress) => void;
  disabled?: boolean;
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
            onChange={(event) =>
              onChange({ ...value, [key]: event.target.value })
            }
          />
        </Field>
      ))}
    </fieldset>
  );
}
