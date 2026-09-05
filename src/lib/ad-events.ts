import type { AdPlacement } from "./api/advertising";
import { advertisingApi } from "./api/advertising";

export type AdvertisingEventType = "IMPRESSION" | "CLICK" | "PROMOTION_CARD_IMPRESSION";

export async function recordAdvertisingEvent({
  decisionID,
  placementKey,
  type,
  token,
}: {
  decisionID: string;
  placementKey: AdPlacement;
  type: AdvertisingEventType;
  token?: string | null;
}): Promise<void> {
  try {
    await advertisingApi.recordAdEvent({
      event_id: `${eventPrefix(type)}-${cryptoSafeID()}`,
      decision_id: decisionID,
      type,
      occurred_at: new Date().toISOString(),
    }, token);
  } catch (error) {
    logAdvertisingError(error, { placementKey, decisionID, operation: "event", eventType: type });
  }
}

export function logAdvertisingError(
  error: unknown,
  context: {
    placementKey: AdPlacement;
    decisionID?: string;
    operation: "decision" | "event";
    eventType?: AdvertisingEventType;
  },
): void {
  const diagnostic = error && typeof error === "object" ? error as {
    code?: string;
    requestID?: string;
    status?: number;
  } : {};
  console.error("[commerce-advertising-error]", {
    operation: context.operation,
    event_type: context.eventType,
    placement_key: context.placementKey,
    decision_id: context.decisionID,
    code: diagnostic.code,
    request_id: diagnostic.requestID,
    status: diagnostic.status,
  });
}

export function cryptoSafeID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function eventPrefix(type: AdvertisingEventType): string {
  if (type === "CLICK") return "clk";
  if (type === "PROMOTION_CARD_IMPRESSION") return "promo";
  return "imp";
}
