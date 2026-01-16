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
  /** Optional callback to open navigation menu (mobile sidebar) */
  onMenuOpen?: () => void;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

type StatusLevel = 'normal' | 'warning' | 'error';

function getWeightStatus(used: number, max: number): StatusLevel {
  if (used > max) return 'error';
  if (max - used < 0.5) return 'warning';
  return 'normal';
}

function getSlotsStatus(used: number, max: number): StatusLevel {
  if (used > max) return 'error';
  return 'normal';
}

function getHeatStatus(generated: number, dissipation: number): StatusLevel {
  if (generated > dissipation) return 'error';
  if (generated === dissipation) return 'warning';
  return 'normal';
}

const statusColors: Record<StatusLevel, string> = {
  normal: 'text-white',
  warning: 'text-amber-400',
  error: 'text-red-400',
};

// =============================================================================
// Stat Display Component
// =============================================================================

interface StatDisplayProps {
  label: string;
  value: string | number;
  max?: string | number;
  status?: StatusLevel;
}

function StatDisplay({ label, value, max, status = 'normal' }: StatDisplayProps) {
  return (
    <div className="flex flex-col items-center px-1.5 min-w-0">
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
// Main Component
// =============================================================================

export function MobileLoadoutHeader({
  stats,
  isExpanded,
  onToggle,
  onMenuOpen,
  className = '',
}: MobileLoadoutHeaderProps): React.ReactElement {
  const weightStatus = getWeightStatus(stats.weightUsed, stats.weightMax);
  const slotsStatus = getSlotsStatus(stats.slotsUsed, stats.slotsMax);
  const heatStatus = getHeatStatus(stats.heatGenerated, stats.heatDissipation);

  return (
    <div
      className={`
        w-full h-11 flex items-center
        bg-surface-base border-t border-border-theme
        ${className}
      `}
    >
      {/* Main stats area - tappable to expand loadout */}
      <button
        onClick={onToggle}
        className="flex-1 h-full px-2 flex items-center justify-between active:bg-surface-raised/50 transition-colors"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse loadout' : 'Expand loadout'}
      >
        {/* Stats row */}
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        <StatDisplay
          label="Weight"
          value={stats.weightUsed.toFixed(1)}
          max={stats.weightMax}
          status={weightStatus}
        />
        
        <div className="w-px h-5 bg-border-theme-subtle flex-shrink-0" />
        
        <StatDisplay
          label="Slots"
          value={stats.slotsUsed}
          max={stats.slotsMax}
          status={slotsStatus}
        />
        
        <div className="w-px h-5 bg-border-theme-subtle flex-shrink-0" />
        
        <StatDisplay
          label="Heat"
          value={stats.heatGenerated}
          max={stats.heatDissipation}
          status={heatStatus}
        />
        
        <div className="w-px h-5 bg-border-theme-subtle flex-shrink-0" />
        
        <StatDisplay
          label="BV"
          value={stats.battleValue.toLocaleString()}
        />
      </div>

        {/* Expand indicator with equipment count */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {stats.unassignedCount > 0 && (
            <span className="text-[9px] text-amber-400 font-medium">
              {stats.unassignedCount} unassigned
            </span>
          )}
          <div className="flex items-center gap-1 bg-accent/20 rounded-full px-2 py-0.5">
            <span className="text-xs font-bold text-accent">
              {stats.equipmentCount}
            </span>
            <span className={`text-[10px] text-accent transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▲
            </span>
          </div>
        </div>
      </button>

      {/* Menu button - opens navigation sidebar (right side for right-hand ergonomics) */}
      {onMenuOpen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMenuOpen();
          }}
          className="h-full px-3 flex items-center justify-center border-l border-border-theme-subtle text-text-theme-secondary hover:text-accent hover:bg-surface-raised/50 active:bg-surface-raised transition-colors"
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default MobileLoadoutHeader;
