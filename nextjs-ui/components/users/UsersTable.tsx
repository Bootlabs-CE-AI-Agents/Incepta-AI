/**
 * Users Table Component
 *
 * Displays users in a sortable table with action buttons
 * Implements AC-1 (columns), AC-2 (sorting), AC-7 (actions)
 */

'use client';

import { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { UserDetail } from '@/lib/api/users';
import { formatLastLogin, formatCreatedDate, formatRoles, getStatusBadge } from '@/lib/utils/users';
import { UserActionButtons } from './UserActionButtons';

interface UsersTableProps {
  users: UserDetail[];
  isLoading?: boolean;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  currentUser: UserDetail | null;
  isSuperAdmin: boolean;
}

/**
 * UsersTable - Sortable table with user data and action buttons
 *
 * Features (per AC-1, AC-2, AC-7):
 * - 6 columns: Email, Roles, Status, Last Login, Created, Actions
 * - Click-to-sort on all columns except Actions
 * - Visual sort indicators (arrows)
 * - Action buttons per row (Deactivate/Activate, Reset Password)
 *
 * @param users - Array of user objects from API
 * @param isLoading - Loading state (shows skeleton rows)
 * @param sorting - Current sort state from parent
 * @param onSortingChange - Callback to update parent sort state
 * @param currentUser - Current logged-in user (for security checks)
 * @param isSuperAdmin - Whether current user is super_admin
 */
export function UsersTable({ users, isLoading, sorting, onSortingChange, currentUser, isSuperAdmin }: UsersTableProps) {
  // Column definitions (AC-1: Email, Roles, Status, Last Login, Created, Actions)
  const columns = useMemo<ColumnDef<UserDetail>[]>(
    () => [
      {
        accessorKey: 'email',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 lg:px-3"
          >
            Email
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.original.email}</div>,
      },
      {
        accessorKey: 'roles',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 lg:px-3"
          >
            Roles
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => <div className="text-sm text-muted-foreground">{formatRoles(row.original.roles)}</div>,
        // Custom sort function to sort by first role
        sortingFn: (rowA, rowB) => {
          const rolesA = formatRoles(rowA.original.roles);
          const rolesB = formatRoles(rowB.original.roles);
          return rolesA.localeCompare(rolesB);
        },
      },
      {
        accessorKey: 'is_active',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 lg:px-3"
          >
            Status
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const badge = getStatusBadge(row.original.is_active);
          return (
            <Badge variant={badge.variant as any} className={badge.className}>
              {badge.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'last_login',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 lg:px-3"
          >
            Last Login
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => <div className="text-sm text-muted-foreground">{formatLastLogin(row.original.last_login)}</div>,
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 lg:px-3"
          >
            Created
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => <div className="text-sm text-muted-foreground">{formatCreatedDate(row.original.created_at)}</div>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <UserActionButtons
            user={row.original}
            currentUser={currentUser}
            isSuperAdmin={isSuperAdmin}
            allUsers={users}
          />
        ),
      },
    ],
    [currentUser, isSuperAdmin, users]
  );

  // Initialize TanStack Table v8 with sorting
  const table = useReactTable({
    data: users,
    columns,
    state: {
      sorting,
    },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // AC-2: Client-side sorting
  });

  // Loading skeleton rows (AC-8: Loading state)
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            // AC-8: Empty state
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
