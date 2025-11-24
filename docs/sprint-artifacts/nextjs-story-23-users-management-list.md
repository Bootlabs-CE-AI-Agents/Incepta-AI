# Story nextjs-story.23: Users Management Page - List & CRUD

Status: ready-for-dev

## Story

As a **super_admin or tenant_admin**,
I want **to view and manage users**,
So that **I can control who has access to the system**.

## Acceptance Criteria

### AC-1: Users Table Display

**Given** I am authenticated as a super_admin or tenant_admin
**When** I navigate to `/dashboard/users`
**Then** I see a users table with the following columns:

| Column | Description | Format |
|--------|-------------|--------|
| Email | User's email address | text |
| Default Tenant | Tenant name (not ID) | text |
| Roles | User's roles across tenants | "Admin (Tenant A), Viewer (Tenant B)" |
| Status | Active/inactive indicator | Badge (green: active, gray: inactive) |
| Last Login | Last login timestamp | Relative time ("2 hours ago", "Never") |
| Created | Account creation date | Formatted date ("Nov 24, 2025") |
| Actions | Action buttons | Edit, Reset Password, Deactivate/Activate |

**And** the table includes:
- "Create User" button in top-right corner
- Search by email input field
- Filter dropdowns: Active status (All/Active/Inactive), Role (All/super_admin/tenant_admin/developer/operator/viewer), Tenant (All/Tenant names)
- Pagination controls (20 per page, with Previous/Next buttons + page number display)

---

### AC-2: Table Sorting and Interaction

**Given** I am viewing the users table
**When** I interact with the table
**Then** I can:
- Click any column header to toggle sort (ascending/descending)
- Click a row to view full user details (navigate to `/dashboard/users/{userId}`)
- See visual indicators for sort direction (up/down arrow icons)

**And** sorting is implemented for:
- Email (alphabetical)
- Default Tenant (alphabetical)
- Status (active first, then inactive)
- Last Login (most recent first)
- Created (most recent first)

---

### AC-3: Search Functionality

**Given** I am on the users page
**When** I type in the email search input
**Then** the search is:
- Debounced (300ms delay after typing stops)
- Case-insensitive
- Filters users matching the email substring (e.g., "john" matches "john@example.com" and "johnson@test.com")
- Shows "No users found" message if no matches

**And** search state is:
- Preserved in URL query params (e.g., `/dashboard/users?search=john`)
- Cleared when I click an "X" button in the search input
- Combined with filter state (both search and filters active simultaneously)

---

### AC-4: Filtering

**Given** I am on the users page
**When** I select filters from the dropdowns
**Then** the table updates to show:
- Only users matching **all** selected filters (AND logic)
- Filter selections preserved in URL query params (e.g., `/dashboard/users?status=active&role=developer`)
- "Clear all filters" button appears when any filter is active
- Filter counts in dropdowns (e.g., "Active (15 users)")

**Filter Options:**
- **Status**: All, Active (is_active=true), Inactive (is_active=false)
- **Role**: All, super_admin, tenant_admin, developer, operator, viewer
- **Tenant**: All, [list of tenant names from GET /api/tenants]

---

### AC-5: Pagination

**Given** there are more than 20 users
**When** I view the table
**Then** pagination controls show:
- "Previous" button (disabled on page 1)
- Current page number / total pages (e.g., "Page 1 of 3")
- "Next" button (disabled on last page)
- Total user count (e.g., "Showing 1-20 of 45 users")

**And** pagination state is:
- Preserved in URL query params (e.g., `/dashboard/users?page=2`)
- Reset to page 1 when search or filters change
- API fetches: `GET /api/users?limit=20&offset={(page-1)*20}`

---

### AC-6: RBAC Enforcement

**Given** I have a specific role
**When** I access the users page
**Then** I see users based on my role:

| Role | Sees | Filter Behavior |
|------|------|-----------------|
| **super_admin** | All users from all tenants | Can filter by any tenant |
| **tenant_admin** | Only users with roles in their tenant | Tenant filter auto-scoped to their tenant |
| **developer/operator/viewer** | Redirected to `/dashboard` | 403 Forbidden error |

**And** tenant scoping works as follows:
- **super_admin**: GET `/api/users` (no tenant_id filter, sees all)
- **tenant_admin**: GET `/api/users?tenant_id={current_user.default_tenant_id}` (automatically scoped)

---

### AC-7: Action Buttons

**Given** I am viewing a user row
**When** I click an action button
**Then** the following happens:

| Action | Trigger | Result |
|--------|---------|--------|
| **Edit** | Click "Edit" button | Navigate to `/dashboard/users/{userId}/edit` (Story 3.3 scope) |
| **Reset Password** | Click "Reset Password" button | Confirmation dialog → API call → Success toast with temp password |
| **Deactivate** | Click "Deactivate" button (if user is active) | Confirmation dialog → `PUT /api/users/{id}` with `is_active=false` → Success toast → Table refreshes |
| **Activate** | Click "Activate" button (if user is inactive) | `PUT /api/users/{id}` with `is_active=true` → Success toast → Table refreshes |

**And** action buttons are:
- Disabled if user lacks permissions (tenant_admin cannot edit users outside their tenant)
- Disabled for own account (cannot deactivate/delete self)
- Disabled for last active super_admin (cannot deactivate)

---

### AC-8: Loading, Error, and Empty States

**Given** I am on the users page
**When** the page is in different states
**Then** I see appropriate feedback:

| State | UI Display |
|-------|------------|
| **Loading** | Skeleton rows (shimmer effect) while fetching data |
| **Error** | Error message with "Retry" button (e.g., "Failed to load users. [Retry]") |
| **No users** | Empty state message: "No users found. Create your first user to get started." + "Create User" button |
| **No search results** | "No users match your search '{query}'. Try different keywords or clear filters." |

---

### AC-9: Responsive Layout

**Given** I am viewing the users page on different screen sizes
**When** the viewport changes
**Then** the layout adapts:

| Screen Size | Layout |
|-------------|--------|
| **Desktop (≥ 1024px)** | Full table with all columns, side-by-side filters |
| **Tablet (768-1023px)** | Full table, stacked filters above table |
| **Mobile (< 768px)** | Card layout (not table), email + status + actions only, expandable for full details |

---

### AC-10: Performance and Accessibility

**Given** I am using the users page
**When** I interact with the UI
**Then** the page meets performance and accessibility standards:

**Performance:**
- Initial page load < 2 seconds
- Search debounce prevents excessive API calls
- React Query caching (staleTime: 60 seconds, refetchOnWindowFocus: false)
- Optimistic UI updates for deactivate/activate actions

**Accessibility (WCAG 2.1 AA):**
- Keyboard navigation: Tab through filters → table → actions
- Screen reader announcements for sort changes, filter updates, action results
- ARIA labels on interactive elements (buttons, dropdowns, search input)
- Focus indicators on all focusable elements
- Color contrast ratio ≥ 4.5:1 for text

---

## Tasks / Subtasks

- [ ] **Task 1:** Create page structure and routing (AC-1)
  - [ ] Subtask 1.1: Create `nextjs-ui/app/dashboard/users/page.tsx`
  - [ ] Subtask 1.2: Add middleware protection: redirect non-admin users to `/dashboard`
  - [ ] Subtask 1.3: Add page header with "Users" title + "Create User" button

- [ ] **Task 2:** Create `useUsers()` hook with pagination + filters (AC-1, AC-3, AC-4, AC-5)
  - [ ] Subtask 2.1: Define TypeScript types for query params (limit, offset, search, status, role, tenant_id)
  - [ ] Subtask 2.2: Implement React Query hook calling `GET /api/users`
  - [ ] Subtask 2.3: Sync URL query params with hook state (using useSearchParams)
  - [ ] Subtask 2.4: Add pagination state (page number, total pages, total count)
  - [ ] Subtask 2.5: Add filter state (status, role, tenant_id)
  - [ ] Subtask 2.6: Add search state with debounce (300ms)
  - [ ] Subtask 2.7: Set staleTime: 60s, refetchOnWindowFocus: false, retry: 3
  - [ ] Subtask 2.8: Return { data, isLoading, error, refetch, pagination, filters, setFilters, search, setSearch }

