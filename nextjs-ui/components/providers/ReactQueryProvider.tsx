"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ReactNode, useState, useEffect, useRef } from "react";
import { useTenantStore } from "@/lib/stores/useTenantStore";

interface ReactQueryProviderProps {
  children: ReactNode;
}

/**
 * TenantCacheInvalidator - Global cache invalidation on tenant switch
 *
 * This component subscribes to tenant changes in the Zustand store and
 * automatically invalidates and refetches all React Query data when the
 * tenant changes. This ensures all pages display the correct tenant's data
 * without requiring manual page refresh.
 *
 * Best practice from TanStack Query docs:
 * - Uses invalidateQueries() with refetchType: 'all' to trigger immediate refetch
 * - First removes old cache to prevent data leakage between tenants (security)
 * - Then invalidates to trigger refetch of all active queries
 * - Active queries will refetch with new X-Tenant-ID header from API client
 *
 * Reference: https://tanstack.com/query/v5/docs/reference/QueryClient
 */
function TenantCacheInvalidator({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const previousTenantIdRef = useRef<string | undefined>(undefined);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Get initial tenant ID
    const initialTenantId = useTenantStore.getState().selectedTenant?.tenant_id;
    previousTenantIdRef.current = initialTenantId;
    isInitializedRef.current = true;

    // Subscribe to all state changes using Zustand's basic subscribe API
    const unsubscribe = useTenantStore.subscribe((state) => {
      const currentTenantId = state.selectedTenant?.tenant_id;

      // Only invalidate if tenant actually changed (not just initial load)
      if (
        isInitializedRef.current &&
        previousTenantIdRef.current !== undefined &&
        currentTenantId !== previousTenantIdRef.current
      ) {
        console.log(
          `[TenantCacheInvalidator] Tenant changed: ${previousTenantIdRef.current} → ${currentTenantId}`
        );

        // Reset all queries - this clears cache AND triggers refetch for active observers
        // resetQueries() is the correct method for tenant switching because it:
        // 1. Removes cached data (prevents data leakage between tenants)
        // 2. Triggers immediate refetch for all active/mounted queries
        // 3. Active queries will use the new X-Tenant-ID header from API client
        queryClient.resetQueries();
      }

      previousTenantIdRef.current = currentTenantId;
    });

    return () => unsubscribe();
  }, [queryClient]);

  return <>{children}</>;
}

/**
 * React Query provider for server state management
 *
 * Configuration:
 * - Caching: 5 minutes for stale data
 * - Refetch on window focus (disabled)
 * - Retry failed requests: 1 attempt
 * - Global tenant switch handling via TenantCacheInvalidator
 *
 * Reference: tech-spec Section 2.2.1
 */
export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TenantCacheInvalidator>{children}</TenantCacheInvalidator>
    </QueryClientProvider>
  );
}
