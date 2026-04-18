/**
 * InfantryPlatoonCounter
 *
 * Replaces the armor diagram for infantry units.  Infantry damage reduces
 * trooper count rather than ablating location armor, so this component renders
 * a large platoon-size counter with color-coded health thresholds instead of
 * per-location pips (TechManual §infantry damage).
 *
 * Thresholds (TM standard):
 *   > 75% strength  → green
 *   25–75%          → yellow / amber
 *   ≤ 25%           → red
 *
 * Reads platoon size from useInfantryStore (squadSize × numberOfSquads).
 * Current trooper count defaults to max (full strength) as combat session state
 * is not yet wired — this will be populated by add-infantry-combat-behavior.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *        Requirement: Infantry Platoon Counter
 */

import React from 'react';

import { useInfantryStore } from '@/stores/useInfantryStore';

// =============================================================================
// Types
// =============================================================================

interface InfantryPlatoonCounterProps {
  /**
   * Current trooper count (remaining after casualties).
   * TODO(add-infantry-combat-behavior): wire from combat session state.
   * Defaults to full platoon strength when not supplied.
   */
  currentTroopers?: number;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

type HealthThreshold = 'full' | 'wounded' | 'casualty';

/**
 * Map a ratio to the three display thresholds.
 *   > 0.75  → full     (green)
 *   > 0.25  → wounded  (amber / yellow)
 *   ≤ 0.25  → casualty (red)
 */
function getThreshold(ratio: number): HealthThreshold {
  if (ratio > 0.75) return 'full';
  if (ratio > 0.25) return 'wounded';
  return 'casualty';
}

const THRESHOLD_STYLES: Record<
  HealthThreshold,
  { counter: string; bar: string; label: string }
> = {
  full: {
    counter: 'text-green-400',
    bar: 'bg-green-500',
    label: 'Full Strength',
  },
  wounded: {
    counter: 'text-amber-400',
    bar: 'bg-amber-500',
    label: 'Wounded',
  },
  casualty: {
    counter: 'text-red-400',
    bar: 'bg-red-500',
    label: 'Casualties',
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Infantry platoon strength counter.
 *
 * Shows:
 *  - Large "current / max" trooper counter with threshold color
 *  - Horizontal strength bar
 *  - "No per-location armor" notice (TM reference)
 *  - Platoon XP / morale placeholder (add-infantry-construction will populate)
 */
export function InfantryPlatoonCounter({
  currentTroopers,
  className = '',
}: InfantryPlatoonCounterProps): React.ReactElement {
  const squadSize = useInfantryStore((s) => s.squadSize);
  const numberOfSquads = useInfantryStore((s) => s.numberOfSquads);
  const specialization = useInfantryStore((s) => s.specialization);

  const maxTroopers = squadSize * numberOfSquads;
  // Default to full strength until combat session state is wired
  const current = currentTroopers ?? maxTroopers;
  const safeMax = Math.max(1, maxTroopers);
  const ratio = Math.max(0, Math.min(1, current / safeMax));
  const threshold = getThreshold(ratio);
  const styles = THRESHOLD_STYLES[threshold];

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle flex flex-col gap-4 rounded-lg border p-4 ${className}`}
      data-testid="infantry-platoon-counter"
      aria-label={`Infantry platoon: ${current} of ${maxTroopers} troopers`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Platoon Strength</h4>
        <span
          className={`text-xs font-medium ${styles.counter}`}
          data-testid="infantry-threshold-label"
        >
          {styles.label}
        </span>
      </div>

      {/* Large trooper counter */}
      <div className="flex flex-col items-center gap-1">
        <span
          className={`font-mono text-5xl font-bold tabular-nums ${styles.counter}`}
          data-testid="infantry-current-count"
        >
          {current}
        </span>
        <span className="text-text-theme-secondary text-sm">
          / {maxTroopers} troopers
        </span>
      </div>

      {/* Strength bar */}
      <div
        className="h-3 w-full overflow-hidden rounded bg-slate-700"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={maxTroopers}
        aria-label="Platoon strength"
      >
        <div
          className={`h-full rounded transition-all ${styles.bar}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      {/* Squad breakdown */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <span className="text-text-theme-secondary">Squads</span>
        <span className="font-mono text-white">{numberOfSquads}</span>
        <span className="text-text-theme-secondary">Per squad</span>
        <span className="font-mono text-white">{squadSize}</span>
        {specialization && (
          <>
            <span className="text-text-theme-secondary">Type</span>
            <span className="font-mono text-white">{specialization}</span>
          </>
        )}
      </div>

      {/* No per-location armor notice — TM §infantry damage */}
      <div className="border-border-theme-subtle rounded border border-dashed px-3 py-2">
        <p className="text-text-theme-secondary text-[10px] leading-relaxed">
          <span className="font-semibold text-white">
            No per-location armor.
          </span>{' '}
          Infantry damage reduces trooper count directly (TechManual §infantry
          damage). Armor kits apply a damage divisor, not ablative points.
        </p>
      </div>

      {/* XP / Morale placeholder */}
      <div className="text-text-theme-secondary text-[10px] italic">
        XP / Morale tracking — add-infantry-construction will populate these
        fields.
      </div>
    </div>
  );
}

export default InfantryPlatoonCounter;