- [ ] **Task 3:** Create `UsersTable` component with sorting (AC-1, AC-2)
  - [ ] Subtask 3.1: Create shadcn/ui Table component with 7 columns (Email, Default Tenant, Roles, Status, Last Login, Created, Actions)
  - [ ] Subtask 3.2: Implement column sorting (click header to toggle asc/desc)
  - [ ] Subtask 3.3: Add sort direction indicators (up/down arrow icons)
  - [ ] Subtask 3.4: Format Last Login as relative time (use date-fns `formatDistanceToNow()`)
  - [ ] Subtask 3.5: Format Created as formatted date (use date-fns `format(date, 'MMM dd, yyyy')`)
  - [ ] Subtask 3.6: Display roles as comma-separated list with tenant names (e.g., "Admin (Tenant A), Viewer (Tenant B)")
  - [ ] Subtask 3.7: Add click handler on row to navigate to `/dashboard/users/{userId}` (Story 3.3+ scope, stub for now)

- [ ] **Task 4:** Create search input with debounce (AC-3)
  - [ ] Subtask 4.1: Create shadcn/ui Input component with search icon
  - [ ] Subtask 4.2: Implement `useDebounce()` hook (300ms delay)
  - [ ] Subtask 4.3: Add "Clear" button (X icon) to reset search
  - [ ] Subtask 4.4: Sync search value with URL query params
  - [ ] Subtask 4.5: Show "No users found" message when search returns 0 results

- [ ] **Task 5:** Create filter dropdowns (AC-4)
  - [ ] Subtask 5.1: Create Status filter dropdown (All, Active, Inactive) using shadcn/ui Select
  - [ ] Subtask 5.2: Create Role filter dropdown (All, super_admin, tenant_admin, developer, operator, viewer)
  - [ ] Subtask 5.3: Create Tenant filter dropdown (fetch from `GET /api/tenants`, show All + tenant names)
  - [ ] Subtask 5.4: Add "Clear all filters" button (appears when any filter is active)
  - [ ] Subtask 5.5: Sync filter values with URL query params (e.g., `/dashboard/users?status=active&role=developer`)
  - [ ] Subtask 5.6: Show filter counts in dropdowns (e.g., "Active (15 users)") - optional, nice-to-have

- [ ] **Task 6:** Create action buttons (AC-7)
  - [ ] Subtask 6.1: Create "Edit" button → navigate to `/dashboard/users/{userId}/edit` (stub for Story 3.3)
  - [ ] Subtask 6.2: Create "Reset Password" button → opens confirmation dialog → calls `POST /api/users/{id}/reset-password` → shows temp password in toast
  - [ ] Subtask 6.3: Create "Deactivate" button → confirmation dialog → `PUT /api/users/{id}` with `is_active=false` → success toast → refetch users
  - [ ] Subtask 6.4: Create "Activate" button → `PUT /api/users/{id}` with `is_active=true` → success toast → refetch users
  - [ ] Subtask 6.5: Disable action buttons for: own account, last super_admin, users outside tenant (tenant_admin only)
  - [ ] Subtask 6.6: Implement optimistic UI updates (show updated status immediately, rollback on error)

- [ ] **Task 7:** Create "Create User" button (AC-1)
  - [ ] Subtask 7.1: Add button in page header
  - [ ] Subtask 7.2: Link to `/dashboard/users/new` (Story 3.3 scope, stub for now)
  - [ ] Subtask 7.3: Add icon (Plus icon from lucide-react)

- [ ] **Task 8:** Implement pagination controls (AC-5)
  - [ ] Subtask 8.1: Create pagination component with Previous/Next buttons
  - [ ] Subtask 8.2: Show "Page X of Y" and "Showing 1-20 of N users"
  - [ ] Subtask 8.3: Disable Previous on page 1, disable Next on last page
  - [ ] Subtask 8.4: Sync page number with URL query params (e.g., `/dashboard/users?page=2`)
  - [ ] Subtask 8.5: Reset to page 1 when search or filters change

- [ ] **Task 9:** Implement RBAC enforcement (AC-6)
  - [ ] Subtask 9.1: Add middleware check: redirect developer/operator/viewer to `/dashboard` with 403 message
  - [ ] Subtask 9.2: Auto-scope tenant_id query param for tenant_admin (use current_user.default_tenant_id)
  - [ ] Subtask 9.3: Allow super_admin to see all users (no tenant_id filter)
  - [ ] Subtask 9.4: Disable "Tenant" filter dropdown for tenant_admin (already scoped)

- [ ] **Task 10:** Add loading, error, and empty states (AC-8)
  - [ ] Subtask 10.1: Create skeleton loader (shimmer effect) for table rows
  - [ ] Subtask 10.2: Create error state component with "Retry" button
  - [ ] Subtask 10.3: Create empty state: "No users found. Create your first user to get started." + button
  - [ ] Subtask 10.4: Create "No search results" state: "No users match '{query}'. Try different keywords."

- [ ] **Task 11:** Implement responsive layout (AC-9)
  - [ ] Subtask 11.1: Desktop (≥1024px): Full table with all 7 columns
  - [ ] Subtask 11.2: Tablet (768-1023px): Full table, stack filters above table
  - [ ] Subtask 11.3: Mobile (<768px): Card layout (email + status + actions), expandable for details
  - [ ] Subtask 11.4: Test on multiple screen sizes (Chrome DevTools responsive mode)

- [ ] **Task 12:** Write unit tests for components and hooks
  - [ ] Subtask 12.1: Test `useUsers()` hook (pagination, filters, search, debounce)
  - [ ] Subtask 12.2: Test `UsersTable` component (sorting, row clicks, rendering)
  - [ ] Subtask 12.3: Test search input (debounce, clear button)
  - [ ] Subtask 12.4: Test filter dropdowns (selection, URL sync)
  - [ ] Subtask 12.5: Test action buttons (deactivate, activate, reset password)
  - [ ] Subtask 12.6: Test RBAC enforcement (redirect for non-admin)
  - [ ] Subtask 12.7: Test loading/error/empty states

- [ ] **Task 13:** Accessibility testing (AC-10)
  - [ ] Subtask 13.1: Keyboard navigation (Tab through all interactive elements)
  - [ ] Subtask 13.2: Screen reader testing (NVDA or VoiceOver)
  - [ ] Subtask 13.3: ARIA labels on buttons, inputs, dropdowns
  - [ ] Subtask 13.4: Focus indicators visible on all focusable elements
  - [ ] Subtask 13.5: Color contrast check (WCAG AA: ≥4.5:1 for text)

- [ ] **Task 14:** Performance testing (AC-10)
  - [ ] Subtask 14.1: Verify initial page load < 2 seconds (Chrome DevTools Network tab)
  - [ ] Subtask 14.2: Verify search debounce prevents excessive API calls (React Query DevTools)
  - [ ] Subtask 14.3: Verify React Query caching (staleTime 60s, no refetch on window focus)
  - [ ] Subtask 14.4: Test optimistic UI updates for deactivate/activate actions

- [ ] **Task 15:** Integration testing
  - [ ] Subtask 15.1: Test full workflow: Load page → Search → Filter → Sort → Paginate → Deactivate user
  - [ ] Subtask 15.2: Test with multiple roles (super_admin sees all, tenant_admin scoped)
  - [ ] Subtask 15.3: Test error scenarios (API error → retry succeeds)
  - [ ] Subtask 15.4: Test edge cases (0 users, 1000+ users with pagination)

---

## Dev Notes

### **Learnings from Previous Story (nextjs-story-22-users-api-crud)**

**From Story nextjs-story-22 (Status: done)**

The previous story implemented the backend user management CRUD API. Key learnings:

- **Backend APIs Available:**
  - `GET /api/v1/users` (AC-1) - List users with pagination, filtering (tenant_id, is_active, role), tenant scoping
  - `POST /api/v1/users` (AC-2) - Create user with password validation, initial role assignment, welcome email
  - `PUT /api/v1/users/{id}` (AC-3) - Update user with last super_admin protection
  - `DELETE /api/v1/users/{id}` (AC-4) - Soft delete with validation
  - `POST /api/v1/users/{id}/reset-password` (AC-5) - Admin password reset with temp password

- **Backend Services to Integrate With:**
  - `src/services/user_service.py` (920 lines) - Service layer with tenant scoping logic
  - `src/schemas/user.py` (362 lines) - Pydantic DTOs (UserDetailDTO, PaginatedUsersResponse, etc.)
  - `src/api/users.py` (664 lines) - FastAPI endpoints with RBAC enforcement

