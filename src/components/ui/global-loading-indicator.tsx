"use client";

import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "./feedback";

const SHOW_DELAY_MS = 150;
const MIN_VISIBLE_MS = 300;

/**
 * A non-blocking signal for React Query loading. It stays beneath navigation
 * and modal layers so it never prevents app chrome from receiving input.
 */
export function GlobalLoadingIndicator() {
  const visible = useLoadingVisibility(useIsFetching() > 0);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-[var(--commerce-z-sticky)] flex justify-center pt-2"
      role="status"
      aria-live="polite"
      aria-label="새로운 정보를 불러오는 중입니다."
      data-testid="global-loading-indicator"
    >
      <span className="grid size-8 place-items-center rounded-full border border-border-subtle bg-surface-raised/95 text-action-primary shadow-card backdrop-blur">
        <LoadingSpinner className="size-4" aria-hidden="true" />
        <span className="sr-only">새로운 정보를 불러오는 중입니다.</span>
      </span>
    </div>
  );
}

function useLoadingVisibility(isFetching: boolean) {
  const [visible, setVisible] = useState(false);
  const visibleSince = useRef<number | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    if (isFetching) {
      if (!visible) {
        timer = window.setTimeout(() => {
          visibleSince.current = Date.now();
          setVisible(true);
        }, SHOW_DELAY_MS);
      }
    } else if (visible) {
      const elapsed = visibleSince.current ? Date.now() - visibleSince.current : MIN_VISIBLE_MS;
      timer = window.setTimeout(() => {
        visibleSince.current = null;
        setVisible(false);
      }, Math.max(0, MIN_VISIBLE_MS - elapsed));
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isFetching, visible]);

  return visible;
}
