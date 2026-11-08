"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { emptyReturnAddress, type ReturnAddress } from "@/lib/returns-api";
import { Button } from "./ui/button";
import { Select } from "./ui/input";
import { Notice } from "./ui/notice";

export function SavedReturnAddressSelect({ token, value, onChange, disabled }: {
  token: string;
  value: ReturnAddress;
  onChange: (address: ReturnAddress) => void;
  disabled: boolean;
}) {
  const addresses = useQuery({
    queryKey: ["return-address-book", token],
    queryFn: () => api.listAddresses(token),
  });
  const choices = (addresses.data ?? []).map((address) => ({
    id: address.id,
    isDefault: address.is_default,
    address: {
      recipient_name: address.receiver, phone: address.phone,
      postal_code: address.zip_code, address: address.line1,
      address_detail: address.line2,
    },
  }));
  const selected = choices.find((choice) =>
    (Object.keys(value) as (keyof ReturnAddress)[]).every((field) => choice.address[field] === value[field]),
  );
  return (
    <div className="grid gap-2">
      {addresses.isPending ? <p role="status" className="text-sm">주소록을 불러오는 중입니다.</p> : null}
      {addresses.isError ? (
        <Notice tone="warning">
          주소록을 불러오지 못했습니다. 직접 입력하거나 다시 시도해주세요.
          <Button className="mt-2" size="sm" variant="secondary" disabled={disabled || addresses.isFetching} onClick={() => void addresses.refetch()}>주소록 다시 불러오기</Button>
        </Notice>
      ) : null}
      <label className="grid gap-2 text-sm font-medium">
        내 주소록에서 선택
        <Select value={selected?.id ?? "manual"} disabled={disabled} onChange={(event) => {
          const choice = choices.find((address) => address.id === Number(event.target.value));
          onChange(choice?.address ?? emptyReturnAddress());
        }}>
          <option value="manual">직접 입력</option>
          {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.isDefault ? "[기본] " : ""}{choice.address.recipient_name} · {choice.address.address} {choice.address.address_detail}</option>)}
        </Select>
      </label>
      {addresses.isSuccess && choices.length === 0 ? <p className="text-sm text-content-secondary">저장된 주소가 없습니다. 아래에 반품 도착지를 입력해주세요.</p> : null}
    </div>
  );
}
