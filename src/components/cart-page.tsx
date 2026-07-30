"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";

export function CartPage() {
  const router = useRouter();
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = token ?? "";
  const cart = useQuery({
    queryKey: ["cart", effectiveToken],
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
  const total = items.reduce((sum, item) => sum + item.price_at_added * item.quantity, 0);
  const productError = products.some((query) => query.isError);

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">로그인이 필요합니다</h1><Link href="/login"><Button className="mt-5">로그인하기</Button></Link></main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-28 pt-8">
      <h1 className="text-2xl font-black">장바구니</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          {cart.isLoading ? <p className="text-sm text-muted">장바구니를 불러오는 중입니다.</p> : null}
          {cart.isError ? (
            <div className="rounded-md border border-brand/30 bg-red-50 p-4 text-sm">
              <p className="font-bold text-brand">{apiErrorMessage(cart.error)}</p>
              <Button className="mt-3" size="sm" variant="secondary" onClick={() => void cart.refetch()}>다시 시도</Button>
            </div>
          ) : null}
          {productError ? <p className="rounded-md bg-amber-50 p-3 text-xs font-bold text-amber-800">일부 상품의 현재 정보는 불러오지 못했습니다. 장바구니에 담긴 가격과 수량은 그대로 표시합니다.</p> : null}
          {cart.isSuccess && !items.length ? <p className="rounded-md border border-line bg-white p-8 text-center text-sm text-muted">장바구니가 비어 있습니다.</p> : null}
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-line bg-white p-4">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-sm font-bold">{item.product?.market_name ?? `마켓 #${item.product?.market_id ?? "-"}`}</p>
                  <p className="mt-1 font-semibold">{item.product?.name ?? `상품 #${item.product_id}`}</p>
                  <p className="mt-2 text-sm text-muted">옵션 #{item.option_id} · 수량 {item.quantity}</p>
                  <p className="mt-1 text-xs text-muted">장바구니에 담은 시점의 가격 기준</p>
                </div>
                <p className="shrink-0 font-black">{formatPrice(item.price_at_added * item.quantity)}</p>
              </div>
            </div>
          ))}
        </section>
        <aside className="h-fit rounded-md border border-line bg-white p-4">
          <div className="flex justify-between text-sm"><span>상품 금액</span><strong>{formatPrice(total)}</strong></div>
          <div className="mt-4 border-t border-line pt-4"><div className="flex justify-between"><span className="font-bold">예상 주문 금액</span><strong className="text-xl">{formatPrice(total)}</strong></div></div>
          <Button className="mt-5 w-full" size="lg" disabled={!items.length || cart.isError} onClick={() => router.push("/checkout")}>주문하기</Button>
        </aside>
      </div>
    </main>
  );
}
