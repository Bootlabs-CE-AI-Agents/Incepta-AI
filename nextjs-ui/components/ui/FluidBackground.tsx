"use client";

/**
 * FluidBackground - Animated gradient orbs background
 *
 * Creates a futuristic animated background with floating gradient orbs
 * that blend and move subtly. The effect is visible through glass-kpi
 * components that use backdrop-filter.
 *
 * Features:
 * - 4 animated gradient orbs (blue, purple, pink, cyan)
 * - Long animation durations (25-35s) for subtle, non-distracting movement
 * - Respects prefers-reduced-motion media query
 * - GPU-accelerated with filter: blur
 *
 * Reference: UX Design Specification - Section 4.1
 */
export function FluidBackground() {
  return (
    <div
      className="fluid-orbs"
      aria-hidden="true"
      role="presentation"
    >
      <div className="fluid-orb fluid-orb-1" />
      <div className="fluid-orb fluid-orb-2" />
      <div className="fluid-orb fluid-orb-3" />
      <div className="fluid-orb fluid-orb-4" />
    </div>
  );
}

export default FluidBackground;
