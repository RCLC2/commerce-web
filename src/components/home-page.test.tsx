import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CMSHomeSection, CommerceEvent, Product } from "@/lib/types";
import { EventCarousel, ProductCarouselSection, usesEdgeChevronControls } from "./home-page";

vi.mock("./safe-image", () => ({
  SafeImage: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

const events: CommerceEvent[] = [
  { id: 1, title: "첫 이벤트", subtitle: "첫 혜택", image_url: "/first.jpg", link_url: "", status: "ACTIVE", starts_at: null, ends_at: null },
  { id: 2, title: "둘째 이벤트", subtitle: "둘째 혜택", image_url: "/second.jpg", link_url: "", status: "ACTIVE", starts_at: null, ends_at: null },
  { id: 3, title: "셋째 이벤트", subtitle: "셋째 혜택", image_url: "/third.jpg", link_url: "", status: "ACTIVE", starts_at: null, ends_at: null },
];

const product: Product = {
  id: 1,
  market_id: 1,
  category_id: 1,
  name: "캐러셀 상품",
  description: "",
  base_price: 10_000,
  discount_price: 0,
  shipping_type: "NORMAL",
  popularity_score: 1,
  status: "SELLING",
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("EventCarousel", () => {
  it("uses sm+ 48px chevrons with 24px icons", () => {
    render(<EventCarousel events={events} />);

    const previousButton = screen.getByRole("button", { name: "이전 이벤트" });
    const nextButton = screen.getByRole("button", { name: "다음 이벤트" });

    expect(previousButton).toHaveClass("h-12", "w-12");
    expect(previousButton).toHaveClass("focus-visible:outline-content-inverse");
    expect(previousButton.firstElementChild).toHaveAttribute("width", "24");
    expect(previousButton.parentElement).toHaveClass("hidden", "sm:flex");
    expect(nextButton).toHaveClass("h-12", "w-12");
    expect(nextButton).not.toHaveClass("-translate-x-2");
    expect(nextButton.firstElementChild).toHaveAttribute("width", "24");
    expect(nextButton.parentElement).toHaveClass("hidden", "sm:flex");
  });

  it("automatically advances every three seconds and wraps around", () => {
    render(<EventCarousel events={events} />);

    expect(screen.getByText("1/3")).toBeVisible();
    act(() => vi.advanceTimersByTime(2_999));
    expect(screen.getByText("1/3")).toBeVisible();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("2/3")).toBeVisible();
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByText("3/3")).toBeVisible();
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByText("1/3")).toBeVisible();
  });

  it("restarts the countdown after a manual move", () => {
    render(<EventCarousel events={events} />);

    act(() => vi.advanceTimersByTime(2_000));
    fireEvent.click(screen.getByRole("button", { name: "다음 이벤트" }));
    expect(screen.getByText("2/3")).toBeVisible();

    act(() => vi.advanceTimersByTime(2_999));
    expect(screen.getByText("2/3")).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("3/3")).toBeVisible();
  });

  it("pauses while hovered or focused and resumes with a fresh countdown", () => {
    render(<EventCarousel events={events} />);
    const carousel = screen.getByRole("region", { name: "진행 중인 이벤트" });

    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(6_000));
    expect(screen.getByText("1/3")).toBeVisible();
    fireEvent.mouseLeave(carousel);
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByText("2/3")).toBeVisible();

    const nextButton = screen.getByRole("button", { name: "다음 이벤트" });
    fireEvent.focus(nextButton);
    act(() => vi.advanceTimersByTime(6_000));
    expect(screen.getByText("2/3")).toBeVisible();
    fireEvent.blur(nextButton);
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByText("3/3")).toBeVisible();
  });
});

