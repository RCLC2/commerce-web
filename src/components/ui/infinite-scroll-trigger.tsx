"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Button } from "./button";
import { InlineLoadingState } from "./feedback";

type InfiniteScrollTriggerProps = {
  hasMore: boolean;
  loading: boolean;
  error?: boolean;
  label: string;
  onLoadMore: () => void;
};

const subscribeToObserverSupport = () => () => {};
const browserSupportsObserver = () => typeof IntersectionObserver !== "undefined";

export function InfiniteScrollTrigger({ hasMore, loading, error = false, label, onLoadMore }: InfiniteScrollTriggerProps) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const supportsObserver = useSyncExternalStore(subscribeToObserverSupport, browserSupportsObserver, () => true);

  useEffect(() => {
    const target = targetRef.current;
    if (!target || !hasMore || loading || error || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        onLoadMore();
      }
    }, { rootMargin: "320px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, error, onLoadMore]);

  if (!hasMore && !loading && !error) return null;
  return (
    <div ref={targetRef} className="mt-8 min-h-8" aria-label={`${label} 이어 불러오기`}>
      {loading ? <InlineLoadingState label={`${label}을 더 불러오는 중입니다.`} /> : null}
      {error ? (
        <div className="text-center" role="alert">
          <p className="text-sm text-status-negative">{label}을 더 불러오지 못했습니다.</p>
          <Button className="mt-3" variant="secondary" onClick={onLoadMore}>다시 시도</Button>
        </div>
      ) : null}
      {hasMore && !supportsObserver && !loading && !error ? (
        <Button variant="secondary" onClick={onLoadMore}>{label} 더 보기</Button>
      ) : null}
    </div>
  );
}
