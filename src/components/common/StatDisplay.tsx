/**
 * StatDisplay Component
 *
 * Reusable stat display for showing values with optional capacity indicators.
 * Used in unit info banners, mobile loadout headers, and stats summaries.
 *
 * Patterns:
 * - SimpleStat: Label + Value (with optional status color)
 * - CapacityStat: Label + Current/Max (with optional status color)
 */

import React from 'react';

// =============================================================================
// Types
// =============================================================================

export type StatStatus = 'normal' | 'warning' | 'error' | 'success' | 'accent';

export interface SimpleStatProps {
  /** Label above the value */
  label: string;
  /** The value to display */
  value: number | string;
  /** Status determines text color */
  status?: StatStatus;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional class names for the container */
  className?: string;
}

export interface CapacityStatProps {
  /** Label above the value */
  label: string;
  /** Current value */
  current: number | string;
  /** Maximum value */
  max: number | string;
  /** Optional unit suffix (e.g., 't' for tons) */
  unit?: string;
  /** Status determines text color */
  status?: StatStatus;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional class names for the container */
  className?: string;
}

// =============================================================================
// Style Helpers
// =============================================================================

const statusColors: Record<StatStatus, string> = {
  normal: 'text-white',
  warning: 'text-amber-400',
  error: 'text-red-400',
  success: 'text-green-400',
  accent: 'text-cyan-400',
};

const sizeClasses = {
  sm: {
    label: 'text-[8px] sm:text-[9px]',
    value: 'text-xs sm:text-sm',
    divider: 'text-[9px]',
    secondary: 'text-[9px]',
  },
  md: {
    label: 'text-[9px] sm:text-[10px]',
    value: 'text-sm sm:text-base',
    divider: 'text-[10px]',
    secondary: 'text-[10px]',
  },
};

// =============================================================================
// Components
// =============================================================================

/**
 * Simple stat display with label and value
 */
export function SimpleStat({
  label,
  value,
  status = 'normal',
  size = 'md',
  className = '',
}: SimpleStatProps): React.ReactElement {
  const styles = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center px-2 sm:px-3 py-0.5 sm:py-1 bg-surface-raised/50 rounded ${className}`}>
      <span className={`${styles.label} font-medium text-text-theme-secondary uppercase tracking-wider`}>
        {label}
      </span>
      <span className={`${styles.value} font-bold ${statusColors[status]}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * Capacity stat display with label, current/max values, and optional unit
 */
export function CapacityStat({
  label,
  current,
  max,
  unit = '',
  status = 'normal',
  size = 'md',
  className = '',
}: CapacityStatProps): React.ReactElement {
  const styles = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center px-2 sm:px-3 py-0.5 sm:py-1 bg-surface-raised/50 rounded ${className}`}>
      <span className={`${styles.label} font-medium text-text-theme-secondary uppercase tracking-wider`}>
        {label}
      </span>
      <div className="flex items-baseline gap-0.5">
        <span className={`${styles.value} font-bold ${statusColors[status]}`}>
          {current}{unit}
        </span>
        <span className={`${styles.divider} text-slate-500`}>/</span>
        <span className={`${styles.secondary} text-slate-500`}>
          {max}{unit}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Compact Variants (for mobile status bars)
// =============================================================================

export interface CompactStatProps {
  /** Label above the value */
  label: string;
  /** The value to display */
  value: number | string;
  /** Maximum value (optional) */
  max?: number | string;
  /** Status determines text color */
  status?: StatStatus;
  /** Additional class names */
  className?: string;
}

/**
 * Compact stat display for tight spaces like mobile status bars
 */
export function CompactStat({
  label,
  value,
  max,
  status = 'normal',
  className = '',
}: CompactStatProps): React.ReactElement {
  return (
    <div className={`flex flex-col items-center px-1.5 min-w-0 ${className}`}>
      <span className="text-[8px] text-text-theme-secondary uppercase tracking-wider truncate">
        {label}
      </span>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-xs font-bold ${statusColors[status]}`}>
          {value}
        </span>
        {max !== undefined && (
          <>
            <span className="text-[9px] text-slate-500">/</span>
            <span className="text-[9px] text-slate-500">{max}</span>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Status Helpers
// =============================================================================

/**
 * Calculate weight status based on current vs max
 */
export function getWeightStatus(used: number, max: number): StatStatus {
  if (used > max) return 'error';
  if (max - used < 0.5) return 'warning';
  return 'normal';
}

/**
 * Calculate slots status based on current vs max
 */
export function getSlotsStatus(used: number, max: number): StatStatus {
  if (used > max) return 'error';
  return 'normal';
}

/**
 * Calculate heat status based on generated vs dissipation
 */
export function getHeatStatus(generated: number, dissipation: number): StatStatus {
  if (generated > dissipation) return 'error';
  if (generated === dissipation) return 'warning';
  return 'success';
}
