/**
 * Battle Armor Status Bar
 *
 * Compact BV-focused status bar for BA squads. Shows per-trooper BV, squad
 * BV, and final (pilot-adjusted) BV, and exposes a breakdown dialog.
 *
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
 *       Requirement: BA BV Breakdown on Unit State
 */

import React, { useMemo, useState } from 'react';

import { useBattleArmorStore } from '@/stores/useBattleArmorStore';
import { calculateBattleArmorBVFromState } from '@/utils/construction/battlearmor/battleArmorBVAdapter';

import { BattleArmorBVBreakdownDialog } from './BattleArmorBVBreakdownDialog';

// =============================================================================
// Types
// =============================================================================

interface BattleArmorStatusBarProps {
  /** Additional CSS classes */
  className?: string;
}

interface StatusItemProps {
  label: string;
  value: string | number;
  subValue?: string;
}

// =============================================================================
// Status Item
// =============================================================================

function StatusItem({
  label,
  value,
  subValue,
}: StatusItemProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center px-3 py-1">
      <span className="text-text-theme-secondary text-[10px] tracking-wide uppercase">
        {label}
      </span>
      <span className="text-sm font-semibold text-white tabular-nums">
        {value}
      </span>
      {subValue && (
        <span className="text-text-theme-secondary text-[10px]">
          {subValue}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Main
// =============================================================================

/**
 * Live BV status bar for BA squads.
 *
 * Subscribes to the full BA state so it recomputes every time the user edits
 * weapons, armor, manipulators, or squad size.
 */
export function BattleArmorStatusBar({
  className = '',
}: BattleArmorStatusBarProps): React.ReactElement {
  // Subscribe to every field that feeds into BV so the hook recomputes live.
  const state = useBattleArmorStore((s) => s);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const breakdown = useMemo(
    () => calculateBattleArmorBVFromState(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      state.weightClass,
      state.squadSize,
      state.groundMP,
      state.jumpMP,
      state.umuMP,
      state.armorPerTrooper,
      state.baArmorType,
      state.leftManipulator,
      state.rightManipulator,
      state.equipment,
    ],
  );

  return (
    <>
      <div
        className={`bg-bg-theme-secondary border-border-theme flex items-center justify-between rounded border px-2 py-1 ${className}`}
      >
        <div className="flex items-center">
          <StatusItem
            label="Trooper BV"
            value={breakdown.perTrooper.total.toFixed(1)}
            subValue={`D ${breakdown.perTrooper.defensive.total.toFixed(1)} / O ${breakdown.perTrooper.offensive.total.toFixed(1)}`}
          />
          <StatusItem
            label="Squad"
            value={breakdown.squadTotal.toFixed(0)}
            subValue={`× ${breakdown.squadSize} troopers`}
          />
          <StatusItem
            label="Pilot ×"
            value={breakdown.pilotMultiplier.toFixed(2)}
          />
          <StatusItem label="Final BV" value={breakdown.final} />
        </div>
        <button
          type="button"
          onClick={() => setShowBreakdown(true)}
          className="bg-bg-theme-tertiary hover:bg-bg-theme-hover text-text-theme-primary ml-2 rounded px-2 py-1 text-xs"
        >
          Breakdown
        </button>
      </div>
      {showBreakdown && (
        <BattleArmorBVBreakdownDialog
          breakdown={breakdown}
          onClose={() => setShowBreakdown(false)}
        />
      )}
    </>
  );
}
