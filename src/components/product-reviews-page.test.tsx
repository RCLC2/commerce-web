import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import type { Product, Review, ReviewSummary } from "@/lib/types";
import { ProductReviewsPage } from "./product-reviews-page";

vi.mock("./safe-image", () => ({
  SafeImage: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("shows the public review summary and every review entry", async () => {
  const product: Product = {
    id: 1,
    market_id: 2,
    category_id: 3,
    name: "린넨 셔츠",
    description: "상품 설명",
    base_price: 39_000,
    discount_price: 35_000,
    shipping_type: "NORMAL",
    popularity_score: 0,
    status: "SELLING",
  };
  const review: Review = {
    id: 11,
    product_id: 1,
    rating: 4.5,
    content: "핏이 좋아요.",
    reviewer_name: "김구매",
    verified_purchase: true,
  };
  const summary: ReviewSummary = {
    product_id: 1,
    review_count: 1,
    average_rating: 4.5,
    photo_review_count: 0,
    rating_distribution: { "5": 1 },
  };
  vi.spyOn(api, "getProductReviews").mockResolvedValue([review]);
  vi.spyOn(api, "getProductReviewSummary").mockResolvedValue(summary);

  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ProductReviewsPage productId={1} initialProduct={product} />
    </QueryClientProvider>,
  );

  expect(await screen.findByRole("heading", { name: "상품 리뷰" })).toBeVisible();
  expect(await screen.findByText("핏이 좋아요.")).toBeVisible();
  expect(screen.getByText("구매 인증")).toBeVisible();
  expect(screen.getByRole("link", { name: /상품으로 돌아가기/ })).toHaveAttribute("href", "/products/1");
  expect(screen.getByRole("progressbar", { name: "5점 리뷰 비율" })).toHaveAttribute("aria-valuenow", "1");
});
