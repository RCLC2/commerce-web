// @vitest-environment jsdom

import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./ui/overlay";
import { StatusBadge } from "./console-layout";
import { ConsoleModal } from "./console-ui";

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
