/**
 * ArmorLocationBlock — Label + Counter + Pip Row wrapper
 *
 * Composes ArmorPipRow with a location label and a current/max counter.
 * All per-type diagrams use this block so every location looks identical.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Shared Armor Pip Primitive
 */

import React from 'react';

import { ArmorPipRow } from './ArmorPipRow';

// =============================================================================
// Types
// =============================================================================

export interface ArmorLocationBlockProps {
  /** Short or full label for the armor location (e.g. "Front", "Nose") */
  label: string;
  /** Current armor value */
  current: number;
  /** Maximum armor value */
  max: number;
  /** Pip orientation (default 'row') */
  orientation?: 'row' | 'column';
  /** Pip size in pixels (default 8) */
  pipSize?: number;
  /** Extra CSS classes on the outer wrapper */
  className?: string;
  /** Accent colour class applied to the current/max counter text (default: cyan) */
  accentClass?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Labelled armor location with pip strip and numeric counter.
 *
 * Renders: [Label]  [current / max]
 *          [■■■■■□□□□□]
 */
export function ArmorLocationBlock({
  label,
  current,
  max,
  orientation = 'row',
  pipSize = 8,
  className = '',
  accentClass = 'text-cyan-400',
}: ArmorLocationBlockProps): React.ReactElement {
  const safeMax = Math.max(0, max);

  return (
    <div
      className={`flex flex-col gap-1 ${className}`}
      aria-label={`${label} armor: ${current} of ${safeMax}`}
    >
      {/* Label row */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-text-theme-secondary text-[10px] font-medium tracking-wide uppercase">
          {label}
        </span>
        <span className={`font-mono text-xs tabular-nums ${accentClass}`}>
          {current}
          <span className="text-text-theme-secondary">/{safeMax}</span>
        </span>
      </div>

      {/* Pip strip — delegates to shared primitive */}
      {safeMax > 0 ? (
        <ArmorPipRow
          label={label}
          current={current}
          max={safeMax}
          orientation={orientation}
          pipSize={pipSize}
        />
      ) : (
        <span className="text-text-theme-secondary text-[10px] italic">
          N/A
        </span>
      )}
    </div>
  );
}
