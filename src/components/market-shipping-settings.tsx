"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shippingPolicyApi, type ShippingSettings } from "@/lib/shipping-policy-api";
import { apiErrorMessage } from "@/lib/api-client";
import { Button } from "./ui/button";

export function MarketShippingSettings({ token, marketID }: { token: string; marketID: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["market-shipping-settings", marketID];
  const query = useQuery({ queryKey, queryFn: () => shippingPolicyApi.settings(token, marketID) });
  const [draft, setDraft] = useState<ShippingSettings>();
  const settings = draft ?? query.data;
  const save = useMutation({
    mutationFn: (value: ShippingSettings) => shippingPolicyApi.update(token, value),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      setDraft(undefined);
    },
  });

  if (!settings) {
    return <p role={query.isError ? "alert" : "status"}>{query.isError ? apiErrorMessage(query.error) : "배송 설정을 불러오는 중입니다."}</p>;
  }

  const feeInRange = (fee: number) => Number.isInteger(fee) && fee >= 0 && fee <= 65535;
  const valid = (settings.shipping_fee === 0 || settings.shipping_fee === 3000) && feeInRange(settings.additional_shipping_fee)
    && (settings.additional_shipping_fee_reason === "NONE" ? settings.additional_shipping_fee === 0 : settings.additional_shipping_fee > 0);
  const updateDraft = (fields: Partial<ShippingSettings>) => {
    save.reset();
    setDraft({ ...settings, ...fields });
  };

  return (
    <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (valid && !save.isPending) save.mutate(settings); }}>
      <label className="grid gap-1 text-sm">
        기본 배송비 (원)
        <input
          className="rounded-md border border-border-subtle p-2"
          type="number" min="0" max="3000" step="3000" required disabled={save.isPending}
          value={Number.isNaN(settings.shipping_fee) ? "" : settings.shipping_fee}
          onChange={(event) => updateDraft({ shipping_fee: event.target.valueAsNumber })}
        />
      </label>
      <p className="text-xs text-content-secondary">무료배송(0원) 또는 유료배송(3,000원)으로 설정해주세요. 배송비에는 쿠폰과 포인트가 적용되지 않습니다.</p>
      <label className="grid gap-1 text-sm">
        추가 배송비 사유
        <select
          className="rounded-md border border-border-subtle p-2"
          disabled={save.isPending}
          value={settings.additional_shipping_fee_reason}
          onChange={(event) => updateDraft({
            additional_shipping_fee_reason: event.target.value === "REMOTE_AREA" ? "REMOTE_AREA" : "NONE",
            additional_shipping_fee: 0,
          })}
        >
          <option value="NONE">추가금 없음</option>
          <option value="REMOTE_AREA">도서산간</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        추가 배송비 (원)
        <input
          className="rounded-md border border-border-subtle p-2"
          type="number" min="0" max="65535" step="1" required
          disabled={save.isPending || settings.additional_shipping_fee_reason === "NONE"}
          value={Number.isNaN(settings.additional_shipping_fee) ? "" : settings.additional_shipping_fee}
          onChange={(event) => updateDraft({ additional_shipping_fee: event.target.valueAsNumber })}
        />
      </label>
      <p className="text-xs text-content-secondary">도서산간 추가금은 설정만 저장하며, 현재 주문에는 부과하지 않습니다.</p>
      {save.isError ? <p role="alert">{apiErrorMessage(save.error)}</p> : null}
      {save.isSuccess ? <p role="status">배송 설정을 저장했습니다.</p> : null}
      <Button type="submit" disabled={!valid || save.isPending}>{save.isPending ? "저장 중" : "배송 설정 저장"}</Button>
    </form>
  );
}
