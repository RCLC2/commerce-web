"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

export function PageJumpControls() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
  }

  function scrollToBottom() {
    const height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.scrollingElement?.scrollHeight ?? 0,
    );
    window.scrollTo({ top: height, behavior: preferredScrollBehavior() });
  }

  return (
    <nav
      aria-label="페이지 빠른 이동"
      className="fixed right-4 bottom-[calc(10.5rem+env(safe-area-inset-bottom))] z-30 flex flex-col gap-2 md:right-6 md:bottom-24 xl:right-[max(1.5rem,calc((100vw-72rem)/2-4rem))]"
    >
      <button
        type="button"
        aria-label="페이지 최상단으로 이동"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/95 text-foreground shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        onClick={scrollToTop}
      >
        <ArrowUp size={20} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="페이지 최하단으로 이동"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/95 text-foreground shadow-lg backdrop-blur transition hover:translate-y-0.5 hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        onClick={scrollToBottom}
      >
        <ArrowDown size={20} aria-hidden="true" />
      </button>
    </nav>
  );
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
