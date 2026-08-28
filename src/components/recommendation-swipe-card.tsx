"use client";

import { Check, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import type { RecommendationChoice, RecommendationInputMethod, RecommendationOnboardingItem } from "@/lib/api/recommendation-onboarding";
import { cn } from "@/lib/utils";

const swipeThreshold = 88;

export function swipeChoiceForDistance(distance: number, threshold = swipeThreshold): RecommendationChoice | null {
  if (distance >= threshold) return "LIKE";
  if (distance <= -threshold) return "DISLIKE";
  return null;
}

export function RecommendationSwipeCard({
  item,
  onChoose,
}: {
  item: RecommendationOnboardingItem;
  onChoose: (choice: RecommendationChoice, inputMethod: RecommendationInputMethod) => void;
}) {
  const startX = useRef<number | null>(null);
  const offsetXRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const price = item.product.discount_price > 0 ? item.product.discount_price : item.product.base_price;
  const likeOpacity = Math.min(1, Math.max(0, offsetX / swipeThreshold));
  const dislikeOpacity = Math.min(1, Math.max(0, -offsetX / swipeThreshold));

  function resetPointer(target: HTMLElement, pointerID: number) {
    startX.current = null;
    offsetXRef.current = 0;
    setDragging(false);
    setOffsetX(0);
    try {
      target.releasePointerCapture(pointerID);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  }

  function completePointer(target: HTMLElement, pointerID: number) {
    const choice = swipeChoiceForDistance(offsetXRef.current);
    resetPointer(target, pointerID);
    if (choice) onChoose(choice, "SWIPE");
  }

  return (
    <article
      data-onboarding-card={item.product.id}
      tabIndex={0}
      aria-label={`${item.product.name}. 왼쪽 화살표는 별로예요, 오른쪽 화살표는 좋아요입니다.`}
      className="relative mx-auto w-full max-w-sm touch-pan-y select-none outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
      style={{
        transform: `translateX(${offsetX}px) rotate(${offsetX / 24}deg)`,
        transition: dragging ? "none" : "transform 180ms ease",
      }}
      onPointerDown={(event) => {
        startX.current = event.clientX;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (startX.current === null) return;
        const nextOffset = Math.max(-160, Math.min(160, event.clientX - startX.current));
        offsetXRef.current = nextOffset;
        setOffsetX(nextOffset);
      }}
      onPointerUp={(event) => completePointer(event.currentTarget, event.pointerId)}
      onPointerCancel={(event) => resetPointer(event.currentTarget, event.pointerId)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onChoose("DISLIKE", "KEYBOARD");
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onChoose("LIKE", "KEYBOARD");
        }
      }}
    >
      <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.14)]">
        <div className="relative aspect-[4/5] bg-zinc-100">
          <Image
            src={item.product.image_url}
            alt={item.product.name}
            fill
            priority
            unoptimized
            sizes="(max-width: 480px) 88vw, 384px"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
          <div
            aria-hidden
            className="absolute left-5 top-5 flex rotate-[-8deg] items-center gap-2 rounded-xl border-4 border-emerald-400 bg-white/90 px-4 py-2 text-xl font-black text-emerald-600"
            style={{ opacity: likeOpacity }}
          >
            <Check size={24} strokeWidth={4} /> O
          </div>
          <div
            aria-hidden
            className="absolute right-5 top-5 flex rotate-[8deg] items-center gap-2 rounded-xl border-4 border-rose-400 bg-white/90 px-4 py-2 text-xl font-black text-rose-600"
            style={{ opacity: dislikeOpacity }}
          >
            <X size={24} strokeWidth={4} /> X
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-sm font-bold text-white/80">{item.product.market_name}</p>
            <h2 className="mt-1 line-clamp-2 text-2xl font-black leading-tight">{item.product.name}</h2>
            <p className="mt-3 text-xl font-black">{price.toLocaleString("ko-KR")}원</p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <button
          type="button"
          aria-label="별로예요"
          className={cn("flex h-14 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white text-base font-black text-rose-500 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50 active:translate-y-0")}
          onClick={() => onChoose("DISLIKE", "BUTTON")}
        >
          <X size={24} strokeWidth={3} /> 별로예요
        </button>
        <button
          type="button"
          aria-label="좋아요"
          className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white text-base font-black text-emerald-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50 active:translate-y-0"
          onClick={() => onChoose("LIKE", "BUTTON")}
        >
          <Check size={24} strokeWidth={3} /> 좋아요
        </button>
      </div>
    </article>
  );
}
