import { afterEach, describe, expect, it, vi } from "vitest";
import { auditApi, auditLogPageSchema } from "./audit";

afterEach(() => vi.unstubAllGlobals());

const auditPage = {
  items: [
    {
      id: 41,
      transaction_id: "mysql-bin.000001:420",
      schema_name: "commerce",
      table_name: "categories",
      row_ordinal: 0,
      operation: "UPDATE",
      primary_key: { id: 7 },
      record_key: "7",
      before_data: { name: "상의" },
      after_data: { name: "아우터" },
      audit_action_id: "action-1",
      request_id: "request-1",
      actor_member_id: 9,
      actor_role: "ADMIN",
      market_id: 3,
      action: "category.update",
      target_type: "category",
      target_id: "7",
      attribution_status: "ATTRIBUTED",
      occurred_at: "2026-08-29T01:02:03Z",
      received_at: "2026-08-29T01:02:04Z",
    },
  ],
  page: {
    limit: 30,
    next_cursor: "next-opaque-cursor",
    has_more: true,
  },
};

describe("auditApi", () => {
  it("requests the admin cursor endpoint with supported filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(auditPage), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const page = await auditApi.adminAuditLogs("admin-token", {
      q: "category",
      actor_role: "ADMIN",
      market_id: 3,
      operation: "UPDATE",
      limit: 30,
      cursor: "current-cursor",
    });

    const [requestedURL] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(requestedURL, "http://commerce-web.test");
    expect(url.pathname).toBe("/api/v1/admin/audit-logs");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      q: "category",
      actor_role: "ADMIN",
      market_id: "3",
      operation: "UPDATE",
      limit: "30",
      cursor: "current-cursor",
    });
    expect(page.items[0]).toMatchObject({ record_key: "7", actor_role: "ADMIN" });
    expect(page.page).toEqual({
      limit: 30,
      next_cursor: "next-opaque-cursor",
      has_more: true,
    });
  });

  it("uses the seller endpoint and omits empty filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...auditPage, page: { limit: 10, next_cursor: null, has_more: false } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await auditApi.sellerAuditLogs("seller-token", {
      q: "",
      request_id: undefined,
      limit: 10,
    });

    const [requestedURL] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(requestedURL, "http://commerce-web.test");
    expect(url.pathname).toBe("/api/v1/seller/audit-logs");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.has("request_id")).toBe(false);
  });
});

describe("auditLogPageSchema", () => {
  it("accepts unattributed rows without actor and request fields", () => {
    const result = auditLogPageSchema.parse({
      items: [
        {
          ...auditPage.items[0],
          audit_action_id: undefined,
          request_id: undefined,
          actor_member_id: undefined,
          actor_role: undefined,
          market_id: undefined,
          action: undefined,
          target_type: undefined,
          target_id: undefined,
          attribution_status: "UNATTRIBUTED",
        },
      ],
      page: { limit: 30, next_cursor: null, has_more: false },
    });

    expect(result.items[0].attribution_status).toBe("UNATTRIBUTED");
    expect(result.items[0].actor_member_id).toBeUndefined();
  });
});
