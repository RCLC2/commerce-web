"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { shouldRetryApiError } from "@/lib/api-client";
import { NotificationProvider } from "@/components/notification-provider";
import { useSessionStore } from "@/lib/session-store";

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

  return (
    <QueryClientProvider client={queryClient}>
      <SessionQueryBoundary />
      <NotificationProvider>{children}</NotificationProvider>
    </QueryClientProvider>
  );
}

const privateQueryRoots = new Set([
  "me",
  "home-me",
  "onboarding",
  "cart",
  "order",
  "orders",
  "coupons",
  "issuable-coupons",
  "addresses",
  "me-wishlist",
  "me-liked-products",
  "market-follow",
  "me-reviews",
  "pdp-review-banner",
  "home-placements",
  "home-recommendations",
  "market-feed",
]);

function SessionQueryBoundary() {
  const queryClient = useQueryClient();
  const accessToken = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const sellerContext = useSessionStore((state) => state.sellerContext);
  const previousIdentity = useRef<string | undefined>(undefined);
  const identity = `${memberID ?? "guest"}:${accessToken ?? "none"}:${sellerContext?.marketID ?? "none"}:${sellerContext?.token ?? "none"}`;

  useEffect(() => {
    if (previousIdentity.current && previousIdentity.current !== identity) {
      void queryClient.cancelQueries({
        predicate: (query) => isSessionScopedQuery(query.queryKey),
      });
      queryClient.removeQueries({
        predicate: (query) => isSessionScopedQuery(query.queryKey),
      });
    }
    previousIdentity.current = identity;
  }, [identity, queryClient]);

  return null;
}

function isSessionScopedQuery(queryKey: readonly unknown[]) {
  const root = queryKey[0];
  return (typeof root === "string" && (privateQueryRoots.has(root) || root.startsWith("seller-") || root.startsWith("admin-")))
    || queryKey.includes("seller");
}
