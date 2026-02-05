/**
 * FilterChip Component
 * Small removable chip showing an active filter.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React from 'react';

// =============================================================================
// Types
// =============================================================================

export type FilterChipVariant =
  | 'category'
  | 'type'
  | 'context'
  | 'time'
  | 'sequence';

export interface FilterChipProps {
  /** Display label for the filter */
  label: string;
  /** Value being filtered */
  value: string;
  /** Remove handler */
  onRemove: () => void;
  /** Variant determines color scheme */
  variant?: FilterChipVariant;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// Variant Configuration
// =============================================================================

type VariantConfig = {
  bg: string;
  text: string;
  border: string;
  hover: string;
  icon: string;
};

const VARIANT_CONFIG: Record<FilterChipVariant, VariantConfig> = {
  category: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    hover: 'hover:border-amber-400/50',
    icon: 'text-amber-500/60 group-hover:text-amber-400',
  },
  type: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    hover: 'hover:border-cyan-400/50',
    icon: 'text-cyan-500/60 group-hover:text-cyan-400',
  },
  context: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    hover: 'hover:border-emerald-400/50',
    icon: 'text-emerald-500/60 group-hover:text-emerald-400',
  },
  time: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    hover: 'hover:border-violet-400/50',
    icon: 'text-violet-500/60 group-hover:text-violet-400',
  },
  sequence: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    hover: 'hover:border-rose-400/50',
    icon: 'text-rose-500/60 group-hover:text-rose-400',
  },
};

// =============================================================================
// Icons
// =============================================================================

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-3.5 w-3.5"
  >
    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

export function FilterChip({
  label,
  value,
  onRemove,
  variant = 'category',
  className = '',
}: FilterChipProps): React.ReactElement {
  const config = VARIANT_CONFIG[variant];

  return (
    <span
      className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150 ${config.bg} ${config.text} ${config.border} ${config.hover} ${className} `}
    >
      {/* Label */}
      <span className="text-text-theme-muted">{label}:</span>

      {/* Value */}
      <span className="font-semibold">{value}</span>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className={`ml-0.5 rounded-full p-0.5 transition-colors duration-150 hover:bg-white/10 focus:ring-1 focus:ring-white/20 focus:outline-none ${config.icon} `}
        aria-label={`Remove ${label} filter`}
      >
        <CloseIcon />
      </button>
    </span>
  );
}

export default FilterChip;
