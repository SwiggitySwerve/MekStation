/**
 * Stat Cell Component
 *
 * Displays a single statistic with label and value.
 *
 * @spec openspec/specs/unit-info-banner/spec.md
 */

import React from 'react';

interface StatCellProps {
  /** Stat label */
  label: string;
  /** Stat value */
  value: string | number;
  /** Optional unit suffix */
  unit?: string;
  /** Color variant */
  variant?: 'default' | 'warning' | 'error' | 'success';
  /** Additional CSS classes */
  className?: string;
}

const variantStyles = {
  default: 'text-slate-100',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  success: 'text-green-400',
};

/**
 * Individual stat cell for unit info displays
 */
export function StatCell({
  label,
  value,
  unit,
  variant = 'default',
  className = '',
}: StatCellProps): React.ReactElement {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span className="text-xs tracking-wide text-slate-400 uppercase">
        {label}
      </span>
      <span className={`text-lg font-bold ${variantStyles[variant]}`}>
        {value}
        {unit && (
          <span className="ml-0.5 text-sm font-normal text-slate-400">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}