- **Tenant Scoping Logic (Critical):**
  - **super_admin**: GET `/api/v1/users` (no tenant_id, sees all users)
  - **tenant_admin**: GET `/api/v1/users?tenant_id={current_user.default_tenant_id}` (automatically scoped)
  - Frontend must pass `tenant_id` query param for tenant_admin users

- **Password Reset Flow:**
  - API returns temp password in response: `{ "temporary_password": "Temp@Pass123", "message": "..." }`
  - Frontend should show temp password in toast/dialog (user copies it manually)
  - Backend sends email asynchronously via Celery

- **Last Super Admin Protection:**
  - Backend prevents deactivating/deleting last active super_admin
  - Returns 400 Bad Request with error message
  - Frontend should display error toast and not optimistically update UI

- **Audit Logging:**
  - All CRUD operations logged to AuditLog table
  - No special frontend handling needed

- **Code Review Findings:**
  - ✅ Production-ready backend (Quality Score: 9.8/10)
  - ✅ Zero security vulnerabilities (Bandit scan clean)
  - ✅ Perfect 2025 best practices (Pydantic v2, SQLAlchemy 2.0+, async patterns)

- **Warnings/Recommendations for This Story:**
  - **This story is FRONTEND-FOCUSED** (Next.js UI), not backend
  - Use shadcn/ui components for table, inputs, dropdowns, buttons
  - Follow existing Next.js patterns from Stories 18-21 (Workers pages)
  - Implement React Query with pagination state management
  - Use TanStack Table for sorting and pagination
  - Follow 2025 Next.js 14 App Router best practices (validated via Context7 MCP)
  - Ensure comprehensive test coverage (unit + integration) - learn from Story 21's test gap

**Services to REUSE:**
- Backend API endpoints (all 5 from Story 22)
- Existing React Query patterns from Workers pages (Stories 18-21)
- shadcn/ui components library
- Existing RBAC middleware patterns

[Source: docs/sprint-artifacts/nextjs-story-22-users-api-crud.md]

---

### **Project Structure Notes**

**Frontend Structure (Next.js UI):**
```
nextjs-ui/
├── app/
│   └── dashboard/
│       └── users/
│           ├── page.tsx                    # CREATE (main users list page)
│           ├── [userId]/
│           │   ├── page.tsx                # FUTURE (Story 3.3+ scope)
│           │   └── edit/
│           │       └── page.tsx            # FUTURE (Story 3.3 scope)
│           └── new/
│               └── page.tsx                # FUTURE (Story 3.3 scope)
├── components/
│   └── users/
│       ├── UsersTable.tsx                  # CREATE
│       ├── UserFilters.tsx                 # CREATE
│       ├── UserActionButtons.tsx           # CREATE
│       ├── UserSearchInput.tsx             # CREATE
│       └── UserStatusBadge.tsx             # CREATE
├── lib/
│   ├── api/
│   │   └── users.ts                        # CREATE (API client functions)
│   ├── hooks/
│   │   ├── useUsers.ts                     # CREATE (React Query hook)
│   │   └── useDebounce.ts                  # CREATE (debounce utility hook)
│   └── utils/
│       └── formatters.ts                   # EXTEND (date/role formatters)
└── __tests__/
    └── users/
        ├── page.test.tsx                   # CREATE
        ├── useUsers.test.ts                # CREATE
        └── UsersTable.test.tsx             # CREATE
```

**API Integration:**
- Base URL: `http://localhost:8000/api/v1` (or env variable `NEXT_PUBLIC_API_URL`)
- Authentication: JWT token in Authorization header (from Auth.js session)
- RBAC: Middleware checks user role, redirects non-admin to `/dashboard`

**Component Patterns:**
```typescript
// API Client (nextjs-ui/lib/api/users.ts)
export async function getUsers(params: {
  limit?: number;
  offset?: number;
  tenant_id?: string;
  is_active?: boolean;
  role?: string;
  search?: string;
}): Promise<PaginatedUsersResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, String(value));
  });
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users?${queryParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

// React Query Hook (nextjs-ui/lib/hooks/useUsers.ts)
export function useUsers(filters: UsersFilters) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const queryKey = ['users', filters, searchParams.toString()];

  return useQuery({
    queryKey,
    queryFn: () => getUsers({ ...filters, limit: 20, offset: (filters.page - 1) * 20 }),
    staleTime: 60 * 1000, // 60 seconds
    refetchOnWindowFocus: false,
    enabled: !!session?.user,
  });
}
```

---

### **Architecture Patterns & Constraints**

**Next.js 14 App Router Patterns:**
1. **Server Components by Default:**
   - `app/dashboard/users/page.tsx` is a Server Component
   - Fetches initial data on server (SEO-friendly, faster initial load)
   - Passes data to Client Components via props

2. **Client Components for Interactivity:**
   - Mark components with `'use client'` directive for hooks (useState, useQuery)
   - UsersTable, UserFilters, action buttons → all Client Components

3. **URL State Management:**
   - Use `useSearchParams()` to read URL query params
   - Use `router.push()` to update URL with new params
   - Preserve state across page refreshes (e.g., `/dashboard/users?search=john&status=active&page=2`)

4. **React Query Integration:**
   - Wrap app in `<QueryClientProvider>` (already done in layout)
   - Use `useQuery()` for GET requests (list users)
   - Use `useMutation()` for POST/PUT/DELETE (deactivate, activate, reset password)
   - Set `staleTime: 60s`, `refetchOnWindowFocus: false`, `retry: 3`

5. **Optimistic UI Updates:**
   ```typescript
   const deactivateMutation = useMutation({
     mutationFn: (userId: string) => updateUser(userId, { is_active: false }),
     onMutate: async (userId) => {
       // Cancel outgoing queries
       await queryClient.cancelQueries({ queryKey: ['users'] });

       // Snapshot previous value
       const previousUsers = queryClient.getQueryData(['users']);

       // Optimistically update UI
       queryClient.setQueryData(['users'], (old) => ({
         ...old,
         items: old.items.map((u) => (u.id === userId ? { ...u, is_active: false } : u)),
       }));

       return { previousUsers };
     },
     onError: (err, userId, context) => {
       // Rollback on error
       queryClient.setQueryData(['users'], context.previousUsers);
     },
     onSettled: () => {
       // Refetch to ensure sync with server
       queryClient.invalidateQueries({ queryKey: ['users'] });
     },
   });
   ```

6. **shadcn/ui Component Library:**
   - Use `<Table>`, `<Select>`, `<Input>`, `<Button>`, `<Badge>` components
   - Install missing components: `npx shadcn-ui@latest add table select badge dialog toast`
   - Customize with Tailwind classes

---

### **RBAC Enforcement Logic**

**Middleware Protection:**
```typescript
// nextjs-ui/app/dashboard/users/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const session = await getServerSession();

  // Redirect non-admin users
  if (!['super_admin', 'tenant_admin'].includes(session.user.role)) {
    redirect('/dashboard?error=forbidden');
  }

  // Auto-scope tenant_id for tenant_admin
  const tenantId = session.user.role === 'tenant_admin' ? session.user.default_tenant_id : null;

  return <UsersPageClient initialTenantId={tenantId} userRole={session.user.role} />;
}
```

**Tenant Scoping in API Calls:**
```typescript
// For super_admin: no tenant_id filter
GET /api/v1/users?limit=20&offset=0

// For tenant_admin: auto-scoped to their tenant
GET /api/v1/users?limit=20&offset=0&tenant_id=abc-123-def-456
```

---

### **Testing Standards**

**Unit Tests (Jest + React Testing Library):**
```typescript
// nextjs-ui/__tests__/users/useUsers.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useUsers } from '@/lib/hooks/useUsers';
import { server } from '@/mocks/server';
import { rest } from 'msw';

describe('useUsers', () => {
  it('fetches users with pagination', async () => {
    server.use(
      rest.get('/api/v1/users', (req, res, ctx) => {
        return res(ctx.json({
          items: [{ id: '1', email: 'user@example.com', ... }],
          total: 1,
          limit: 20,
          offset: 0,
        }));
      })
    );

    const { result } = renderHook(() => useUsers({ page: 1, limit: 20 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.items).toHaveLength(1);
  });

  it('debounces search input', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useUsers({ search: 'john' }));

    // Fast-forward 300ms
    jest.advanceTimersByTime(300);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    jest.useRealTimers();
  });
});
```

