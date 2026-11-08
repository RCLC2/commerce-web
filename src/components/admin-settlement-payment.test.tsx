// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminConsoleApi, adminSettlementDetailSchema, adminSettlementListItemSchema } from "@/lib/admin-console-api";
import { AdminSettlementsPageV2 } from "./admin-commerce-v2";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/settlements",
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("./admin-console", () => ({ useAdminToken: () => "test-admin", adminLinks: [], AdminAuthRequired: () => null }));
vi.mock("./console-layout", async (importOriginal) => ({
  ...await importOriginal<typeof import("./console-layout")>(),
  ConsoleLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/lib/admin-console-api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/admin-console-api")>(),
  adminConsoleApi: { settlements: vi.fn(), settlement: vi.fn(), markSettlementPaid: vi.fn() },
}));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

async function openSettlement(status: string) {
  const settlement = adminSettlementDetailSchema.parse({
    id: 119, market_id: 1, market_name: "검증 마켓", target_month: "2026-10", status,
    total_sales_amount: 29900, total_return_shipping_fee: 0, commission_amount: 2990,
    final_settlement_amount: 26910, refund_deduction_amount: 26910, payable_amount: 0,
    outstanding_refund_amount: status === "PAID" ? 0 : 26910,
    created_at: "2026-10-12T12:00:00Z", updated_at: "2026-10-12T12:00:00Z",
    lines: { items: [], page: 1, page_size: 20, total: 0, total_pages: 1 },
  });
  vi.mocked(adminConsoleApi.settlements).mockResolvedValue({
    items: [adminSettlementListItemSchema.parse(settlement)], page: 1, page_size: 20, total: 1, total_pages: 1,
  });
  vi.mocked(adminConsoleApi.settlement).mockResolvedValue(settlement);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AdminSettlementsPageV2 /></QueryClientProvider>);
  const markets = await screen.findAllByText("검증 마켓");
  fireEvent.click(markets[0]);
  const dialog = await screen.findByRole("dialog", { name: "검증 마켓 2026-10 정산" });
  await within(dialog).findByText("원래 정산액");
  return dialog;
}

describe("settlement payment controls", () => {
  it.each(["PREPARED", "EXCLUDED", "PAID"])("does not offer payout for %s", async (status) => {
    const dialog = await openSettlement(status);
    expect(within(dialog).queryByRole("button", { name: "지급 완료 처리" })).not.toBeInTheDocument();
    expect(within(dialog).getByText(status === "PAID" ? "차감 완료액" : "차감 예정액")).toBeInTheDocument();
    expect(adminConsoleApi.markSettlementPaid).not.toHaveBeenCalled();
  });

  it("shows the zero net payout and requires confirmation before recording it", async () => {
    const detail = await openSettlement("CONFIRMED");
    fireEvent.click(within(detail).getByRole("button", { name: "지급 완료 처리" }));
    const confirmation = await screen.findByRole("dialog", { name: "정산 지급 완료" });
    expect(within(confirmation).getByText("원래 정산액")).toBeInTheDocument();
    expect(within(confirmation).getByText("환불 차감액")).toBeInTheDocument();
    expect(within(confirmation).getByText("0원")).toBeInTheDocument();
    expect(within(confirmation).getByText(/은행 송금은 실행되지 않습니다/)).toBeInTheDocument();
    expect(adminConsoleApi.markSettlementPaid).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByRole("button", { name: "취소" }));
    expect(adminConsoleApi.markSettlementPaid).not.toHaveBeenCalled();
  });
});
