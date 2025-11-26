# Error Message Standards

> Style guide for consistent, user-friendly error messages across the AI Agents Next.js UI.
> Reference: Story 35 - Loading States & Error Handling

## Principles

1. **User-focused:** Write for users, not developers
2. **Actionable:** Tell users what to do next
3. **Consistent:** Same tone and format everywhere
4. **Clear:** Avoid jargon and technical terms

## Error Message Format

```
[What happened] + [Why it happened (optional)] + [What to do next]
```

### Examples

| Type | Message |
|------|---------|
| Network | "Connection lost. Check your connection and try again." |
| Permission | "You don't have permission to delete this agent." |
| Validation | "Email is required" |
| Not Found | "Agent not found. It may have been deleted." |
| Server | "Server error. Please try again later." |

## Error Message Templates

### Network Errors

| Scenario | Message |
|----------|---------|
| Offline | "Connection lost. Check your connection and try again." |
| Timeout | "Request took too long. Please try again." |
| DNS failure | "Unable to reach server. Check your connection." |

### Authentication Errors (4xx)

| Status | Message |
|--------|---------|
| 401 | "Your session expired. Please login again." |
| 403 | "You don't have permission to perform this action." |
| 404 | "The requested resource was not found." |
| 429 | "Too many requests. Please wait a moment and try again." |

### Server Errors (5xx)

| Status | Message |
|--------|---------|
| 500 | "Server error. Please try again later." |
| 502 | "Server temporarily unavailable. Please try again." |
| 503 | "Service unavailable. Please try again later." |
| 504 | "Server took too long to respond. Please try again." |

### Validation Errors

| Field | Message |
|-------|---------|
| Required | "{Field} is required" |
| Email | "Please enter a valid email address" |
| Password length | "Password must be at least 12 characters" |
| URL | "Please enter a valid URL" |
| Number range | "{Field} must be between {min} and {max}" |
| Duplicate | "An agent with this name already exists" |

## Do's and Don'ts

### Do's ✅

- Use plain language
- Be specific about what went wrong
- Provide actionable next steps
- Use consistent verb tense (past for what happened, imperative for instructions)
- Include relevant context

**Good Examples:**
```
✅ "Failed to save agent. The name is already in use."
✅ "Network error. Your changes were not saved. [Retry]"
✅ "Permission denied. Contact your administrator for access."
```

### Don'ts ❌

- Don't use technical jargon
- Don't show error codes alone
- Don't blame the user
- Don't include stack traces (except dev mode)
- Don't use all caps or exclamation points

**Bad Examples:**
```
❌ "Error 500"
❌ "TypeError: Cannot read property 'id' of undefined"
❌ "ECONNREFUSED 127.0.0.1:5432"
❌ "You made an error!"
❌ "FAILED!!!"
```

## Error Message Categories

### 1. User Errors (Validation)

**Context:** User submitted invalid data

**Format:** `{Field} {problem}`

**Examples:**
- "Email is required"
- "Password must be at least 12 characters"
- "Name must be between 3 and 100 characters"
- "Please enter a valid URL"

**Tone:** Neutral, instructive

### 2. System Errors (API/DB)

**Context:** Backend service failed

**Format:** `{What failed}. {What to do}`

**Examples:**
- "Failed to save changes. Please try again."
- "Unable to load agents. Try refreshing the page."
- "Server error. Please try again later."

**Tone:** Apologetic, reassuring

### 3. Permission Errors

**Context:** User lacks authorization

**Format:** `{Action denied}. {How to resolve}`

**Examples:**
- "You don't have permission to delete this agent."
- "Access denied. Contact your administrator for access."
- "This action requires admin privileges."

**Tone:** Informative, helpful

### 4. Network Errors

**Context:** Connection issues

**Format:** `{Connection problem}. {Recovery action}`

**Examples:**
- "Connection lost. Check your connection and try again."
- "Unable to reach server. Check your internet connection."
- "Request timed out. Try again or check your connection."

**Tone:** Neutral, actionable

## Recovery Actions

Always include a recovery action when possible:

| Error Type | Recovery Action |
|------------|-----------------|
| Temporary | "Try again" |
| Network | "Check your connection and try again" |
| Permission | "Contact your administrator" |
| Validation | Fix the field |
| Session | "Login again" |
| Unknown | "Try again or contact support" |

## Error Message Components

### Inline Validation

```tsx
<div className="mt-1 text-sm text-red-600" role="alert">
  <span className="sr-only">Error: </span>
  {errorMessage}
</div>
```

### Error Toast

```tsx
toast.error('Failed to save agent', {
  description: 'The server did not respond. Please try again.',
  action: {
    label: 'Retry',
    onClick: () => handleRetry()
  }
});
```

### Error Banner

```tsx
<div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
  <div className="flex items-center gap-2">
    <AlertTriangle className="text-red-500" />
    <p className="font-medium text-red-800">{title}</p>
  </div>
  <p className="mt-1 text-sm text-red-700">{description}</p>
  <button onClick={retry} className="mt-2">Retry</button>
</div>
```

## Accessibility

### Screen Reader Support

- Use `role="alert"` for important errors
- Use `aria-live="polite"` for non-critical messages
- Prefix with "Error:" for clarity: `<span className="sr-only">Error: </span>`

### Contrast Requirements

- Error text: 4.5:1 contrast ratio (WCAG AA)
- Error border/background: 3:1 contrast ratio
- Use design system colors: `text-red-600`, `bg-red-50`, `border-red-200`

## Implementation

### Error Message Mapping Function

```typescript
// lib/api/error-messages.ts
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Connection lost. Check your connection and try again.',
  TIMEOUT_ERROR: 'Request took too long. Please try again.',
  AUTH_EXPIRED: 'Your session expired. Please login again.',
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

export function getErrorMessage(status: number | undefined): string {
  if (status === undefined) return ERROR_MESSAGES.NETWORK_ERROR;

  switch (status) {
    case 401: return ERROR_MESSAGES.AUTH_EXPIRED;
    case 403: return ERROR_MESSAGES.FORBIDDEN;
    case 404: return ERROR_MESSAGES.NOT_FOUND;
    case 429: return ERROR_MESSAGES.RATE_LIMITED;
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_MESSAGES.SERVER_ERROR;
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
}
```

## Implementation Checklist

- [ ] Error message is user-friendly (no jargon)
- [ ] Error message is specific (not generic)
- [ ] Error includes recovery action
- [ ] Error uses consistent tone
- [ ] Error has `role="alert"` for screen readers
- [ ] Error meets contrast requirements
- [ ] Error is visible near the affected area (for validation)

## Related Documentation

- [Error Handling Patterns](./error-handling-patterns.md)
- [Toast Patterns](./toast-patterns.md)
- [Accessibility Audit Checklist](./a11y-audit-checklist.md)
