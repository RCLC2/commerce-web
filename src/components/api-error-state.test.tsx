import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { ApiErrorState } from "./api-error-state";

describe("ApiErrorState", () => {
  it("shows the public message, error code, and request ID", () => {
    render(<ApiErrorState error={new ApiError(
      "인기 상품을 불러오지 못했습니다.",
      "http",
      500,
      undefined,
      "PRODUCT_POPULAR_READ_FAILED",
      "request-456",
    )} />);

    expect(screen.getByText("인기 상품을 불러오지 못했습니다.")).toBeInTheDocument();
    expect(screen.getByText("오류 코드 PRODUCT_POPULAR_READ_FAILED")).toBeInTheDocument();
    expect(screen.getByText("요청 ID request-456")).toBeInTheDocument();
  });

  it("offers an explicit retry action when provided", () => {
    const retry = vi.fn();
    render(<ApiErrorState error={new Error("실패")} onRetry={retry} retryLabel="다시 시도" />);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
