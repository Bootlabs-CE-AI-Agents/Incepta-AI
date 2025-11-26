# Confirmation Dialog Patterns

> Design specification for consistent confirmation dialogs across the AI Agents Next.js UI.
> Reference: Story 35 - Loading States & Error Handling

## Overview

Confirmation dialogs prevent accidental destructive actions by requiring explicit user confirmation.

## When to Use Confirmation Dialogs

| Action | Confirmation Required | Reason |
|--------|----------------------|--------|
| Delete agent | Yes | Permanent data loss |
| Delete tenant | Yes | Cascading deletion |
| Clear queue | Yes | Bulk operation |
| Reset configuration | Yes | Resets all settings |
| Logout | Optional | Session ends |
| Save changes | No | Non-destructive |
| Cancel form | Optional | May lose unsaved work |

## Dialog Structure

```
┌─────────────────────────────────────────────┐
│ [X]                                         │
│                                             │
│  🗑️ Confirm Deletion                        │
│                                             │
│  Are you sure you want to delete this       │
│  agent? This action cannot be undone.       │
│                                             │
│  All execution history and configurations   │
│  will be permanently removed.               │
│                                             │
│                    [Cancel]  [Delete]       │
└─────────────────────────────────────────────┘
```

## Component Usage

### Basic Usage

```tsx
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function AgentDeleteButton({ agent }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Delete Agent
      </Button>

      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={async () => {
          await deleteAgent(agent.id);
          setIsOpen(false);
        }}
        title="Delete Agent"
        description={`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </>
  );
}
```

### With Loading State

```tsx
<ConfirmDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onConfirm={handleDelete}
  title="Delete Agent"
  description="..."
  confirmLabel="Delete"
  confirmVariant="danger"
  isLoading={isDeleting}
/>
```

## Dialog Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | required | Controls dialog visibility |
| `onClose` | () => void | required | Called when dialog should close |
| `onConfirm` | () => void | required | Called when user confirms |
| `title` | string | required | Dialog title |
| `description` | string | required | Explanation of the action |
| `confirmLabel` | string | "Confirm" | Confirm button text |
| `cancelLabel` | string | "Cancel" | Cancel button text |
| `confirmVariant` | 'primary' \| 'danger' | 'primary' | Confirm button style |
| `isLoading` | boolean | false | Shows loading state on confirm |

## Accessibility Requirements

### ARIA Attributes

```tsx
<div
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">{title}</h2>
  <p id="dialog-description">{description}</p>
</div>
```

### Focus Management

1. **Opening dialog:**
   - Focus moves to Cancel button (safer default)
   - Focus trapped within dialog

2. **Focus trap:**
   - Tab cycles through: Close (X) → Cancel → Confirm
   - Shift+Tab cycles in reverse
   - Focus cannot escape dialog

3. **Closing dialog:**
   - Focus returns to trigger element

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus to next element |
| Shift+Tab | Move focus to previous element |
| Escape | Close dialog (Cancel action) |
| Enter | Activate focused button |
| Space | Activate focused button |

## Button Layout

### Desktop (side-by-side)

```tsx
<div className="flex justify-end gap-3">
  <Button variant="ghost" onClick={onClose}>Cancel</Button>
  <Button variant="danger" onClick={onConfirm}>Delete</Button>
</div>
```

### Mobile (stacked)

```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
  <Button variant="ghost" onClick={onClose} className="order-2 sm:order-1">
    Cancel
  </Button>
  <Button variant="danger" onClick={onConfirm} className="order-1 sm:order-2">
    Delete
  </Button>
</div>
```

## Dialog Variants

### Delete Confirmation

```tsx
<ConfirmDialog
  title="Delete Agent"
  description="Are you sure you want to delete this agent? This action cannot be undone."
  confirmLabel="Delete"
  confirmVariant="danger"
/>
```

### Reset Confirmation

```tsx
<ConfirmDialog
  title="Reset Configuration"
  description="This will reset all settings to their default values. Your customizations will be lost."
  confirmLabel="Reset"
  confirmVariant="danger"
/>
```

### Clear Confirmation

```tsx
<ConfirmDialog
  title="Clear Queue"
  description="This will remove all pending jobs from the queue. Running jobs will complete normally."
  confirmLabel="Clear Queue"
  confirmVariant="primary"
/>
```

### Logout Confirmation (optional)

```tsx
<ConfirmDialog
  title="Logout"
  description="You will need to sign in again to access your dashboard."
  confirmLabel="Logout"
  confirmVariant="primary"
/>
```

## Destructive Actions Inventory

All destructive actions requiring confirmation:

| Page | Action | Confirmation Required |
|------|--------|----------------------|
| Agents | Delete agent | Yes |
| Tenants | Delete tenant | Yes |
| MCP Servers | Delete server | Yes |
| LLM Providers | Delete provider | Yes |
| Queue | Clear queue | Yes |
| Execution History | Clear history | Yes |
| Users | Delete user | Yes |
| Plugins | Uninstall plugin | Yes |

## Implementation Checklist

- [ ] Dialog has `role="alertdialog"` and `aria-modal="true"`
- [ ] Title has `aria-labelledby` association
- [ ] Description has `aria-describedby` association
- [ ] Focus trapped within dialog
- [ ] Cancel button receives initial focus
- [ ] Escape key closes dialog
- [ ] Enter/Space activates focused button
- [ ] Focus returns to trigger element on close
- [ ] Loading state disables buttons
- [ ] Dialog backdrop prevents background interaction

## Related Documentation

- [Error Handling Patterns](./error-handling-patterns.md)
- [Toast Patterns](./toast-patterns.md)
- [Accessibility Audit Checklist](./a11y-audit-checklist.md)
