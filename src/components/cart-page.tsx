"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
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

export function CartPage() {
  const router = useRouter();
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

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">로그인이 필요합니다</h1><Link href="/login"><Button className="mt-5">로그인하기</Button></Link></main>;
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
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-brand">Shopping bag</p><h1 className="mt-1 text-3xl font-black">장바구니</h1></div>
        {displayGroups.length ? <p className="text-sm font-bold text-muted">{selectedGroups.length}/{displayGroups.length}개 옵션 선택</p> : null}
      </div>
      <div className="mt-7 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          {displayGroups.length ? <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm font-black"><input type="checkbox" className="h-5 w-5 accent-action-primary" checked={allSelected} onChange={toggleAll} />전체 선택</label> : null}
          <div className="space-y-3">
          {cart.isLoading ? <LoadingState label="장바구니를 불러오는 중입니다." /> : null}
          {cart.isError ? (
            <Notice tone="error" title={apiErrorMessage(cart.error)}>
              <Button className="mt-3" size="sm" variant="secondary" onClick={() => void cart.refetch()}>다시 시도</Button>
            </Notice>
          ) : null}
          {productError ? <Notice tone="warning">일부 상품의 현재 정보는 불러오지 못했습니다. 장바구니에 담긴 가격과 수량은 그대로 표시합니다.</Notice> : null}
          {cart.isSuccess && !displayGroups.length ? <EmptyState icon={<ShoppingBag className="size-7" />} title="장바구니가 비어 있습니다" description="마음에 드는 상품을 담아보세요." action={<Link href="/products"><Button>상품 둘러보기</Button></Link>} /> : null}
          {displayGroups.map((group) => {
            const item = group.items[0];
            const option = item.product?.options?.find((candidate) => candidate.id === group.option_id);
            const selected = selectedGroupKeys.has(group.key);
            return <article key={group.key} className={`rounded-surface border bg-surface-raised p-4 transition ${selected ? "border-action-primary/40 shadow-card" : "border-border-subtle"}`}>
              <div className="grid grid-cols-[24px_88px_minmax(0,1fr)] gap-3">
                <label className="pt-1" aria-label={`${item.product?.name ?? `상품 ${group.product_id}`} 선택`}><input type="checkbox" className="h-5 w-5 cursor-pointer accent-action-primary" checked={selected} onChange={() => toggleGroup(group.cartItemIDs)} /></label>
                <Link href={`/products/${group.product_id}`} className="relative aspect-square overflow-hidden rounded-control bg-surface-subtle"><SafeImage src={item.product?.image_url} alt="" fill sizes="88px" className="object-cover" /></Link>
                <div className="min-w-0">
                  <Link href={`/products/${group.product_id}`} className="group block"><p className="text-xs font-bold text-content-secondary">{item.product?.market_name ?? `마켓 #${item.product?.market_id ?? "-"}`}</p><div className="mt-1 flex items-start justify-between gap-2"><h2 className="line-clamp-2 text-sm font-black leading-5 text-content-primary group-hover:underline">{item.product?.name ?? `상품 #${group.product_id}`}</h2><ChevronRight className="mt-0.5 shrink-0 text-content-tertiary" size={16} /></div></Link>
                  <p className="mt-2 text-xs text-content-secondary">{option ? `${option.option_name} · ${option.option_value}` : `옵션 #${group.option_id}`} · {group.quantity}개</p>
                  <p className="mt-3 text-right font-black text-content-primary">{formatPrice(group.totalPrice)}</p>
                </div>
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
            footer={<><Button className="w-full" size="lg" disabled={!selectedItems.length || cart.isError} onClick={goToCheckout}><Check size={18} /> 선택 상품 주문하기</Button>{displayGroups.length > 0 && !selectedItems.length ? <p className="mt-3 text-center text-xs font-bold text-action-primary">주문할 상품을 선택해주세요.</p> : null}</>}
          />
        </aside>
      </div>
    </main>
  );
}
