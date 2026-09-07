import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Pagination } from "./pagination";
afterEach(cleanup);
it("selects page numbers and accepts only valid page jumps", () => {
  const change=vi.fn();render(<Pagination page={1} totalPages={8} onChange={change} />);
  expect(screen.getByRole("button", {name:"이전 페이지"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"8페이지"}));expect(change).toHaveBeenLastCalledWith(8);
  fireEvent.change(screen.getByRole("spinbutton"),{target:{value:"9"}});expect(screen.getByRole("button",{name:"이동"})).toBeDisabled();
  fireEvent.change(screen.getByRole("spinbutton"),{target:{value:"4"}});fireEvent.click(screen.getByRole("button",{name:"이동"}));expect(change).toHaveBeenLastCalledWith(4);
});
it("supports older category responses without a total and locks while loading", () => {
  const change=vi.fn();const view=render(<Pagination page={2} hasNext onChange={change} />);
  fireEvent.click(screen.getByRole("button",{name:"3페이지"}));expect(change).toHaveBeenCalledWith(3);
  view.rerender(<Pagination page={2} hasNext disabled onChange={change} />);
  expect(screen.getByRole("button",{name:"다음 페이지"})).toBeDisabled();
});
