/**
 * Accordion Component
 *
 * Collapsible sections for organizing form content
 * Used in Tenants Form (Story 32)
 */

'use client';

import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDownIcon } from 'lucide-react';

interface AccordionContextValue {
  openItems: Set<string>;
  toggleItem: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | undefined>(undefined);

interface AccordionItemContextValue {
  value: string;
  isOpen: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextValue | undefined>(undefined);

interface AccordionProps {
  children: React.ReactNode;
  defaultValue?: string[];
  className?: string;
}

/**
 * Accordion - Container component
 *
 * @example
 * ```tsx
 * <Accordion defaultValue={["basic"]}>
 *   <AccordionItem value="basic">
 *     <AccordionTrigger>Basic Information</AccordionTrigger>
 *     <AccordionContent>Form fields...</AccordionContent>
 *   </AccordionItem>
 * </Accordion>
 * ```
 */
export function Accordion({ children, defaultValue = [], className }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultValue));

  const toggleItem = (value: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className={cn('space-y-4', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

/**
 * AccordionItem - Individual accordion section
 */
export function AccordionItem({ children, value, className }: AccordionItemProps) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('AccordionItem must be used within Accordion');

  const isOpen = context.openItems.has(value);

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div className={cn('glass-card', className)}>{children}</div>
    </AccordionItemContext.Provider>
  );
}

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AccordionTrigger - Header button to toggle section
 */
export function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  const accordionContext = useContext(AccordionContext);
  const itemContext = useContext(AccordionItemContext);

  if (!accordionContext) throw new Error('AccordionTrigger must be used within Accordion');
  if (!itemContext) throw new Error('AccordionTrigger must be used within AccordionItem');

  const { value, isOpen } = itemContext;

  return (
    <button
      type="button"
      onClick={() => accordionContext.toggleItem(value)}
      aria-expanded={isOpen}
      className={cn(
        'flex w-full items-center justify-between px-6 py-4',
        'text-left text-lg font-semibold text-text-primary',
        'transition-colors hover:bg-white/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue',
        className
      )}
    >
      <span>{children}</span>
      <ChevronDownIcon
        className={cn(
          'h-5 w-5 text-text-secondary transition-transform',
          isOpen && 'rotate-180'
        )}
        aria-hidden="true"
      />
    </button>
  );
}

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AccordionContent - Collapsible content area
 */
export function AccordionContent({ children, className }: AccordionContentProps) {
  const itemContext = useContext(AccordionItemContext);
  if (!itemContext) throw new Error('AccordionContent must be used within AccordionItem');

  const { isOpen } = itemContext;

  if (!isOpen) return null;

  return (
    <div className={cn('px-6 pb-6 space-y-4', className)} role="region">
      {children}
    </div>
  );
}
