"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";

export function CartPage() {
  const router = useRouter();
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = token ?? (process.env.NEXT_PUBLIC_API_MOCKING === "enabled" ? "mock-access-token" : "");
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cart", effectiveToken],
    queryFn: () => api.listCart(effectiveToken),
    enabled: Boolean(effectiveToken),
  });

  const total = items.reduce((sum, item) => sum + item.price_at_added * item.quantity, 0);

  if (!token && process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-black">로그인이 필요합니다</h1>
        <Link href="/login">
          <Button className="mt-5">로그인하기</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-28 pt-8">
      <h1 className="text-2xl font-black">장바구니</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          {isLoading ? <p className="text-sm text-muted">장바구니를 불러오는 중입니다.</p> : null}
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-line bg-white p-4">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-sm font-bold">{item.product?.market_name ?? `상품 ${item.product_id}`}</p>
                  <p className="mt-1 font-semibold">{item.product?.name ?? `상품 ${item.product_id}`}</p>
                  <p className="mt-2 text-sm text-muted">옵션 #{item.option_id} · 수량 {item.quantity}</p>
                </div>
                <p className="shrink-0 font-black">{formatPrice(item.price_at_added * item.quantity)}</p>
              </div>
            </div>
          ))}
        </section>

        <aside className="h-fit rounded-md border border-line bg-white p-4">
          <div className="flex justify-between text-sm">
            <span>상품 금액</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <div className="mt-3 flex justify-between text-sm">
            <span>배송비</span>
            <strong>0원</strong>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <div className="flex justify-between">
              <span className="font-bold">결제 예정 금액</span>
              <strong className="text-xl">{formatPrice(total)}</strong>
            </div>
          </div>
          <Button className="mt-5 w-full" size="lg" disabled={!items.length} onClick={() => router.push("/checkout")}>
            주문하기
          </Button>
        </aside>
      </div>
    </main>
  );
}
