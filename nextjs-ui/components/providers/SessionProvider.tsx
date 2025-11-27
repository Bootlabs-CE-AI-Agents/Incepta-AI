"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { useTenantStore } from "@/lib/stores/useTenantStore";

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * TenantInitializer - initializes tenant from session API
 * Uses direct API fetch instead of useSession() hook to work on tunnel domains
 */
function TenantInitializer({ children }: { children: ReactNode }) {
  const selectedTenant = useTenantStore((state) => state.selectedTenant);
  const setSelectedTenant = useTenantStore((state) => state.setSelectedTenant);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once
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
  }, [initialized, selectedTenant, setSelectedTenant]);

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