describe("ProductCarouselSection", () => {
  it("uses edge chevrons only for popular or promotion CMS endpoints", () => {
    const section = (api_url: string) => ({ id: 1, sequence: 1, title: "상품", api_url, status: "ACTIVE" }) satisfies CMSHomeSection;

    expect(usesEdgeChevronControls(section("/api/v1/products/popular?limit=8"))).toBe(true);
    expect(usesEdgeChevronControls(section("https://commerce.example/api/v1/products/promotions"))).toBe(true);
    expect(usesEdgeChevronControls(section("/api/v1/products/popular/"))).toBe(true);
    expect(usesEdgeChevronControls(section("/api/v1/products/latest"))).toBe(false);
    expect(usesEdgeChevronControls(section("/api/v1/products?sort=popular"))).toBe(false);
    expect(usesEdgeChevronControls(section("http://["))).toBe(false);
  });

  it.each(["인기 상품", "프로모션 상품"])("moves the %s carousel with sm+ event-style overlay chevrons", (title) => {
    render(
      <ProductCarouselSection
        title={title}
        description=""
        products={[product]}
        isLoading={false}
        isSuccess
        error={null}
        onRetry={vi.fn()}
        edgeChevronControls
      />,
    );

    const productLink = screen.getByRole("link", { name: /캐러셀 상품/ });
    const carousel = productLink.parentElement?.parentElement as HTMLDivElement;
    const scrollBy = vi.fn();
    Object.assign(carousel, { scrollBy });
    const previousButton = screen.getByRole("button", { name: `${title} 이전` });
    const nextButton = screen.getByRole("button", { name: `${title} 다음` });

    expect(previousButton).toHaveClass("h-12", "w-12");
    expect(previousButton).not.toHaveClass("-translate-x-2");
    expect(previousButton).toHaveClass("bg-transparent", "text-content-inverse", "focus-visible:outline-content-inverse", "pointer-events-auto");
    expect(previousButton.firstElementChild).toHaveAttribute("width", "24");
    expect(previousButton.parentElement).toHaveClass("pointer-events-none", "absolute", "inset-y-0", "left-0", "hidden", "sm:flex", "px-2");
    expect(nextButton).toHaveClass("h-12", "w-12", "-translate-x-2");
    expect(nextButton).toHaveClass("bg-transparent", "text-content-inverse", "focus-visible:outline-content-inverse", "pointer-events-auto");
    expect(nextButton.firstElementChild).toHaveAttribute("width", "24");
    expect(nextButton.parentElement).toHaveClass("pointer-events-none", "absolute", "inset-y-0", "right-0", "hidden", "sm:flex", "px-2");
    expect(carousel.parentElement).toHaveClass("relative");
    expect(carousel).toHaveClass("min-w-0");
    fireEvent.click(previousButton);
    fireEvent.click(nextButton);
    expect(scrollBy).toHaveBeenNthCalledWith(1, { left: -640, behavior: "smooth" });
    expect(scrollBy).toHaveBeenNthCalledWith(2, { left: 640, behavior: "smooth" });
  });

  it("keeps non-target product controls in the section header", () => {
    render(
      <ProductCarouselSection
        title="최신 상품"
        description=""
        products={[product]}
        isLoading={false}
        isSuccess
        error={null}
        onRetry={vi.fn()}
        edgeChevronControls={false}
      />,
    );

    const previousButton = screen.getByRole("button", { name: "최신 상품 이전" });
    expect(previousButton).toHaveClass("border", "bg-button-secondary", "shadow-card");
    expect(previousButton).toHaveClass("h-12", "w-12");
    expect(previousButton).toHaveClass("focus-visible:outline-action-primary");
    expect(previousButton.firstElementChild).toHaveAttribute("width", "24");
    expect(previousButton.parentElement).toHaveClass("hidden", "sm:flex", "gap-2");
  });

  it("does not render edge chevrons for an empty target section", () => {
    render(
      <ProductCarouselSection
        title="인기 상품"
        description=""
        products={[]}
        isLoading={false}
        isSuccess
        error={null}
        onRetry={vi.fn()}
        edgeChevronControls
      />,
    );

    expect(screen.getByText("표시할 상품이 없습니다.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "인기 상품 이전" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "인기 상품 다음" })).not.toBeInTheDocument();
  });

});
