import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommerceEvent } from "@/lib/types";
import { EventCarousel } from "./home-page";

vi.mock("./safe-image", () => ({
  SafeImage: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

const events: CommerceEvent[] = [
  { id: 1, title: "첫 이벤트", subtitle: "첫 혜택", image_url: "/first.jpg", link_url: "", status: "ACTIVE", starts_at: null, ends_at: null },
  { id: 2, title: "둘째 이벤트", subtitle: "둘째 혜택", image_url: "/second.jpg", link_url: "", status: "ACTIVE", starts_at: null, ends_at: null },
  { id: 3, title: "셋째 이벤트", subtitle: "셋째 혜택", image_url: "/third.jpg", link_url: "", status: "ACTIVE", starts_at: null, ends_at: null },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("EventCarousel", () => {
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
