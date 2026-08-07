"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

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
  const selectedItems = items.filter((item) => selectedIDs.has(item.id));
  const total = selectedItems.reduce((sum, item) => sum + item.price_at_added * item.quantity, 0);
  const productError = products.some((query) => query.isError);
  const allSelected = items.length > 0 && selectedItems.length === items.length;

  useEffect(() => {
    if (!cart.data || initializedSelection.current) return;
    initializedSelection.current = true;
    setSelectedIDs(new Set(cart.data.map((item) => item.id)));
  }, [cart.data]);

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">로그인이 필요합니다</h1><Link href="/login"><Button className="mt-5">로그인하기</Button></Link></main>;
  }

  function toggleItem(id: number) {
    setSelectedIDs((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIDs(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  }

  function goToCheckout() {
    const ids = selectedItems.map((item) => item.id).join(",");
    router.push(`/checkout?cartItemIDs=${encodeURIComponent(ids)}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-32 pt-8">
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-brand">Shopping bag</p><h1 className="mt-1 text-3xl font-black">장바구니</h1></div>
        {items.length ? <p className="text-sm font-bold text-muted">{selectedItems.length}/{items.length}개 선택</p> : null}
      </div>
      <div className="mt-7 grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          {items.length ? <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm font-black"><input type="checkbox" className="h-5 w-5 accent-brand" checked={allSelected} onChange={toggleAll} />전체 선택</label> : null}
          <div className="space-y-3">
          {cart.isLoading ? <p className="text-sm text-muted">장바구니를 불러오는 중입니다.</p> : null}
          {cart.isError ? (
            <div className="rounded-xl border border-brand/30 bg-red-50 p-4 text-sm">
              <p className="font-bold text-brand">{apiErrorMessage(cart.error)}</p>
              <Button className="mt-3" size="sm" variant="secondary" onClick={() => void cart.refetch()}>다시 시도</Button>
            </div>
          ) : null}
          {productError ? <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">일부 상품의 현재 정보는 불러오지 못했습니다. 장바구니에 담긴 가격과 수량은 그대로 표시합니다.</p> : null}
          {cart.isSuccess && !items.length ? <div className="rounded-2xl border border-line bg-white p-10 text-center"><ShoppingBag className="mx-auto text-zinc-300" size={36} /><p className="mt-4 font-black">장바구니가 비어 있습니다</p><p className="mt-1 text-sm text-muted">마음에 드는 상품을 담아보세요.</p><Link href="/products" className="mt-5 inline-block"><Button>상품 둘러보기</Button></Link></div> : null}
          {items.map((item) => {
            const option = item.product?.options?.find((candidate) => candidate.id === item.option_id);
            return <article key={item.id} className={`rounded-2xl border bg-white p-4 transition ${selectedIDs.has(item.id) ? "border-brand/40 shadow-sm" : "border-line"}`}>
              <div className="grid grid-cols-[24px_88px_minmax(0,1fr)] gap-3">
                <label className="pt-1" aria-label={`${item.product?.name ?? `상품 ${item.product_id}`} 선택`}><input type="checkbox" className="h-5 w-5 cursor-pointer accent-brand" checked={selectedIDs.has(item.id)} onChange={() => toggleItem(item.id)} /></label>
                <Link href={`/products/${item.product_id}`} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100"><SafeImage src={item.product?.image_url} alt="" fill sizes="88px" className="object-cover" /></Link>
                <div className="min-w-0">
                  <Link href={`/products/${item.product_id}`} className="group block"><p className="text-xs font-bold text-muted">{item.product?.market_name ?? `마켓 #${item.product?.market_id ?? "-"}`}</p><div className="mt-1 flex items-start justify-between gap-2"><h2 className="line-clamp-2 text-sm font-black leading-5 group-hover:underline">{item.product?.name ?? `상품 #${item.product_id}`}</h2><ChevronRight className="mt-0.5 shrink-0 text-zinc-400" size={16} /></div></Link>
                  <p className="mt-2 text-xs text-muted">{option ? `${option.option_name} · ${option.option_value}` : `옵션 #${item.option_id}`} · {item.quantity}개</p>
                  <p className="mt-3 text-right font-black">{formatPrice(item.price_at_added * item.quantity)}</p>
                </div>
              </div>
            </article>;
          })}
          </div>
        </section>
        <aside className="h-fit rounded-2xl border border-line bg-white p-5 md:sticky md:top-24">
          <h2 className="font-black">주문 예상 금액</h2>
          <div className="mt-5 flex justify-between text-sm"><span className="text-muted">선택 상품 {selectedItems.length}개</span><strong>{formatPrice(total)}</strong></div>
          <div className="mt-5 border-t border-line pt-5"><div className="flex items-end justify-between"><span className="font-bold">총 결제 예정</span><strong className="text-2xl">{formatPrice(total)}</strong></div></div>
          <Button className="mt-5 w-full" size="lg" disabled={!selectedItems.length || cart.isError} onClick={goToCheckout}><Check size={18} /> 선택 상품 주문하기</Button>
          {items.length > 0 && !selectedItems.length ? <p className="mt-3 text-center text-xs font-bold text-brand">주문할 상품을 선택해주세요.</p> : null}
        </aside>
      </div>
    </main>
  );
}
