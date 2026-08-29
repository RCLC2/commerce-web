import { afterEach, describe, expect, it, vi } from "vitest";
import { onboardingApi } from "./onboarding";

afterEach(() => vi.unstubAllGlobals());

describe("onboardingApi", () => {
  it("saves O/X choices with the input method", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      session_id: 1,
      generation: 1,
      status: "IN_PROGRESS",
      candidate_version: "balanced_v1",
      total_count: 10,
      responded_count: 1,
      items: [],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await onboardingApi.saveOnboardingResponse("token", 7, "LIKE", "SWIPE");

    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe("/api/v1/me/onboarding/responses/7");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({ choice: "LIKE", input_method: "SWIPE" });
  });

  it("uses DELETE for undo and POST for skip", async () => {
    const session = { status: "IN_PROGRESS", total_count: 10, responded_count: 0, items: [] };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(session), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "SKIPPED", responded_count: 0, recommendation_ready: false, generation: 1,
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await onboardingApi.undoOnboardingResponse("token", 7);
    await onboardingApi.finishOnboarding("token", "SKIPPED");

    expect(fetchMock.mock.calls.map(([url, options]) => [new URL(String(url)).pathname, options.method])).toEqual([
      ["/api/v1/me/onboarding/responses/7", "DELETE"],
      ["/api/v1/me/onboarding/finish", "POST"],
    ]);
  });
});
