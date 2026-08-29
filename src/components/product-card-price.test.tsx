import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCardPrice } from "./product-card-price";

describe("ProductCardPrice", () => {
  it("renders a regular price twice without a strikethrough", () => {
    const { container } = render(<ProductCardPrice basePrice={50_000} discountPrice={0} />);
    expect(screen.getAllByText("50,000원")).toHaveLength(2);
    expect(container.querySelector("del")).toBeNull();
  });

  it("renders the sale rate and sale price", () => {
    render(<ProductCardPrice basePrice={50_000} discountPrice={40_000} />);
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("할인가 40,000원")).toBeInTheDocument();
  });

  it("renders coupon rate based on selling price", () => {
    render(<ProductCardPrice basePrice={50_000} discountPrice={40_000} couponPrice={36_000} />);
    expect(screen.getByText("할인 20% · 쿠폰 10%")).toBeInTheDocument();
    expect(screen.getByText("쿠폰 최적가 36,000원")).toBeInTheDocument();
  });
});
