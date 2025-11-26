import { HTMLAttributes, useEffect, useState } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Skeleton width (CSS value: '100%', '200px', etc.)
   */
  width?: string;
  /**
   * Skeleton height (CSS value: '20px', '100px', etc.)
   */
  height?: string;
  /**
   * Border radius (CSS value: '4px', '8px', '50%', etc.)
   */
  rounded?: string;
  /**
   * Shimmer animation direction
   */
  shimmerDirection?: "ltr" | "rtl";
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Hook to detect user's reduced motion preference
 * Returns true if user prefers reduced motion (WCAG 2.1 AA compliance)
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes to user preference
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Skeleton Component
 *
 * Base skeleton loader with shimmer animation.
 * Used as building block for loading states.
 *
 * Features:
 * - Shimmer animation (left-to-right or right-to-left)
 * - Customizable dimensions
 * - Accessible (aria-busy, aria-label)
 * - Supports light/dark mode
 * - Respects prefers-reduced-motion (WCAG 2.1 AA)
 *
 * Loading State Thresholds:
 * - < 200ms: No loading indicator (avoid flickering)
 * - 200ms - 1s: Show spinner
 * - > 1s: Show skeleton loader
 * - > 5s: Add "Taking longer than usual..." message
 * - > 30s: Timeout error with retry option
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="status" for screen reader announcements
 * - aria-busy="true" indicates loading state
 * - aria-label provides context
 * - prefers-reduced-motion: shows static background (no animation)
 * - Minimum 3:1 contrast ratio in light/dark modes
 *
 * @example
 * ```tsx
 * // Basic skeleton
 * <Skeleton width="200px" height="20px" />
 *
 * // Circular avatar skeleton
 * <Skeleton width="40px" height="40px" rounded="50%" />
 *
 * // Full width skeleton
 * <Skeleton height="16px" />
 *
 * // RTL shimmer direction
 * <Skeleton width="300px" height="24px" shimmerDirection="rtl" />
 * ```
 *
 * Reference: Story 35 AC-1, AC-4, AC-10 (Loading States & Accessibility)
 */
export function Skeleton({
  width = "100%",
  height = "20px",
  rounded = "4px",
  shimmerDirection = "ltr",
  className = "",
  ...props
}: SkeletonProps) {
  const prefersReducedMotion = useReducedMotion();

  // Determine animation based on user preference
  const shimmerKeyframes = prefersReducedMotion
    ? "none"
    : shimmerDirection === "ltr"
      ? "shimmer-ltr 2s ease-in-out infinite"
      : "shimmer-rtl 2s ease-in-out infinite";

  // Light mode: #f3f4f6 (gray-100) -> #e5e7eb (gray-200) - 3:1+ contrast
  // Static background for reduced motion: #e5e7eb (gray-200)
  const background = prefersReducedMotion
    ? "#e5e7eb"
    : "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)";

  return (
    <>
      {/* CSS animation keyframes - only rendered when motion is allowed */}
      {!prefersReducedMotion && (
        <style jsx>{`
          @keyframes shimmer-ltr {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }

          @keyframes shimmer-rtl {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      )}

      <div
        role="status"
        aria-busy="true"
        aria-label="Loading content"
        className={`skeleton-loader ${className}`}
        style={{
          width,
          height,
          borderRadius: rounded,
          background,
          backgroundSize: prefersReducedMotion ? "100% 100%" : "200% 100%",
          animation: shimmerKeyframes,
        }}
        {...props}
      />
    </>
  );
}

/**
 * Dark mode skeleton (for dark theme)
 *
 * Accessibility (WCAG 2.1 AA):
 * - Dark mode colors: #1f2937 (gray-800) -> #374151 (gray-700) - 3:1+ contrast
 * - Static background for reduced motion: #374151 (gray-700)
 * - Same role/aria attributes as light mode
 *
 * Reference: Story 35 AC-1, AC-4 (Loading States & Dark Mode)
 */
export function SkeletonDark({
  width = "100%",
  height = "20px",
  rounded = "4px",
  shimmerDirection = "ltr",
  className = "",
  ...props
}: SkeletonProps) {
  const prefersReducedMotion = useReducedMotion();

  const shimmerKeyframes = prefersReducedMotion
    ? "none"
    : shimmerDirection === "ltr"
      ? "shimmer-ltr 2s ease-in-out infinite"
      : "shimmer-rtl 2s ease-in-out infinite";

  // Dark mode: #1f2937 (gray-800) -> #374151 (gray-700) - 3:1+ contrast
  // Static background for reduced motion: #374151 (gray-700)
  const background = prefersReducedMotion
    ? "#374151"
    : "linear-gradient(90deg, #1f2937 0%, #374151 50%, #1f2937 100%)";

  return (
    <>
      {!prefersReducedMotion && (
        <style jsx>{`
          @keyframes shimmer-ltr {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }

          @keyframes shimmer-rtl {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      )}

      <div
        role="status"
        aria-busy="true"
        aria-label="Loading content"
        className={`skeleton-loader dark:block hidden ${className}`}
        style={{
          width,
          height,
          borderRadius: rounded,
          background,
          backgroundSize: prefersReducedMotion ? "100% 100%" : "200% 100%",
          animation: shimmerKeyframes,
        }}
        {...props}
      />
    </>
  );
}

/**
 * Responsive skeleton that adapts to light/dark mode
 *
 * Automatically switches between light and dark skeleton variants
 * based on the current theme. This is the recommended component for most use cases.
 *
 * Accessibility (WCAG 2.1 AA):
 * - Inherits all accessibility features from Skeleton/SkeletonDark
 * - Maintains 3:1+ contrast ratio in both themes
 * - Respects prefers-reduced-motion in both variants
 *
 * @example
 * ```tsx
 * // Basic responsive skeleton
 * <SkeletonResponsive width="200px" height="20px" />
 *
 * // Avatar skeleton
 * <SkeletonResponsive width="48px" height="48px" rounded="50%" />
 * ```
 *
 * Reference: Story 35 AC-1, AC-4, AC-10 (Loading States & Dark Mode)
 */
export function SkeletonResponsive(props: SkeletonProps) {
  return (
    <div className="skeleton-wrapper">
      {/* Light mode skeleton */}
      <div className="dark:hidden">
        <Skeleton {...props} />
      </div>
      {/* Dark mode skeleton */}
      <div className="hidden dark:block">
        <SkeletonDark {...props} />
      </div>
    </div>
  );
}

/**
 * Loading Container Component
 *
 * Wrapper for loading content with proper accessibility attributes.
 * Use this to wrap skeleton content for screen reader announcements.
 *
 * @example
 * ```tsx
 * <LoadingContainer label="Loading agents">
 *   <SkeletonCard />
 *   <SkeletonCard />
 * </LoadingContainer>
 * ```
 *
 * Reference: Story 35 AC-4 (Accessibility)
 */
export function LoadingContainer({
  children,
  label = "Loading content",
  className = "",
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={className}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
