"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function EventDetailPage({ eventId }: { eventId: number }) {
  const eventQuery = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => api.getEvent(eventId),
  });
  const productsQuery = useQuery({
    queryKey: ["event-products", eventId],
    queryFn: () => api.listProducts({ sort: "popular" }),
  });
  const event = eventQuery.data;
  const products = productsQuery.data ?? [];

  if (eventQuery.isError) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-sm"><p className="font-bold text-brand">{apiErrorMessage(eventQuery.error)}</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => void eventQuery.refetch()}>다시 시도</Button></main>;
  }
  if (eventQuery.isLoading || !event) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">이벤트를 불러오는 중입니다.</main>;
  }

  const startsAt = new Date(event.starts_at).toLocaleDateString("ko-KR");
  const endsAt = new Date(event.ends_at).toLocaleDateString("ko-KR");

  return (
    <main className="pb-24">
      <section className="relative min-h-[420px] bg-zinc-100">
        <SafeImage src={event.image_url} alt={event.title} fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative mx-auto flex min-h-[420px] max-w-6xl flex-col justify-end px-4 py-10 text-white">
          <p className="text-sm font-black">진행중 이벤트</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight md:text-6xl">{event.title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 md:text-base">{event.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
            <span className="rounded-md bg-white/15 px-3 py-2 backdrop-blur">{startsAt} - {endsAt}</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <section className="grid gap-3 py-6 md:grid-cols-3">
          {[
            { icon: CalendarDays, title: "기간 안내", body: "표시된 이벤트 기간과 상품 정보를 확인하세요." },
            { icon: Truck, title: "빠른 출고", body: "오늘출발 태그 상품은 평일 기준 당일 출고" },
            { icon: ShieldCheck, title: "안심 구매", body: "마켓별 주문 상태와 정산 기준을 투명하게 표시" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-md border border-line bg-white p-4">
                <Icon size={20} className="text-brand" />
                <p className="mt-3 font-black">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{item.body}</p>
              </div>
            );
          })}
        </section>

        <section className="rounded-md border border-line bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-muted">
                <CalendarDays size={16} />
                이벤트 기간
              </div>
              <p className="mt-2 text-xl font-black">{startsAt}부터 {endsAt}까지</p>
            </div>
            <Link href="/products?sort=popular">
              <Button>
                이벤트 상품 전체보기
                <ChevronRight size={16} />
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-8">
          <h2 className="text-xl font-black">이벤트 상품</h2>
          {productsQuery.isError ? <div className="mt-4 rounded-md bg-red-50 p-3 text-sm"><p className="font-bold text-brand">{apiErrorMessage(productsQuery.error)}</p><Button className="mt-2" size="sm" variant="secondary" onClick={() => void productsQuery.refetch()}>상품 다시 불러오기</Button></div> : null}
          {productsQuery.isSuccess && !products.length ? <p className="mt-4 text-sm text-muted">표시할 상품이 없습니다.</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
            {products.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5 text-sm leading-7 text-muted">
          <h2 className="text-base font-black text-foreground">유의사항</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>쿠폰과 포인트는 보유 상태와 서버 정책에 따라 주문 생성 시 확정됩니다.</li>
            <li>상품별 재고와 배송 일정은 마켓 사정에 따라 변경될 수 있습니다.</li>
            <li>이벤트 노출 여부와 기간은 서버가 제공하는 상태를 따릅니다.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
