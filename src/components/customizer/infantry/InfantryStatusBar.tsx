/**
 * Infantry Status Bar Component
 *
 * Compact status bar showing key infantry platoon stats and live Battle Value.
 *
 * Surfaces the fields called out in the spec delta for live-update coverage:
 *   perTrooperBV, platoonBV (pre-pilot), fieldGunBV, final — plus motive,
 *   anti-mech, pilot multiplier. Clicking the BV item opens a breakdown
 *   dialog with the full IInfantryBVBreakdown.
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md
 * @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
 */

import React, { useMemo, useState } from 'react';

import { useInfantryStore } from '@/stores/useInfantryStore';
import { computeInfantryBVFromState } from '@/utils/construction/infantry/infantryBVAdapter';
import { totalTroopers } from '@/utils/construction/infantry/platoonComposition';

import { InfantryBVBreakdownDialog } from './InfantryBVBreakdownDialog';

// =============================================================================
// Types
// =============================================================================

interface InfantryStatusBarProps {
  /** Additional CSS classes */
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

interface StatusItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  status?: 'normal' | 'warning' | 'error' | 'success';
}

// =============================================================================
// Status Item
// =============================================================================

function StatusItem({
  label,
  value,
  subValue,
  status = 'normal',
}: StatusItemProps): React.ReactElement {
  const statusColors: Record<string, string> = {
    normal: 'text-white',
    warning: 'text-amber-400',
    error: 'text-red-400',
    success: 'text-green-400',
  };

  return (
    <div className="flex flex-col items-center px-3 py-1">
      <span className="text-text-theme-secondary text-[10px] tracking-wide uppercase">
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${statusColors[status]}`}
      >
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
// Main Component
// =============================================================================

/**
 * Compact status bar showing infantry platoon statistics.
 *
 * BV breakdown is computed via `computeInfantryBVFromState`. The store slice
 * selector is intentionally granular so the bar re-computes only when inputs
 * that matter for BV change (motive, composition, weapons, armor kit, etc.).
 */
export function InfantryStatusBar({
  className = '',
  compact = false,
}: InfantryStatusBarProps): React.ReactElement {
  // Identity / composition
  const infantryMotive = useInfantryStore((s) => s.infantryMotive);
  const platoonComposition = useInfantryStore((s) => s.platoonComposition);
  const armorKit = useInfantryStore((s) => s.armorKit);
  const hasAntiMechTraining = useInfantryStore((s) => s.hasAntiMechTraining);

  // Weapons
  const primaryWeapon = useInfantryStore((s) => s.primaryWeapon);
  const primaryWeaponId = useInfantryStore((s) => s.primaryWeaponId);
  const secondaryWeapon = useInfantryStore((s) => s.secondaryWeapon);
  const secondaryWeaponId = useInfantryStore((s) => s.secondaryWeaponId);
  const secondaryWeaponCount = useInfantryStore((s) => s.secondaryWeaponCount);

  // Field guns
  const fieldGuns = useInfantryStore((s) => s.fieldGuns);

  // MP (for display — not for BV)
  const groundMP = useInfantryStore((s) => s.groundMP);
  const jumpMP = useInfantryStore((s) => s.jumpMP);

  // BV dialog open state
  const [bvDialogOpen, setBvDialogOpen] = useState(false);

  const troopers = useMemo(
    () => totalTroopers(platoonComposition),
    [platoonComposition],
  );

  // Live BV — re-runs when any BV-relevant field changes.
  // @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
  const bvBreakdown = useMemo(() => {
    try {
      return computeInfantryBVFromState({
        infantryMotive,
        platoonComposition,
        armorKit,
        hasAntiMechTraining,
        primaryWeapon,
        primaryWeaponId,
        secondaryWeapon,
        secondaryWeaponId,
        secondaryWeaponCount,
        fieldGuns,
      });
    } catch {
      return null;
    }
  }, [
    infantryMotive,
    platoonComposition,
    armorKit,
    hasAntiMechTraining,
    primaryWeapon,
    primaryWeaponId,
    secondaryWeapon,
    secondaryWeaponId,
    secondaryWeaponCount,
    fieldGuns,
  ]);

  // Compact rendering (used in narrow layouts)
  if (compact) {
    return (
      <div
        className={`bg-surface-base border-border-theme-subtle flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs ${className}`}
      >
        <span className="font-medium text-white">
          {troopers} troopers {infantryMotive}
        </span>
        <span className="text-text-theme-secondary">
          {groundMP}
          {jumpMP > 0 ? `/${jumpMP}J` : ''} MP
        </span>
        {hasAntiMechTraining && (
          <span className="text-text-theme-secondary">Anti-Mech</span>
        )}
        {fieldGuns.length > 0 && (
          <span className="text-text-theme-secondary">
            {fieldGuns.length} gun{fieldGuns.length === 1 ? '' : 's'}
          </span>
        )}
        {bvBreakdown && (
          <span className="font-medium text-white" title="Battle Value">
            BV {bvBreakdown.final}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={`bg-surface-base border-border-theme-subtle flex items-center justify-between border-b ${className}`}
      >
        {/* Platoon size */}
        <StatusItem
          label="Troopers"
          value={troopers}
          subValue={`${platoonComposition.squads} × ${platoonComposition.troopersPerSquad}`}
        />

        {/* Motive */}
        <StatusItem
          label="Motive"
          value={infantryMotive}
          subValue={`${groundMP}${jumpMP > 0 ? `/${jumpMP}J` : ''} MP`}
        />

        {/* Armor kit */}
        <StatusItem label="Armor" value={armorKit} />

        {/* Anti-Mech */}
        <StatusItem
          label="Anti-Mech"
          value={hasAntiMechTraining ? 'Yes' : 'No'}
          status={hasAntiMechTraining ? 'success' : 'normal'}
        />

        {/* Field Guns */}
        <StatusItem
          label="Field Guns"
          value={fieldGuns.length}
          subValue={
            fieldGuns.length > 0
              ? fieldGuns.map((g) => g.name).join(', ')
              : 'none'
          }
        />

        {/* Per-trooper BV */}
        {bvBreakdown && (
          <StatusItem
            label="Per-Trooper"
            value={bvBreakdown.perTrooper.toFixed(2)}
          />
        )}

        {/* Field gun BV */}
        {bvBreakdown && bvBreakdown.fieldGunBV > 0 && (
          <StatusItem
            label="Field Gun BV"
            value={bvBreakdown.fieldGunBV.toFixed(0)}
          />
        )}

        {/* Final BV (click to open breakdown dialog) */}
        {bvBreakdown && (
          <button
            type="button"
            onClick={() => setBvDialogOpen(true)}
            className="hover:bg-surface-hover focus:ring-accent-theme/40 rounded transition focus:ring-2 focus:outline-none"
            aria-label="Show Battle Value breakdown"
            data-testid="infantry-bv-status-item"
          >
            <StatusItem
              label="BV"
              value={bvBreakdown.final}
              subValue={`platoon ${Math.round(bvBreakdown.platoonBV)}`}
            />
          </button>
        )}
      </div>

      {bvDialogOpen && bvBreakdown && (
        <InfantryBVBreakdownDialog
          breakdown={bvBreakdown}
          onClose={() => setBvDialogOpen(false)}
        />
      )}
    </>
  );
}

export default InfantryStatusBar;
