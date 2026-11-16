import { afterEach, describe, expect, it, vi } from "vitest";
import { experimentApi } from "./experiment";

afterEach(() => vi.unstubAllGlobals());

describe("experiment admin API", () => {
  it("uses the commerce bearer token without a shared admin header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ experiments: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await experimentApi.listExperiments({ token: "commerce-admin-token" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(options.headers);
    expect(headers.get("Authorization")).toBe("Bearer commerce-admin-token");
    expect(headers.get("X-Experiment-Admin-Token")).toBeNull();
  });

  it("preserves the latest revision from a conflict response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "experiment revision conflict", current_revision: 9 }), { status: 409 })));

    const request = experimentApi.updateConfig(24, {
      expected_revision: 8,
      value_type: "BOOLEAN",
      default_value: false,
      include_anonymous: false,
      variants: [],
      targeting_rules: [],
      overrides: [],
      conclusion: "UNDECIDED",
      change_reason: "test",
    }, { token: "token" });

    await expect(request).rejects.toMatchObject({ status: 409, currentRevision: 9 });
  });
});
