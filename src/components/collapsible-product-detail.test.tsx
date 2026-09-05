import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollapsibleProductDetail, collapsedProductDetailHeight } from "./collapsible-product-detail";

const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
let detailHeight = 0;

describe("CollapsibleProductDetail", () => {
  beforeEach(() => {
    detailHeight = 0;
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get: () => detailHeight,
    });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    if (originalScrollHeight) {
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollHeight");
    }
  });

  it("uses the mobile and desktop collapse thresholds", () => {
    expect(collapsedProductDetailHeight(375)).toBe(1100);
    expect(collapsedProductDetailHeight(767)).toBe(1100);
    expect(collapsedProductDetailHeight(768)).toBe(1400);
  });

  it("keeps long content collapsed from the first render and toggles it", async () => {
    detailHeight = 1600;
    render(<CollapsibleProductDetail html="<p>긴 상품 정보</p>" />);

    const content = screen.getByTestId("product-detail-content");
    expect(content).toHaveClass("max-h-[1100px]", "md:max-h-[1400px]", "overflow-hidden");
    const more = await screen.findByRole("button", { name: "상품정보 더보기" });
    expect(more).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(more);
    expect(screen.getByRole("button", { name: "상품정보 접기" })).toHaveAttribute("aria-expanded", "true");
    expect(content).toHaveClass("max-h-none", "overflow-visible");
  });

  it("does not show controls for content below the desktop threshold", async () => {
    detailHeight = 1200;
    render(<CollapsibleProductDetail html="<p>짧은 상품 정보</p>" />);

    await waitFor(() => expect(screen.queryByRole("button", { name: "상품정보 더보기" })).not.toBeInTheDocument());
  });

  it("remeasures after an image loads", async () => {
    detailHeight = 1000;
    render(<CollapsibleProductDetail html='<img src="/detail.jpg" alt="상품 디테일">' />);
    expect(screen.queryByRole("button", { name: "상품정보 더보기" })).not.toBeInTheDocument();

    detailHeight = 1700;
    fireEvent.load(screen.getByRole("img", { name: "상품 디테일" }));

    expect(await screen.findByRole("button", { name: "상품정보 더보기" })).toBeInTheDocument();
  });

  it("remeasures when the viewport crosses the mobile breakpoint", async () => {
    detailHeight = 1200;
    render(<CollapsibleProductDetail html="<p>반응형 상품 정보</p>" />);
    expect(screen.queryByRole("button", { name: "상품정보 더보기" })).not.toBeInTheDocument();

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    fireEvent(window, new Event("resize"));

    expect(await screen.findByRole("button", { name: "상품정보 더보기" })).toBeInTheDocument();
  });

  it("restores the detail start when collapsing from below the fold", async () => {
    detailHeight = 1800;
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 2000 });
    render(<CollapsibleProductDetail html="<p>긴 상품 정보</p>" />);

    fireEvent.click(await screen.findByRole("button", { name: "상품정보 더보기" }));
    const content = screen.getByTestId("product-detail-content");
    const root = content.parentElement?.parentElement;
    expect(root).not.toBeNull();
    vi.spyOn(root as HTMLDivElement, "getBoundingClientRect").mockReturnValue({
      x: 0, y: -1800, top: -1800, right: 0, bottom: 0, left: 0, width: 0, height: 0, toJSON: () => ({}),
    });

    fireEvent.click(screen.getByRole("button", { name: "상품정보 접기" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 112, behavior: "smooth" });
  });
});
