"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AdDecision } from "@/lib/api/advertising";
import { formatPrice } from "@/lib/utils";
import { useSessionStore } from "@/lib/session-store";
import { SafeImage } from "./safe-image";

export function SponsoredProductSlot({ placementKey, className = "", impressionEventType = "IMPRESSION" }: { placementKey: string; className?: string; impressionEventType?: "IMPRESSION" | "IN_APP_IMPRESSION" }) {
  const [decision, setDecision] = useState<AdDecision | null>(null);
  const slotRef = useRef<HTMLElement | null>(null);
  const impressionSent = useRef(false);
  const requestIDRef = useRef(`ads-${cryptoSafeID()}`);
  const accessToken = useSessionStore((state) => state.accessToken);
  const adEventToken = accessToken ?? (typeof window === "undefined" ? null : window.localStorage.getItem("commerce.accessToken"));
  const productQuery = useQuery({
    queryKey: ["ad-product", decision?.decision_id],
    queryFn: () => api.getProduct(decision?.product_id ?? 0),
    enabled: Boolean(decision?.product_id),
    retry: false,
  });

  useEffect(() => {
    let mounted = true;
    void api.adDecision({ request_id: requestIDRef.current, placement_key: placementKey }).then((next) => {
      if (mounted) setDecision(next);
    }).catch(() => {
      if (mounted) setDecision(null);
    });
    return () => { mounted = false; };
  }, [placementKey]);

  useEffect(() => {
    const target = slotRef.current;
    if (!target || !decision || !productQuery.data || impressionSent.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5) && !impressionSent.current) {
        impressionSent.current = true;
		void api.recordAdEvent({ event_id: `imp-${cryptoSafeID()}`, decision_id: decision.decision_id, type: impressionEventType, occurred_at: new Date().toISOString() }, adEventToken).catch(() => undefined);
        observer.disconnect();
      }
    }, { threshold: [0.5] });
    observer.observe(target);
    return () => observer.disconnect();
	}, [decision, productQuery.data, adEventToken, impressionEventType]);

  const product = productQuery.data;
  if (!decision || !product) return null;
  const price = product.discount_price || product.base_price;
  return (
    <article ref={slotRef} className={`relative overflow-hidden rounded-md border border-brand/30 bg-white ${className}`}>
      <span className="absolute left-3 top-3 z-10 rounded-sm bg-zinc-900/80 px-2 py-1 text-[10px] font-black tracking-wide text-white">광고</span>
      <Link href={`/products/${product.id}`} onClick={() => { void api.recordAdEvent({ event_id: `clk-${cryptoSafeID()}`, decision_id: decision.decision_id, type: "CLICK", occurred_at: new Date().toISOString() }, adEventToken).catch(() => undefined); }} className="flex min-h-40 gap-4 p-3 transition hover:bg-zinc-50">
        <div className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-md bg-zinc-100"><SafeImage src={product.image_url} alt={product.name} fill sizes="128px" className="object-cover" /></div>
        <div className="min-w-0 py-1"><p className="text-xs font-bold text-muted">{product.market_name ?? "스폰서드 마켓"}</p><h2 className="mt-2 line-clamp-2 text-base font-black leading-6">{product.name}</h2><p className="mt-3 text-lg font-black text-brand">{formatPrice(price)}</p><p className="mt-2 text-xs font-bold text-muted">상품 상세로 이동</p></div>
      </Link>
    </article>
  );
}

function cryptoSafeID() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
