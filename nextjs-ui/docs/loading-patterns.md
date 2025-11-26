# Loading State Patterns

> Design specification for consistent loading states across the AI Agents Next.js UI.
> Reference: Story 35 - Loading States & Error Handling

## Overview

All data fetches must show loading states to provide visual feedback to users. Loading states follow a consistent pattern across the application.

## Loading State Timing

| Duration | Indicator | Reason |
|----------|-----------|--------|
| < 200ms | None | Avoid flickering for fast operations |
| 200ms - 1s | Spinner | Brief operations show lightweight indicator |
| > 1s | Skeleton | Extended operations show content placeholder |
| > 5s | Skeleton + Message | "Taking longer than usual..." |
| > 30s | Timeout Error | Request failed, offer retry |

## Skeleton Components

### Base Skeleton

```tsx
import { Skeleton } from '@/components/ui/Skeleton';

// Basic usage
<Skeleton width="200px" height="20px" />

// Circular avatar
<Skeleton width="48px" height="48px" rounded="50%" />

// Full width
<Skeleton height="16px" />
```

**Props:**
- `width`: CSS width value (default: '100%')
- `height`: CSS height value (default: '20px')
- `rounded`: Border radius (default: '4px')
- `shimmerDirection`: 'ltr' | 'rtl' (default: 'ltr')
- `className`: Additional CSS classes

### SkeletonCard

For dashboard metric cards and list items:

```tsx
import { SkeletonCard, SkeletonCardCompact } from '@/components/ui/SkeletonCard';

// Full card skeleton
<SkeletonCard />

// Without avatar
<SkeletonCard showAvatar={false} />

// Compact version for grids
<SkeletonCardCompact />
```

### SkeletonTable

For data tables:

```tsx
import { SkeletonTable, SkeletonTableCompact } from '@/components/ui/SkeletonTable';

// Default (4 columns, 10 rows)
<SkeletonTable />

// Custom dimensions
<SkeletonTable columns={5} rows={15} />

// With custom column widths
<SkeletonTable columnWidths={['15%', '35%', '25%', '25%']} />
```

## Accessibility Requirements (WCAG 2.1 AA)

### Required Attributes

Every loading container must include:

```tsx
<div
  role="status"
  aria-busy="true"
  aria-label="Loading content"
>
  <Skeleton />
</div>
```

### Screen Reader Announcements

- Loading state announced: `aria-busy="true"` + "Loading..." text
- Remove `aria-busy` when loading completes
- Skeleton does not interfere with accessibility tree

### Reduced Motion

Respect user preference for reduced motion:

```css
/* In globals.css */
@media (prefers-reduced-motion: reduce) {
  .skeleton-loader {
    animation: none !important;
    background: var(--skeleton-static-bg) !important;
  }
}
```

Static skeleton background:
- Light mode: `#e5e7eb` (gray-200)
- Dark mode: `#374151` (gray-700)

## Dark Mode Support

All skeletons must have sufficient contrast in both themes:

| Theme | Background | Shimmer Highlight | Contrast |
|-------|------------|-------------------|----------|
| Light | `#f3f4f6` | `#e5e7eb` | 3:1+ |
| Dark | `#1f2937` | `#374151` | 3:1+ |

## Usage Patterns

### Dashboard Page

```tsx
function DashboardPage() {
  const { data, isLoading, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading dashboard">
        <SkeletonCardGrid columns={4} count={4} />
      </div>
    );
  }

  return <DashboardContent data={data} />;
}
```

### Table with Pagination

```tsx
function DataTable() {
  const { data, isLoading, isFetching } = useQuery(...);

  return (
    <div aria-busy={isLoading || isFetching}>
      {isLoading ? (
        <SkeletonTable rows={10} />
      ) : (
        <Table data={data} />
      )}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <Loading size="sm" text="Loading..." />
        </div>
      )}
    </div>
  );
}
```

### Form Skeleton

```tsx
function FormSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading form">
      <div className="space-y-4">
        <Skeleton height="36px" />  {/* Input field */}
        <Skeleton height="36px" />  {/* Input field */}
        <Skeleton height="100px" /> {/* Textarea */}
        <Skeleton width="120px" height="40px" /> {/* Submit button */}
      </div>
    </div>
  );
}
```

## Implementation Checklist

- [ ] Container has `role="status"` and `aria-busy="true"`
- [ ] Skeleton matches final content layout
- [ ] Shows for minimum 200ms, maximum 5s before timeout
- [ ] Respects `prefers-reduced-motion` (static skeleton)
- [ ] Meets WCAG AA contrast ratios (3:1 minimum)
- [ ] Works in both light and dark mode
- [ ] Loading state announced to screen readers

## Related Documentation

- [Error Handling Patterns](./error-handling-patterns.md)
- [Toast Patterns](./toast-patterns.md)
- [Accessibility Audit Checklist](./a11y-audit-checklist.md)
