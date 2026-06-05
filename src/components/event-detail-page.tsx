"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Gift, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function EventDetailPage({ eventId }: { eventId: number }) {
  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => api.getEvent(eventId),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["event-products", eventId],
    queryFn: () => api.listProducts({ sort: "popular" }),
  });

  if (isLoading || !event) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">이벤트를 불러오는 중입니다.</main>;
  }

  const startsAt = new Date(event.starts_at).toLocaleDateString("ko-KR");
  const endsAt = new Date(event.ends_at).toLocaleDateString("ko-KR");

  return (
    <main className="pb-24">
      <section className="relative min-h-[420px] bg-zinc-100">
        <SafeImage src={event.image_url} alt={event.title} fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative mx-auto flex min-h-[420px] max-w-6xl flex-col justify-end px-4 py-10 text-white">
          <p className="text-sm font-black">진행중 이벤트</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight md:text-6xl">{event.title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 md:text-base">{event.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
            <span className="rounded-md bg-white/15 px-3 py-2 backdrop-blur">{startsAt} - {endsAt}</span>
            <span className="rounded-md bg-white/15 px-3 py-2 backdrop-blur">선착순 혜택</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <section className="grid gap-3 py-6 md:grid-cols-3">
          {[
            { icon: Gift, title: "전용 쿠폰", body: "이벤트 상품 5만원 이상 구매 시 즉시 할인" },
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
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
            {products.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5 text-sm leading-7 text-muted">
          <h2 className="text-base font-black text-foreground">유의사항</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>쿠폰과 포인트는 주문서에서 사용 조건을 만족할 때 적용됩니다.</li>
            <li>상품별 재고와 배송 일정은 마켓 사정에 따라 변경될 수 있습니다.</li>
            <li>이벤트 종료 후에는 일부 혜택이 자동으로 비활성화됩니다.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
