"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mockReady, setMockReady] = useState(() => process.env.NEXT_PUBLIC_API_MOCKING !== "enabled");
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
      return;
    }

    void import("@/mocks/browser").then(({ worker }) => {
      void worker.start({ onUnhandledRequest: "bypass" }).then(() => setMockReady(true));
    });
  }, []);

  if (!mockReady) {
    return null;
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
