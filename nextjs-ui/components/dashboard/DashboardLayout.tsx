"use client";

import { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { SidebarProvider } from "./SidebarContext";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { FluidBackground } from "@/components/ui/FluidBackground";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard Layout Shell
 *
 * Combines Header, Sidebar, Footer, Mobile Bottom Nav, and FluidBackground
 * into a cohesive layout using the Hybrid design system.
 *
 * Design System:
 * - FluidBackground: Animated gradient orbs (visible through glass-kpi cards)
 * - glass-card: Solid white cards for forms/tables (no glass effect)
 * - glass-kpi: Glass effect cards for KPI metrics only
 *
 * Layout structure:
 * Desktop (≥768px):
 * - FluidBackground (fixed, z-0)
 * - Header (top, full width, z-10)
 * - Sidebar (left, scrollable, z-10)
 * - Main content area (right side, scrollable, z-10)
 * - Footer (bottom, full width)
 *
 * Mobile (<768px):
 * - FluidBackground (fixed, z-0)
 * - Header (top, full width)
 * - Main content area (full width, scrollable)
 * - Mobile Bottom Nav (fixed bottom, 5 key items)
 * - Footer (hidden on mobile to save space)
 *
 * Reference: tech-spec Section 2.3.1, UX Design Spec Section 4.1
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen p-6 pb-24 md:pb-6 fluid-background">
        {/* Animated gradient orbs - visible through glass-kpi cards */}
        <FluidBackground />

        {/* Main layout - positioned above fluid background */}
        <div className="relative z-10">
          <Header />
          <div className="flex">
            <Sidebar />
            <main id="main" className="flex-1 min-w-0 overflow-x-auto">
              {children}
            </main>
          </div>
          <Footer />
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
