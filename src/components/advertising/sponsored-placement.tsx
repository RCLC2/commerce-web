"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAdImpression } from "@/hooks/use-ad-impression";
import { cryptoSafeID, logAdvertisingError, recordAdvertisingEvent } from "@/lib/ad-events";
import { api } from "@/lib/api";
import type { AdDecision, AdPlacement } from "@/lib/api/advertising";
import { useSessionStore } from "@/lib/session-store";
import { SponsoredBanner } from "./sponsored-banner";
import { SponsoredInApp } from "./sponsored-in-app";
import { SponsoredMarketShelf } from "./sponsored-market-shelf";
import { SponsoredProductCard } from "./sponsored-product-card";

export function SponsoredPlacement({ placementKey, className = "" }: { placementKey: AdPlacement; className?: string }) {
  const hasHydrated = useSessionStore((state) => state.hasHydrated);
  const token = useSessionStore((state) => state.accessToken);
  const [requestID] = useState(() => `ads-${cryptoSafeID()}`);
  const query = useQuery({
    queryKey: ["ad-decision", placementKey, requestID, token ?? "anonymous"],
    queryFn: () => api.adDecision({ request_id: requestID, placement_key: placementKey }, token),
    enabled: hasHydrated,
    retry: false,
  });

  useEffect(() => {
    if (query.error) logAdvertisingError(query.error, { placementKey, operation: "decision" });
  }, [placementKey, query.error]);

  if (!query.data) return null;
  return <SponsoredDecision decision={query.data} token={token} className={className} />;
}

export function SponsoredDecision({ decision, token, className = "" }: { decision: AdDecision; token?: string | null; className?: string }) {
  const trackedRef = useRef<HTMLElement | null>(null);
  const impressionType = decision.creative.format === "IN_APP" ? "IN_APP_IMPRESSION" : "IMPRESSION";
  useAdImpression({
    targetRef: trackedRef,
    decisionID: decision.decision_id,
    placementKey: decision.placement_key,
    token,
    eventType: impressionType,
  });
  const onNavigate = () => {
    void recordAdvertisingEvent({
      decisionID: decision.decision_id,
      placementKey: decision.placement_key,
      type: "CLICK",
      token,
    });
  };

  return (
    <section ref={trackedRef} className={className} data-ad-decision-id={decision.decision_id} data-ad-placement={decision.placement_key}>
      {decision.creative.format === "BANNER" ? <SponsoredBanner decision={decision} onNavigate={onNavigate} /> : null}
      {decision.creative.format === "PRODUCT_CARD" ? <SponsoredProductCard decision={decision} onNavigate={onNavigate} /> : null}
      {decision.creative.format === "MARKET_SHELF" ? <SponsoredMarketShelf decision={decision} onNavigate={onNavigate} /> : null}
      {decision.creative.format === "IN_APP" ? <SponsoredInApp decision={decision} onNavigate={onNavigate} /> : null}
    </section>
  );
}
