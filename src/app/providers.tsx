"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { shouldRetryApiError } from "@/lib/api-client";
import { NotificationProvider } from "@/components/notification-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: shouldRetryApiError,
          },
        },
      }),
  );

 return <QueryClientProvider client={queryClient}><NotificationProvider>{children}</NotificationProvider></QueryClientProvider>;
}
