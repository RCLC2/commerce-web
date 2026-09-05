import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adEvents from "@/lib/ad-events";
import { resetAdImpressionRegistryForTests, useAdImpression } from "./use-ad-impression";

let intersectionCallback: IntersectionObserverCallback;

class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0.5];
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  resetAdImpressionRegistryForTests();
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useAdImpression", () => {
  it("requires at least 50% continuous visibility for one second", () => {
    const record = vi.spyOn(adEvents, "recordAdvertisingEvent").mockResolvedValue(undefined);
    render(<Harness decisionID="decision-1" />);

    emitIntersection(0.49, true);
    act(() => vi.advanceTimersByTime(1_100));
    expect(record).not.toHaveBeenCalled();

    emitIntersection(0.5, true);
    act(() => vi.advanceTimersByTime(999));
    expect(record).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(record).toHaveBeenCalledOnce();
  });

  it("cancels the timer when visibility drops before one second", () => {
    const record = vi.spyOn(adEvents, "recordAdvertisingEvent").mockResolvedValue(undefined);
    render(<Harness decisionID="decision-2" />);

    emitIntersection(0.75, true);
    act(() => vi.advanceTimersByTime(500));
    emitIntersection(0.2, true);
    act(() => vi.advanceTimersByTime(1_000));

    expect(record).not.toHaveBeenCalled();
  });

  it("sends the same decision only once across unmount and carousel return", () => {
    const record = vi.spyOn(adEvents, "recordAdvertisingEvent").mockResolvedValue(undefined);
    const first = render(<Harness decisionID="decision-3" />);
    emitIntersection(1, true);
    act(() => vi.advanceTimersByTime(1_000));
    first.unmount();

    render(<Harness decisionID="decision-3" />);
    act(() => vi.advanceTimersByTime(2_000));

    expect(record).toHaveBeenCalledOnce();
  });
});

function Harness({ decisionID }: { decisionID: string }) {
  const ref = useRef<HTMLElement | null>(null);
  useAdImpression({ targetRef: ref, decisionID, placementKey: "home.main_banner" });
  return <article ref={ref}>광고</article>;
}

function emitIntersection(ratio: number, isIntersecting: boolean) {
  act(() => intersectionCallback([{ intersectionRatio: ratio, isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));
}
