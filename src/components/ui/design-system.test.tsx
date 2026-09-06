// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./badge";
import { Button } from "./button";
import { Field } from "./field";
import { Input } from "./input";
import { Notice } from "./notice";
import { BottomSheet, Dialog } from "./overlay";
import { Tabs } from "./tabs";

describe("commerce UI primitives", () => {
  it("keeps the semantic primary and destructive action variants distinct", () => {
    render(<><Button>구매하기</Button><Button variant="danger">주문 취소</Button></>);

    expect(screen.getByRole("button", { name: "구매하기" })).toHaveClass("bg-button-primary", "text-button-primary-content", "enabled:hover:bg-button-primary-hover", "enabled:active:bg-button-primary-pressed");
    expect(screen.getByRole("button", { name: "주문 취소" })).toHaveClass("bg-button-danger");
    expect(screen.getByRole("button", { name: "주문 취소" })).toHaveClass("bg-button-danger");
  });

  it("keeps a disabled button targetable for a not-allowed cursor without enabling it", () => {
    render(<Button disabled>결제하기</Button>);

    const button = screen.getByRole("button", { name: "결제하기" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:cursor-not-allowed");
    expect(button).not.toHaveClass("disabled:pointer-events-none");
  });

  it("connects a field label and error state to an accessible input", () => {
    const view = render(<Field label="이메일" htmlFor="email" error="이메일을 확인해주세요." required><Input id="email" state="error" /></Field>);

    expect(within(view.container).getByLabelText(/이메일/)).toHaveClass("border-status-negative");
    expect(within(view.container).getByRole("alert")).toHaveTextContent("이메일을 확인해주세요.");
  });

  it("communicates notices and badges with a semantic tone", () => {
    const view = render(<><Badge tone="positive">무료배송</Badge><Notice tone="info" title="안내">배송지를 확인해주세요.</Notice><Notice tone="error" title="결제 오류">다시 시도해주세요.</Notice></>);

    expect(within(view.container).getByText("무료배송")).toHaveClass("bg-status-positive-subtle");
    expect(within(view.container).getByText("안내").parentElement?.parentElement).toHaveClass("bg-status-info-subtle");
    expect(within(view.container).getByRole("alert")).toHaveTextContent("결제 오류");
  });

  it("uses a readable border for a default control", () => {
    render(<Input aria-label="검색어" />);

    expect(screen.getByRole("textbox", { name: "검색어" })).toHaveClass("border-border-interactive");
  });

  it("moves a tab selection with arrow keys", () => {
    const onValueChange = vi.fn();
    const view = render(<Tabs ariaLabel="정렬" value="new" onValueChange={onValueChange} items={[{ value: "new", label: "신상품", content: <p>신상품 내용</p> }, { value: "popular", label: "인기", content: <p>인기 내용</p> }]} />);

    const newTab = within(view.container).getByRole("tab", { name: "신상품" });
    expect(newTab).toHaveAttribute("aria-controls");
    expect(within(view.container).getByRole("tabpanel")).toHaveTextContent("신상품 내용");
    fireEvent.keyDown(newTab, { key: "ArrowRight" });

    expect(onValueChange).toHaveBeenCalledWith("popular");
  });

  it("closes a dialog with Escape and releases the scroll lock", () => {
    const onClose = vi.fn();
    const view = render(<Dialog open onClose={onClose} title="확인"><Button>확인</Button></Dialog>);

    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps sheet focus when its close handler changes and uses the latest handler", async () => {
    const firstClose = vi.fn();
    const nextClose = vi.fn();
    const view = render(<BottomSheet open onClose={firstClose} title="수정"><Input aria-label="내용" /></BottomSheet>);
    const dialog = within(view.container).getByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    const input = within(view.container).getByRole("textbox", { name: "내용" });
    input.focus();

    view.rerender(<BottomSheet open onClose={nextClose} title="수정"><Input aria-label="내용" /></BottomSheet>);
    await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

    expect(input).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(firstClose).not.toHaveBeenCalled();
    expect(nextClose).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("only closes the topmost overlay with Escape", () => {
    const parentClose = vi.fn();
    const childClose = vi.fn();
    render(<><Dialog open onClose={parentClose} title="부모"><Button>부모 확인</Button></Dialog><Dialog open onClose={childClose} title="자식"><Button>자식 확인</Button></Dialog></>);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(parentClose).not.toHaveBeenCalled();
    expect(childClose).toHaveBeenCalledTimes(1);
  });
});
