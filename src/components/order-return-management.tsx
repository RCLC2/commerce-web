"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  returnsApi,
  emptyReturnAddress,
  returnAddressSchema,
  returnStatusLabels,
  type ReturnAddress,
  type ReturnRequest,
  type ReturnCollection,
  type ReturnMarket,
} from "@/lib/returns-api";
import { ApiError, apiErrorMessage } from "@/lib/api-client";
import {
  ReturnAddressFields,
  returnKeys,
  useReturnRefresh,
} from "./order-return-shared";
import { ReturnRequestSummary } from "./customer-order-returns";
import { ReturnCollectionWorkspace } from "./order-return-collection";
import { OrderRefundControls } from "./order-refund-controls";
import { Button } from "./ui/button";
import { Notice } from "./ui/notice";
import { Select } from "./ui/input";

export function OrderReturnManagement({
  token,
  orderCode,
  markets,
  role,
  pickupDefault,
}: {
  token: string;
  orderCode: string;
  markets: ReturnMarket[];
  role: "SELLER" | "ADMIN";
  pickupDefault?: Partial<ReturnAddress>;
}) {
  const requests = useQuery({
    queryKey: returnKeys.requests(token, orderCode),
    queryFn: () => returnsApi.requests(token, orderCode),
    refetchInterval: (q) =>
      q.state.data?.some((item) => item.status === "PROCESSING") ? 2000 : false,
  });
  const collections = useQuery({
    queryKey: returnKeys.collections(token, orderCode),
    queryFn: () => returnsApi.collections(token, orderCode),
  });
  const [selectedID, setSelectedID] = useState<number>();
  const visibleRequests =
    requests.data?.filter(
      (request) =>
        role === "ADMIN" ||
        markets.some((market) => market.id === request.market_id),
    ) ?? [];
  const selected =
    visibleRequests.find((item) => item.id === selectedID) ??
    visibleRequests[0];
  const connected = new Set(selected?.items.map((item) => item.id));
  const related =
    collections.data?.filter((collection) =>
      collection.items.some((item) => connected.has(item.refund_item_id)),
    ) ?? [];
  return (
    <section className="grid min-w-0 gap-5" aria-label="반품·수거·검수 관리">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">반품·수거·검수 관리</h3>
        <Button
          size="sm"
          variant="secondary"
          disabled={requests.isFetching || collections.isFetching}
          onClick={() => {
            void requests.refetch();
            void collections.refetch();
          }}
        >
          반품 상태 새로고침
        </Button>
      </div>
      <p className="text-sm leading-6 text-content-secondary">
        반품 신청 → 수거 → 입고 → 검수 → 관리자 환불 순서로 처리합니다. 재입고는
        검수 후 선택한 수량만 별도로 반영합니다. 구매확정 이후 상품은 환불
        대상이 아닙니다.
      </p>
      {requests.isPending || collections.isPending ? (
        <p role="status">반품 작업을 불러오는 중입니다.</p>
      ) : requests.isError || collections.isError ? (
        <Notice tone="error">
          {apiErrorMessage(requests.error ?? collections.error)}
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              void requests.refetch();
              void collections.refetch();
            }}
          >
            반품 작업 다시 불러오기
          </Button>
        </Notice>
      ) : (
        <>
          {!visibleRequests.length ? (
            <Notice>
              구매자가 신청한 반품이 없습니다. 구매자 주문 상세에서 상품과
              수량을 선택해 신청할 수 있습니다.
            </Notice>
          ) : null}
          {selected ? (
            <>
              <label className="grid gap-2 text-sm font-bold">
                처리할 반품 요청
                <Select
                  value={selected.id}
                  onChange={(event) =>
                    setSelectedID(Number(event.target.value))
                  }
                >
                  {visibleRequests.map((item) => (
                    <option key={item.id} value={item.id}>
                      요청 #{item.id} ·{" "}
                      {markets.find((m) => m.id === item.market_id)?.name ??
                        `마켓 ${item.market_id}`}{" "}
                      · {returnStatusLabels[item.status]}
                    </option>
                  ))}
                </Select>
              </label>
              <ReturnRequestSummary request={selected} markets={markets} />
              {selected.status === "REQUESTED" && related.length === 0 ? (
                <ReturnCollectionCreate
                  key={`create:${selected.id}`}
                  token={token}
                  code={orderCode}
                  selected={selected}
                  requests={visibleRequests}
                  collections={collections.data}
                  pickupDefault={pickupDefault}
                />
              ) : null}
              {related.map((collection) => (
                <ReturnCollectionWorkspace
                  key={`collection:${collection.id}:${collection.status}`}
                  token={token}
                  collection={collection}
                  requests={visibleRequests}
                  markets={markets}
                />
              ))}
              <OrderRefundControls
                key={`refund:${selected.id}`}
                token={token}
                request={selected}
                canExecute={role === "ADMIN"}
              />
            </>
          ) : null}
        </>
      )}
      {markets.map((market) => (
        <MarketReturnAddressEditor
          key={market.id}
          token={token}
          market={market}
        />
      ))}
    </section>
  );
}
function MarketReturnAddressEditor({
  token,
  market,
}: {
  token: string;
  market: ReturnMarket;
}) {
  const client = useQueryClient();
  const key = ["return-address", token, market.id];
  const query = useQuery({
    queryKey: key,
    queryFn: () => returnsApi.address(token, market.id),
    retry: false,
  });
  const missing = query.error instanceof ApiError && query.error.status === 404;
  return (
    <details className="rounded-control border border-border-subtle p-4">
      <summary className="cursor-pointer text-sm font-bold">
        {market.name} 기본 반품 도착지 {missing ? "등록 필요" : "설정"}
      </summary>
      <div className="mt-4 grid gap-3">
        {query.isPending ? (
          <p role="status">반품 도착지를 확인하는 중입니다.</p>
        ) : query.isError && !missing ? (
          <Notice tone="error">
            {apiErrorMessage(query.error)}
            <Button variant="secondary" onClick={() => void query.refetch()}>
              반품 도착지 다시 확인
            </Button>
          </Notice>
        ) : (
          <ReturnAddressEditor
            key={JSON.stringify(query.data)}
            initial={query.data ?? emptyReturnAddress()}
            onSave={async (address) => {
              await returnsApi.saveAddress(token, market.id, address);
              await client.invalidateQueries({ queryKey: key });
            }}
          />
        )}
        <p className="text-xs leading-5 text-content-secondary">
          마켓의 현재 설정입니다. 변경해도 이미 생성한 수거 건의 반품 도착지는
          바뀌지 않습니다.
        </p>
      </div>
    </details>
  );
}
function ReturnAddressEditor({
  initial,
  onSave,
}: {
  initial: ReturnAddress;
  onSave: (address: ReturnAddress) => Promise<void>;
}) {
  const [address, setAddress] = useState(initial);
  const save = useMutation({ mutationFn: () => onSave(address) });
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (returnAddressSchema.safeParse(address).success && !save.isPending)
          save.mutate();
      }}
    >
      <ReturnAddressFields
        label="기본 반품 도착지"
        value={address}
        onChange={setAddress}
        disabled={save.isPending}
      />
      {save.isError ? (
        <Notice tone="error">{apiErrorMessage(save.error)}</Notice>
      ) : null}
      {save.isSuccess ? (
        <Notice tone="success">반품 도착지를 저장했습니다.</Notice>
      ) : null}
      <Button
        type="submit"
        disabled={
          save.isPending || !returnAddressSchema.safeParse(address).success
        }
      >
        기본 반품 도착지 저장
      </Button>
    </form>
  );
}
function ReturnCollectionCreate({
  token,
  code,
  selected,
  requests,
  collections,
  pickupDefault,
}: {
  token: string;
  code: string;
  selected: ReturnRequest;
  requests: ReturnRequest[];
  collections: ReturnCollection[];
  pickupDefault?: Partial<ReturnAddress>;
}) {
  const address = useQuery({
    queryKey: ["return-address", token, selected.market_id],
    queryFn: () => returnsApi.address(token, selected.market_id),
    retry: false,
  });
  return (
    <section
      className="grid gap-3 rounded-control bg-surface-subtle p-4"
      aria-label="수거 묶음 만들기"
    >
      <h4 className="font-bold">수거 묶음 만들기</h4>
      {address.data ? (
        <CollectionCreateForm
          token={token}
          code={code}
          selected={selected}
          requests={requests}
          collections={collections}
          destination={address.data}
          pickupDefault={pickupDefault}
        />
      ) : address.isPending ? (
        <p role="status">기본 반품지를 확인하는 중입니다.</p>
      ) : (
        <Notice>
          아래 마켓 기본 반품 도착지를 먼저 등록해주세요. 조회에 실패했다면 다시
          확인해주세요.
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => void address.refetch()}
          >
            기본 반품지 다시 확인
          </Button>
        </Notice>
      )}
    </section>
  );
}
function CollectionCreateForm({
  token,
  code,
  selected,
  requests,
  collections,
  destination: initial,
  pickupDefault,
}: {
  token: string;
  code: string;
  selected: ReturnRequest;
  requests: ReturnRequest[];
  collections: ReturnCollection[];
  destination: ReturnAddress;
  pickupDefault?: Partial<ReturnAddress>;
}) {
  const refresh = useReturnRefresh();
  const [pickup, setPickup] = useState({
    ...emptyReturnAddress(),
    ...pickupDefault,
  });
  const [destination, setDestination] = useState(initial);
  const [ids, setIDs] = useState([selected.id]);
  const [existing, setExisting] = useState<number>();
  const assigned = new Set(
    collections.flatMap((c) => c.items.map((item) => item.refund_item_id)),
  );
  const candidates = requests.filter(
    (r) =>
      r.market_id === selected.market_id &&
      r.status === "REQUESTED" &&
      r.items.every((item) => !assigned.has(item.id)),
  );
  const create = useMutation({
    mutationFn: () =>
      returnsApi.collect(token, code, {
        market_id: selected.market_id,
        refund_ids: ids,
        pickup,
        destination,
        ...(existing ? { collection_id: existing } : {}),
      }),
    onSuccess: refresh,
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (ids.length && !create.isPending) create.mutate();
      }}
    >
      <fieldset disabled={create.isPending} className="grid gap-2">
        <legend className="mb-2 text-sm font-bold">
          같은 수거로 묶을 요청
        </legend>
        {candidates.map((request) => (
          <label key={request.id} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-action-primary"
              checked={ids.includes(request.id)}
              disabled={request.id === selected.id}
              onChange={(event) =>
                setIDs(
                  event.target.checked
                    ? [...ids, request.id]
                    : ids.filter((id) => id !== request.id),
                )
              }
            />
            반품 요청 #{request.id} ·{" "}
            {request.items.reduce((sum, item) => sum + item.quantity, 0)}개
          </label>
        ))}
      </fieldset>
      <label className="grid gap-2 text-sm font-bold">
        수거 묶음
        <Select
          value={existing ?? ""}
          disabled={create.isPending}
          onChange={(event) => {
            const id = Number(event.target.value);
            const collection = collections.find((c) => c.id === id);
            setExisting(collection?.id);
            if (collection) {
              setPickup(collection.pickup);
              setDestination(collection.destination);
            }
          }}
        >
          <option value="">새 수거 건 생성</option>
          {collections
            .filter(
              (c) => c.market_id === selected.market_id && c.status === "DRAFT",
            )
            .map((c) => (
              <option key={c.id} value={c.id}>
                수거 #{c.id}에 추가
              </option>
            ))}
        </Select>
      </label>
      <ReturnAddressFields
        label="고객 수거지"
        value={pickup}
        onChange={setPickup}
        disabled={create.isPending || Boolean(existing)}
      />
      <ReturnAddressFields
        label="이번 반품 도착지"
        value={destination}
        onChange={setDestination}
        disabled={create.isPending || Boolean(existing)}
      />
      <p className="text-xs leading-5 text-content-secondary">
        같은 주문·마켓·주소의 수거 준비 상태에서만 묶을 수 있습니다. 고객과 실제
        수거지를 확인해주세요.
      </p>
      {create.isError ? (
        <Notice tone="error">{apiErrorMessage(create.error)}</Notice>
      ) : null}
      <Button
        type="submit"
        disabled={
          create.isPending ||
          !ids.length ||
          !returnAddressSchema.safeParse(pickup).success ||
          !returnAddressSchema.safeParse(destination).success
        }
      >
        수거 묶음 저장
      </Button>
    </form>
  );
}
