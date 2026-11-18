import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateShippingAddressRequest } from "@/lib/api/checkout-contracts";
import { queryKeys } from "@/lib/query-keys";
import type { Address } from "@/lib/types";

export function useCreateShippingAddress(token: string, memberID: number | null) {
  const queryClient = useQueryClient();
  const addressKey = queryKeys.addresses(memberID);
  return useMutation({
    mutationFn: (address: CreateShippingAddressRequest) => api.createAddress(token, address),
    onSuccess: async (address) => {
      await queryClient.cancelQueries({ queryKey: addressKey, exact: true });
      queryClient.setQueryData<Address[]>(addressKey, (current) => [
        address,
        ...(current ?? []).filter((entry) => entry.id !== address.id)
          .map((entry) => address.is_default ? { ...entry, is_default: false } : entry),
      ]);
      void queryClient.invalidateQueries({ queryKey: addressKey, exact: true });
    },
  });
}
