# Toast Notification Patterns

> Design specification for consistent toast notifications across the AI Agents Next.js UI.
> Reference: Story 35 - Loading States & Error Handling

## Overview

Toast notifications provide non-blocking feedback for user actions. Uses the Sonner library with custom styling.

## Toast Variants

| Variant | Background | Icon | Use Case |
|---------|------------|------|----------|
| Success | Green (`accent-green/10`) | ✓ CheckCircle | Action completed successfully |
| Error | Red (`red-500/10`) | ✗ XCircle | Action failed |
| Warning | Orange (`accent-orange/10`) | ⚠ AlertCircle | Warning message |
| Info | Blue (`accent-blue/10`) | ℹ Info | Informational message |

## Toast Configuration

### Default Settings

```typescript
const defaultConfig = {
  duration: 4000,     // 4 seconds auto-dismiss
  position: 'top-right',
  maxVisible: 3,      // Maximum visible toasts
  dismissible: true,  // Show close button
};
```

### Timing Guidelines

| Toast Type | Duration | Reason |
|------------|----------|--------|
| Success | 4s | Quick confirmation |
| Error | 5s | User needs time to read |
| Warning | 5s | User needs time to read |
| Info | 4s | Informational only |
| Loading | Infinity | Dismiss when complete |

## Usage Examples

### Basic Toasts

```tsx
import { toast } from '@/components/ui/Toast';

// Success
toast.success('Profile updated successfully!');

// Error
toast.error('Failed to save changes');

// Warning
toast.warning('Your session will expire soon');

// Info
toast.info('New version available');
```

### With Description

```tsx
toast.error('Failed to save changes', {
  description: 'Please try again later.'
});
```

### With Action Button

```tsx
toast.warning('Your session will expire soon', {
  action: {
    label: 'Extend',
    onClick: () => extendSession()
  }
});
```

### With Dismiss Callback

```tsx
toast.success('Changes saved', {
  onDismiss: () => {
    // Called when toast is dismissed
  }
});
```

### Promise-Based Toast

For async operations:

```tsx
toast.promise(saveProfile(), {
  loading: 'Saving profile...',
  success: 'Profile saved!',
  error: 'Failed to save profile'
});
```

## Stacking Behavior

- Maximum 3 toasts visible at once
- Additional toasts are queued
- Oldest toast dismissed first when new toast added
- Toasts stack vertically (newest at bottom)

```
┌─────────────────────┐
│  Toast 1 (oldest)   │
└─────────────────────┘
┌─────────────────────┐
│  Toast 2            │
└─────────────────────┘
┌─────────────────────┐
│  Toast 3 (newest)   │
└─────────────────────┘
```

## Accessibility Requirements

### ARIA Attributes

```tsx
// Success/Info toasts
<div role="status" aria-live="polite">
  {message}
</div>

// Error/Warning toasts
<div role="alert" aria-live="assertive">
  {message}
</div>
```

### Keyboard Navigation

- Close button keyboard accessible
- Esc key does NOT dismiss (avoid accidental dismissal)
- Tab navigates to close button and action button

### Focus Management

- Toast does not steal focus
- Close button focusable for keyboard users
- Action button focusable

## Toast Message Guidelines

### Do's

- Use descriptive action verbs
- Include the object affected
- Keep messages concise (< 80 chars)

**Good Examples:**
- "✓ Agent saved"
- "✗ Failed to delete tenant. Permission denied."
- "⚠ Session will expire in 5 minutes"

### Don'ts

- Don't use just "Error" or "Success"
- Don't include technical details
- Don't use toasts for form validation errors (use inline)

**Bad Examples:**
- "Error"
- "Success!"
- "Error 500: Internal Server Error"

## Integration with API Client

Toast notifications are automatically triggered for API errors:

```typescript
// In API client interceptor
client.interceptors.response.use(
  (response) => {
    // Success responses don't auto-toast
    return response;
  },
  (error) => {
    const message = mapErrorToMessage(error);
    toast.error(message);
    return Promise.reject(error);
  }
);
```

### Manual Toast on Success

```tsx
const handleSave = async () => {
  try {
    await saveData();
    toast.success('Changes saved successfully');
  } catch (error) {
    // Error toast handled by interceptor
  }
};
```

## ToastProvider Setup

In `app/layout.tsx`:

```tsx
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster
          position="top-right"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: 'glass-card border border-white/50 dark:border-white/20',
            },
          }}
        />
      </body>
    </html>
  );
}
```

## Implementation Checklist

- [ ] Toast shows for appropriate duration
- [ ] Toast has correct variant (success/error/warning/info)
- [ ] Toast message is descriptive
- [ ] Close button is keyboard accessible
- [ ] Action button works correctly (if present)
- [ ] Toast announced to screen readers (`aria-live`)
- [ ] Maximum 3 toasts visible
- [ ] Toast does not block page interaction

## Related Documentation

- [Loading Patterns](./loading-patterns.md)
- [Error Handling Patterns](./error-handling-patterns.md)
- [Error Message Guide](./error-message-guide.md)
