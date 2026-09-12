// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PageLayout } from "./page-layout";

describe("PageLayout", () => {
  afterEach(cleanup);

  it("renders one semantic main with the shared shopping layout", () => {
    const { container } = render(<PageLayout>상품</PageLayout>);
    const main = screen.getByRole("main");

    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(main).toHaveClass(
      "max-w-6xl",
      "px-4",
      "pb-[calc(5rem+env(safe-area-inset-bottom))]",
      "min-h-[60vh]",
    );
  });

  it.each([
    ["auth", ["max-w-md", "items-center", "min-h-[calc(100dvh-4rem)]", "pb-[calc(5rem+env(safe-area-inset-bottom))]"]],
    ["payment", ["max-w-xl", "pt-16", "pb-[calc(5rem+env(safe-area-inset-bottom))]", "text-center"]],
    ["console", ["max-w-7xl", "grid", "pt-5", "pb-[calc(5rem+env(safe-area-inset-bottom))]"]],
    ["onboarding", ["min-h-screen", "overflow-hidden", "pb-10"]],
    ["product-detail", ["max-w-6xl", "pb-[calc(11rem+env(safe-area-inset-bottom))]"]],
  ] as const)("applies the %s variant contract", (variant, classes) => {
    render(<PageLayout variant={variant}>화면</PageLayout>);

    expect(screen.getByRole("main")).toHaveClass(...classes);
  });
});
