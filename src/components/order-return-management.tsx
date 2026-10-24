"use client";

import { useId, useRef, useState, type Ref } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import {
  returnsApi,
  emptyReturnAddress,
  returnAddressSchema,
  returnStatusLabels,
  returnInspectionProgress,
  type ReturnAddress,
  type ReturnRequest,
  type ReturnCollection,
  type ReturnMarket,
} from "@/lib/returns-api";
import { apiErrorMessage } from "@/lib/api-client";
import {
  ReturnAddressDetails,
  returnKeys,
  useReturnRefresh,
} from "./order-return-shared";
import { ReturnRequestSummary } from "./customer-order-returns";
import { ReturnCollectionWorkspace } from "./order-return-collection";
import { OrderRefundControls } from "./order-refund-controls";
import { Button } from "./ui/button";
import { Notice } from "./ui/notice";
import { Select } from "./ui/input";
import { SavedReturnAddressSelect } from "./saved-return-address-select";

function moveToReturnSection(section: HTMLElement | null | undefined) {
  if (!section) return;
  section.focus({ preventScroll: true });
  section.scrollIntoView({
    block: "start",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}

function samePickupAddress(left?: ReturnAddress | null, right?: ReturnAddress | null) {
  if (!left || !right) return left === right;
  return (["recipient_name", "phone", "postal_code", "address", "address_detail"] as const)
    .every((field) => left[field] === right[field]);
}

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
  const refresh = useReturnRefresh();
  const refreshAll = useMutation({ mutationFn: refresh });
  const refundSection = useRef<HTMLElement>(null);
  const collectionSection = useRef<HTMLElement>(null);
  const workspaceSection = useRef<HTMLElement>(null);
  const addressEditors = useRef(new Map<number, HTMLDetailsElement>());
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
  const inspectionProgress = returnInspectionProgress(visibleRequests, related);
  const pendingRefundItems = new Set(
    visibleRequests
      .filter((request) => request.status !== "WITHDRAWN")
      .flatMap((request) => request.items)
      .filter((item) => item.responsibility === "UNDETERMINED")
      .map((item) => item.id),
  );
  const nextInspectionCollection = related.find(
    (collection) =>
      collection.status === "RECEIVED" &&
      collection.items.some((item) =>
        pendingRefundItems.has(item.refund_item_id),
      ),
  );
  const nextInspectionItem = nextInspectionCollection?.items.find((item) =>
    pendingRefundItems.has(item.refund_item_id),
  );
  const registerAddress = (marketID: number) => {
    const editor = addressEditors.current.get(marketID);
    if (!editor) return;
    editor.open = true;
    editor.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    editor
      .querySelector<HTMLInputElement>("input:not(:disabled)")
      ?.focus({ preventScroll: true });
  };
  return (
    <section
      ref={workspaceSection}
      className="grid min-w-0 gap-5"
      aria-label="반품·수거·검수 관리"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">반품·수거·검수 관리</h3>
        <Button
          size="sm"
          variant="secondary"
          disabled={
            refreshAll.isPending ||
            requests.isFetching ||
            collections.isFetching
          }
          onClick={() => refreshAll.mutate()}
        >
          {refreshAll.isPending ? "최신 상태 확인 중" : "반품 상태 새로고침"}
        </Button>
      </div>
      <p className="text-sm leading-6 text-content-secondary">
        반품 신청 → 수거 → 입고 → 검수 → 관리자 환불 순서로 처리합니다. 재입고는
        검수 후 선택한 수량만 별도로 반영합니다. 구매확정한 상품은 반품을 신청할 수 없습니다.
      </p>
      {requests.isPending || collections.isPending ? (
        <p role="status">반품 작업을 불러오는 중입니다.</p>
      ) : requests.isError || collections.isError ? (
        <Notice tone="error">
          {apiErrorMessage(requests.error ?? collections.error)}
          <Button
            variant="secondary"
            className="mt-3"
            disabled={refreshAll.isPending}
            onClick={() => refreshAll.mutate()}
          >
            반품 작업 다시 불러오기
          </Button>
        </Notice>
      ) : (
        <>
          {!visibleRequests.length ? (
            <Notice>
              아직 접수된 반품이 없습니다.
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
              <ReturnNextAction
                request={selected}
                collections={related}
                role={role}
                inspectionProgress={inspectionProgress}
                onViewRefund={() => moveToReturnSection(refundSection.current)}
                onViewInspection={
                  nextInspectionItem
                    ? () => {
                        const workspace = workspaceSection.current;
                        moveToReturnSection(
                          workspace?.querySelector<HTMLElement>(
                            `[data-return-inspection-item="${nextInspectionItem.id}"]`,
                          ) ??
                            workspace?.querySelector<HTMLElement>(
                              `[data-return-collection="${nextInspectionCollection?.id}"]`,
                            ),
                        );
                      }
                    : undefined
                }
              />
              {selected.status === "REQUESTED" && related.length === 0 ? (
                <ReturnCollectionCreate
                  key={`create:${selected.id}`}
                  token={token}
                  code={orderCode}
                  selected={selected}
                  requests={visibleRequests}
                  collections={collections.data}
                  pickupDefault={pickupDefault}
                  sectionRef={collectionSection}
                  onRegisterAddress={() => registerAddress(selected.market_id)}
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
                markets={markets}
                canExecute={role === "ADMIN"}
                sectionRef={refundSection}
                inspectionReady={inspectionProgress.ready}
                previousShippingRefundAmount={visibleRequests
                  .filter((request) => request.id !== selected.id && request.market_id === selected.market_id && request.status === "COMPLETED")
                  .reduce((sum, request) => sum + request.shipping_refund_amount, 0)}
              />
            </>
          ) : null}
        </>
      )}
      {markets.map((market) => (
        <MarketReturnAddressEditor
          key={market.id}
          token={token}
          role={role}
          market={market}
          onContinue={
            selected?.market_id === market.id &&
            selected.status === "REQUESTED" &&
            related.length === 0
              ? () => moveToReturnSection(collectionSection.current)
              : undefined
          }
          editorRef={(element) => {
            if (element) addressEditors.current.set(market.id, element);
            else addressEditors.current.delete(market.id);
          }}
        />
      ))}
    </section>
  );
}
function ReturnNextAction({
  request,
  collections,
  role,
  onViewRefund,
  inspectionProgress,
  onViewInspection,
}: {
  request: ReturnRequest;
  collections: ReturnCollection[];
  role: "SELLER" | "ADMIN";
  onViewRefund: () => void;
  inspectionProgress: ReturnType<typeof returnInspectionProgress>;
  onViewInspection?: () => void;
}) {
  let title: string;
  let description: string;
  const unfinished = collections.find((item) => item.status !== "RECEIVED");
  if (request.status === "COMPLETED") {
    title = "환불 완료";
    description = "완료된 수거·검수 내역은 요약을 펼쳐 확인할 수 있습니다.";
  } else if (request.status === "PROCESSING") {
    title = "환불 처리 중";
    description =
      "환불이 완료되면 상태가 자동으로 바뀝니다. 다시 요청하지 않아도 됩니다.";
  } else if (request.status === "WITHDRAWN" || request.status === "LEGACY") {
    return null;
  } else if (!collections.length) {
    title = "다음 작업 · 수거 준비";
    description =
      "고객 수거지와 반품 도착지를 확인하고 수거 건을 저장해주세요.";
  } else if (unfinished?.status === "DRAFT") {
    title = "다음 작업 · 수거 접수";
    description = "실제 접수한 택배사와 송장번호를 저장해주세요.";
  } else if (unfinished?.status === "REQUESTED") {
    title = "다음 작업 · 수거 완료 확인";
    description = "택배사가 상품을 수거한 뒤 완료를 확인해주세요.";
  } else if (unfinished?.status === "COLLECTED") {
    title = "다음 작업 · 반품 입고 확인";
    description = "반품 상품이 도착하면 입고를 확인해주세요.";
  } else if (!inspectionProgress.ready) {
    title = "다음 작업 · 상품 검수";
    description = `검수 ${inspectionProgress.completed}/${inspectionProgress.total} 완료 · 남은 상품의 수령·환불 승인·재판매 가능 수량을 확인해주세요.`;
  } else {
    title =
      role === "ADMIN" ? "다음 작업 · 환불 금액 확인" : "관리자 환불 대기";
    description =
      "검수가 완료되었습니다. 재입고는 선택한 수량만 별도로 처리하고, 환불은 관리자가 금액을 확인한 뒤 실행합니다.";
  }
  return (
    <Notice
      tone={request.status === "COMPLETED" ? "success" : "info"}
      title={title}
    >
      <p>{description}</p>
      {!inspectionProgress.ready &&
      !unfinished &&
      onViewInspection &&
      ["REQUESTED", "INSPECTED"].includes(request.status) ? (
        <Button
          className="mt-3"
          size="sm"
          variant="secondary"
          onClick={onViewInspection}
        >
          다음 미검수 상품으로 이동
        </Button>
      ) : null}
      {request.status === "INSPECTED" &&
      collections.length > 0 &&
      !unfinished &&
      inspectionProgress.ready ? (
        <Button
          className="mt-3"
          size="sm"
          variant="secondary"
          onClick={onViewRefund}
        >
          환불 금액으로 이동
        </Button>
      ) : null}
    </Notice>
  );
}
function MarketReturnAddressEditor({
  token,
  role,
  market,
  editorRef,
  onContinue,
}: {
  token: string;
  role: "SELLER" | "ADMIN";
  market: ReturnMarket;
  editorRef: (element: HTMLDetailsElement | null) => void;
  onContinue?: () => void;
}) {
  const client = useQueryClient();
  const details = useRef<HTMLDetailsElement>(null);
  const [saved, setSaved] = useState(false);
  const key = ["return-address", token, market.id];
  const query = useQuery({
    queryKey: key,
    queryFn: () => returnsApi.address(token, market.id),
    retry: false,
  });
  const missing = query.isSuccess && query.data === null;
  const save = useMutation({
    mutationFn: async (address: ReturnAddress) => {
      await returnsApi.saveAddress(token, market.id, address);
      client.setQueryData(key, address);
      await client.invalidateQueries({ queryKey: key });
    },
    onSuccess: () => {
      setSaved(true);
      if (details.current) {
        details.current.open = false;
        details.current.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
      }
    },
  });
  return (
    <div className="grid gap-3">
      <details
        ref={(element) => {
          details.current = element;
          editorRef(element);
        }}
        className="scroll-mt-4 rounded-control border border-border-subtle p-4"
        onToggle={(event) => {
          if (event.currentTarget.open) {
            event.currentTarget.scrollIntoView?.({ block: "start", behavior: "instant" });
          }
        }}
      >
        <summary className="cursor-pointer text-sm font-bold">
          <span>
            {market.name} 기본 반품 도착지 {missing ? "등록 필요" : "설정"}
          </span>
          {query.data ? (
            <span className="mt-2 block break-words text-sm font-normal text-content-secondary">
              {query.data.recipient_name} · {query.data.address}{" "}
              {query.data.address_detail}
            </span>
          ) : null}
          {saved && !save.isPending ? (
            <span
              role="status"
              className="mt-2 block text-sm font-normal text-status-positive"
            >
              반품 도착지를 저장했습니다.
            </span>
          ) : null}
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
              addressBookToken={role === "SELLER" ? token : undefined}
              initial={query.data ?? emptyReturnAddress()}
              onSave={save.mutate}
              saving={save.isPending}
              error={save.error}
            />
          )}
          <p className="text-xs leading-5 text-content-secondary">
            마켓의 현재 설정입니다. 변경해도 이미 생성한 수거 건의 반품 도착지는
            바뀌지 않습니다.
          </p>
        </div>
      </details>
      {saved && onContinue ? (
        <Button
          className="justify-self-start"
          variant="secondary"
          onClick={onContinue}
        >
          수거 준비로 이동
        </Button>
      ) : null}
    </div>
  );
}
function ReturnAddressEditor({
  addressBookToken,
  initial,
  onSave,
  saving,
  error,
}: {
  addressBookToken?: string;
  initial: ReturnAddress;
  onSave: (address: ReturnAddress) => void;
  saving: boolean;
  error: unknown;
}) {
  const [address, setAddress] = useState(initial);
  const [editingAddress, setEditingAddress] = useState(!returnAddressSchema.safeParse(initial).success);
  const [touched, setTouched] = useState<Partial<Record<keyof ReturnAddress, boolean>>>({});
  const saveActions = useRef<HTMLDivElement>(null);
  const guidanceID = useId();
  const validation = returnAddressSchema.safeParse(address);
  const errors = validation.error?.flatten().fieldErrors;
  const visibleErrors: Partial<Record<keyof ReturnAddress, string>> = {};
  for (const field of ["recipient_name", "phone", "postal_code", "address", "address_detail"] as const) {
    if (touched[field]) visibleErrors[field] = errors?.[field]?.[0];
  }
  return (
    <form
      className="relative grid gap-3"
      aria-busy={saving}
      onFocusCapture={(event) => {
        const input = event.target;
        if (input instanceof HTMLInputElement && saveActions.current &&
          input.getBoundingClientRect().bottom > saveActions.current.getBoundingClientRect().top) {
          input.scrollIntoView({ block: "center", behavior: "instant" });
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (returnAddressSchema.safeParse(address).success && !saving)
          onSave(address);
      }}
    >
      {addressBookToken ? <SavedReturnAddressSelect token={addressBookToken} value={address} disabled={saving} onChange={(value) => {
        setAddress(value);
        setEditingAddress(!returnAddressSchema.safeParse(value).success);
        setTouched({});
      }} /> : null}
      <ReturnAddressDetails
        editing={editingAddress}
        onEdit={() => setEditingAddress(true)}
        onDone={() => setEditingAddress(false)}
        label="기본 반품 도착지"
        value={address}
        onChange={setAddress}
        disabled={saving}
        errors={visibleErrors}
        onBlur={(field) => setTouched((current) => ({ ...current, [field]: true }))}
      />
      <div
        ref={saveActions}
        role="group"
        aria-label="반품 도착지 저장"
        className="sticky bottom-0 z-10 grid gap-2 border-t border-border-subtle bg-surface-raised py-3"
      >
        {error ? <Notice tone="error">{apiErrorMessage(error)}</Notice> : null}
        <p id={guidanceID} role="status" aria-live="polite" className="text-sm text-content-secondary">
          {saving
            ? "반품 도착지를 저장하고 있습니다. 잠시만 기다려주세요."
            : validation.success
              ? "입력 내용을 확인한 후 저장해주세요."
              : validation.error.issues[0].message}
        </p>
        <Button type="submit" aria-describedby={guidanceID} disabled={saving || !validation.success}>
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              저장 내용 확인 중…
            </span>
          ) : "기본 반품 도착지 저장"}
        </Button>
      </div>
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
  onRegisterAddress,
  sectionRef,
}: {
  token: string;
  code: string;
  selected: ReturnRequest;
  requests: ReturnRequest[];
  collections: ReturnCollection[];
  pickupDefault?: Partial<ReturnAddress>;
  onRegisterAddress: () => void;
  sectionRef: Ref<HTMLElement>;
}) {
  const address = useQuery({
    queryKey: ["return-address", token, selected.market_id],
    queryFn: () => returnsApi.address(token, selected.market_id),
    retry: false,
  });
  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      className="scroll-mt-4 grid gap-3 rounded-control bg-surface-subtle p-4"
      aria-label="수거 준비"
    >
      <h4 className="font-bold">수거 준비</h4>
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
      ) : address.isSuccess && address.data === null ? (
        <Notice>
          <div className="grid justify-items-start gap-3">
            <p>
              수거 건을 만들려면 마켓의 기본 반품 도착지를 먼저 등록해주세요.
            </p>
            <Button onClick={onRegisterAddress}>반품지 등록하기</Button>
          </div>
        </Notice>
      ) : (
        <Notice tone="error">
          {apiErrorMessage(address.error)}
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
    ...selected.pickup,
  });
  const [destination, setDestination] = useState(initial);
  const [editingPickup, setEditingPickup] = useState(!returnAddressSchema.safeParse(pickup).success);
  const [editingDestination, setEditingDestination] = useState(!returnAddressSchema.safeParse(initial).success);
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
          함께 수거할 반품
        </legend>
        {candidates.map((request) => (
          <label key={request.id} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-action-primary"
              checked={ids.includes(request.id)}
              disabled={request.id === selected.id || Boolean(request.pickup && !samePickupAddress(request.pickup, selected.pickup))}
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
            {request.pickup && !samePickupAddress(request.pickup, selected.pickup) ? " · 수거지가 달라 따로 접수해주세요" : ""}
          </label>
        ))}
      </fieldset>
      <label className="grid gap-2 text-sm font-bold">
        수거 건
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
              (c) => c.market_id === selected.market_id && c.status === "DRAFT" &&
              (!selected.pickup || samePickupAddress(c.pickup, selected.pickup)),
            )
            .map((c) => (
              <option key={c.id} value={c.id}>
                수거 #{c.id}에 추가
              </option>
            ))}
        </Select>
      </label>
      <ReturnAddressDetails
        editing={editingPickup}
        onEdit={() => setEditingPickup(true)}
        onDone={() => setEditingPickup(false)}
        label="고객 수거지"
        value={pickup}
        onChange={setPickup}
        disabled={create.isPending || Boolean(existing)}
      />
      <ReturnAddressDetails
        editing={editingDestination}
        onEdit={() => setEditingDestination(true)}
        onDone={() => setEditingDestination(false)}
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
        수거 정보 저장
      </Button>
    </form>
  );
}
