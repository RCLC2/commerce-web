// @vitest-environment jsdom

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
