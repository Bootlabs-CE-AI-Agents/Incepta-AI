# Next.js UI Development Guide

**Version:** 1.0  
**Last Updated:** 2025-11-22  
**Epic:** Next.js UI Migration  
**Target Audience:** Frontend developers working on the AI Agents platform

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [TanStack Query Patterns](#tanstack-query-patterns)
6. [Apple Liquid Glass Design System](#apple-liquid-glass-design-system)
7. [State Management](#state-management)
8. [Authentication & Authorization](#authentication--authorization)
9. [API Integration](#api-integration)
10. [Testing Patterns](#testing-patterns)
11. [Performance Optimization](#performance-optimization)
12. [Automated Quality Gates](#automated-quality-gates)
13. [Common Patterns](#common-patterns)
14. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers development patterns, best practices, and conventions for the Next.js UI component of the AI Agents platform. The UI is a complete migration from Streamlit, built with Next.js 14 App Router and the Apple Liquid Glass design system.

### Key Principles

1. **Type Safety First**: TypeScript strict mode, zero type errors
2. **Test Coverage**: 80% minimum, 95%+ target (Sprint 1: 99.76%)
3. **Automated Quality**: All checks automated in CI/CD
4. **Performance**: <2s page load, <200ms API response
5. **Accessibility**: WCAG 2.1 AA compliance

### Design Philosophy

- **Apple Liquid Glass**: Glassmorphic design with blur effects, subtle shadows
- **Responsive**: Mobile-first, desktop-optimized
- **Dark Mode**: Theme toggle with system preference detection
- **Consistent**: Design tokens from Figma, shadcn/ui components

---

## Tech Stack

### Core Framework
- **Next.js 14.2.15**: App Router, React Server Components
- **React 18.3.1**: Concurrent features, Suspense
- **TypeScript 5.6.3**: Strict mode type checking

### UI & Styling
- **Tailwind CSS 3.4**: Utility-first styling
- **shadcn/ui**: Accessible component primitives
- **Radix UI**: Headless accessible components
- **Lucide Icons**: Consistent icon system
- **Framer Motion**: Smooth animations

### Data Fetching & State
- **TanStack Query v5**: Server state management
- **Zustand 5.0**: Client state management
- **React Hook Form 7.66**: Form state & validation
- **Zod 4.1**: Schema validation

### Development Tools
- **Jest 30.2**: Unit testing
- **React Testing Library 16.3**: Component testing
- **Playwright 1.56**: E2E testing
- **ESLint**: Code quality
- **Prettier**: Code formatting
- **TypeScript**: Type checking

### Code Editor Tools
- **CodeMirror 6**: Code editor with syntax highlighting
- **Monaco Editor**: Alternative for complex editing

### Charts & Visualization
- **Recharts 3.3**: Responsive chart library
- **D3.js** (via Recharts): Data transformations

---

## Project Structure

```
nextjs-ui/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth layout group
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/                # Main dashboard
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── page.tsx              # Dashboard home
│   │   ├── agents/               # Agent management
│   │   ├── llm-costs/            # LLM cost analytics
│   │   ├── agent-performance/    # Performance metrics
│   │   ├── mcp-servers/          # MCP server management
│   │   ├── prompts/              # Prompt management
│   │   ├── tools/                # Tool assignment
│   │   └── workers/              # Worker monitoring (Sprint 2)
│   ├── api/                      # API routes (if needed)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── costs/                    # LLM cost components
│   │   ├── DailySpendChart.tsx
│   │   ├── TokenBreakdownChart.tsx
│   │   ├── BudgetUtilizationRow.tsx
│   │   └── DateRangeSelector.tsx
│   ├── charts/                   # Shared chart components
│   │   ├── CustomTooltip.tsx
│   │   └── ChartContainer.tsx
│   ├── prompts/                  # Prompt editor components
│   │   ├── PromptEditor.tsx
│   │   ├── TokenCounter.tsx
│   │   ├── VariableManager.tsx
│   │   ├── PromptPreview.tsx
│   │   └── PromptVersionHistory.tsx
│   └── layout/                   # Layout components
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── Footer.tsx
│
├── hooks/                        # Custom React hooks
│   ├── useAgents.ts              # Agent data fetching
│   ├── useLLMCostSummary.ts      # Cost summary hook
│   ├── useLLMCostTrend.ts        # Cost trend hook
│   ├── useTokenBreakdown.ts      # Token breakdown hook
│   ├── useBudgetUtilization.ts   # Budget utilization hook
│   └── useAuth.ts                # Authentication hook
│
├── lib/                          # Utility libraries
│   ├── api/                      # API client utilities
│   │   ├── client.ts             # Axios instance
│   │   ├── agents.ts             # Agent API
│   │   ├── llm-costs.ts          # Cost API
│   │   ├── prompts.ts            # Prompt API
│   │   └── error-analysis.ts     # Error handling
│   ├── utils.ts                  # General utilities
│   ├── auth.ts                   # Auth utilities
│   └── validation.ts             # Zod schemas
│
├── types/                        # TypeScript type definitions
│   ├── agents.ts                 # Agent types
│   ├── costs.ts                  # Cost types
│   ├── prompts.ts                # Prompt types
│   ├── api.ts                    # API response types
│   └── index.ts                  # Type exports
│
├── tests/                        # Test files
│   ├── components/               # Component tests
│   ├── hooks/                    # Hook tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # E2E tests
│
├── public/                       # Static assets
│   ├── icons/
│   ├── images/
│   └── mockServiceWorker.js      # MSW worker
│
├── .github/                      # GitHub workflows
│   └── workflows/
│       └── nextjs-quality-gates.yml
│
├── jest.config.js                # Jest configuration
├── playwright.config.ts          # Playwright configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
├── .eslintrc.json                # ESLint configuration
├── .prettierrc.json              # Prettier configuration
└── package.json                  # Dependencies & scripts
```

---

## Development Workflow

### Local Development Setup

```bash
# 1. Install dependencies
cd nextjs-ui
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your local API URL

# 3. Start development server
npm run dev
# Access at http://localhost:3000

# 4. Run Storybook (for component development)
npm run storybook
# Access at http://localhost:6006
```

### Pre-commit Checklist

**ALWAYS run before committing:**

```bash
# 1. Format code
npm run format

# 2. Fix linting issues
npm run lint:fix

# 3. Type check
npm run type-check

# 4. Run tests with coverage
npm test -- --coverage

# 5. Build to verify no build errors
npm run build
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/story-X.Y-description

# 2. Make changes and commit
git add .
git commit -m "feat(story-X.Y): Brief description

- Detailed change 1
- Detailed change 2

Co-Authored-By: Claude <noreply@anthropic.com>"

# 3. Push and create PR
git push origin feature/story-X.Y-description
# Open PR on GitHub using the PR template
```

### PR Review Process

1. **Self-review**: Check Technical Debt section in PR template
2. **Automated Checks**: All quality gates must pass (CI/CD)
3. **Code Review**: Reviewer approval required
4. **RE-REVIEW Prevention**: See docs/testing-strategy.md

---

## TanStack Query Patterns

### Basic Query Setup

TanStack Query (formerly React Query) v5 is used for all server state management. Key benefits:
- Automatic caching
- Background refetching
- Optimistic updates
- Request deduplication

#### Query Configuration

**Global Configuration** (`app/layout.tsx`):

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 seconds
      gcTime: 5 * 60 * 1000,        // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,  // Disable auto-refetch on focus
      retry: 3,                     // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

### Query Hook Pattern

**Standard Query Hook** (`hooks/useAgents.ts`):

```typescript
import { useQuery } from '@tanstack/react-query';
import { getAgents } from '@/lib/api/agents';
import type { Agent } from '@/types/agents';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 30 * 1000,      // Fresh for 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

// Usage in component:
const AgentsPage = () => {
  const { data: agents, isLoading, error } = useAgents();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <AgentList agents={agents} />;
};
```

### Query with Parameters

**Parametrized Query** (`hooks/useLLMCostTrend.ts`):

```typescript
import { useQuery } from '@tanstack/react-query';
import { getLLMCostTrend } from '@/lib/api/llm-costs';

export interface UseLLMCostTrendParams {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'week' | 'month';
  agentId?: string;
}

export function useLLMCostTrend(params: UseLLMCostTrendParams) {
  return useQuery({
    queryKey: ['llm-cost-trend', params], // Include params in key
    queryFn: () => getLLMCostTrend(params),
    enabled: !!params.startDate && !!params.endDate, // Only fetch when params ready
    staleTime: 60 * 1000, // 1 minute
  });
}

// Usage:
const TrendChart = () => {
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-01-31' });
  
  const { data, isLoading } = useLLMCostTrend({
    startDate: dateRange.start,
    endDate: dateRange.end,
    groupBy: 'day',
  });
  
  // Query automatically refetches when dateRange changes
};
```

### Mutation Pattern

**Creating/Updating Data**:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAgent, updateAgent } from '@/lib/api/agents';
import { toast } from 'sonner';

export function useCreateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createAgent,
    onSuccess: (newAgent) => {
      // Invalidate agents query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      
      // Or optimistically update cache:
      queryClient.setQueryData(['agents'], (old: Agent[]) => [...old, newAgent]);
      
      toast.success('Agent created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create agent: ${error.message}`);
    },
  });
}

// Usage in component:
const CreateAgentForm = () => {
  const createAgent = useCreateAgent();
  
  const handleSubmit = (data: AgentFormData) => {
    createAgent.mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={createAgent.isPending}>
        {createAgent.isPending ? 'Creating...' : 'Create Agent'}
      </button>
    </form>
  );
};
```

### Optimistic Updates

**Immediate UI Feedback**:

```typescript
export function useUpdateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateAgent,
    onMutate: async (updatedAgent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['agents', updatedAgent.id] });
      
      // Snapshot previous value
      const previousAgent = queryClient.getQueryData(['agents', updatedAgent.id]);
      
      // Optimistically update
      queryClient.setQueryData(['agents', updatedAgent.id], updatedAgent);
      
      // Return context with snapshot
      return { previousAgent };
    },
    onError: (err, updatedAgent, context) => {
      // Rollback on error
      if (context?.previousAgent) {
        queryClient.setQueryData(['agents', updatedAgent.id], context.previousAgent);
      }
      toast.error('Failed to update agent');
    },
    onSettled: (updatedAgent) => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['agents', updatedAgent?.id] });
    },
  });
}
```

### Pagination Pattern

**Infinite Scroll / Load More**:

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteAgents() {
  return useInfiniteQuery({
    queryKey: ['agents', 'infinite'],
    queryFn: ({ pageParam = 1 }) => getAgents({ page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

// Usage:
const InfiniteAgentList = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteAgents();
  
  return (
    <>
      {data?.pages.map((page) => (
        page.agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
      ))}
      
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading more...' : 'Load more'}
        </button>
      )}
    </>
  );
};
```

