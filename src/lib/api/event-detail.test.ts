import { afterEach, describe, expect, it, vi } from "vitest";
import { eventDetailApi } from "./event-detail";

afterEach(() => vi.unstubAllGlobals());

describe("eventDetailApi backend contract", () => {
  it("keeps event and event-product 404 errors visible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response("not found", { status: 404 }))));
    await expect(eventDetailApi.getEvent(10)).rejects.toMatchObject({ status: 404 });
    await expect(eventDetailApi.listEventProducts({
      eventID: 10, limit: 12, offset: 0, sort: "RECOMMENDED",
    })).rejects.toMatchObject({ status: 404 });
  });

  it("accepts an event detail with an open exposure schedule", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 1, title: "상시 이벤트", subtitle: "", image_url: "", link_url: "", status: "ACTIVE",
      starts_at: null, ends_at: null, design_variant: "BENEFIT_FOCUS",
      product_display: {
        enabled: false, mode: "PRODUCT_GRID", section_title: "", default_sort: "RECOMMENDED",
        sort_options: [], markets: [], categories: [],
      },
      rewards: [],
    }), { status: 200 })));
    await expect(eventDetailApi.getEvent(1)).resolves.toMatchObject({ starts_at: null, ends_at: null });
  });

  it("sends the selected reward row through the authenticated event endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "ISSUED", event_id: 10, reward_row_id: 20, reward_type: "COUPON", reward_id: 30,
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await eventDetailApi.claimEventReward("token", 10, 20);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/events/10/rewards/20/claim");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
  });

  it("rejects non-issued reward responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "PREVIEW", event_id: 10, reward_row_id: 20, reward_type: "POINT_EVENT", reward_id: 30,
    }), { status: 200 })));

    await expect(eventDetailApi.claimEventReward("token", 10, 20)).rejects.toMatchObject({
      kind: "contract",
    });
  });
});
