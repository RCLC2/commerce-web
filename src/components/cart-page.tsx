"use client";

import { PageHeading } from "./ui/page-heading";
import { ShoppingBag as PageIcon } from "lucide-react";

import { ButtonLink } from "@/components/ui/button-link";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { groupCartItemsForDisplay, selectedCartItemIDsForGroups } from "@/lib/cart-display";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";
import { EmptyState, LoadingState } from "./ui/feedback";
import { Notice } from "./ui/notice";
import { OrderSummary } from "./ui/order-summary";
import { QuantityStepper } from "./ui/quantity-stepper";
import { CartOptionEditor, availableCartQuantity } from "./cart-option-editor";
import type { CartDisplayGroup } from "@/lib/cart-display";
import type { CartItem } from "@/lib/types";

export function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const effectiveToken = token ?? "";
  const [selectedIDs, setSelectedIDs] = useState<Set<number>>(new Set());
  const initializedSelection = useRef(false);
  const cart = useQuery({
    queryKey: queryKeys.cart(memberID),
    queryFn: () => api.listCart(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const productIDs = [...new Set((cart.data ?? []).map((item) => item.product_id))];
  const products = useQueries({
    queries: productIDs.map((id) => ({
      queryKey: queryKeys.product(id),
      queryFn: () => api.getProduct(id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const productByID = new Map(products.flatMap((query, index) =>
    query.data ? [[productIDs[index], query.data] as const] : []));
  const items = (cart.data ?? []).map((item) => ({ ...item, product: productByID.get(item.product_id) }));
  const displayGroups = groupCartItemsForDisplay(items);
  const selectedItems = items.filter((item) => selectedIDs.has(item.id));
  const selectedGroupKeys = new Set(displayGroups
    .filter((group) => group.cartItemIDs.every((id) => selectedIDs.has(id)))
    .map((group) => group.key));
  const selectedGroups = displayGroups.filter((group) => selectedGroupKeys.has(group.key));
  const selectedQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = selectedItems.reduce((sum, item) => sum + item.price_at_added * item.quantity, 0);
  const productError = products.some((query) => query.isError);
  const allSelected = displayGroups.length > 0 && selectedGroups.length === displayGroups.length;

  useEffect(() => {
    if (!cart.data || initializedSelection.current) return;
    initializedSelection.current = true;
    setSelectedIDs(new Set(cart.data.map((item) => item.id)));
  }, [cart.data]);

  const updateCart = useMutation({
    mutationFn: ({ group, optionID, quantity }: { group: CartDisplayGroup; optionID: number; quantity: number }) => api.updateCartItems(effectiveToken, { cart_item_ids: group.cartItemIDs, option_id: optionID, quantity }),
    onSuccess: (updated, { group }) => {
      const current = queryClient.getQueryData<CartItem[]>(queryKeys.cart(memberID)) ?? [];
      const next = current.filter((item) => !group.cartItemIDs.includes(item.id)).concat(updated);
      queryClient.setQueryData(queryKeys.cart(memberID), next);
      setSelectedIDs((selected) => {
        const keepSelected = group.cartItemIDs.every((id) => selected.has(id));
        const result = new Set([...selected].filter((id) => !group.cartItemIDs.includes(id)));
        for (const item of next) {
          if (item.product_id === updated.product_id && item.option_id === updated.option_id) {
            if (keepSelected) result.add(item.id); else result.delete(item.id);
          }
        }
        return result;
      });
      setEditingKey(null);
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(memberID) });
    },
    onError: () => { void queryClient.invalidateQueries({ queryKey: queryKeys.cart(memberID) }); },
  });
  const editingGroup = displayGroups.find((group) => group.key === editingKey);
  const editingProduct = editingGroup ? productByID.get(editingGroup.product_id) : undefined;

  function saveGroup(group: CartDisplayGroup, optionID: number, quantity: number) {
    if (updateCart.isPending) return;
    setSaved(false);
    updateCart.mutate({ group, optionID, quantity });
  }

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-bold">로그인이 필요합니다</h1><ButtonLink href="/login" className="mt-5">로그인하기</ButtonLink></main>;
  }

  function toggleGroup(cartItemIDs: readonly number[]) {
    setSelectedIDs((current) => {
      const next = new Set(current);
      const selected = cartItemIDs.every((id) => current.has(id));
      for (const id of cartItemIDs) {
        if (selected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelectedIDs(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  function goToCheckout() {
    const ids = selectedCartItemIDsForGroups(displayGroups, selectedGroupKeys).join(",");
    router.push(`/checkout?cartItemIDs=${encodeURIComponent(ids)}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-32 pt-8">
      <div className="flex items-end justify-between gap-4">
        <PageHeading icon={<PageIcon />} title="장바구니" description="상품의 옵션과 수량을 확인하고 주문하세요." />
        {displayGroups.length ? <p className="shrink-0 whitespace-nowrap text-xs font-bold text-content-secondary">{selectedGroups.length}/{displayGroups.length}개 선택</p> : null}
      </div>
      {saved ? <Notice className="mt-4" tone="success">장바구니를 변경했습니다.</Notice> : null}
      {updateCart.error && !editingGroup ? <Notice className="mt-4" tone="error" title="장바구니를 변경하지 못했습니다">{apiErrorMessage(updateCart.error)}<Button variant="secondary" size="sm" className="ml-2" onClick={() => { updateCart.reset(); void cart.refetch(); }}>목록 새로고침</Button></Notice> : null}
      {editingGroup && editingProduct ? <CartOptionEditor key={editingGroup.key} group={editingGroup} product={editingProduct} groups={displayGroups} pending={updateCart.isPending} error={updateCart.error ? apiErrorMessage(updateCart.error) : undefined} onClose={() => { setEditingKey(null); updateCart.reset(); }} onSave={(optionID, quantity) => saveGroup(editingGroup, optionID, quantity)} /> : null}
      <div className="mt-7 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          {displayGroups.length ? <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-action-primary" checked={allSelected} onChange={toggleAll} />전체 선택</label> : null}
          <div className="space-y-3">
          {cart.isLoading ? <LoadingState label="장바구니를 불러오는 중입니다." /> : null}
          {cart.isError ? (
            <Notice tone="error" title={apiErrorMessage(cart.error)}>
              <Button className="mt-3" size="sm" variant="secondary" onClick={() => void cart.refetch()}>다시 시도</Button>
            </Notice>
          ) : null}
          {productError ? <Notice tone="warning">일부 상품의 현재 정보는 불러오지 못했습니다. 장바구니에 담긴 가격과 수량은 그대로 표시합니다.</Notice> : null}
          {cart.isSuccess && !displayGroups.length ? <EmptyState icon={<ShoppingBag className="size-7" />} title="장바구니가 비어 있습니다" description="마음에 드는 상품을 담아보세요." action={<ButtonLink href="/products" >상품 둘러보기</ButtonLink>} /> : null}
          {displayGroups.map((group) => {
            const item = group.items[0];
            const option = item.product?.options?.find((candidate) => candidate.id === group.option_id);
            const selected = selectedGroupKeys.has(group.key);
            return <article key={group.key} className={`rounded-surface border bg-surface-raised p-4 transition ${selected ? "border-action-primary/40 shadow-card" : "border-border-subtle"}`}>
              <div className="grid grid-cols-[24px_88px_minmax(0,1fr)] gap-3">
                <label className="pt-1" aria-label={`${item.product?.name ?? `상품 ${group.product_id}`} 선택`}><input type="checkbox" className="h-5 w-5 cursor-pointer accent-action-primary" checked={selected} onChange={() => toggleGroup(group.cartItemIDs)} /></label>
                <Link href={`/products/${group.product_id}`} className="relative aspect-square overflow-hidden rounded-control bg-surface-subtle"><SafeImage src={item.product?.image_url} alt="" fill sizes="88px" className="object-cover" /></Link>
                <div className="min-w-0">
                  <Link href={`/products/${group.product_id}`} className="group block"><p className="text-xs font-bold text-content-secondary">{item.product?.market_name ?? `마켓 #${item.product?.market_id ?? "-"}`}</p><div className="mt-1 flex items-start justify-between gap-2"><h2 className="line-clamp-2 text-sm font-bold leading-5 text-content-primary group-hover:underline">{item.product?.name ?? `상품 #${group.product_id}`}</h2><ChevronRight className="mt-0.5 shrink-0 text-content-tertiary" size={16} /></div></Link>
                  <p className="mt-2 text-xs text-content-secondary">{option ? `${option.option_name} · ${option.option_value}` : `옵션 #${group.option_id}`} · {group.quantity}개</p>
                  <p className="mt-3 text-right font-bold tabular-nums text-content-primary">{formatPrice(group.totalPrice)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3">
                <QuantityStepper value={group.quantity} max={availableCartQuantity(item.product, group.option_id)} disabled={updateCart.isPending || !item.product || cart.isFetching} label={`${item.product?.name ?? "상품"} 수량`} onValueChange={(quantity) => saveGroup(group, group.option_id, quantity)} />
                <Button size="sm" variant="secondary" disabled={updateCart.isPending || !item.product?.options?.length || cart.isFetching} onClick={() => { updateCart.reset(); setSaved(false); setEditingKey(group.key); }}>옵션 변경</Button>
              </div>
            </article>;
          })}
          </div>
        </section>
        <aside className="md:sticky md:top-24">
          <OrderSummary
            title="주문 예상 금액"
            items={[{ label: `선택 수량 ${selectedQuantity}개`, value: formatPrice(total) }]}
            total={formatPrice(total)}
            footer={<><Button className="w-full" size="lg" disabled={!selectedItems.length || cart.isError || cart.isFetching || updateCart.isPending} onClick={goToCheckout}><Check size={18} /> 선택 상품 주문하기</Button>{displayGroups.length > 0 && !selectedItems.length ? <p className="mt-3 text-center text-xs font-bold text-action-primary">주문할 상품을 선택해주세요.</p> : null}</>}
          />
        </aside>
      </div>
    </main>
  );
}