### Error Handling

**Global Error Boundary**:

```typescript
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

<QueryErrorResetBoundary>
  {({ reset }) => (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <pre>{error.message}</pre>
          <button onClick={resetErrorBoundary}>Try again</button>
        </div>
      )}
    >
      <App />
    </ErrorBoundary>
  )}
</QueryErrorResetBoundary>
```

### Dependent Queries

**Sequential Data Fetching**:

```typescript
export function useAgentWithTools(agentId: string) {
  // First, fetch agent
  const agentQuery = useQuery({
    queryKey: ['agents', agentId],
    queryFn: () => getAgent(agentId),
  });
  
  // Then, fetch tools (only when agent is loaded)
  const toolsQuery = useQuery({
    queryKey: ['agents', agentId, 'tools'],
    queryFn: () => getAgentTools(agentId),
    enabled: !!agentQuery.data, // Only run when agent is loaded
  });
  
  return {
    agent: agentQuery.data,
    tools: toolsQuery.data,
    isLoading: agentQuery.isLoading || toolsQuery.isLoading,
  };
}
```

---

## Apple Liquid Glass Design System

### Design Tokens

**Color Palette** (defined in `tailwind.config.ts`):

```typescript
// Light mode
colors: {
  background: 'hsl(0 0% 100%)',
  foreground: 'hsl(240 10% 3.9%)',
  card: 'hsl(0 0% 100%)',
  'card-foreground': 'hsl(240 10% 3.9%)',
  primary: 'hsl(240 5.9% 10%)',
  'primary-foreground': 'hsl(0 0% 98%)',
  // ...
}

// Dark mode
dark: {
  background: 'hsl(240 10% 3.9%)',
  foreground: 'hsl(0 0% 98%)',
  // ...
}
```

