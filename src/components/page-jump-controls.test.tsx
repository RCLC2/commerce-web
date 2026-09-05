import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageJumpControls } from "./page-jump-controls";

describe("PageJumpControls", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(cleanup);

  it("moves to both document boundaries with accessible controls", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    Object.defineProperty(document.body, "scrollHeight", { configurable: true, value: 4200 });
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 5000 });
    render(<PageJumpControls />);

    fireEvent.click(screen.getByRole("button", { name: "페이지 최상단으로 이동" }));
    fireEvent.click(screen.getByRole("button", { name: "페이지 최하단으로 이동" }));

    expect(scrollTo).toHaveBeenNthCalledWith(1, { top: 0, behavior: "smooth" });
    expect(scrollTo).toHaveBeenNthCalledWith(2, { top: 5000, behavior: "smooth" });
    expect(screen.getByRole("navigation", { name: "페이지 빠른 이동" })).toHaveClass(
      "fixed",
      "bottom-[calc(10.5rem+env(safe-area-inset-bottom))]",
      "md:bottom-24",
    );
  });

  it("respects reduced-motion preferences", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    render(<PageJumpControls />);

    fireEvent.click(screen.getByRole("button", { name: "페이지 최상단으로 이동" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });
});
