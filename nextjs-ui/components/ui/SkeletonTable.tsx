import { SkeletonResponsive } from "./Skeleton";

interface SkeletonTableProps {
  /**
   * Number of columns in the table
   */
  columns?: number;
  /**
   * Number of skeleton rows to display
   */
  rows?: number;
  /**
   * Show table header skeleton
   */
  showHeader?: boolean;
  /**
   * Column widths (e.g., ["20%", "30%", "25%", "25%"])
   * If not provided, equal width distribution
   */
  columnWidths?: string[];
}

/**
 * SkeletonTable Component
 *
 * Table skeleton loader with configurable rows and columns.
 * Displays header and data rows with shimmer animation.
 *
 * Features:
 * - Configurable columns and rows
 * - Optional header skeleton
 * - Custom column widths
 * - Matches actual table styling
 * - Light/dark mode support
 *
 * @example
 * ```tsx
 * // Basic table skeleton (4 columns, 10 rows)
 * <SkeletonTable />
 *
 * // Custom table with 5 columns, 15 rows
 * <SkeletonTable columns={5} rows={15} />
 *
 * // Table with custom column widths
 * <SkeletonTable
 *   columns={4}
 *   columnWidths={["15%", "35%", "25%", "25%"]}
 * />
 *
 * // No header skeleton
 * <SkeletonTable showHeader={false} />
 * ```
 *
 * Reference: Story 6 AC-4 (Loading States - Table Pattern)
 */
export function SkeletonTable({
  columns = 4,
  rows = 10,
  showHeader = true,
  columnWidths,
}: SkeletonTableProps) {
  // Generate equal column widths if not provided
  const widths = columnWidths || Array(columns).fill(`${100 / columns}%`);

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-white/50 dark:border-white/20"
      role="status"
      aria-label="Loading table data"
    >
      {/* Table Header Skeleton */}
      {showHeader && (
        <div className="bg-white/50 dark:bg-white/5 border-b border-white/50 dark:border-white/20 p-4">
          <div className="flex items-center gap-4">
            {widths.map((width, index) => (
              <div key={`header-${index}`} style={{ width }}>
                <SkeletonResponsive height="16px" rounded="4px" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Body Skeleton (10 rows) */}
      <div className="divide-y divide-white/50 dark:divide-white/20">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="p-4 hover:bg-white/30 dark:hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              {widths.map((width, colIndex) => (
                <div key={`cell-${rowIndex}-${colIndex}`} style={{ width }}>
                  <SkeletonResponsive
                    height={colIndex === 0 ? "20px" : "16px"}
                    rounded="4px"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonTableCompact Component
 *
 * Compact table skeleton with smaller padding and spacing.
 * Useful for dense tables or smaller viewports.
 *
 * @example
 * ```tsx
 * <SkeletonTableCompact columns={5} rows={20} />
 * ```
 */
export function SkeletonTableCompact({
  columns = 4,
  rows = 10,
  showHeader = true,
  columnWidths,
}: SkeletonTableProps) {
  const widths = columnWidths || Array(columns).fill(`${100 / columns}%`);

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-white/50 dark:border-white/20"
      role="status"
      aria-label="Loading table data"
    >
      {/* Table Header */}
      {showHeader && (
        <div className="bg-white/50 dark:bg-white/5 border-b border-white/50 dark:border-white/20 p-2">
          <div className="flex items-center gap-2">
            {widths.map((width, index) => (
              <div key={`header-${index}`} style={{ width }}>
                <SkeletonResponsive height="14px" rounded="4px" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Body */}
      <div className="divide-y divide-white/50 dark:divide-white/20">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="p-2 hover:bg-white/30 dark:hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              {widths.map((width, colIndex) => (
                <div key={`cell-${rowIndex}-${colIndex}`} style={{ width }}>
                  <SkeletonResponsive height="14px" rounded="4px" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