**Glassmorphism Effects**:

```css
/* Example from DailySpendChart */
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
}

/* Dark mode variant */
.dark .glass-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Component Patterns

**Card Component** (`components/ui/card.tsx`):

```typescript
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card/50 backdrop-blur-sm text-card-foreground shadow-lg',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  );
}
```

**Usage Example**:

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const DashboardWidget = () => (
  <Card>
    <CardHeader>
      <CardTitle>LLM Cost Summary</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Total spend: $1,234.56</p>
    </CardContent>
  </Card>
);
```

### Responsive Design

**Mobile-First Breakpoints**:

```typescript
// tailwind.config.ts
screens: {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// Usage in components:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid: 1 col on mobile, 2 on tablet, 3 on desktop */}
</div>
```

### Animation Patterns

**Framer Motion Examples**:

```typescript
import { motion } from 'framer-motion';

// Fade in on mount
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <Card>...</Card>
</motion.div>

// List item stagger
<motion.div
  variants={{
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }}
  initial="hidden"
  animate="show"
>
  {items.map((item) => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
      }}
    >
      <AgentCard agent={item} />
    </motion.div>
  ))}
</motion.div>
```


### Dark Mode Implementation

**Theme Toggle with next-themes**:

```typescript
// app/layout.tsx
import { ThemeProvider } from 'next-themes';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

// components/ThemeToggle.tsx
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-lg p-2 hover:bg-accent"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}
```

