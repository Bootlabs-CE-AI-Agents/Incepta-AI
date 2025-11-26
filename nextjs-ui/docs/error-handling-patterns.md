# Error Handling Patterns

> Design specification for consistent error handling across the AI Agents Next.js UI.
> Reference: Story 35 - Loading States & Error Handling

## Overview

Error handling follows a hierarchical approach with graceful degradation. Errors are caught at multiple levels to prevent entire app crashes.

## Error Boundary Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ App Root (layout.tsx)                                   │
│  └── PageErrorBoundary                                  │
│       ├── Dashboard Page                                │
│       │    ├── SectionErrorBoundary (Metrics)          │
│       │    │    └── Metric Cards                        │
│       │    ├── SectionErrorBoundary (Charts)           │
│       │    │    └── Chart Components                    │
│       │    └── SectionErrorBoundary (Tables)           │
│       │         └── Data Tables                         │
│       └── API Error Handler (per request)              │
└─────────────────────────────────────────────────────────┘
```

## Error Boundary Components

### PageErrorBoundary

Wraps entire page content. Shows full error page with recovery options.

```tsx
import { ErrorBoundary } from '@/components/error-boundary/ErrorBoundary';

// In page layout
<ErrorBoundary
  onError={(error, errorInfo) => {
    // Log to Sentry or monitoring service
    console.error('Page error:', error);
  }}
>
  <PageContent />
</ErrorBoundary>
```

**Features:**
- Shows error icon, message, and stack trace (dev mode only)
- Actions: Reload Page, Report Issue, Copy Error
- Accessible: focusable error container, keyboard navigation

### SectionErrorBoundary

Wraps dashboard sections. Shows inline error with graceful degradation.

```tsx
import { SectionErrorBoundary } from '@/components/error-boundary/SectionErrorBoundary';

<SectionErrorBoundary title="Metrics" retryable>
  <MetricsPanel />
</SectionErrorBoundary>
```

**Features:**
- Doesn't hide entire page
- Shows section-specific error message
- Retry button resets error state
- Other sections remain functional

## API Error Handling

### Error Types

| HTTP Status | Error Type | User Message |
|-------------|------------|--------------|
| Network | Connection Error | "Connection lost. Check your connection and try again." |
| 401 | Unauthorized | "Your session expired. Please login again." |
| 403 | Forbidden | "You don't have permission to perform this action." |
| 404 | Not Found | "The requested resource was not found." |
| 429 | Rate Limited | "Too many requests. Please wait a moment and try again." |
| 500-599 | Server Error | "Server error. Please try again later." |
| Timeout | Timeout | "Request took too long. Please try again." |

### Retry Logic

Automatic retry for transient errors:

```typescript
// Retry configuration
const retryConfig = {
  maxRetries: 3,
  retryableStatuses: [429, 503],
  backoffMs: [1000, 2000, 4000], // Exponential backoff
};
```

**Retry Strategy:**
1. Status 429 (Rate Limit): Exponential backoff (1s, 2s, 4s)
2. Status 503 (Service Unavailable): Exponential backoff
3. Network timeout: Retry up to 3 times
4. After max retries: Show error with manual Retry button

### Error Handler Middleware

```typescript
// lib/api/error-handler.ts
import { AxiosError } from 'axios';
import { toast } from '@/components/ui/Toast';

export interface APIError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string>;
}

export function mapErrorToMessage(error: AxiosError): string {
  if (!error.response) {
    return 'Connection lost. Check your connection and try again.';
  }

  const status = error.response.status;

  switch (status) {
    case 401:
      return 'Your session expired. Please login again.';
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
      return 'Server error. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
```

## Accessibility Requirements

### Screen Reader Announcements

Error messages must be immediately announced:

```tsx
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  <p>{errorMessage}</p>
</div>
```

### Keyboard Navigation

- Tab to navigate error actions (Retry, Back, Report)
- Enter/Space to activate buttons
- Escape closes error modals
- Visible focus indicators (2px minimum, 3:1 contrast)

## Error Message Guidelines

### Do's

- User-focused language (not technical jargon)
- Actionable (tells user what to do next)
- Consistent tone across app
- Include recovery action

**Good Examples:**
- "Agent information couldn't be loaded. [Retry]"
- "Database connection lost. Check your connection and try again."
- "Email is required"

### Don'ts

- Technical error codes
- Stack traces (except dev mode)
- Blame the user

**Bad Examples:**
- "TypeError: Cannot read property 'id' of undefined"
- "ECONNREFUSED 127.0.0.1:5432"
- "Error 500"

## Error Categories

### User Errors (Validation)

Inline, next to affected field:
- "Email is required"
- "Password must be at least 12 characters"
- "Invalid URL format"

### System Errors (API/DB)

Toast notification + inline message:
- "Service temporarily unavailable"
- "Server error. Please try again later."

### Network Errors

Banner + toast:
- "Connection lost"
- "Waiting for connection..."

## Error UI Components

### Inline Error

```tsx
<div className="text-red-500 text-sm mt-1" role="alert">
  <AlertCircle className="inline w-4 h-4 mr-1" />
  {errorMessage}
</div>
```

### Error Card

```tsx
<div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
  <div className="flex items-start gap-3">
    <AlertTriangle className="text-red-500" />
    <div>
      <p className="font-medium text-red-800">{title}</p>
      <p className="text-sm text-red-600">{description}</p>
      <button onClick={retry}>Retry</button>
    </div>
  </div>
</div>
```

## Implementation Checklist

- [ ] Error boundary at page level
- [ ] Error boundary at section level (optional)
- [ ] API errors trigger toast notification
- [ ] Retry button available for all errors
- [ ] Error messages are user-friendly
- [ ] Error announced to screen readers (`role="alert"`)
- [ ] Keyboard accessible recovery actions
- [ ] Dev mode shows technical details
- [ ] Production mode hides stack traces

## Related Documentation

- [Loading Patterns](./loading-patterns.md)
- [Toast Patterns](./toast-patterns.md)
- [Error Message Guide](./error-message-guide.md)
