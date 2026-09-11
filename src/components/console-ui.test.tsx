// @vitest-environment jsdom

import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./ui/overlay";
import { StatusBadge } from "./console-layout";
import {
  advanceConsoleUrlSync,
  ConsoleModal,
  ConsoleTable,
  createConsoleUrlSyncState,
} from "./console-ui";

describe("ConsoleModal stack", () => {
  it("closes only the top modal for each Escape key press", () => {
    const closeParent = vi.fn();
    const closeChild = vi.fn();
    const view = render(
      <>
        <ConsoleModal open title="parent" onClose={closeParent}>parent body</ConsoleModal>
        <ConsoleModal open title="child" onClose={closeChild}>child body</ConsoleModal>
      </>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(closeChild).toHaveBeenCalledTimes(1);
    expect(closeParent).not.toHaveBeenCalled();

    view.rerender(
      <>
        <ConsoleModal open title="parent" onClose={closeParent}>parent body</ConsoleModal>
        <ConsoleModal open={false} title="child" onClose={closeChild}>child body</ConsoleModal>
      </>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closeParent).toHaveBeenCalledTimes(1);
  });
});

it("distinguishes payment completion from settlement completion", () => {
  const view = render(<><StatusBadge value="PAID" /><StatusBadge value="PAID" context="settlement" /></>);
  expect(view.getByText("결제 완료")).toBeInTheDocument();
  expect(view.getByText("지급 완료")).toBeInTheDocument();
});

it("keeps keyboard focus in the top overlay across shared and console dialogs", async () => {
  const view = render(<ConsoleModal open title="상품 편집" onClose={() => {}}>
    <button>상위 작업</button>
    <Dialog open title="수정 확인" onClose={() => {}}><button>하위 작업</button></Dialog>
  </ConsoleModal>);
  const child = view.getByRole("dialog", { name: "수정 확인" });
  const first = within(child).getByRole("button", { name: "대화상자 닫기" });
  await waitFor(() => expect(first).toHaveFocus());
  const last = within(child).getByRole("button", { name: "하위 작업" });
  last.focus();
  fireEvent.keyDown(window, { key: "Tab" });
  expect(first).toHaveFocus();
});

it("keeps nested table actions independent from row activation", () => {
  const onRowClick = vi.fn();
  const view = render(
    <ConsoleTable
      columns={["마켓", "관리"]}
      rows={[["테스트 마켓", <button key="penalty" type="button">페널티</button>]]}
      onRowClick={onRowClick}
    />,
  );

  const actionButtons = view.getAllByRole("button", { name: "페널티" });
  fireEvent.click(actionButtons[0]);
  fireEvent.keyDown(actionButtons[0], { key: "Enter" });
  expect(onRowClick).not.toHaveBeenCalled();
  expect(view.getAllByRole("button", { name: "상세 보기" })).toHaveLength(1);
});

it("replaces the URL again when a rapid filter change returns to an earlier query", () => {
  let state = createConsoleUrlSyncState("");

  let result = advanceConsoleUrlSync(state, "", "q=a");
  expect(result.action).toBe("replace");
  state = result.state;

  result = advanceConsoleUrlSync(state, "", "q=ab");
  expect(result.action).toBe("replace");
  state = result.state;

  result = advanceConsoleUrlSync(state, "", "q=a");
  expect(result.action).toBe("replace");
  state = result.state;

  result = advanceConsoleUrlSync(state, "q=ab", "q=a");
  expect(result.action).toBe("replace");
  expect(result.state.latestRequestedQuery).toBe("q=a");
  state = result.state;

  result = advanceConsoleUrlSync(state, "q=a", "q=a");
  expect(result.action).toBe("none");
  result = advanceConsoleUrlSync(result.state, "q=ab", "q=a", true);
  expect(result.action).toBe("external");

  result = advanceConsoleUrlSync(result.state, "q=a", "q=a", true);
  expect(result.action).toBe("external");
});
