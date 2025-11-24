/**
 * Tenant Store (Zustand)
 *
 * Global state management for tenant selection.
 * Persists selected tenant to localStorage for consistency across page reloads.
 *
 * Used by:
 * - TenantSwitcher component
 * - API client (for X-Tenant-ID header)
 * - Forms that need tenant context
 *
 * Reference: tech-spec Section 2.3.4
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface TenantStore {
  selectedTenant: Tenant | null;
  setSelectedTenant: (tenant: Tenant) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantStore>()(
  persist(
    (set) => ({
      selectedTenant: null,
      setSelectedTenant: (tenant) => set({ selectedTenant: tenant }),
      clearTenant: () => set({ selectedTenant: null }),
    }),
    {
      name: 'tenant-storage', // localStorage key
    }
  )
);
