import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { useCreateShippingAddress } from "@/lib/queries/shipping-addresses";
import { queryKeys } from "@/lib/query-keys";
import type { Address } from "@/lib/types";
import { CheckoutAddressForm } from "./checkout-address-form";
import { SavedAddressEditor } from "./saved-address-editor";
import { Button } from "./ui/button";
import { InlineLoadingState } from "./ui/feedback";
import { Dialog } from "./ui/overlay";
import { Surface } from "./ui/surface";

export function MyShippingAddresses({ token, memberID }: { token: string; memberID: number | null }) {
  const headingID = useId();
  const addressKey = queryKeys.addresses(memberID);
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number>();
  const [deleting, setDeleting] = useState<Address>();
  const addresses = useQuery({
    queryKey: addressKey,
    queryFn: () => api.listAddresses(token),
  });
  const createAddress = useCreateShippingAddress(token, memberID);
  const deleteAddress = useMutation({
    mutationFn: (id: number) => api.deleteAddress(token, id),
    onSuccess: async (_response, id) => {
      await queryClient.cancelQueries({ queryKey: addressKey, exact: true });
      queryClient.setQueryData<Address[]>(addressKey, (current) => current?.filter((address) => address.id !== id));
      setDeleting(undefined);
      void queryClient.invalidateQueries({ queryKey: addressKey, exact: true });
    },
  });
  const formOpen = adding || addresses.data?.some((address) => address.id === editing) === true;

  return (
    <Surface className="mt-5" padding="sm">
      <section aria-labelledby={headingID}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={headingID} className="text-lg font-bold">배송지 관리</h2>
          <Button size="sm" variant="secondary" disabled={formOpen || !addresses.isSuccess} onClick={() => {
            createAddress.reset();
            setAdding(true);
          }}>
            <Plus className="size-4" aria-hidden="true" />
            배송지 추가
          </Button>
        </div>

        {addresses.isPending ? <InlineLoadingState className="mt-3" label="배송지를 불러오는 중입니다." /> : null}
        {addresses.isError && !formOpen ? (
          <div className="mt-3 text-sm">
            <p role="alert">배송지를 불러오지 못했습니다.</p>
            <Button className="mt-2" size="sm" variant="secondary" onClick={() => void addresses.refetch()}>다시 시도</Button>
          </div>
        ) : null}
        {addresses.isSuccess && !addresses.data.length && !adding ? (
          <p className="mt-3 text-sm text-content-secondary">등록된 배송지가 없습니다.</p>
        ) : null}

        {adding ? (
          <CheckoutAddressForm
            firstAddress={!addresses.data?.length}
            submitLabel="배송지 저장"
            onSave={(address) => createAddress.mutate(address, { onSuccess: () => setAdding(false) })}
            onCancel={() => setAdding(false)}
            pending={createAddress.isPending}
            error={createAddress.isError ? apiErrorMessage(createAddress.error) : undefined}
          />
        ) : null}

        {addresses.data?.length ? (
          <ul className="mt-2 divide-y divide-border-subtle">
            {addresses.data.map((address) => (
              <li key={address.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 basis-44 break-words">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{address.receiver} / {address.phone}</p>
                      {address.is_default ? <span className="rounded-full bg-action-secondary px-2 py-0.5 text-xs font-bold text-action-primary">기본 배송지</span> : null}
                    </div>
                    <p className="text-content-secondary">({address.zip_code}) {address.line1} {address.line2}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" disabled={formOpen} aria-label={`${address.receiver} ${address.line1} ${address.line2} 배송지 수정`} onClick={() => setEditing(address.id)}>
                      수정
                    </Button>
                    <Button size="sm" variant="ghost" disabled={formOpen} aria-label={`${address.receiver} ${address.line1} ${address.line2} 배송지 삭제`} onClick={() => {
                      deleteAddress.reset();
                      setDeleting(address);
                    }}>
                      삭제
                    </Button>
                  </div>
                </div>
                {editing === address.id ? (
                  <SavedAddressEditor
                    address={address}
                    token={token}
                    memberID={memberID}
                    onCancel={() => setEditing(undefined)}
                    onSaved={() => setEditing(undefined)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {deleting ? (
          <Dialog open onClose={() => {
            if (!deleteAddress.isPending) setDeleting(undefined);
          }} title="배송지를 삭제할까요?" description={`(${deleting.zip_code}) ${deleting.line1} ${deleting.line2}`}>
            {deleting.is_default && (addresses.data?.length ?? 0) > 1 ? (
              <p className="mb-3 text-sm text-content-secondary">삭제하면 가장 최근에 추가한 배송지가 기본 배송지로 지정됩니다.</p>
            ) : null}
            {deleteAddress.isError ? <p className="mb-3 text-sm text-status-negative" role="alert">{apiErrorMessage(deleteAddress.error)}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={deleteAddress.isPending} onClick={() => setDeleting(undefined)}>취소</Button>
              <Button variant="danger" disabled={deleteAddress.isPending} onClick={() => deleteAddress.mutate(deleting.id)}>
                {deleteAddress.isPending ? "삭제 중" : "배송지 삭제"}
              </Button>
            </div>
          </Dialog>
        ) : null}
      </section>
    </Surface>
  );
}
