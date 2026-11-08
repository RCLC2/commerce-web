import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BackButton } from "./back-button";

const { back, push } = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push }) }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("returns to the previous page when it belongs to this site", () => {
  vi.stubGlobal("navigation", {
    currentEntry: { index: 1 },
    entries: () => [{ url: `${window.location.origin}/categories?category=tops` }, { url: window.location.href }],
  });
  render(<BackButton fallbackHref="/products" />);

  fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));

  expect(back).toHaveBeenCalledOnce();
  expect(push).not.toHaveBeenCalled();
});

it("uses the safe listing page for a direct or external visit", () => {
  vi.stubGlobal("navigation", {
    currentEntry: { index: 1 },
    entries: () => [{ url: "https://example.com/other" }, { url: window.location.href }],
  });
  render(<BackButton fallbackHref="/products" />);

  fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));

  expect(push).toHaveBeenCalledWith("/products");
  expect(back).not.toHaveBeenCalled();
});
