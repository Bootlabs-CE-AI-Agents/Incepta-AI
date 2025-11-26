import { ReactNode, useId } from 'react';
import { cn } from '@/lib/utils/cn';
import { Package, FileQuestion, Search, Users, Server, Bot, AlertCircle } from 'lucide-react';

/**
 * Empty State Component
 *
 * Displays when no data is available with optional action button.
 * Accessible to screen readers with proper role and announcements.
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="status" for screen reader announcements
 * - aria-live="polite" for non-intrusive announcements
 * - Proper heading structure
 * - Keyboard accessible action button
 *
 * @example
 * ```tsx
 * // With custom icon
 * <EmptyState
 *   icon={<Package className="w-12 h-12" />}
 *   title="No tenants found"
 *   description="Get started by creating your first tenant"
 *   action={
 *     <Button onClick={() => router.push('/dashboard/tenants/new')}>
 *       Create Tenant
 *     </Button>
 *   }
 * />
 *
 * // With preset type
 * <EmptyState
 *   type="agents"
 *   title="No agents configured"
 *   description="Create your first agent to get started"
 *   action={<Button>Create Agent</Button>}
 * />
 * ```
 *
 * Reference: Story 35 AC-5 (Empty States), AC-4 (Accessibility)
 */

/**
 * Preset empty state types with default icons
 */
export type EmptyStateType =
  | 'default'
  | 'search'
  | 'agents'
  | 'tenants'
  | 'servers'
  | 'error';

const typeConfig: Record<EmptyStateType, {
  icon: typeof Package;
  iconColor: string;
}> = {
  default: {
    icon: FileQuestion,
    iconColor: 'text-gray-400 dark:text-gray-500',
  },
  search: {
    icon: Search,
    iconColor: 'text-blue-400 dark:text-blue-500',
  },
  agents: {
    icon: Bot,
    iconColor: 'text-purple-400 dark:text-purple-500',
  },
  tenants: {
    icon: Users,
    iconColor: 'text-green-400 dark:text-green-500',
  },
  servers: {
    icon: Server,
    iconColor: 'text-orange-400 dark:text-orange-500',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-red-400 dark:text-red-500',
  },
};

interface EmptyStateProps {
  /**
   * Custom icon element (overrides type icon)
   */
  icon?: ReactNode;
  /**
   * Preset type with default icon
   * @default "default"
   */
  type?: EmptyStateType;
  /**
   * Title text (required)
   */
  title: string;
  /**
   * Description text (optional)
   */
  description?: string;
  /**
   * Action button or link (optional)
   */
  action?: ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Size variant
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to show a card background
   * @default true
   */
  showCard?: boolean;
}

const sizeConfig = {
  sm: {
    padding: 'py-6 px-4',
    iconSize: 'w-8 h-8',
    titleSize: 'text-base',
    descriptionSize: 'text-xs',
  },
  md: {
    padding: 'py-12 px-6',
    iconSize: 'w-12 h-12',
    titleSize: 'text-lg',
    descriptionSize: 'text-sm',
  },
  lg: {
    padding: 'py-16 px-8',
    iconSize: 'w-16 h-16',
    titleSize: 'text-xl',
    descriptionSize: 'text-base',
  },
};

export function EmptyState({
  icon,
  type = 'default',
  title,
  description,
  action,
  className,
  size = 'md',
  showCard = true,
}: EmptyStateProps) {
  const titleId = useId();
  const descriptionId = useId();
  const config = typeConfig[type];
  const sizeStyles = sizeConfig[size];
  const IconComponent = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'flex flex-col items-center justify-center',
        sizeStyles.padding,
        showCard && 'glass-card rounded-lg',
        className
      )}
    >
      {/* Screen reader announcement */}
      <span className="sr-only">
        {title}. {description || ''}
      </span>

      {/* Icon */}
      {(icon || type) && (
        <div
          className={cn('mb-4 opacity-60', config.iconColor)}
          aria-hidden="true"
        >
          {icon || <IconComponent className={sizeStyles.iconSize} />}
        </div>
      )}

      {/* Title */}
      <h3
        id={titleId}
        className={cn(
          'font-semibold text-text-primary dark:text-white mb-2 text-center',
          sizeStyles.titleSize
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          id={descriptionId}
          className={cn(
            'text-text-secondary dark:text-text-secondary text-center max-w-md',
            sizeStyles.descriptionSize,
            action ? 'mb-6' : ''
          )}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * Search Empty State
 *
 * Specialized empty state for search results with no matches.
 *
 * @example
 * ```tsx
 * <SearchEmptyState
 *   query="foobar"
 *   onClearSearch={() => setQuery('')}
 * />
 * ```
 */
export function SearchEmptyState({
  query,
  onClearSearch,
  className,
}: {
  query: string;
  onClearSearch?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      type="search"
      title="No results found"
      description={`No items match "${query}". Try adjusting your search.`}
      action={
        onClearSearch && (
          <button
            onClick={onClearSearch}
            className="text-sm text-accent-blue hover:underline focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 rounded"
          >
            Clear search
          </button>
        )
      }
      className={className}
    />
  );
}

/**
 * Error Empty State
 *
 * Specialized empty state for error conditions with retry action.
 *
 * @example
 * ```tsx
 * <ErrorEmptyState
 *   title="Failed to load agents"
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function ErrorEmptyState({
  title = 'Something went wrong',
  description = 'We encountered an error loading this content.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      type="error"
      title={title}
      description={description}
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Try again
          </button>
        )
      }
      className={className}
    />
  );
}

export default EmptyState;
