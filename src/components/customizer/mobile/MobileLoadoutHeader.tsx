/**
 * Mobile Loadout Header Component
 *
 * Compact always-visible status bar for mobile devices showing key unit stats.
 * Displays Weight, Slots, Heat, and BV with color-coded status indicators.
 * Tapping expands to full-screen equipment list.
 *
 * @spec c:\Users\wroll\.cursor\plans\mobile_loadout_full-screen_redesign_00a59d27.plan.md
 */

import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

import {
  CAUTION_TEXT_CLASS,
  getCapacityStatus,
  getHeatStatus,
  getWeightStatus,
  STAT_STATUS_TEXT_CLASS,
  type StatStatus,
} from '../shared/unitStatStatus';

// =============================================================================
// Types
// =============================================================================

export interface MobileLoadoutStats {
  /** Weight used in tons */
  weightUsed: number;
  /** Maximum weight (tonnage) */
  weightMax: number;
  /** Critical slots used */
  slotsUsed: number;
  /** Total critical slots */
  slotsMax: number;
  /** Heat generated */
  heatGenerated: number;
  /** Heat dissipation */
  heatDissipation: number;
  /** Battle Value */
  battleValue: number;
  /** Total equipment count */
  equipmentCount: number;
  /** Unassigned equipment count */
  unassignedCount: number;
}

interface MobileLoadoutHeaderProps {
  stats: MobileLoadoutStats;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
  /** Hide the stats when the page header already shows them. */
  showStats?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

type StatusLevel = StatStatus;

/** Shared readout colors: cautions orange, errors red, never the accent. */
const statusColors: Record<StatusLevel, string> = STAT_STATUS_TEXT_CLASS;

// =============================================================================
// Stat Display Component
// =============================================================================

interface StatDisplayProps {
  label: string;
  value: string | number;
  max?: string | number;
  status?: StatusLevel;
}

function StatDisplay({
  label,
  value,
  max,
  status = 'normal',
}: StatDisplayProps) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1.5">
      <span className="text-text-theme-secondary truncate text-[8px] tracking-wider uppercase">
        {label}
      </span>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-xs font-bold ${statusColors[status]}`}>
          {value}
        </span>
        {max !== undefined && (
          <>
            <span className="text-text-theme-muted text-[9px]">/</span>
            <span className="text-text-theme-muted text-[9px]">{max}</span>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MobileLoadoutHeader({
  stats,
  isExpanded,
  onToggle,
  className = '',
  showStats = true,
}: MobileLoadoutHeaderProps): React.ReactElement {
  const weightStatus = getWeightStatus(stats.weightUsed, stats.weightMax);
  const slotsStatus = getCapacityStatus(stats.slotsUsed, stats.slotsMax);
  const heatStatus = getHeatStatus(stats.heatGenerated, stats.heatDissipation);

  return (
    <div
      className={`bg-surface-base border-border-theme flex h-[45px] w-full items-center border-t ${className} `}
    >
      {/* Main stats area - tappable to expand loadout */}
      <button
        onClick={onToggle}
        className="active:bg-surface-raised/50 flex h-full flex-1 items-center justify-between px-2 transition-colors"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse loadout' : 'Expand loadout'}
      >
        {showStats ? (
          /* Stats row */
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            <StatDisplay
              label="Weight"
              value={stats.weightUsed.toFixed(1)}
              max={stats.weightMax}
              status={weightStatus}
            />

            <div className="bg-border-theme-subtle h-5 w-px flex-shrink-0" />

            <StatDisplay
              label="Slots"
              value={stats.slotsUsed}
              max={stats.slotsMax}
              status={slotsStatus}
            />

            <div className="bg-border-theme-subtle h-5 w-px flex-shrink-0" />

            <StatDisplay
              label="Heat"
              value={stats.heatGenerated}
              max={stats.heatDissipation}
              status={heatStatus}
            />

            <div className="bg-border-theme-subtle h-5 w-px flex-shrink-0" />

            <StatDisplay
              label="BV"
              value={stats.battleValue.toLocaleString()}
            />
          </div>
        ) : (
          <span className="text-text-theme-primary text-sm font-semibold">
            Loadout
          </span>
        )}

        {/* Expand indicator with equipment count */}
        <div className="ml-2 flex flex-shrink-0 items-center gap-1.5">
          {stats.unassignedCount > 0 && (
            <span className={`text-[11px] font-medium ${CAUTION_TEXT_CLASS}`}>
              {stats.unassignedCount} unassigned
            </span>
          )}
          <div className="bg-accent/20 flex items-center gap-1 rounded-full px-2 py-0.5">
            <span className="text-accent text-xs font-bold">
              {stats.equipmentCount}
            </span>
            <span
              className={`text-accent text-[10px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            >
              <AppIcon name="chevron-up" size="inline" aria-hidden="true" />
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

export default MobileLoadoutHeader;
