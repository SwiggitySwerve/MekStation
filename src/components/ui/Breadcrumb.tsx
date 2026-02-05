import Link from 'next/link';
/**
 * Breadcrumb Component
 * Hierarchical navigation indicator showing current location in site structure.
 */
import React from 'react';

export interface BreadcrumbItem {
  /** Display label for the breadcrumb item */
  label: string;
  /** Navigation href - undefined for current page (renders as non-clickable text) */
  href?: string;
}

export interface BreadcrumbProps {
  /** Array of breadcrumb items from root to current page */
  items: BreadcrumbItem[];
  /** Additional CSS classes */
  className?: string;
  /** Separator style between items */
  separator?: 'chevron' | 'slash';
}

/** Chevron separator icon */
function ChevronSeparator() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="text-text-theme-muted h-3.5 w-3.5 flex-shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

/** Slash separator */
function SlashSeparator() {
  return (
    <span className="text-text-theme-muted flex-shrink-0" aria-hidden="true">
      /
    </span>
  );
}

export function Breadcrumb({
  items,
  className = '',
  separator = 'chevron',
}: BreadcrumbProps): React.ReactElement {
  if (items.length === 0) {
    return <nav aria-label="Breadcrumb" className="hidden" />;
  }

  const Separator = separator === 'chevron' ? ChevronSeparator : SlashSeparator;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-1.5 text-sm ${className}`}
    >
      <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = item.href && !isLast;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && <Separator />}
              {isClickable ? (
                <Link
                  href={item.href!}
                  className="text-text-theme-secondary hover:text-accent max-w-[150px] truncate transition-colors duration-150 sm:max-w-none"
                  title={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`max-w-[150px] truncate sm:max-w-none ${
                    isLast
                      ? 'text-text-theme-primary font-medium'
                      : 'text-text-theme-secondary'
                  }`}
                  title={item.label}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
