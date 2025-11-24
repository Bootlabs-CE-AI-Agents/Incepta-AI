/**
 * useDebounce Hook
 *
 * Debounces a value by delaying updates until after a specified delay
 * Used for search input to prevent excessive API calls (AC-3)
 */

import { useEffect, useState } from 'react';

/**
 * Debounce a value with configurable delay
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms per AC-3)
 * @returns Debounced value
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 *
 * useEffect(() => {
 *   // This only runs 300ms after user stops typing
 *   fetchData(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timeout to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up timeout if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
