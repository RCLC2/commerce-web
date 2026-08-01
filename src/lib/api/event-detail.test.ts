import { afterEach, describe, expect, it, vi } from "vitest";
import { eventDetailApi } from "./event-detail";

afterEach(() => vi.unstubAllGlobals());

describe("eventDetailApi preview contract", () => {
  it("uses a known event detail only on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));

    const detail = await eventDetailApi.getEvent(91002);

    expect(detail.design_variant).toBe("MARKET_STORY");
    expect(detail.product_display.mode).toBe("MARKET_CAROUSELS");
    expect(detail.rewards).toHaveLength(3);
    expect(detail.rewards.map((reward) => reward.reward_type)).toEqual(["COUPON", "COUPON", "POINT_EVENT"]);
  });

  it("keeps unknown event 404 errors visible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));

    await expect(eventDetailApi.getEvent(99999)).rejects.toMatchObject({ status: 404 });
  });

  it("pages, sorts and filters preview event products", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(
      () => Promise.resolve(new Response("not found", { status: 404 })),
    ));

    const page = await eventDetailApi.listEventProducts({
      eventID: 91002, limit: 2, offset: 0, sort: "PRICE_ASC", marketID: 900,
    });

    expect(page.mode).toBe("MARKET_CAROUSELS");
    expect(page.items).toHaveLength(2);
    expect(page.items.every((product) => product.market_id === 900)).toBe(true);
    expect(page.items[0].market_profile_image_url).toBe("/images/fashion-placeholder.svg");
    expect(page.items[0].market_follower_count).toBeGreaterThan(0);
    expect(page.items[0].discount_price || page.items[0].base_price)
      .toBeLessThanOrEqual(page.items[1].discount_price || page.items[1].base_price);
  });
});

describe("eventDetailApi reward claim", () => {
  it("sends the selected reward row through the authenticated event endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "ISSUED", event_id: 10, reward_row_id: 20, reward_type: "COUPON", reward_id: 30,
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await eventDetailApi.claimEventReward("token", 10, 20);

    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/events/10/rewards/20/claim");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
  });
});
