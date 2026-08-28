// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuditLogPage } from "@/lib/api/audit";
import { AuditLogExplorer } from "./audit-log-explorer";
import { ConsoleLayout } from "./console-layout";

const apiMocks = vi.hoisted(() => ({
  adminAuditLogs: vi.fn(),
  sellerAuditLogs: vi.fn(),
}));

vi.mock("@/lib/api/audit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/audit")>("@/lib/api/audit");
  return {
    ...actual,
    auditApi: apiMocks,
  };
});

const firstPage: AuditLogPage = {
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
    next_cursor: "cursor-2",
    has_more: true,
  },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderExplorer(scope: "admin" | "seller" = "admin") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConsoleLayout title="Audit" links={[]}>
        <AuditLogExplorer scope={scope} token={`${scope}-token`} />
      </ConsoleLayout>
    </QueryClientProvider>,
  );
}

describe("AuditLogExplorer", () => {
  it("loads 30 newest rows, follows the cursor, and resets it when filters apply", async () => {
    apiMocks.adminAuditLogs.mockResolvedValue(firstPage);
    renderExplorer();

    await waitFor(() => expect(apiMocks.adminAuditLogs).toHaveBeenCalledWith(
      "admin-token",
      expect.objectContaining({ limit: 30, cursor: undefined }),
    ));
    expect((await screen.findAllByText("category.update")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    await waitFor(() => expect(apiMocks.adminAuditLogs).toHaveBeenLastCalledWith(
      "admin-token",
      expect.objectContaining({ limit: 30, cursor: "cursor-2" }),
    ));

    fireEvent.change(screen.getByLabelText("요청 ID"), { target: { value: "request-filter" } });
    fireEvent.click(screen.getByRole("button", { name: "필터 적용" }));
    await waitFor(() => expect(apiMocks.adminAuditLogs).toHaveBeenLastCalledWith(
      "admin-token",
      expect.objectContaining({ request_id: "request-filter", cursor: undefined }),
    ));
  });

  it("changes the server page size and hides admin-only market filtering for sellers", async () => {
    apiMocks.sellerAuditLogs.mockResolvedValue({
      ...firstPage,
      page: { limit: 30, next_cursor: null, has_more: false },
    });
    renderExplorer("seller");

    await waitFor(() => expect(apiMocks.sellerAuditLogs).toHaveBeenCalled());
    expect(screen.queryByLabelText("마켓 ID")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("페이지 크기"), { target: { value: "100" } });
    await waitFor(() => expect(apiMocks.sellerAuditLogs).toHaveBeenLastCalledWith(
      "seller-token",
      expect.objectContaining({ limit: 100, cursor: undefined }),
    ));
    expect(screen.getByLabelText("페이지 크기")).toHaveValue("100");
  });

  it("shows attribution, request, and before/after details", async () => {
    apiMocks.adminAuditLogs.mockResolvedValue(firstPage);
    renderExplorer();

    const detailButtons = await screen.findAllByRole("button", { name: "상세 보기" });
    fireEvent.click(detailButtons[0]);

    expect(screen.getByRole("dialog", { name: "변경 이력 상세" })).toBeInTheDocument();
    expect(screen.getByText("mysql-bin.000001:420")).toBeInTheDocument();
    expect(screen.getByText("변경 전")).toBeInTheDocument();
    expect(screen.getByText("변경 후")).toBeInTheDocument();
    expect(screen.getByText(/아우터/)).toBeInTheDocument();
  });
});
