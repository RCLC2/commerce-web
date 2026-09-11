// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SafeImage } from "./safe-image";

vi.mock("next/image", () => ({
  default: ({ src, alt, onError }: { src: string; alt: string; onError?: () => void }) => <img src={src} alt={alt} onError={onError} />,
}));

afterEach(cleanup);

describe("SafeImage", () => {
  it("recovers when a different source is selected after a failed image", () => {
    const view = render(<SafeImage src="/first.jpg" alt="상품 이미지" width={100} height={100} />);
    const image = screen.getByRole("img", { name: "상품 이미지" });

    fireEvent.error(image);
    expect(image).toHaveAttribute("src", "/images/fashion-placeholder.svg");

    view.rerender(<SafeImage src="/second.jpg" alt="상품 이미지" width={100} height={100} />);
    expect(screen.getByRole("img", { name: "상품 이미지" })).toHaveAttribute("src", "/second.jpg");
  });
});
