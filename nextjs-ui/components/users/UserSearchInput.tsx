/**
 * User Search Input Component
 *
 * Search input with 300ms debounce for email searching
 * Implements AC-3 (Email search with debounce)
 */

'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UserSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * UserSearchInput - Search input with clear button
 *
 * Features (per AC-3):
 * - Email search with 300ms debounce (debouncing handled by parent via useDebounce)
 * - Clear button (X icon) when input has value
 * - Search icon
 * - Keyboard accessible (WCAG 2.1 AA)
 *
 * @param value - Current search value from parent
 * @param onChange - Callback when search value changes
 * @param placeholder - Placeholder text (default: "Search by email...")
 */
export function UserSearchInput({ value, onChange, placeholder = 'Search by email...' }: UserSearchInputProps) {
  return (
    <div className="relative w-full sm:w-[300px]">
      {/* Search Icon */}
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      {/* Search Input */}
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9"
        aria-label="Search users by email"
      />

      {/* Clear Button (only shown when input has value) */}
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
