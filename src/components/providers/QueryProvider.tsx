"use client";

// ============================================================================
// TanStack Query provider.
//
// Scoped to the social surfaces (community, chat, voucher, admin moderation) —
// the older pages keep using `useApiResource` and are untouched by this.
//
// Defaults chosen for this backend:
//   • retry: never retry a 4xx. A 409 CONCURRENCY_CONFLICT or COMMUNITY_POST_FULL
//     must reach the user so they can re-read and decide; retrying it silently
//     is exactly the behaviour the contract forbids.
//   • refetchOnWindowFocus: off. `GET /api/community/posts/{id}` increments
//     viewCount, so a focus-triggered refetch would inflate the counter every
//     time the user tabs back.
// ============================================================================

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from "@tanstack/react-query";
import { ApiResultError } from "@/lib/api-result";

const config: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error instanceof ApiResultError ? error.status : undefined;
        if (status !== undefined && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // Mutations are never auto-retried: several of them (purchase, accept
      // application, resolve report) are not idempotent, and the contract
      // requires the user to confirm before a second attempt.
      retry: false,
    },
  },
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One client per browser session, created lazily so it is never shared
  // between requests during SSR.
  const [client] = useState(() => new QueryClient(config));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
