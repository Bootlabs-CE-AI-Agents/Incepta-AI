"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = "ai-agents-sidebar-collapsed";

interface SidebarProviderProps {
  children: ReactNode;
}

/**
 * Sidebar Provider
 *
 * Manages sidebar collapse state with localStorage persistence.
 * Follows UX best practices for collapsible navigation.
 */
export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load initial state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsCollapsed(JSON.parse(stored));
    }
    setIsHydrated(true);
  }, []);

  // Persist state to localStorage when it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isHydrated]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const setCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, toggleCollapse, setCollapsed }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

/**
 * Hook to access sidebar collapse state
 *
 * @throws Error if used outside SidebarProvider
 */
export function useSidebar(): SidebarContextType {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