**Integration Tests (Playwright or Cypress):**
```typescript
// nextjs-ui/e2e/users.spec.ts
import { test, expect } from '@playwright/test';

test('users page loads and displays table', async ({ page }) => {
  await page.goto('/dashboard/users');
  await expect(page.locator('table')).toBeVisible();
  await expect(page.locator('th:has-text("Email")')).toBeVisible();
});

test('search filters users', async ({ page }) => {
  await page.goto('/dashboard/users');
  await page.fill('input[placeholder*="Search"]', 'john');
  await page.waitForTimeout(300); // Debounce
  await expect(page.locator('tr:has-text("john@example.com")')).toBeVisible();
});

test('deactivate user shows confirmation and updates', async ({ page }) => {
  await page.goto('/dashboard/users');
  await page.click('button:has-text("Deactivate")').first();
  await page.click('button:has-text("Confirm")');
  await expect(page.locator('.toast:has-text("User deactivated")')).toBeVisible();
});
```

**Coverage Target:** 80%+ for hooks and components

---

### **Date Formatting Patterns**

**Relative Time (Last Login):**
```typescript
import { formatDistanceToNow } from 'date-fns';

// null → "Never"
// 2025-11-24T10:00:00Z → "2 hours ago"
const formatLastLogin = (date: string | null) => {
  if (!date) return 'Never';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};
```

**Formatted Date (Created):**
```typescript
import { format } from 'date-fns';

// 2025-11-24T10:00:00Z → "Nov 24, 2025"
const formatCreatedDate = (date: string) => {
  return format(new Date(date), 'MMM dd, yyyy');
};
```

---

### **Role Display Formatting**

**Roles Array to String:**
```typescript
// Input: [
//   { role: 'super_admin', tenant_id: 'abc', tenant_name: 'Tenant A' },
//   { role: 'viewer', tenant_id: 'def', tenant_name: 'Tenant B' }
// ]
// Output: "Admin (Tenant A), Viewer (Tenant B)"

const formatRoles = (roles: UserRole[]) => {
  return roles.map((r) => `${roleLabels[r.role]} (${r.tenant_name})`).join(', ');
};

const roleLabels = {
  super_admin: 'Admin',
  tenant_admin: 'Tenant Admin',
  developer: 'Developer',
  operator: 'Operator',
  viewer: 'Viewer',
};
```

---

### **References**

**Source Documents:**
- [Epic: Sprint 3 - User & Role Management] docs/epics-nextjs-feature-parity-completion.md (lines 831-885)
- [Story 22: Users API] docs/sprint-artifacts/nextjs-story-22-users-api-crud.md
- [Next.js UI Epic] docs/epics-nextjs-ui-migration.md
- [Architecture] docs/architecture.md

**API Endpoints (From Story 22):**
- `GET /api/v1/users` - List users (AC-1)
- `PUT /api/v1/users/{id}` - Update user (AC-3) - used for deactivate/activate
- `POST /api/v1/users/{id}/reset-password` - Admin password reset (AC-5)

**shadcn/ui Components:**
- Table: `npx shadcn-ui@latest add table`
- Select: `npx shadcn-ui@latest add select`
- Badge: `npx shadcn-ui@latest add badge`
- Dialog: `npx shadcn-ui@latest add dialog`
- Toast: `npx shadcn-ui@latest add toast`
- Input: `npx shadcn-ui@latest add input`
- Button: Already installed

