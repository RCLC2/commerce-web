// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ButtonDemo } from "./button-demo";
import { FieldDemo } from "./field-demo";
import { FilterChipDemo } from "./filter-chip-demo";
import { QuantityStepperDemo } from "./quantity-stepper-demo";
import { PurchaseDemo } from "./purchase-demo";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

afterEach(cleanup);

describe("design system examples", () => {
  it("saves and resets without showing instructions as feedback", () => {
    const view = render(<ButtonDemo />);
    const ui = within(view.container);
    expect(ui.getByRole("status")).toBeEmptyDOMElement();
    expect(ui.getByRole("button", { name: "비활성" })).toBeDisabled();
    fireEvent.click(ui.getByRole("button", { name: "저장" }));
    expect(ui.getByRole("status")).toHaveTextContent("저장했어요.");
    fireEvent.click(ui.getByRole("button", { name: "초기화" }));
    expect(ui.getByRole("status")).toBeEmptyDOMElement();
  });

  it("validates the actual field value after blur", () => {
    const view = render(<FieldDemo />);
    const ui = within(view.container);
    const input = ui.getByRole("textbox", { name: "이메일" });
    fireEvent.change(input, { target: { value: "invalid" } });
    fireEvent.blur(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(ui.getByRole("alert")).toHaveTextContent(
      "이메일 형식을 확인해주세요.",
    );
    fireEvent.change(input, { target: { value: "name@example.com" } });
    fireEvent.blur(input);
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(ui.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("filters the displayed list and restores it on deselection", () => {
    const view = render(<FilterChipDemo />);
    const ui = within(view.container);
    const filter = ui.getByRole("button", { name: "무료배송" });
    expect(ui.getAllByRole("listitem")).toHaveLength(3);
    fireEvent.click(filter);
    expect(filter).toHaveAttribute("aria-pressed", "true");
    expect(ui.getAllByRole("listitem")).toHaveLength(2);
    expect(ui.queryByText("코튼 티셔츠")).not.toBeInTheDocument();
    fireEvent.click(filter);
    expect(ui.getAllByRole("listitem")).toHaveLength(3);
  });

  it("disables quantity actions at both bounds", () => {
    const view = render(<QuantityStepperDemo />);
    const ui = within(view.container);
    const decrease = ui.getByRole("button", { name: "수량 줄이기" });
    const increase = ui.getByRole("button", { name: "수량 늘리기" });
    expect(decrease).toBeDisabled();
    for (let count = 0; count < 4; count += 1) fireEvent.click(increase);
    expect(ui.getByRole("status")).toHaveTextContent("5");
    expect(increase).toBeDisabled();
    for (let count = 0; count < 4; count += 1) fireEvent.click(decrease);
    expect(ui.getByRole("status")).toHaveTextContent("1");
    expect(decrease).toBeDisabled();
  });

  it("does not submit a surrounding form when changing quantity", () => {
    const submit = vi.fn((event) => event.preventDefault());
    const change = vi.fn();
    const view = render(
      <form onSubmit={submit}>
        <QuantityStepper value={1} onValueChange={change} label="셔츠 수량" />
      </form>,
    );
    fireEvent.click(
      within(view.container).getByRole("button", { name: "셔츠 수량 늘리기" }),
    );
    expect(change).toHaveBeenCalledWith(2);
    expect(submit).not.toHaveBeenCalled();
  });

  it("uses the selected quantity for the total, cart additions and purchase", () => {
    const view = render(<PurchaseDemo />);
    const ui = within(view.container);
    const increase = ui.getByRole("button", { name: "수량 늘리기" });
    const total = ui.getByLabelText("상품 합계");
    expect(total).toHaveTextContent("29,900원");
    fireEvent.click(increase);
    expect(total).toHaveTextContent("59,800원");
    fireEvent.click(ui.getByRole("button", { name: "장바구니" }));
    expect(ui.getByText(/장바구니에 총 2개/)).toBeInTheDocument();
    fireEvent.click(increase);
    expect(total).toHaveTextContent("89,700원");
    fireEvent.click(ui.getByRole("button", { name: "장바구니" }));
    expect(ui.getByText(/장바구니에 총 5개/)).toBeInTheDocument();
    fireEvent.click(ui.getByRole("button", { name: "구매하기" }));
    expect(
      ui.getByText("상품 3개 · 89,700원 주문을 선택했어요."),
    ).toBeInTheDocument();
  });

});
