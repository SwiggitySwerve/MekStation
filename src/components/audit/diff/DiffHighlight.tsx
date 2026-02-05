/**
 * DiffHighlight Component
 * Renders a single value with appropriate change-type highlighting.
 * GitHub-style diff visualization with colored backgrounds.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React from 'react';

import { DiffChangeType } from '@/hooks/audit';

// =============================================================================
// Types
// =============================================================================

export interface DiffHighlightProps {
  /** The value to display */
  value: unknown;
  /** Type of change for this value */
  changeType: DiffChangeType;
  /** Whether to show the type annotation */
  showType?: boolean;
  /** Optional additional className */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const CHANGE_TYPE_STYLES: Record<DiffChangeType, string> = {
  added: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  removed:
    'bg-red-500/20 text-red-300 border-red-500/30 line-through decoration-red-400/50',
  modified: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  unchanged:
    'bg-surface-raised/30 text-text-theme-secondary border-border-theme-subtle/30',
};

const CHANGE_TYPE_INDICATORS: Record<
  DiffChangeType,
  { symbol: string; label: string }
> = {
  added: { symbol: '+', label: 'Added' },
  removed: { symbol: '-', label: 'Removed' },
  modified: { symbol: '~', label: 'Modified' },
  unchanged: { symbol: ' ', label: 'Unchanged' },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a value for display.
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 3) {
      return `[${value.map((v) => formatValue(v)).join(', ')}]`;
    }
    return `[${value.length} items]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    if (keys.length <= 2) {
      return `{${keys.map((k) => `${k}: ...`).join(', ')}}`;
    }
    return `{${keys.length} fields}`;
  }

  return String(value);
}

/**
 * Get the JavaScript type of a value.
 */
function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// =============================================================================
// Component
// =============================================================================

export function DiffHighlight({
  value,
  changeType,
  showType = false,
  className = '',
}: DiffHighlightProps): React.ReactElement {
  const indicator = CHANGE_TYPE_INDICATORS[changeType];
  const formattedValue = formatValue(value);
  const valueType = getValueType(value);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-sm leading-relaxed ${CHANGE_TYPE_STYLES[changeType]} ${className} `}
      title={`${indicator.label}: ${formattedValue}`}
    >
      {/* Change indicator symbol */}
      <span
        className={`w-4 flex-shrink-0 text-center font-bold ${changeType === 'added' ? 'text-emerald-400' : ''} ${changeType === 'removed' ? 'text-red-400' : ''} ${changeType === 'modified' ? 'text-amber-400' : ''} `}
        aria-label={indicator.label}
      >
        {indicator.symbol}
      </span>

      {/* Value */}
      <span className="max-w-xs truncate">{formattedValue}</span>

      {/* Type annotation */}
      {showType && (
        <span className="ml-1 text-xs opacity-60">({valueType})</span>
      )}
    </span>
  );
}

export default DiffHighlight;
