import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GlobalLoadingIndicator } from "./global-loading-indicator";

afterEach(cleanup);

function PendingQuery({ resolve }: { resolve: () => Promise<string> }) {
  useQuery({ queryKey: ["pending-global-loading-indicator"], queryFn: resolve });
  return null;
}

describe("GlobalLoadingIndicator", () => {
  it("stays absent without an active React Query request", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><GlobalLoadingIndicator /></QueryClientProvider>);

    expect(screen.queryByTestId("global-loading-indicator")).not.toBeInTheDocument();
  });

  it("announces a pending request without intercepting page or navigation input", async () => {
    let finish!: () => void;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <GlobalLoadingIndicator />
        <PendingQuery resolve={() => new Promise<string>((resolve) => { finish = () => resolve("done"); })} />
      </QueryClientProvider>,
    );

    const indicator = await screen.findByRole("status", { name: "새로운 정보를 불러오는 중입니다." });
    expect(indicator).toHaveClass("pointer-events-none", "fixed", "top-[calc(4rem+env(safe-area-inset-top))]", "z-[var(--commerce-z-sticky)]");
    expect(indicator.querySelector("svg")).toHaveClass("motion-safe:animate-spin");

    finish();
    await waitFor(() => expect(screen.queryByTestId("global-loading-indicator")).not.toBeInTheDocument());
  });
});
