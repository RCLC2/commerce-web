import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import type { OrderShippingAddressInput } from "@/lib/api/checkout-contracts";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Address } from "@/lib/types";
import { CheckoutAddressForm } from "./checkout-address-form";
import { Button } from "./ui/button";

export function SavedAddressEditor({ address, token, memberID, onCancel, onSaved }: {
  address: Address;
  token: string;
  memberID: number | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const addressQueryKey = queryKeys.addresses(memberID);
  const save = useMutation({
    retry: false,
    mutationFn: async (input?: OrderShippingAddressInput) => {
      if (input) {
        await api.updateAddress(token, address.id, input);
        setSaved(true);
      }
      // Discard reads started before the write and fetch the server-normalized address.
      await queryClient.cancelQueries({ queryKey: addressQueryKey, exact: true });
      await queryClient.invalidateQueries({ queryKey: addressQueryKey, exact: true, refetchType: "none" });
      const addresses = await queryClient.fetchQuery({
        queryKey: addressQueryKey,
        queryFn: () => api.listAddresses(token),
        retry: false,
      });
      if (!addresses.some((entry) => entry.id === address.id)) {
        throw new Error("수정한 배송지를 조회할 수 없습니다.");
      }
      await queryClient.invalidateQueries({ queryKey: ["checkout-quote", memberID] });
    },
  });

  if (saved) {
    return save.isError ? (
      <div className="mt-4 text-sm">
        <p role="alert">배송지는 저장됐지만 목록을 갱신하지 못했습니다.</p>
        <Button className="mt-2" type="button" size="sm" variant="secondary" onClick={() => save.mutate(undefined, { onSuccess: onSaved })}>
          배송지 다시 불러오기
        </Button>
      </div>
    ) : <p className="mt-4 text-sm" role="status">저장한 배송지를 불러오는 중입니다.</p>;
  }

  return (
    <CheckoutAddressForm
      initialAddress={address}
      onSave={(input) => save.mutate(input, { onSuccess: onSaved })}
      onCancel={onCancel}
      pending={save.isPending}
      error={save.isError ? apiErrorMessage(save.error) : undefined}
    />
  );
}
