import { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
  className?: string;
}

/**
 * Kbd Component
 *
 * Displays keyboard keys in a styled badge format.
 * Used by ShortcutsModal and CommandPalette to show keyboard shortcuts.
 *
 * @example
 * ```tsx
 * <Kbd>⌘</Kbd> + <Kbd>K</Kbd>
 * ```
 *
 * Reference: Story 6 AC-2 (Keyboard Shortcuts System)
 */
export function Kbd({ children, className = "" }: KbdProps) {
  return (
    <kbd
      className={`inline-flex items-center justify-center px-2 py-1 min-w-[2rem] text-xs font-semibold text-text-primary dark:text-text-secondary bg-white/50 dark:bg-white/10 border border-white/50 dark:border-white/20 rounded shadow-sm ${className}`}
    >
      {children}
    </kbd>
  );
}
