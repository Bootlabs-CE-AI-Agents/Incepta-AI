/**
 * useAuth Hook
 *
 * Wrapper around next-auth useSession for consistent auth access
 * Returns user, loading state, and authentication status
 */

import { useSession } from 'next-auth/react';
import type { UserDetail } from '@/lib/api/users';

interface UseAuthReturn {
  user: UserDetail | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook for accessing current user authentication state
 *
 * Wraps next-auth's useSession hook with type-safe user object
 *
 * @returns {UseAuthReturn} Current user, loading state, and auth status
 *
 * @example
 * ```tsx
 * const { user, isLoading, isAuthenticated } = useAuth();
 *
 * if (isLoading) return <Loading />;
 * if (!isAuthenticated) return <Login />;
 *
 * return <div>Welcome {user?.email}</div>;
 * ```
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  return {
    user: session?.user as UserDetail | null,
    isLoading: status === 'loading',
    isAuthenticated: !!session?.user,
  };
}
