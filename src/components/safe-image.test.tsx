// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SafeImage } from "./safe-image";

vi.mock("next/image", () => ({
  default: ({ src, alt, className, onError, onLoad }: { src: string; alt: string; className?: string; onError?: () => void; onLoad?: () => void }) => <img src={src} alt={alt} className={className} onError={onError} onLoad={onLoad} />,
}));

afterEach(cleanup);

describe("SafeImage", () => {
  it("shows only the spinner until an image has loaded", () => {
    render(<SafeImage src="/first.jpg" alt="상품 이미지" width={100} height={100} />);
    const image = screen.getByRole("img", { name: "상품 이미지" });

    expect(image).toHaveClass("opacity-0");
    fireEvent.load(image);
    expect(image).not.toHaveClass("opacity-0");
  });

  it("recovers when a different source is selected after a failed image", () => {
    const view = render(<SafeImage src="/first.jpg" alt="상품 이미지" width={100} height={100} />);
    const image = screen.getByRole("img", { name: "상품 이미지" });

    fireEvent.error(image);
    expect(screen.getByRole("img", { name: "상품 이미지" })).toHaveAttribute("src", "/images/fashion-placeholder.svg");

    view.rerender(<SafeImage src="/second.jpg" alt="상품 이미지" width={100} height={100} />);
    expect(screen.getByRole("img", { name: "상품 이미지" })).toHaveAttribute("src", "/second.jpg");
  });
});
