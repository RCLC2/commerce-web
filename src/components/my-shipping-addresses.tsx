import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Address } from "@/lib/types";
import { SavedAddressEditor } from "./saved-address-editor";
import { Button } from "./ui/button";
import { InlineLoadingState } from "./ui/feedback";
import { Surface } from "./ui/surface";

export function MyShippingAddresses({ token, memberID }: { token: string; memberID: number | null }) {
  const panelID = useId();
  const [open, setOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address>();
  const addresses = useQuery({
    queryKey: queryKeys.addresses(memberID),
    queryFn: () => api.listAddresses(token),
    enabled: open,
  });

  return (
    <Surface className="mt-4" padding="sm">
      <Button type="button" variant="secondary" aria-expanded={open} aria-controls={panelID} disabled={Boolean(editingAddress)} onClick={() => setOpen(!open)}>
        배송지 관리
      </Button>
      <div id={panelID} hidden={!open}>
        {open && (editingAddress ? (
          <SavedAddressEditor
            key={editingAddress.id}
            address={editingAddress}
            token={token}
            memberID={memberID}
            onCancel={() => setEditingAddress(undefined)}
            onSaved={() => setEditingAddress(undefined)}
          />
        ) : (
          <div className="mt-3">
            {addresses.isPending ? <InlineLoadingState label="배송지를 불러오는 중입니다." /> : null}
            {addresses.isError ? (
              <div className="text-sm">
                <p role="alert">배송지를 불러오지 못했습니다.</p>
                <Button className="mt-2" type="button" size="sm" variant="secondary" onClick={() => void addresses.refetch()}>다시 시도</Button>
              </div>
            ) : null}
            {addresses.isSuccess && addresses.data.length === 0 ? <p className="text-sm text-content-secondary">등록된 배송지가 없습니다.</p> : null}
            {addresses.isSuccess && addresses.data.length > 0 ? (
              <ul className="divide-y divide-border-subtle">
                {addresses.data.map((address) => (
                  <li key={address.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0 break-words">
                      <p className="font-bold">{address.receiver} / {address.phone}</p>
                      <p className="text-content-secondary">({address.zip_code}) {address.line1} {address.line2}</p>
                      {address.is_default ? <p className="font-bold text-action-primary">기본 배송지</p> : null}
                    </div>
                    <Button type="button" size="sm" variant="secondary" aria-label={`${address.receiver} ${address.line1} ${address.line2} 배송지 수정`} onClick={() => setEditingAddress(address)}>
                      수정
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </Surface>
  );
}
