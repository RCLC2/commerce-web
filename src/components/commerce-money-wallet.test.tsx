import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommerceMoneyWallet } from "./commerce-money-wallet";

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  isPrimary: boolean;
  pointerType: string;
  constructor(type: string, options: PointerEventInit = {}) {
    super(type, options);
    this.pointerId = options.pointerId ?? 1;
    this.isPrimary = options.isPrimary ?? true;
    this.pointerType = options.pointerType ?? "mouse";
  }
}

beforeEach(() => { vi.stubGlobal("PointerEvent", TestPointerEvent); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderWallet() {
  render(<CommerceMoneyWallet pointBalance={12500} pointsError={false} onRetryPoints={vi.fn()} />);
  const viewport = screen.getByRole("group", { name: "머니·카드 슬라이드" });
  Object.assign(viewport, { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() });
  return { viewport, info: screen.getByRole("region", { name: "선택한 결제수단 정보" }) };
}

function swipe(viewport: HTMLElement, dx: number, dy = 0, cancel = false) {
  fireEvent.pointerDown(viewport, { pointerId: 1, isPrimary: true, button: 0, clientX: 160, clientY: 200 });
  fireEvent.pointerMove(viewport, { pointerId: 1, isPrimary: true, clientX: 160 + dx, clientY: 200 + dy });
  if (cancel) fireEvent.pointerCancel(viewport, { pointerId: 1 });
  else fireEvent.pointerUp(viewport, { pointerId: 1, isPrimary: true, clientX: 160 + dx, clientY: 200 + dy });
}

describe("commerce money wallet", () => {
  it("puts money first and shows selected method information above a unified slider", () => {
    const { viewport, info } = renderWallet();
    expect(screen.getByRole("region", { name: "commerce money" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(within(info).getByRole("heading", { name: "보유 포인트" })).toBeInTheDocument();
    expect(within(info).queryByText("commerce money")).not.toBeInTheDocument();
    expect(within(info).queryByText("머니")).not.toBeInTheDocument();
    expect(within(info).getByText("12,500")).toBeInTheDocument();
    expect(info.compareDocumentPosition(viewport) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(viewport).getByRole("button", { name: "머니 상세 보기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전 결제수단" })).toBeDisabled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/배송지|Commerce Pay|머니 잔액/)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const next = screen.getByRole("button", { name: "다음 결제수단" });
    for (const [name, product] of [["현대카드", "ZERO Edition3 Metal"], ["신한카드", "Mr.Life"], ["KB국민카드", "My WE:SH"]]) {
      fireEvent.click(next);
      expect(within(info).getByRole("heading", { name })).toBeInTheDocument();
      expect(within(info).getByText(product)).toBeInTheDocument();
      expect(within(info).queryByRole("definition")).not.toBeInTheDocument();
      expect(within(info).queryByText("보유 포인트")).not.toBeInTheDocument();
      expect(within(viewport).getAllByRole("button")).toHaveLength(1);
    }
    expect(next).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("KB국민카드4 / 4");
  });

  it("keeps information on the selected slide when another card is hovered or focused", () => {
    const { viewport, info } = renderWallet();
    const card = within(viewport).getByRole("button", { name: "현대카드 상세 보기", hidden: true });
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    fireEvent.focus(card);
    expect(within(info).getByRole("heading", { name: "보유 포인트" })).toBeInTheDocument();
    expect(within(info).getByText("보유 포인트")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("머니1 / 4");
    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    expect(within(info).getByRole("heading", { name: "보유 포인트" })).toBeInTheDocument();
    expect(within(info).getByText("12,500")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음 결제수단" }));
    expect(within(info).getByRole("heading", { name: "현대카드" })).toBeInTheDocument();
  });

  it("swipes in both directions without opening details and ignores short, vertical, and cancelled drags", () => {
    const { viewport, info } = renderWallet();
    swipe(viewport, -100);
    expect(within(info).getByRole("heading", { name: "현대카드" })).toBeInTheDocument();
    fireEvent.click(viewport);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    swipe(viewport, -100);
    expect(within(info).getByRole("heading", { name: "신한카드" })).toBeInTheDocument();
    swipe(viewport, 100);
    expect(within(info).getByRole("heading", { name: "현대카드" })).toBeInTheDocument();
    swipe(viewport, -20);
    swipe(viewport, -80, 0, true);
    swipe(viewport, -20, 140);
    expect(within(info).getByRole("heading", { name: "현대카드" })).toBeInTheDocument();
    swipe(viewport, 100);
    swipe(viewport, 100);
    expect(within(info).getByRole("heading", { name: "보유 포인트" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전 결제수단" })).toBeDisabled();
  });

  it("supports keyboard navigation across money and cards with stable focus", () => {
    const { viewport, info } = renderWallet();
    viewport.focus();
    fireEvent.keyDown(viewport, { key: "End" });
    expect(within(info).getByRole("heading", { name: "KB국민카드" })).toBeInTheDocument();
    expect(viewport).toHaveFocus();
    fireEvent.keyDown(viewport, { key: "ArrowLeft" });
    expect(within(info).getByRole("heading", { name: "신한카드" })).toBeInTheDocument();
    fireEvent.keyDown(viewport, { key: "Home" });
    expect(within(info).getByRole("heading", { name: "보유 포인트" })).toBeInTheDocument();
  });

  it("keeps a touch drag active when implicit child capture transfers to the viewport", () => {
    const { viewport, info } = renderWallet();
    const card = within(viewport).getByRole("button", { name: "머니 상세 보기" });
    fireEvent.pointerDown(card, { pointerId: 1, isPrimary: true, button: 0, clientX: 160, clientY: 200 });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 140, clientY: 200 });
    fireEvent(card, new TestPointerEvent("lostpointercapture", { bubbles: true, pointerId: 1 }));
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 60, clientY: 200 });
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 60, clientY: 200 });
    expect(within(info).getByRole("heading", { name: "현대카드" })).toBeInTheDocument();
    fireEvent.click(viewport);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens card or money information in the existing sheet and preserves selection and focus", async () => {
    const { viewport, info } = renderWallet();
    const moneyInfo = within(viewport).getByRole("button", { name: "머니 상세 보기" });
    moneyInfo.focus();
    fireEvent.click(moneyInfo);
    expect(screen.getByRole("dialog", { name: "머니" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(moneyInfo).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "다음 결제수단" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 결제수단" }));
    const card = within(viewport).getByRole("button", { name: "신한카드 상세 보기" });
    card.focus();
    fireEvent.click(card);
    const sheet = screen.getByRole("dialog", { name: "신한카드" });
    expect(within(sheet).getByText("Mr.Life")).toBeInTheDocument();
    expect(within(sheet).queryByRole("definition")).not.toBeInTheDocument();
    expect(within(sheet).queryByText("보유 포인트")).not.toBeInTheDocument();
    expect(within(sheet).queryByRole("link")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(card).toHaveFocus();
    expect(within(info).getByRole("heading", { name: "신한카드" })).toBeInTheDocument();
  });

  it("opens payment method guidance with a close action and no checkout navigation", async () => {
    renderWallet();
    const add = screen.getByRole("button", { name: "결제수단 추가" });
    add.focus();
    fireEvent.click(add);
    const sheet = screen.getByRole("dialog", { name: "결제수단 추가" });
    expect(within(sheet).getByRole("button", { name: /머니 · commerce money/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(sheet).queryByRole("link")).not.toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: /신용·체크카드/ }));
    expect(within(sheet).getByRole("button", { name: /신용·체크카드/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(sheet).queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: "확인" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(add).toHaveFocus();
  });

  it("distinguishes unknown points, errors, and genuine zero in the upper information panel", () => {
    const onRetryPoints = vi.fn();
    const view = render(<CommerceMoneyWallet pointBalance={null} pointsError={false} onRetryPoints={onRetryPoints} />);
    expect(screen.getByRole("status", { name: "결제 포인트를 불러오는 중입니다." })).toBeInTheDocument();
    view.rerender(<CommerceMoneyWallet pointBalance={null} pointsError onRetryPoints={onRetryPoints} />);
    fireEvent.click(screen.getByRole("button", { name: "포인트 다시 확인" }));
    expect(onRetryPoints).toHaveBeenCalledOnce();
    view.rerender(<CommerceMoneyWallet pointBalance={0} pointsError={false} onRetryPoints={onRetryPoints} />);
    expect(within(screen.getByRole("region", { name: "선택한 결제수단 정보" })).getByText("0")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "결제 포인트를 불러오는 중입니다." })).not.toBeInTheDocument();
  });

  it("uses money naming in help and restores focus when closed", async () => {
    renderWallet();
    const trigger = screen.getByRole("button", { name: "머니 이용안내" });
    trigger.focus();
    fireEvent.click(trigger);
    const sheet = screen.getByRole("dialog", { name: "머니 이용안내" });
    expect(within(sheet).getByText(/카드 정보는 결제창에서 입력해요/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
