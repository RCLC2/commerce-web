"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MOBILE_COLLAPSED_HEIGHT = 1100;
const DESKTOP_COLLAPSED_HEIGHT = 1400;
const DESKTOP_BREAKPOINT = 768;
const DETAIL_SCROLL_OFFSET = 88;

export function collapsedProductDetailHeight(viewportWidth: number) {
  return viewportWidth >= DESKTOP_BREAKPOINT ? DESKTOP_COLLAPSED_HEIGHT : MOBILE_COLLAPSED_HEIGHT;
}

export function CollapsibleProductDetail({ html, className }: { html: string; className?: string }) {
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    let frame = 0;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const collapsedHeight = collapsedProductDetailHeight(window.innerWidth);
      setIsOverflowing(content.scrollHeight > collapsedHeight + 1);
    };
    const scheduleMeasure = () => {
      if (typeof window.requestAnimationFrame !== "function") {
        measure();
        return;
      }
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    const handleContentLoad = (event: Event) => {
      if (event.target instanceof HTMLImageElement) scheduleMeasure();
    };

    measure();
    content.addEventListener("load", handleContentLoad, true);
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);
    observer?.observe(content);
    void document.fonts?.ready.then(scheduleMeasure);

    return () => {
      disposed = true;
      content.removeEventListener("load", handleContentLoad, true);
      window.removeEventListener("resize", scheduleMeasure);
      observer?.disconnect();
      if (typeof window.cancelAnimationFrame === "function") window.cancelAnimationFrame(frame);
    };
  }, [html]);

  function toggleExpanded() {
    if (!isExpanded) {
      setIsExpanded(true);
      return;
    }

    const root = rootRef.current;
    const collapsedHeight = collapsedProductDetailHeight(window.innerWidth);
    const rootTop = root ? window.scrollY + root.getBoundingClientRect().top : 0;
    const shouldRestorePosition = Boolean(root && window.scrollY > rootTop + collapsedHeight);
    setIsExpanded(false);
    if (!shouldRestorePosition) return;

    scheduleAnimationFrame(() => {
      window.scrollTo({ top: Math.max(0, rootTop - DETAIL_SCROLL_OFFSET), behavior: preferredScrollBehavior() });
    });
  }

  return (
    <div ref={rootRef}>
      <div className="relative">
        <div
          id={contentId}
          ref={contentRef}
          data-testid="product-detail-content"
          className={cn(
            className,
            isExpanded ? "max-h-none overflow-visible" : "max-h-[1100px] overflow-hidden md:max-h-[1400px]",
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {isOverflowing && !isExpanded ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-white/0 via-white/85 to-white"
          />
        ) : null}
      </div>
      {isOverflowing ? (
        <button
          type="button"
          className="relative mt-3 flex h-12 w-full items-center justify-center rounded-md border border-line bg-white text-sm font-black text-foreground shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          aria-controls={contentId}
          aria-expanded={isExpanded}
          onClick={toggleExpanded}
        >
          {isExpanded ? "상품정보 접기" : "상품정보 더보기"}
        </button>
      ) : null}
    </div>
  );
}

function scheduleAnimationFrame(callback: () => void) {
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(callback);
    return;
  }
  callback();
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
