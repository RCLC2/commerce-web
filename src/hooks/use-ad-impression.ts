"use client";

import { type RefObject, useEffect } from "react";
import { recordAdvertisingEvent, type AdvertisingEventType } from "@/lib/ad-events";
import type { AdPlacement } from "@/lib/api/advertising";

const sentDecisionIDs = new Set<string>();

export function useAdImpression({
  targetRef,
  decisionID,
  placementKey,
  token,
  eventType = "IMPRESSION",
}: {
  targetRef: RefObject<HTMLElement | null>;
  decisionID: string;
  placementKey: AdPlacement;
  token?: string | null;
  eventType?: Extract<AdvertisingEventType, "IMPRESSION" | "PROMOTION_CARD_IMPRESSION">;
}): void {
  useEffect(() => {
    const target = targetRef.current;
    if (!target || sentDecisionIDs.has(decisionID)) return;

    let visibleTimer: ReturnType<typeof setTimeout> | undefined;
    const stopTimer = () => {
      if (visibleTimer !== undefined) clearTimeout(visibleTimer);
      visibleTimer = undefined;
    };
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5);
      if (!visible) {
        stopTimer();
        return;
      }
      if (visibleTimer !== undefined || sentDecisionIDs.has(decisionID)) return;
      visibleTimer = setTimeout(() => {
        visibleTimer = undefined;
        if (sentDecisionIDs.has(decisionID)) return;
        sentDecisionIDs.add(decisionID);
        void recordAdvertisingEvent({ decisionID, placementKey, type: eventType, token });
        observer.disconnect();
      }, 1_000);
    }, { threshold: [0.5] });
    observer.observe(target);
    return () => {
      stopTimer();
      observer.disconnect();
    };
  }, [decisionID, eventType, placementKey, targetRef, token]);
}

export function resetAdImpressionRegistryForTests(): void {
  sentDecisionIDs.clear();
}
