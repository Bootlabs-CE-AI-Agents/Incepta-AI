import type { Metadata } from "next";
import "./globals.css";
import { MSWProvider } from "@/components/providers/MSWProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import { PageLoader } from "@/components/ui/PageLoader";
import { OfflineBanner } from "@/components/error-boundary/OfflineBanner";

/**
 * Force dynamic rendering to prevent RSC streaming issues with Cloudflare Tunnel.
 * Cloudflare's HTTP/2 implementation buffers streaming responses, which breaks
 * Next.js RSC flight data mechanism. By forcing dynamic rendering, we ensure
 * the full HTML is sent at once instead of being streamed.
 *
 * Reference: https://github.com/cloudflare/cloudflared/issues/199
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Incepta",
  description: "Where Intelligent Agents Take Shape - Enterprise AI Agents Management Platform",
};

/**
 * Root Layout with Nested Providers
 *
 * Provider hierarchy (outer to inner):
 * 1. MSWProvider - Mock Service Worker (development only)
 * 2. SessionProvider - NextAuth authentication state + auto-tenant initialization
 * 3. ReactQueryProvider - Server state management (React Query)
 * 4. ThemeProvider - Client-side theme state (light/dark mode)
 * 5. ToastProvider - Notification system (Sonner)
 * 6. KeyboardShortcutsProvider - Command palette (⌘K) + shortcuts (Story 6 AC-1 & AC-2)
 *
 * Reference: tech-spec Section 2.1.2
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* AC-8: Skip to Main Content Link for Accessibility */}
        <a
          href="#main"
          className="sr-only-focus-visible sr-only fixed top-0 left-0 z-50 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Skip to main content
        </a>
        <PageLoader />
        <OfflineBanner />
        <MSWProvider>
          <SessionProvider>
            <ReactQueryProvider>
              <ThemeProvider>
                <ToastProvider>
                  <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
                </ToastProvider>
              </ThemeProvider>
            </ReactQueryProvider>
          </SessionProvider>
        </MSWProvider>
      </body>
    </html>
  );
}
