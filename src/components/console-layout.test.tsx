import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleActionField, ConsoleLayout, DataTable, FilterField, FilterPanel } from "./console-layout";

let pathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

afterEach(() => {
  cleanup();
  pathname = "/admin";
});

describe("DataTable", () => {
  it("uses an internally scrollable desktop table and labeled mobile cards", () => {
    render(
      <DataTable
        columns={["데이터 주소", "작업"]}
        rows={[["/api/v1/products/this-is-a-long-endpoint", <button key="edit" type="button">수정</button>]]}
      />,
    );

    const table = screen.getByRole("table");

    expect(table).toHaveClass("min-w-max");
    expect(table.parentElement).toHaveClass("hidden", "md:block", "overflow-x-auto", "overscroll-x-contain");
    expect(screen.getAllByText("데이터 주소")).toHaveLength(2);
    expect(document.querySelector("[class*='md:hidden']")).toHaveClass("md:hidden");
  });

  it("can keep a dense table in labeled cards through narrow desktop widths", () => {
    render(
      <DataTable
        columns={["쿠폰", "작업"]}
        rows={[["신규 회원 쿠폰", <button key="issue" type="button">발급</button>]]}
        cardBreakpoint="xl"
      />,
    );

    const table = screen.getByRole("table");

    expect(table.parentElement).toHaveClass("hidden", "xl:block");
    expect(document.querySelector("[class~='xl:hidden']")).toHaveClass("xl:hidden");
  });

  it("uses the shared illustrated empty state", () => {
    render(
      <DataTable
        columns={["광고"]}
        rows={[]}
        emptyText="검수할 광고 캠페인이 없습니다."
        emptyDescription="새 캠페인이 등록되면 이곳에서 확인할 수 있습니다."
      />,
    );

    expect(screen.getByText("검수할 광고 캠페인이 없습니다.")).toBeVisible();
    expect(screen.getByText("새 캠페인이 등록되면 이곳에서 확인할 수 있습니다.")).toBeVisible();
    expect(screen.getByText("검수할 광고 캠페인이 없습니다.").parentElement?.querySelector("svg")).toBeTruthy();
  });

  it("shows a spinner instead of the empty state while data is loading", () => {
    render(<DataTable columns={["광고"]} rows={[]} isLoading />);

    expect(screen.getByRole("status", { name: "불러오는 중입니다." })).toBeVisible();
    expect(screen.queryByText("표시할 데이터가 없습니다.")).not.toBeInTheDocument();
  });

  it("does not associate an action label with a mutation button", () => {
    render(
      <ConsoleActionField>
        <button type="button">등록</button>
      </ConsoleActionField>,
    );

    expect(screen.getByText("작업").tagName).toBe("P");
    expect(screen.getByRole("button", { name: "등록" }).closest("label")).toBeNull();
  });
});

describe("ConsoleLayout navigation", () => {
  it("keeps navigation collapsed on mobile until its accessible toggle is pressed", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ConsoleLayout title="관리자" links={[{ href: "/admin", label: "홈" }, { href: "/admin/orders", label: "주문" }]}>
          <p>콘솔 본문</p>
        </ConsoleLayout>
      </QueryClientProvider>,
    );

    const toggle = screen.getByRole("button", { name: "탐색 열기" });
    const navigation = screen.getByRole("navigation");

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", navigation.id);
    expect(navigation).toHaveClass("hidden", "md:grid", "md:grid-cols-1");
    expect(navigation.closest("aside")).toHaveClass("border-b", "bg-transparent", "md:border", "md:bg-surface-raised");
    expect(toggle.parentElement).toHaveClass("md:px-3", "md:py-2");
    expect(toggle).not.toHaveClass("border", "shadow-card");
    expect(toggle).toHaveClass("focus-visible:ring-2", "focus-visible:ring-action-primary");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "탐색 닫기" })).toHaveAttribute("aria-expanded", "true");
    expect(navigation).toHaveClass("grid", "md:grid", "md:grid-cols-1");
    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");

    const navigationEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    navigationEvent.preventDefault();
    fireEvent(screen.getByRole("link", { name: "주문" }), navigationEvent);

    expect(screen.getByRole("button", { name: "탐색 열기" })).toHaveAttribute("aria-expanded", "false");
    expect(navigation).toHaveClass("hidden", "md:grid");
  });
});

describe("FilterPanel", () => {
  it("keeps the default three and four column console layout", () => {
    render(
      <FilterPanel>
        <FilterField label="검색"><input /></FilterField>
      </FilterPanel>,
    );

    const panel = screen.getByText("검색").closest("label")?.parentElement;

    expect(panel).toHaveClass("md:grid-cols-3", "xl:grid-cols-4");
    expect(panel).not.toHaveClass("lg:grid-cols-2");
  });

  it("can stack a two-field layout until the large console breakpoint", () => {
    render(
      <FilterPanel layout="two-columns-at-lg">
        <FilterField label="검색"><input /></FilterField>
        <FilterField label="상태"><select><option>전체 상태</option></select></FilterField>
      </FilterPanel>,
    );

    const panel = screen.getByText("검색").closest("label")?.parentElement;

    expect(panel).toHaveClass("lg:grid-cols-2");
    expect(panel).not.toHaveClass("md:grid-cols-3", "xl:grid-cols-4");
  });
});
