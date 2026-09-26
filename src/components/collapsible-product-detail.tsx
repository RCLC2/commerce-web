"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ProductDetailContent } from "./product-detail-content";
import { Button } from "./ui/button";
import { LoadingSpinner } from "./ui/feedback";
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
  const [isMediaLoading, setIsMediaLoading] = useState(false);

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
    const updateMediaLoading = () => {
      const images = Array.from(content.querySelectorAll("img"));
      setIsMediaLoading(images.some((image) => !image.complete));
    };
    const handleContentMediaEvent = (event: Event) => {
      if (event.target instanceof HTMLImageElement) {
        scheduleMeasure();
        updateMediaLoading();
      }
    };

    measure();
    updateMediaLoading();
    content.addEventListener("load", handleContentMediaEvent, true);
    content.addEventListener("error", handleContentMediaEvent, true);
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);
    observer?.observe(content);
    void document.fonts?.ready.then(scheduleMeasure);

    return () => {
      disposed = true;
      content.removeEventListener("load", handleContentMediaEvent, true);
      content.removeEventListener("error", handleContentMediaEvent, true);
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
        <ProductDetailContent
          id={contentId}
          ref={contentRef}
          data-testid="product-detail-content"
          className={cn(
            className,
            isExpanded ? "max-h-none overflow-visible" : "max-h-[1100px] overflow-hidden md:max-h-[1400px]",
          )}
          html={html}
        />
        {isMediaLoading ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-surface-raised" role="status">
            <LoadingSpinner className="size-12" aria-hidden="true" />
            <span className="sr-only">상품 상세 이미지를 불러오는 중입니다.</span>
          </div>
        ) : null}
        {isOverflowing && !isExpanded ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-surface-raised/0 via-surface-raised/85 to-surface-raised"
          />
        ) : null}
      </div>
      {isOverflowing ? (
        <Button
          variant="secondary"
          className="relative mt-3 h-12 w-full"
          aria-controls={contentId}
          aria-expanded={isExpanded}
          onClick={toggleExpanded}
        >
          {isExpanded ? "상품정보 접기" : "상품정보 더보기"}
        </Button>
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
