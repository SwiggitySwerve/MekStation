/**
 * Vehicle BV Breakdown Dialog
 *
 * Modal dialog showing the full vehicle Battle Value breakdown.
 *
 * Surfaces every field on IVehicleBVBreakdown so players can audit how the
 * final BV was computed (required by spec: defensive, offensive, pilot
 * multiplier, turret modifier, final + supporting components).
 *
 * @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
 */

import React from 'react';

import type { IVehicleBVBreakdown } from '@/utils/construction/vehicle/vehicleBV';

// =============================================================================
// Types
// =============================================================================

interface VehicleBVBreakdownDialogProps {
  breakdown: IVehicleBVBreakdown;
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

export function VehicleBVBreakdownDialog({
  breakdown,
  onClose,
}: VehicleBVBreakdownDialogProps): React.ReactElement {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-bv-dialog-title"
      onClick={onClose}
    >
      <div
        className="bg-surface-base border-border-theme-subtle max-h-[80vh] w-[480px] max-w-[90vw] overflow-auto rounded-lg border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2
            id="vehicle-bv-dialog-title"
            className="text-xl font-semibold text-white"
          >
            Battle Value Breakdown
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

          <SectionTitle>Defensive</SectionTitle>
          <BreakdownRow label="Armor BV" value={breakdown.armorBV.toFixed(1)} />
          <BreakdownRow
            label="Structure BV"
            value={breakdown.structureBV.toFixed(1)}
          />
          <BreakdownRow
            label="Defensive Equipment"
            value={breakdown.defensiveEquipmentBV.toFixed(1)}
          />
          <BreakdownRow
            label="Defensive Factor (1 + TMM × 0.5/10)"
            value={breakdown.defensiveFactor.toFixed(3)}
            sub={`TMM ${breakdown.tmm}`}
          />
          <BreakdownRow
            label="Defensive Total"
            value={breakdown.defensive.toFixed(1)}
            highlight
          />

          <div className="border-border-theme-subtle my-3 border-t" />

          <SectionTitle>Offensive</SectionTitle>
          <BreakdownRow
            label="Weapon BV"
            value={breakdown.weaponBV.toFixed(1)}
            sub={`turret mod ${breakdown.turretModifier.toFixed(3)}`}
          />
          <BreakdownRow label="Ammo BV" value={breakdown.ammoBV.toFixed(1)} />
          <BreakdownRow
            label="Offensive Equipment"
            value={breakdown.offensiveEquipmentBV.toFixed(1)}
          />
          <BreakdownRow
            label="Speed Factor"
            value={breakdown.speedFactor.toFixed(3)}
          />
          <BreakdownRow
            label="Offensive Total"
            value={breakdown.offensive.toFixed(1)}
            highlight
          />
        </div>
      </div>
    </div>
  );
}

export default VehicleBVBreakdownDialog;
