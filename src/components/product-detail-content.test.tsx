import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ProductDetailContent } from "./product-detail-content";
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => { cleanup(); push.mockClear(); });
it("routes authored same-origin links through Next navigation", () => {
  render(<ProductDetailContent html='<a href="/products?category=tops#list"><span>다른 상품</span></a>' />);
  fireEvent.click(screen.getByText("다른 상품"));
  expect(push).toHaveBeenCalledWith("/products?category=tops#list");
});
it.each([
  ['<a href="/products" target="_blank">상품</a>', {}],
  ['<a href="/products" download>상품</a>', {}],
  ['<a href="https://example.com">상품</a>', {}],
  ['<a href="/products">상품</a>', { ctrlKey: true }],
])("preserves browser navigation for external, new-tab and modified clicks", (html, init) => {
  render(<ProductDetailContent html={html} />);
  fireEvent.click(screen.getByText("상품"), init);
  expect(push).not.toHaveBeenCalled();
});
