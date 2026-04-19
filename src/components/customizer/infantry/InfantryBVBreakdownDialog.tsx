/**
 * Infantry BV Breakdown Dialog
 *
 * Modal dialog showing the full infantry Battle Value breakdown.
 *
 * Surfaces every field on `IInfantryBVBreakdown` so players can audit how the
 * final BV was computed (required by spec: perTrooper, motiveMultiplier,
 * antiMechMultiplier, fieldGunBV, platoonBV, pilotMultiplier, final).
 *
 * @spec openspec/changes/add-infantry-battle-value/specs/infantry-unit-system/spec.md
 */

import React from 'react';

import type { IInfantryBVBreakdown } from '@/utils/construction/infantry/infantryBV';

// =============================================================================
// Types
// =============================================================================

interface InfantryBVBreakdownDialogProps {
  breakdown: IInfantryBVBreakdown;
  onClose: () => void;
}

interface BreakdownRowProps {
  label: string;
  value: number | string;
  sub?: string;
  highlight?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="text-text-theme-secondary text-xs font-semibold tracking-wide uppercase">
      {children}
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  sub,
  highlight,
}: BreakdownRowProps): React.ReactElement {
  return (
    <div
      className={`flex items-baseline justify-between ${highlight ? 'font-semibold text-white' : 'text-text-theme-secondary'}`}
    >
      <span>
        {label}
        {sub && (
          <span className="text-text-theme-secondary ml-2 text-xs">
            ({sub})
          </span>
        )}
      </span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

// =============================================================================
// Dialog
// =============================================================================

export function InfantryBVBreakdownDialog({
  breakdown,
  onClose,
}: InfantryBVBreakdownDialogProps): React.ReactElement {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="infantry-bv-dialog-title"
      onClick={onClose}
    >
      <div
        className="bg-surface-base border-border-theme-subtle max-h-[80vh] w-[480px] max-w-[90vw] overflow-auto rounded-lg border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2
            id="infantry-bv-dialog-title"
            className="text-xl font-semibold text-white"
          >
            Infantry Battle Value Breakdown
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-theme-secondary hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <BreakdownRow label="Final BV" value={breakdown.final} highlight />
          <BreakdownRow
            label="Pilot Multiplier"
            value={breakdown.pilotMultiplier.toFixed(2)}
          />

          <div className="border-border-theme-subtle my-3 border-t" />

          <SectionTitle>Per-Trooper</SectionTitle>
          <BreakdownRow
            label="Primary Weapon"
            value={breakdown.primaryBV.toFixed(2)}
          />
          <BreakdownRow
            label="Secondary Weapon"
            value={breakdown.secondaryBV.toFixed(2)}
          />
          <BreakdownRow
            label="Armor Kit"
            value={breakdown.armorKitBV.toFixed(2)}
          />
          <BreakdownRow
            label="Per-Trooper Total"
            value={breakdown.perTrooper.toFixed(2)}
            sub={`${breakdown.troopers} troopers`}
            highlight
          />

          <div className="border-border-theme-subtle my-3 border-t" />

          <SectionTitle>Platoon Multipliers</SectionTitle>
          <BreakdownRow
            label="Motive Multiplier"
            value={breakdown.motiveMultiplier.toFixed(3)}
          />
          <BreakdownRow
            label="Anti-Mech Multiplier"
            value={breakdown.antiMechMultiplier.toFixed(2)}
          />

          <div className="border-border-theme-subtle my-3 border-t" />

          <SectionTitle>Field Gun</SectionTitle>
          <BreakdownRow
            label="Field Gun Weapon BV"
            value={breakdown.fieldGunWeaponBV.toFixed(1)}
          />
          <BreakdownRow
            label="Field Gun Ammo BV"
            value={breakdown.fieldGunAmmoBV.toFixed(1)}
          />
          <BreakdownRow
            label="Field Gun Total"
            value={breakdown.fieldGunBV.toFixed(1)}
            highlight
          />

          <div className="border-border-theme-subtle my-3 border-t" />

          <BreakdownRow
            label="Platoon BV (pre-pilot)"
            value={breakdown.platoonBV.toFixed(1)}
            highlight
          />
        </div>
      </div>
    </div>
  );
}

export default InfantryBVBreakdownDialog;