---

## State Management

### Client State (Zustand)

**Simple Store Pattern**:

```typescript
// lib/stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

// Usage in component:
const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  
  return (
    <aside className={cn('transition-all', sidebarOpen ? 'w-64' : 'w-0')}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  );
};
```

### Form State (React Hook Form + Zod)

**Form with Validation**:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define schema
const agentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus']),
  temperature: z.number().min(0).max(2),
});

type AgentFormData = z.infer<typeof agentSchema>;

// Form component
export function AgentForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      temperature: 0.7,
    },
  });
  
  const createAgent = useCreateAgent();
  
  const onSubmit = (data: AgentFormData) => {
    createAgent.mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Name</label>
        <input {...register('name')} />
        {errors.name && <span className="text-red-500">{errors.name.message}</span>}
      </div>
      
      <div>
        <label>System Prompt</label>
        <textarea {...register('systemPrompt')} rows={5} />
        {errors.systemPrompt && <span className="text-red-500">{errors.systemPrompt.message}</span>}
      </div>
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Agent'}
      </button>
    </form>
  );
}
```

---

## Authentication & Authorization

### NextAuth.js Setup

**Auth Configuration** (`app/api/auth/[...nextauth]/route.ts`):

```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const res = await fetch(`${process.env.API_URL}/auth/login`, {
          method: 'POST',
          body: JSON.stringify(credentials),
          headers: { "Content-Type": "application/json" }
        });
        
        const user = await res.json();
        
        if (res.ok && user) {
          return user;
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.access_token;
        token.tenantId = user.tenant_id;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.tenantId = token.tenantId;
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Protected Routes

**Middleware** (`middleware.ts`):

```typescript
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## API Integration

### Axios Client Setup

**Base Client** (`lib/api/client.ts`):

```typescript
import axios from 'axios';
import { getSession } from 'next-auth/react';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### API Module Pattern

**Agents API** (`lib/api/agents.ts`):

```typescript
import apiClient from './client';
import type { Agent, AgentCreate, AgentUpdate } from '@/types/agents';

export async function getAgents(): Promise<Agent[]> {
  const { data } = await apiClient.get('/agents');
  return data;
}

export async function getAgent(id: string): Promise<Agent> {
  const { data } = await apiClient.get(`/agents/${id}`);
  return data;
}

export async function createAgent(agent: AgentCreate): Promise<Agent> {
  const { data } = await apiClient.post('/agents', agent);
  return data;
}

export async function updateAgent({ id, ...updates }: AgentUpdate): Promise<Agent> {
  const { data } = await apiClient.patch(`/agents/${id}`, updates);
  return data;
}

export async function deleteAgent(id: string): Promise<void> {
  await apiClient.delete(`/agents/${id}`);
}
```

---

## Testing Patterns

### Component Testing Best Practices

**From Sprint 1 learnings (99.76% coverage):**

1. **Test user behavior, not implementation**
2. **Use reusable fixtures (avoid duplication)**
3. **Cover edge cases (loading, error, empty states)**
4. **Test accessibility**

**Example Test** (`components/costs/DailySpendChart.test.tsx`):

```typescript
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DailySpendChart } from './DailySpendChart';
import { mockDailySpendData } from '@/tests/fixtures/costFixtures';

describe('DailySpendChart', () => {
  describe('Success State', () => {
    it('should render chart with correct data', () => {
      render(<DailySpendChart data={mockDailySpendData} />);
      
      expect(screen.getByRole('img', { name: /daily spend chart/i })).toBeInTheDocument();
      expect(screen.getByText(/total: \$1,234\.56/i)).toBeInTheDocument();
    });
  });
  
  describe('Loading State', () => {
    it('should show loading spinner when data is loading', () => {
      render(<DailySpendChart isLoading={true} />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });
  
  describe('Error State', () => {
    it('should display error message when fetch fails', () => {
      const error = new Error('Failed to fetch data');
      render(<DailySpendChart error={error} />);
      
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });
  
  describe('Empty State', () => {
    it('should show empty state when no data available', () => {
      render(<DailySpendChart data={[]} />);
      
      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });
  });
});
```

### Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAgents } from './useAgents';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAgents', () => {
  it('should fetch agents successfully', async () => {
    const { result } = renderHook(() => useAgents(), {
      wrapper: createWrapper(),
    });
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data).toHaveLength(3);
  });
});
```

---

## Performance Optimization

### Code Splitting

**Dynamic Imports**:

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy components
const ChartComponent = dynamic(() => import('./ChartComponent'), {
  loading: () => <LoadingSkeleton />,
  ssr: false, // Disable SSR for client-only components
});

// Lazy load modals
const AgentModal = dynamic(() => import('./AgentModal'));
```

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/images/logo.png"
  alt="AI Agents Logo"
  width={200}
  height={50}
  priority // For above-the-fold images
  placeholder="blur" // Show blur while loading
