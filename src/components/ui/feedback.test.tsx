import { render, screen } from "@testing-library/react";
import { Search } from "lucide-react";
import { expect, it } from "vitest";
import { EmptyState, InlineLoadingState } from "./feedback";

it("renders an accessible inline loading state with a spinner", () => {
  render(<InlineLoadingState label="인기 검색어를 불러오는 중입니다." />);

  const loading = screen.getByRole("status", { name: "인기 검색어를 불러오는 중입니다." });
  expect(loading.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
  expect(loading.querySelector(".sr-only")).toHaveTextContent("인기 검색어를 불러오는 중입니다.");
});

it("renders an icon, title, and description for an empty result", () => {
  render(
    <EmptyState
      icon={<Search className="size-7" />}
      title="표시할 인기 검색어가 없습니다"
      description="다른 검색어를 입력해 원하는 상품과 마켓을 찾아보세요."
    />,
  );

  expect(screen.getByText("표시할 인기 검색어가 없습니다")).toBeVisible();
  expect(screen.getByText("다른 검색어를 입력해 원하는 상품과 마켓을 찾아보세요.")).toBeVisible();
  expect(screen.getByText("표시할 인기 검색어가 없습니다").parentElement?.querySelector("svg")).toHaveClass("lucide-search");
});