**Libraries:**
- React Query v5 (TanStack Query): Data fetching + caching
- date-fns: Date formatting
- Next.js 14 App Router: Server + Client Components
- TypeScript: Type safety

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/nextjs-story-23-users-management-list.context.xml` (Generated 2025-11-24)

### Agent Model Used

<!-- Model name/version will be added during development -->

### Debug Log References

<!-- Links to debug logs will be added during development -->

### Completion Notes List

<!-- Dev agent will fill this after implementation -->

### File List

<!-- Dev agent will fill this after implementation -->

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-24 | Bob (SM) | Story created in drafted status |
| 2025-11-24 | Amelia (Dev Agent) | Senior Developer Review notes appended - **BLOCKED** status |

---

## Senior Developer Review (AI)

**Reviewer:** Ravi
**Date:** 2025-11-24
**Model:** Claude Sonnet 4.5
**Outcome:** 🚫 **BLOCKED**

---

### Summary

Story **nextjs-story-23** attempted to implement a Next.js users management page with list, search, filters, pagination, and CRUD actions. **9 implementation files were created** (page.tsx, 4 components, 3 lib files, 1 hook, 1 utility file), but the implementation has **3 CRITICAL HIGH SEVERITY BLOCKERS** that prevent the code from even compiling:

1. **Build Completely Broken** - Missing shadcn/ui components (@/components/ui/alert, @/components/ui/alert-dialog)
2. **Missing Auth Hook** - @/lib/hooks/useAuth doesn't exist, breaking RBAC (AC-6)
3. **ZERO Test Coverage** - No test files written (violates AC-10 80%+ requirement)

**Status Mismatch Alert:** Story file shows "ready-for-dev" (line 3), but sprint-status.yaml shows "ready-for-review" with note "✅ IMPLEMENTATION COMPLETE". This review proceeds based on actual files found.

**Production Confidence:** VERY LOW - Cannot deploy code that doesn't compile.

---

### Key Findings

#### **HIGH SEVERITY** (3 Critical Blockers)

**HIGH-1: Build Completely Broken - Missing shadcn/ui Components**
- **Files:** page.tsx:13 (Alert), page.tsx:16 (AlertDescription), UserActionButtons.tsx:13-21 (AlertDialog suite)
- **Evidence:** `npm run build` fails with:
  ```
  Module not found: Can't resolve '@/components/ui/alert'
  Module not found: Can't resolve '@/components/ui/alert-dialog'
  ```
- **Impact:** Code cannot compile → Cannot run in dev → Cannot test → Cannot deploy
- **Root Cause:** Dev Notes (line 684-686) specify `npx shadcn-ui@latest add alert dialog toast` but these commands were **never executed**
- **Required Files Missing:**
  - nextjs-ui/components/ui/alert.tsx
  - nextjs-ui/components/ui/alert-dialog.tsx
- **Required Action:** Install missing components:
  ```bash
  npx shadcn-ui@latest add alert alert-dialog
  ```

**HIGH-2: Missing useAuth Hook - RBAC Cannot Function**
- **File:** page.tsx:16 `import { useAuth } from '@/lib/hooks/useAuth';`
- **Evidence:** File does NOT exist at nextjs-ui/lib/hooks/useAuth.ts (glob returned 0 results)
- **Impact:**
  - AC-6 (RBAC enforcement) completely broken - cannot check user roles
  - Lines 58-73 crash: `currentUser.roles.some()` will throw if hook doesn't provide user
  - Lines 76 crash: checking `isSuperAdmin` on undefined user
- **Root Cause:** Confusion between Next-Auth session pattern vs custom useAuth hook
- **Existing Pattern:** Other pages use `useSession()` from next-auth (Stories 18-21 pattern)
- **Required Action:** Either:
  1. Implement useAuth hook wrapping next-auth's useSession, OR
  2. Refactor to use `const { data: session } = useSession()` directly (recommended - matches existing pattern)

**HIGH-3: ZERO Test Coverage - Violates AC-10 Requirement**
- **Files:** Tasks 12.1-12.7 ALL subtasks incomplete (7 test files required, 0 created)
- **Evidence:** `nextjs-ui/**/*users*.test.{ts,tsx}` glob returned 0 files
- **Impact:** AC-10 requires "80%+ coverage" - currently 0%
- **Missing Test Files:**
  - useUsers.test.ts (Task 12.1)
  - UsersTable.test.tsx (Task 12.2)
  - UserSearchInput.test.tsx (Task 12.3)
  - UserFilters.test.tsx (Task 12.4)
  - UserActionButtons.test.tsx (Task 12.5)
  - RBAC redirect test (Task 12.6)
  - Loading/error/empty states test (Task 12.7)
- **Required Action:** Write minimum 80% test coverage:
  ```bash
  # Minimum viable tests
  - useUsers hook: pagination, filters, debounce (10 tests)
  - UsersTable: sorting, rendering (8 tests)
  - Search/Filters: debounce, clear, dropdowns (6 tests)
  - Action buttons: deactivate, activate, reset password (6 tests)
  - RBAC: redirect non-admin (2 tests)
  - Total: 32 tests minimum
  ```

---

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| **AC-1** | Users Table Display (6 columns, search, filters, pagination, "Create User" button) | ⚠️ **PARTIAL** | **IMPLEMENTED:** Table with 6 columns (page.tsx:173-178, UsersTable.tsx:57-177), pagination controls (page.tsx:181-210), search input (page.tsx:157), filters (page.tsx:160-170). **MISSING:** "Create User" button NOT found in page header. **FILES:** page.tsx (186 lines ≤500 ✅), UsersTable.tsx (225 lines ≤500 ✅) |
| **AC-2** | Table Sorting and Interaction (click headers, sort indicators, row navigation) | ✅ **IMPLEMENTED** | Client-side sorting with TanStack Table v8 (UsersTable.tsx:182-191 getSortedRowModel), sort buttons on all 5 columns (email/roles/status/last_login/created_at lines 62-171), visual indicators ArrowUp/ArrowDown/ArrowUpDown (lines 69-73, 88-92, 114-118, 141-145, 162-166). Row click navigation STUBBED (line 218 comment). **FILE:** UsersTable.tsx:61-177 |
| **AC-3** | Search Functionality (300ms debounce, case-insensitive, URL params, clear button) | ✅ **IMPLEMENTED** | Search input with clear button (UserSearchInput.tsx:34-62), 300ms debounce via useDebounce hook (page.tsx:54, useDebounce.ts:26-42), passed to API as `search` param (useUsers.ts:37, users.ts:97). **MISSING:** URL query param preservation (page doesn't use useSearchParams/router.push). **FILES:** UserSearchInput.tsx (51 lines ≤500 ✅), useDebounce.ts (43 lines ≤500 ✅) |
| **AC-4** | Filtering (Status/Role/Tenant dropdowns, AND logic, URL params, "Clear all" button) | ⚠️ **PARTIAL** | **IMPLEMENTED:** 3 filter dropdowns (Status/Role/Tenant lines 64-147 in UserFilters.tsx), filters passed to useUsers hook (page.tsx:79-92), AND logic via API query params (users.ts:93-99). **MISSING:** URL query params NOT synced (page doesn't use URLSearchParams), "Clear all filters" button exists (page.tsx:223-237) but ONLY shows when results=0 (should show when ANY filter active). **FILE:** UserFilters.tsx (120 lines ≤500 ✅) |
| **AC-5** | Pagination (20/page, Previous/Next, page indicator, total count, URL params, reset on filter change) | ⚠️ **PARTIAL** | **IMPLEMENTED:** 20 items/page constant (page.tsx:24), pagination controls (lines 181-210 Previous/Next/Page X of Y/Showing 1-20 of N), passed to API (line 90-91 limit/offset). **MISSING:** URL query params NOT synced, reset to page 1 on filter change NOT implemented (no useEffect watching filters to call setPage(0)). **FILE:** page.tsx:181-210 |
| **AC-6** | RBAC Enforcement (super_admin sees all, tenant_admin scoped, developer/operator/viewer redirect) | ❌ **MISSING** | **BLOCKED:** Cannot verify due to missing useAuth hook (HIGH-2). Code ATTEMPTS RBAC (lines 57-73 redirect check, lines 69-71 tenant_id auto-scope) but will CRASH due to undefined `currentUser`. Tenant scoping logic exists (line 89 tenant_id filter) but untestable. **BLOCKER:** Fix useAuth hook first. **FILE:** page.tsx:57-89 |
| **AC-7** | Action Buttons (Deactivate/Activate, Reset Password, confirmation dialogs, disabled states) | ⚠️ **PARTIAL** | **IMPLEMENTED:** Deactivate/Activate button with confirmation dialog (UserActionButtons.tsx:69-122), Reset Password button with confirmation (lines 85-139), optimistic UI updates via mutations (useUsers.ts:54-105 useUpdateUser, lines 113-135 useResetPassword), loading states (lines 64, 75-81, 91). **MISSING:** Disabled states NOT implemented (Task 6.5 - own account, last super_admin, users outside tenant checks). **FILES:** UserActionButtons.tsx (125 lines ≤500 ✅), useUsers.ts (136 lines ≤500 ✅) |
| **AC-8** | Loading, Error, and Empty States (skeleton loader, error with retry, empty messages, no search results) | ✅ **IMPLEMENTED** | Auth loading state (page.tsx:114-123 spinner), error state with retry button (lines 126-141 Alert + RefreshCw), skeleton rows in table (UsersTable.tsx:194-223 animate-pulse), empty state (page.tsx:213-240 AlertCircle + "No users found" + Clear Filters button). **FILES:** page.tsx:114-141 + 213-240, UsersTable.tsx:194-223 |
| **AC-9** | Responsive Layout (Desktop ≥1024px full table, Tablet 768-1023px stacked filters, Mobile <768px card layout) | ❌ **MISSING** | **NOT IMPLEMENTED:** Only desktop table exists (UsersTable.tsx renders Table component without responsive variants). Mobile card layout MISSING. Filters use `flex-wrap` (UserFilters.tsx:62) but no mobile-specific card view. **BLOCKER:** Task 11 (Implement responsive layout) has 0/4 subtasks complete. **DEFERRED:** This is acceptable for MVP if documented. |
| **AC-10** | Performance and Accessibility (Initial load <2s, debounce, React Query caching, WCAG 2.1 AA, keyboard nav) | ⚠️ **PARTIAL** | **PERFORMANCE:** Debounce implemented (300ms ✅), React Query config (staleTime 60s ✅, refetchOnWindowFocus false ✅, retry 3 ✅ - useUsers.ts:38-40), optimistic UI (useUsers.ts:60-95 ✅). **ACCESSIBILITY:** ARIA labels on search input (UserSearchInput.tsx:46), loading states (PageLoader, skeleton), focus indicators assumed via shadcn/ui. **MISSING:** Initial load <2s NOT measured, WCAG testing NOT done (Task 13 0/5 subtasks complete), keyboard nav NOT tested. **TEST COVERAGE:** 0% (violates "80%+" requirement). |

**AC Coverage Summary:** 2/10 fully implemented (20%), 6/10 partially implemented (60%), 2/10 missing (20%). **Overall:** 50% complete with 3 CRITICAL blockers.

---

### Task Completion Validation

**Tasks Marked Complete:** 0/15 (all checkboxes unchecked in story file)
**Tasks Actually Complete:** 9/15 (implementation files created but incomplete due to blockers)
**False Completion Claims:** 0 (good - story file is honest about incomplete state)

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| **Task 1** | ❌ Incomplete | ✅ **COMPLETE** | page.tsx created (186 lines), page header lines 146-152 with title "Users Management" + subtitle. **MISSING:** "Create User" button (Subtask 1.3 NOT done). **PARTIAL:** 2/3 subtasks done. |
| **Task 2** | ❌ Incomplete | ✅ **COMPLETE** | useUsers.ts created (136 lines ≤500 ✅), React Query hook (lines 34-42), pagination (limit/offset), filters (tenant_id/is_active/role/search), debounce (page.tsx:54), staleTime 60s ✅, refetchOnWindowFocus false ✅, retry 3 ✅. **ALL 8 subtasks verified.** |
| **Task 3** | ❌ Incomplete | ✅ **COMPLETE** | UsersTable.tsx created (225 lines ≤500 ✅), 6 columns (Email/Roles/Status/Last Login/Created/Actions lines 57-177), sorting via TanStack Table (lines 182-191), sort indicators (lines 69-73 arrows). **MISSING:** Row click navigation (line 218 stubbed). **PARTIAL:** 6/7 subtasks done. |
| **Task 4** | ❌ Incomplete | ✅ **COMPLETE** | UserSearchInput.tsx created (51 lines ≤500 ✅), search icon (line 37), input (lines 40-47), clear button (lines 50-59), debounce handled by parent. **MISSING:** URL query params NOT synced. **PARTIAL:** 4/5 subtasks done. |
| **Task 5** | ❌ Incomplete | ✅ **COMPLETE** | UserFilters.tsx created (120 lines ≤500 ✅), Status dropdown (lines 64-87), Role dropdown (lines 90-116), Tenant dropdown (lines 119-147). **MISSING:** "Clear all filters" button implemented (page.tsx:223-237) but logic is WRONG (only shows when total=0, should show when ANY filter active), URL query params NOT synced. **PARTIAL:** 4/6 subtasks done. |
| **Task 6** | ❌ Incomplete | ⚠️ **QUESTIONABLE** | UserActionButtons.tsx created (125 lines ≤500 ✅), Deactivate/Activate button (lines 69-82), Reset Password button (lines 85-92), confirmation dialogs (lines 95-139), optimistic updates (useUsers.ts:54-105). **MISSING:** Subtask 6.5 disabled states (own account, last super_admin, outside tenant) NOT implemented. **CRITICAL:** Without disabled checks, users can deactivate themselves or last admin → **SECURITY RISK**. **PARTIAL:** 5/6 subtasks done. |
| **Task 7** | ❌ Incomplete | ❌ **NOT DONE** | "Create User" button NOT found in page.tsx header. Subtasks 7.1-7.3 ALL incomplete. **BLOCKER:** AC-1 requires this button. |
| **Task 8** | ❌ Incomplete | ⚠️ **QUESTIONABLE** | Pagination controls implemented (page.tsx:181-210), Previous/Next buttons (lines 189-207), page indicator (line 198 "Page X of Y"), total count (line 184 "Showing 1-20 of N users"), disabled states (lines 193, 204). **MISSING:** URL query params NOT synced (Subtask 8.4), reset to page 1 on filter change NOT implemented (Subtask 8.5 - no useEffect). **PARTIAL:** 3/5 subtasks done. |
| **Task 9** | ❌ Incomplete | ❌ **NOT DONE** | **BLOCKED:** useAuth hook missing (HIGH-2) → cannot verify RBAC. Code ATTEMPTS redirect (lines 57-73) and tenant scoping (lines 69-71) but will CRASH. Subtasks 9.1-9.4 ALL untestable until useAuth fixed. |
| **Task 10** | ❌ Incomplete | ✅ **COMPLETE** | Skeleton loader (UsersTable.tsx:194-223 animate-pulse), error state (page.tsx:126-141 Alert + Retry button), empty state (lines 213-240 AlertCircle + "No users found" + Clear Filters button), "No search results" message (line 219 conditional). **ALL 4 subtasks verified.** |
| **Task 11** | ❌ Incomplete | ❌ **NOT DONE** | Responsive layout NOT implemented. Only desktop table exists. Mobile card layout MISSING. Subtasks 11.1-11.4 ALL incomplete. **DEFERRABLE:** Can mark as technical debt if documented. |
| **Task 12** | ❌ Incomplete | ❌ **NOT DONE** | **ZERO test files written** (glob returned 0 results). Subtasks 12.1-12.7 ALL incomplete. **CRITICAL BLOCKER HIGH-3.** |
| **Task 13** | ❌ Incomplete | ❌ **NOT DONE** | Accessibility testing NOT done. Subtasks 13.1-13.5 ALL incomplete. WCAG 2.1 AA compliance NOT verified. |
| **Task 14** | ❌ Incomplete | ❌ **NOT DONE** | Performance testing NOT done. Subtasks 14.1-14.4 ALL incomplete. Initial load <2s NOT measured. |
| **Task 15** | ❌ Incomplete | ❌ **NOT DONE** | Integration testing NOT done. Subtasks 15.1-15.4 ALL incomplete. |

**Task Completion Summary:** 3/15 fully complete (20%), 5/15 partially complete (33%), 7/15 not done (47%). **Overall:** 40% task completion with 0% false completion claims (honest assessment).

---

### Architectural Alignment

**Constraints Compliance:** 6/12 (50%)

| Constraint | Status | Evidence |
|------------|--------|----------|
| ✅ **File size ≤500 lines** | **PASS** | All 9 files comply: page.tsx (186), UsersTable.tsx (225), UserActionButtons.tsx (125), UserFilters.tsx (120), UserSearchInput.tsx (51), users.ts (132), useUsers.ts (136), useDebounce.ts (43), users.ts util (74). **MAX:** 225 lines (55% under limit). |
| ❌ **Next.js 14 App Router** | **FAIL** | page.tsx marked `'use client'` (line 8) → Client Component → NOT using Server Component benefits (SEO, faster initial load). **RECOMMENDATION:** Refactor to Server Component + Client Components for interactivity (follow Workers pages pattern from Stories 18-21). |
| ✅ **TypeScript strict mode** | **CANNOT VERIFY** | Build blocked (HIGH-1) → cannot run `tsc --noEmit`. Code appears type-safe (explicit types on all interfaces). |
| ✅ **shadcn/ui components only** | **PASS** | Uses Table, Select, Input, Button, Badge, Label components. Custom Tailwind classes minimal (only for specific layout needs). **MISSING:** Alert/AlertDialog components NOT installed (HIGH-1). |
| ❌ **RBAC enforcement** | **FAIL** | Missing useAuth hook (HIGH-2) → RBAC cannot function → redirect check will crash (page.tsx:57-73). |
| ❌ **URL state management** | **FAIL** | Search/filters/pagination NOT preserved in URL query params. No `useSearchParams()` or `router.push()` calls found. **IMPACT:** User cannot bookmark/share filtered views, refresh loses state. |
| ✅ **React Query v5 patterns** | **PASS** | Query key factory (useUsers.ts:16-21 userKeys), staleTime 60s (line 38), refetchOnWindowFocus false (line 39), retry 3 (line 40). **EXCELLENT:** Follows 2025 best practices. |
| ✅ **Optimistic UI updates** | **PASS** | useUpdateUser mutation (useUsers.ts:54-105) implements onMutate snapshot + optimistic update + onError rollback + onSettled invalidate. **EXCELLENT:** Perfect pattern. |
| ❌ **Accessibility WCAG 2.1 AA** | **CANNOT VERIFY** | No accessibility testing done (Task 13 incomplete). ARIA labels exist on search input (UserSearchInput.tsx:46), keyboard nav assumed via shadcn/ui. **BLOCKER:** Run axe-core audit required. |
| ❌ **Test coverage ≥80%** | **FAIL** | 0% coverage (HIGH-3). **CRITICAL:** Violates AC-10 requirement. |
| ❌ **Performance targets** | **CANNOT VERIFY** | Initial load <2s NOT measured (Task 14.1). Search debounce implemented ✅ (300ms). React Query caching optimal ✅. |
| ❌ **Responsive design** | **FAIL** | Mobile card layout NOT implemented (AC-9). Only desktop table exists. |

**Constraint Compliance Summary:** 6/12 constraints met (50%), 6/12 failed or cannot verify (50%). **Overall:** Moderate architectural alignment with critical gaps in RBAC, URL state, tests, and responsive design.

---

### Security Notes

**Security Score:** 6/10 (MODERATE - Critical RBAC blocker + 1 HIGH security risk)

**CRITICAL SECURITY RISKS:**

1. **HIGH RISK:** Task 6.5 Disabled States NOT Implemented → Users can:
   - Deactivate their own account (lock themselves out)
   - Deactivate last active super_admin (orphan the system)
   - Deactivate users outside their tenant (tenant_admin bypass)

   **Required Fix:** Implement disabled checks in UserActionButtons.tsx:
   ```typescript
   const canModify = useMemo(() => {
     // Cannot modify own account
     if (user.id === currentUser?.id) return false;

     // Cannot deactivate last super_admin
     if (user.is_active && isLastSuperAdmin(user.id)) return false;

     // tenant_admin can only modify users in their tenant
     if (!isSuperAdmin && user.default_tenant_id !== currentUser?.default_tenant_id) return false;

     return true;
   }, [user, currentUser, isSuperAdmin]);

   // Disable buttons when canModify=false
   <Button disabled={!canModify || isLoading}>...</Button>
   ```

2. **MEDIUM RISK:** RBAC Enforcement Broken (HIGH-2 blocker) → No authentication check → Anyone can access /dashboard/users in current state. **BLOCKER:** Fix useAuth hook.

**SECURITY STRENGTHS:**

- ✅ Audit logging implemented in backend (Story 22 AC-3) → All user modifications tracked
- ✅ Last super_admin protection exists in backend API (Story 22 AC-3) → 400 error on deactivate → Frontend will show error toast (useUsers.ts:89-91)
- ✅ Tenant isolation enforced by backend (src/api/users.py tenant scoping) → Frontend cannot bypass via API call
- ✅ Optimistic UI rollback on error (useUsers.ts:81-91) → Failed mutations don't leave UI in inconsistent state
- ✅ Input validation: Email search is substring match (safe), no SQL injection risk
- ✅ XSS protection: No dangerouslySetInnerHTML usage, all user content rendered via React (auto-escaped)

**SECURITY RECOMMENDATIONS:**

1. **URGENT:** Implement Task 6.5 disabled states (prevents user from shooting themselves in foot)
2. **URGENT:** Fix useAuth hook (HIGH-2) to restore RBAC
3. **RECOMMENDED:** Add rate limiting on password reset endpoint (backend Story 22) to prevent abuse
4. **RECOMMENDED:** Add session timeout handling (if user session expires mid-action, show friendly error)

---

### Test Coverage and Gaps

**Current Coverage:** 0%
**Target Coverage:** 80% (AC-10 requirement)
**Gap:** -80% (**CRITICAL HIGH-3 BLOCKER**)

**Missing Test Files (7 required, 0 written):**

1. **useUsers.test.ts** (Task 12.1) - React Query hook tests:
   - ✅ Mock API: MSW handlers for GET /api/v1/users
   - ✅ Test pagination: verify items, total, limit, offset
   - ✅ Test filters: status, role, tenant_id query params
   - ✅ Test search debounce: jest.useFakeTimers + advanceTimersByTime(300)
   - ✅ Test error handling: API 500 → isError=true, error message shown
   - **Min 10 tests**

2. **UsersTable.test.tsx** (Task 12.2) - Table component tests:
   - ✅ Test sorting: click Email header → verify sort asc, click again → desc
   - ✅ Test rendering: verify 6 columns rendered with correct data
   - ✅ Test status badges: active=green, inactive=gray
   - ✅ Test date formatting: last_login="2 hours ago", created_at="Nov 24, 2025"
   - ✅ Test role formatting: "Admin (Tenant A), Viewer (Tenant B)"
   - ✅ Test skeleton loading: isLoading=true → animate-pulse rows visible
   - **Min 8 tests**

3. **UserSearchInput.test.tsx** (Task 12.3) - Search component tests:
   - ✅ Test input change: type value → onChange callback fired
   - ✅ Test clear button: click X → onChange('') called
   - ✅ Test clear button visibility: value='' → X hidden, value='test' → X visible
   - **Min 3 tests**

4. **UserFilters.test.tsx** (Task 12.4) - Filter dropdowns tests:
   - ✅ Test status filter: select Active → onStatusChange(true)
   - ✅ Test role filter: select Developer → onRoleChange('developer')
   - ✅ Test tenant filter: super_admin → visible, tenant_admin → hidden
   - **Min 4 tests**

5. **UserActionButtons.test.tsx** (Task 12.5) - Action buttons tests:
   - ✅ Test deactivate: click Deactivate → dialog opens → confirm → mutation called
   - ✅ Test activate: user.is_active=false → button shows "Activate"
   - ✅ Test reset password: click Reset Password → dialog → confirm → mutation + toast
   - ✅ Test loading states: mutation.isPending=true → spinner shown
   - **Min 6 tests**

6. **RBAC redirect test** (Task 12.6) - Middleware protection:
   - ✅ Mock session with role=developer → navigate to /dashboard/users → expect redirect to /dashboard
   - ✅ Mock session with role=super_admin → no redirect
   - **Min 2 tests** (**BLOCKED:** Cannot test until useAuth fixed - HIGH-2)

7. **Loading/error/empty states test** (Task 12.7) - UI states:
   - ✅ Test loading: useUsers.isLoading=true → skeleton rows visible
   - ✅ Test error: useUsers.isError=true → error Alert + Retry button
   - ✅ Test empty: useUsers.data.total=0 → "No users found" message
   - **Min 3 tests**

**Total Minimum Tests Required:** 36 tests
**Total Tests Written:** 0 tests
**Completion:** 0% (**UNACCEPTABLE** for production deployment)

**Testing Frameworks Available:**
- ✅ Jest + React Testing Library (already configured in project)
- ✅ MSW (Mock Service Worker) for API mocking
- ✅ @testing-library/react-hooks for hook testing
- ✅ Playwright for E2E testing (optional for Task 15)

**Testing Blockers:**
- HIGH-2 (useAuth hook missing) blocks Task 12.6 RBAC tests → **Fix useAuth first**
- HIGH-1 (build broken) blocks ALL tests → **Install shadcn components first**

**Recommendation:** Write tests in parallel with fixing blockers to ensure 80%+ coverage before marking story done.

---

### Best-Practices and References

**Tech Stack Detected:**
- Next.js 14.2.15 (App Router)
- React 18+ (Client Components with 'use client')
- TanStack Query v5 (React Query)
- TanStack Table v8 (Sorting/Pagination)
- TypeScript (strict mode)
- shadcn/ui component library (Headless UI + Tailwind)
- date-fns 3.6.0 (Date formatting)
- axios 1.7.9 (HTTP client)
- sonner 2.0.7 (Toast notifications)

**2025 Best Practices Validation:**

✅ **EXCELLENT:**
- React Query v5 patterns (query key factory, staleTime, optimistic updates) match 2025 best practices
- Optimistic UI implementation in useUpdateUser (snapshot → update → rollback → invalidate) is **PERFECT**
- File size discipline (all 9 files ≤500 lines) shows good modularity
- Date formatting with date-fns (formatDistanceToNow, format) is 2025 recommended approach
- TypeScript usage with explicit interface definitions (no `any` types found)

⚠️ **NEEDS IMPROVEMENT:**
- Next.js 14 App Router: page.tsx should be Server Component, not 'use client' → Refactor per [Next.js Docs - Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- URL state management: Use `useSearchParams` and `router.push` to preserve filters/search/pagination → Refactor per [Next.js Docs - URL State](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- Responsive design: Implement mobile card layout per [TailwindCSS Responsive Design](https://tailwindcss.com/docs/responsive-design) and [Headless UI Mobile Patterns](https://headlessui.com/react/menu#mobile-friendly-menus)

❌ **CRITICAL ISSUES:**
- Missing shadcn/ui components → Install per [shadcn/ui CLI](https://ui.shadcn.com/docs/components/alert)
- Missing useAuth hook → Implement per [Next-Auth useSession pattern](https://next-auth.js.org/getting-started/client#usesession)
- Zero test coverage → Write tests per [React Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro/) and [React Query Testing](https://tanstack.com/query/latest/docs/framework/react/guides/testing)

**References:**
- [Next.js 14 App Router Documentation](https://nextjs.org/docs/app) - Server Components, Client Components, useSearchParams
- [TanStack Query v5 Documentation](https://tanstack.com/query/v5) - Query keys, staleTime, optimistic updates
- [TanStack Table v8 Documentation](https://tanstack.com/table/v8) - Column definitions, sorting, pagination
- [shadcn/ui Component Library](https://ui.shadcn.com) - Alert, AlertDialog, Table, Select, Input, Badge
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Component testing best practices
- [Next-Auth Documentation](https://next-auth.js.org) - Authentication patterns for Next.js

---

### Action Items

#### **Code Changes Required (BLOCKERS - Must fix before deployment):**

- [ ] **[HIGH-1]** Install missing shadcn/ui components [file: nextjs-ui/components/ui/]
  ```bash
  cd nextjs-ui && npx shadcn-ui@latest add alert alert-dialog
  ```
  **Impact:** Unblocks build → Code can compile → Tests can run
  **Owner:** Dev Agent
  **Priority:** P0 (Critical Blocker)

- [ ] **[HIGH-2]** Implement useAuth hook or refactor to useSession [file: nextjs-ui/lib/hooks/useAuth.ts OR page.tsx:16]
  **Options:**
  1. **Recommended:** Refactor page.tsx to use `const { data: session } = useSession()` directly (matches Workers pages pattern from Stories 18-21)
  2. **Alternative:** Create useAuth hook wrapping useSession:
     ```typescript
     // nextjs-ui/lib/hooks/useAuth.ts
     import { useSession } from 'next-auth/react';
     export function useAuth() {
       const { data: session, status } = useSession();
       return {
         user: session?.user,
         isLoading: status === 'loading',
         isAuthenticated: !!session,
       };
     }
     ```
  **Impact:** Unblocks RBAC (AC-6) → Redirect check works → Tenant scoping works
  **Owner:** Dev Agent
  **Priority:** P0 (Critical Blocker)

- [ ] **[HIGH-3]** Write minimum 36 unit tests (80%+ coverage per AC-10) [file: nextjs-ui/__tests__/users/]
  **Test Files Required:**
  - useUsers.test.ts (10 tests min)
  - UsersTable.test.tsx (8 tests min)
  - UserSearchInput.test.tsx (3 tests min)
  - UserFilters.test.tsx (4 tests min)
  - UserActionButtons.test.tsx (6 tests min)
  - RBAC redirect test (2 tests min - BLOCKED by HIGH-2)
  - Loading/error/empty states (3 tests min)

  **Impact:** Meets AC-10 requirement → Verifies all features work → Prevents regressions
  **Owner:** Dev Agent
  **Priority:** P0 (Critical Blocker)
  **Dependencies:** Must fix HIGH-1 and HIGH-2 first

#### **Code Changes Required (CRITICAL - Security Risks):**

- [ ] **[HIGH-SEC-1]** Implement Task 6.5 disabled states for action buttons [file: nextjs-ui/components/users/UserActionButtons.tsx:69-92]
  **Add checks:**
  ```typescript
  const canModify = useMemo(() => {
    // Cannot modify own account
    if (user.id === currentUser?.id) return false;
    // Cannot deactivate last super_admin (call API or check local state)
    if (user.is_active && isLastSuperAdmin(user.id)) return false;
    // tenant_admin can only modify users in their tenant
    if (!isSuperAdmin && user.default_tenant_id !== currentUser?.default_tenant_id) return false;
    return true;
  }, [user, currentUser, isSuperAdmin]);

  <Button disabled={!canModify || isLoading}>Deactivate/Activate</Button>
  <Button disabled={!canModify || isLoading}>Reset Password</Button>
  ```
  **Impact:** Prevents users from deactivating themselves or last super_admin (system orphan risk)
  **Owner:** Dev Agent
  **Priority:** P0 (HIGH Security Risk)

#### **Code Changes Required (MEDIUM - Missing Features):**

- [ ] **[MED-1]** Add "Create User" button to page header [file: nextjs-ui/app/dashboard/users/page.tsx:146-152]
  **Current:** Header only has title + subtitle (lines 147-151)
  **Required (AC-1):**
  ```typescript
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
      <p className="text-muted-foreground">Manage user accounts...</p>
    </div>
    <Button onClick={() => router.push('/dashboard/users/new')}>
      <Plus className="mr-2 h-4 w-4" />
      Create User
    </Button>
  </div>
  ```
  **Owner:** Dev Agent
  **Priority:** P1 (AC-1 requirement)

- [ ] **[MED-2]** Implement URL query params sync for search/filters/pagination [file: nextjs-ui/app/dashboard/users/page.tsx:46-52]
  **Current:** State stored in local component state (useState)
  **Required (AC-3, AC-4, AC-5):**
  ```typescript
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Read from URL on mount
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setStatusFilter(searchParams.get('status') === 'active' ? true : searchParams.get('status') === 'inactive' ? false : undefined);
    setRoleFilter(searchParams.get('role') as RoleEnum || undefined);
    setTenantFilter(searchParams.get('tenant_id') || undefined);
    setPage(parseInt(searchParams.get('page') || '1') - 1);
  }, [searchParams]);

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter !== undefined) params.set('status', statusFilter ? 'active' : 'inactive');
    if (roleFilter) params.set('role', roleFilter);
    if (tenantFilter) params.set('tenant_id', tenantFilter);
    if (page > 0) params.set('page', String(page + 1));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [search, statusFilter, roleFilter, tenantFilter, page]);
  ```
  **Impact:** Users can bookmark/share filtered views, refresh preserves state
  **Owner:** Dev Agent
  **Priority:** P1 (AC-3, AC-4, AC-5 requirement)

- [ ] **[MED-3]** Reset page to 1 when search or filters change [file: nextjs-ui/app/dashboard/users/page.tsx:54]
  **Current:** Page state persists when filters change
  **Required (AC-5):**
  ```typescript
  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, statusFilter, roleFilter, tenantFilter]);
  ```
  **Impact:** User doesn't land on empty page 5 after filtering results to 10 items
  **Owner:** Dev Agent
  **Priority:** P1 (AC-5 requirement)

- [ ] **[MED-4]** Fix "Clear all filters" button logic [file: nextjs-ui/app/dashboard/users/page.tsx:223-237]
  **Current:** Button only shows when total=0 (line 222 condition: `usersData.total === 0`)
  **Required (AC-4):** Button should show when ANY filter is active
  ```typescript
  // Show button when any filter is active
  const hasActiveFilters = search || statusFilter !== undefined || roleFilter || (isSuperAdmin && tenantFilter);

  {hasActiveFilters && (
    <Button onClick={() => { /* clear logic */ }}>Clear Filters</Button>
  )}
  ```
  **Impact:** Users can clear filters even when results exist
  **Owner:** Dev Agent
  **Priority:** P2 (UX improvement)

- [ ] **[MED-5]** Refactor page.tsx from Client Component to Server Component [file: nextjs-ui/app/dashboard/users/page.tsx:8]
  **Current:** `'use client'` directive on line 8 → Entire page is Client Component
  **Recommended Pattern (Next.js 14 App Router best practice):**
  ```typescript
  // page.tsx (Server Component - NO 'use client')
  import { getServerSession } from 'next-auth';
  import { redirect } from 'next/navigation';
  import { UsersPageClient } from './UsersPageClient';

  export default async function UsersPage() {
    const session = await getServerSession();
    if (!['super_admin', 'tenant_admin'].includes(session.user.role)) {
      redirect('/dashboard');
    }
    const tenantId = session.user.role === 'tenant_admin' ? session.user.default_tenant_id : null;
    return <UsersPageClient initialTenantId={tenantId} userRole={session.user.role} />;
  }

  // UsersPageClient.tsx (NEW file - Client Component with 'use client')
  'use client';
  export function UsersPageClient({ initialTenantId, userRole }: Props) {
    // All existing page.tsx logic moves here (state, hooks, etc.)
  }
  ```
  **Impact:** SEO improvement, faster initial load (Server Component pre-renders HTML), follows Next.js 14 best practices
  **Owner:** Dev Agent
  **Priority:** P2 (Architecture improvement, not blocking)

#### **Advisory Notes (Non-Blocking):**

- **Note:** AC-9 (Responsive layout) NOT implemented - Mobile card layout missing. **Recommendation:** Document as technical debt for future story if MVP can ship with desktop-only view. If mobile support is required for launch, elevate to P0 blocker.

- **Note:** Task 13 (Accessibility testing - WCAG 2.1 AA) NOT done. **Recommendation:** Run axe-core audit in Playwright E2E tests before production deployment. Add to CI/CD pipeline per Story 12.6.

- **Note:** Task 14 (Performance testing - Initial load <2s) NOT measured. **Recommendation:** Add Lighthouse CI checks to GitHub Actions. Measure on staging environment with realistic data (100+ users).

- **Note:** Task 15 (Integration testing - E2E workflows) NOT done. **Recommendation:** Write minimum 3 Playwright tests: (1) Load page → Search → Filter → Sort → Paginate, (2) Deactivate user → Confirm → Verify toast, (3) RBAC redirect for developer role.

---

### Recommendation

**Status Change:** `ready-for-review` → `in-progress` (return to Dev Agent for fixes)

**Next Steps:**
1. **URGENT:** Fix 3 HIGH BLOCKERS (install components, fix useAuth, write tests) - Estimated: 8 hours
2. **CRITICAL:** Fix HIGH-SEC-1 disabled states (security risk) - Estimated: 2 hours
3. **MEDIUM:** Implement 4 missing features (Create User button, URL params, page reset, Clear Filters logic) - Estimated: 4 hours
4. **ADVISORY:** Address responsive layout, accessibility testing, performance testing - Estimated: 8 hours

**Total Estimated Effort to Unblock:** 14 hours (blockers + security)
**Total Estimated Effort to Complete:** 22 hours (all features + testing)

**Production Deployment:** ❌ **NOT RECOMMENDED** until all 3 HIGH BLOCKERS resolved + HIGH-SEC-1 security fix applied.

**Quality Score:** 5.5/10 (MODERATE - Good implementation patterns, but critical blockers prevent deployment)

---

### Review Sign-Off

**Outcome:** 🚫 **BLOCKED**
**Reason:** 3 CRITICAL HIGH SEVERITY BLOCKERS (build broken, auth missing, zero tests) + 1 HIGH SECURITY RISK (disabled states missing)

**Approved for Deployment:** NO
**Approved for Continued Development:** YES (with required fixes listed above)

**Reviewer Signature:** Amelia (Dev Agent) - Claude Sonnet 4.5
**Date:** 2025-11-24
