import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductCardPrice } from "./product-card-price";

describe("ProductCardPrice", () => {
  it("renders a regular price once without a strikethrough", () => {
    const { container } = render(<ProductCardPrice basePrice={50_000} discountPrice={0} />);
    expect(screen.getAllByText("50,000원")).toHaveLength(1);
    expect(container.querySelector("del")).toBeNull();
  });

  it("renders the sale rate and sale price", () => {
    render(<ProductCardPrice basePrice={50_000} discountPrice={40_000} />);
    expect(screen.getByLabelText("20% 할인")).toHaveTextContent("20%");
    expect(screen.getByLabelText("할인가 40,000원")).toBeInTheDocument();
  });

  it("renders coupon rate based on selling price", () => {
    render(<ProductCardPrice basePrice={50_000} discountPrice={40_000} couponPrice={36_000} />);
    expect(screen.getByText("할인 20% · 쿠폰 10%")).toBeInTheDocument();
    expect(screen.getByLabelText("쿠폰 최적가 36,000원")).toBeInTheDocument();
  });
});
