"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { useTenantStore } from "@/lib/stores/useTenantStore";

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * TenantInitializer - initializes tenant from session API only if no tenant is persisted
 * Uses direct API fetch instead of useSession() hook to work on tunnel domains
 *
 * IMPORTANT: Waits for Zustand hydration before checking if tenant exists.
 * This prevents overwriting user's selected tenant on page refresh.
 */
function TenantInitializer({ children }: { children: ReactNode }) {
  const selectedTenant = useTenantStore((state) => state.selectedTenant);
  const setSelectedTenant = useTenantStore((state) => state.setSelectedTenant);
  const [initialized, setInitialized] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand persist hydration to complete
  useEffect(() => {
    // Check if we're on the client and Zustand has hydrated from localStorage
    // The persist middleware sets _hasHydrated after rehydration
    const checkHydration = () => {
      // Small delay to ensure Zustand persist middleware has hydrated
      // This is necessary because persist hydration happens asynchronously
      const storedTenant = localStorage.getItem("tenant-storage");
      if (storedTenant) {
        try {
          const parsed = JSON.parse(storedTenant);
          if (parsed?.state?.selectedTenant) {
            // localStorage has a tenant, wait for Zustand to hydrate it
            setHydrated(true);
            return;
          }
        } catch {
          // Invalid JSON, continue with initialization
        }
      }
      // No stored tenant, mark as hydrated so we can initialize from session
      setHydrated(true);
    };

    // Run after a microtask to ensure Zustand has time to hydrate
    const timeoutId = setTimeout(checkHydration, 50);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    // Wait for hydration check to complete
    if (!hydrated) {
      return;
    }

    // Only initialize if not already done and no tenant is selected
    if (initialized || selectedTenant) {
      return;
    }

    // Fetch session directly from API
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((sessionData) => {
        if (sessionData?.user) {
          const user = sessionData.user;
          const defaultTenantId = user.default_tenant_id;
          const userRoles = user.roles || [];

          if (defaultTenantId) {
            const defaultRole = userRoles.find(
              (role: any) => role.tenant_id === defaultTenantId
            );
            const tenantName = defaultRole?.tenant_name || "Default Tenant";

            setSelectedTenant({
              id: user.id,
              tenant_id: defaultTenantId,
              name: tenantName,
              slug: defaultTenantId,
              is_active: true,
            });
          }
        }
        setInitialized(true);
      })
      .catch((error) => {
        console.warn("Failed to initialize tenant from session:", error);
        setInitialized(true);
      });
  }, [hydrated, initialized, selectedTenant, setSelectedTenant]);

  return <>{children}</>;
}

/**
 * Client-side SessionProvider wrapper for NextAuth
 * Provides authentication state and auto-initializes tenant selection
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      <TenantInitializer>{children}</TenantInitializer>
    </NextAuthSessionProvider>
  );
}