/>
```

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

const ExpensiveComponent = ({ data }) => {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      computed: expensiveCalculation(item),
    }));
  }, [data]);
  
  // Memoize callbacks
  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []);
  
  return <DataTable data={processedData} onRowClick={handleClick} />;
};
```

---

## Automated Quality Gates

### Local Development Checks

**Pre-commit Script** (`.husky/pre-commit`):

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

cd nextjs-ui

# Run checks
npm run format:check || exit 1
npm run lint || exit 1
npm run type-check || exit 1
npm test -- --bail --passWithNoTests || exit 1
```

### CI/CD Pipeline

All checks automated in `.github/workflows/nextjs-quality-gates.yml`:

1. ✅ Prettier formatting
2. ✅ ESLint linting
3. ✅ TypeScript type checking
4. ✅ Next.js build validation
5. ✅ Jest tests with 80% coverage
6. ✅ Coverage report upload

**PR Requirements:**
- All automated checks PASS
- Technical Debt section filled in PR template
- Code review approval

---

## Common Patterns

### Loading States

**Skeleton Pattern**:

```typescript
export function AgentCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-muted rounded w-3/4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </CardContent>
    </Card>
  );
}

// Usage with TanStack Query
const AgentList = () => {
  const { data: agents, isLoading } = useAgents();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <AgentCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {agents?.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
};
```

### Error Boundaries

```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
            Something went wrong
          </h2>
          <pre className="mt-2 text-sm text-red-600 dark:text-red-300">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### Toast Notifications

```typescript
import { toast } from 'sonner';

// Success
toast.success('Agent created successfully');

// Error
toast.error('Failed to create agent', {
  description: error.message,
  action: {
    label: 'Retry',
    onClick: () => retry(),
  },
});

// Loading
const toastId = toast.loading('Creating agent...');
// Later
toast.success('Agent created!', { id: toastId });
```

---

## Troubleshooting

### Common Issues

**1. Hydration Mismatch**

```typescript
// Problem: Server/client render mismatch with theme
// Solution: Use suppressHydrationWarning
<html lang="en" suppressHydrationWarning>
```

**2. TanStack Query Not Refetching**

```typescript
// Problem: Stale data not updating
// Solution: Invalidate queries after mutation
queryClient.invalidateQueries({ queryKey: ['agents'] });
```

**3. TypeScript Errors in Tests**

```typescript
// Problem: "Cannot find module '@testing-library/jest-dom'"
// Solution: Add to jest.setup.ts
import '@testing-library/jest-dom';
```

**4. Build Fails with Environment Variables**

```bash
# Problem: Missing NEXT_PUBLIC_API_URL
# Solution: Add to .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Debug Tools

**React DevTools**: Component tree inspection  
**TanStack Query DevTools**: Query state debugging  
**Next.js Build Analyzer**: Bundle size analysis

```bash
# Analyze bundle
ANALYZE=true npm run build
```

---

## Best Practices Summary

### DOs

✅ Use TypeScript strict mode  
✅ Write tests for all components  
✅ Use TanStack Query for server state  
✅ Follow Apple Liquid Glass design system  
✅ Run quality gates before committing  
✅ Document technical debt in PRs  
✅ Use reusable test fixtures  
✅ Implement proper loading/error states  
✅ Optimize images with Next.js Image  
✅ Use memoization for expensive operations  

### DON'Ts

❌ Skip automated quality checks  
❌ Use `as any` type casts  
❌ Duplicate test fixtures  
❌ Skip error handling  
❌ Commit without running tests  
❌ Create PRs without Technical Debt section  
❌ Mix server and client state  
❌ Use inline styles (use Tailwind)  
❌ Forget accessibility  
❌ Skip coverage requirements  

---

## Additional Resources

- **Testing Strategy**: `docs/testing-strategy.md`
- **Sprint 1 Retrospective**: `docs/retrospectives/nextjs-sprint-1-retro-2025-11-22.md`
- **PR Template**: `.github/PULL_REQUEST_TEMPLATE.md`
- **Quality Gates**: `.github/workflows/nextjs-quality-gates.yml`

**External Documentation:**
- [Next.js 14 Docs](https://nextjs.org/docs)
- [TanStack Query v5](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Document Owner:** Amelia (Developer)  
**Contributors:** Charlie (Senior Dev), Bob (Scrum Master)  
**Last Updated:** 2025-11-22  
**Version:** 1.0
