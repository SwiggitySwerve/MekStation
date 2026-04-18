/**
 * Battle Armor BV Breakdown Dialog
 *
 * Modal showing the full BA BV decomposition — per-trooper defensive/offensive
 * subtotals, squad scaling, pilot multiplier, and final BV.
 *
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
 *       Requirement: BA BV Breakdown on Unit State
 */

import React from 'react';

import type { IBABreakdown } from '@/utils/construction/battlearmor/battleArmorBV';

// =============================================================================
// Types
// =============================================================================

interface BattleArmorBVBreakdownDialogProps {
  breakdown: IBABreakdown;
  onClose: () => void;
}

interface BreakdownRowProps {
  label: string;
  value: number | string;
  indent?: boolean;
  emphasis?: boolean;
}

// =============================================================================
// Row
// =============================================================================

function BreakdownRow({
  label,
  value,
  indent = false,
  emphasis = false,
}: BreakdownRowProps): React.ReactElement {
  return (
    <div
      className={`flex items-center justify-between py-1 ${indent ? 'pl-6' : ''} ${emphasis ? 'border-border-theme border-t font-semibold' : ''}`}
    >
      <span className="text-text-theme-primary text-xs">{label}</span>
      <span className="text-text-theme-primary text-xs tabular-nums">
        {typeof value === 'number' ? value.toFixed(2) : value}
      </span>
    </div>
  );
}

// =============================================================================
// Main
// =============================================================================

export function BattleArmorBVBreakdownDialog({
  breakdown,
  onClose,
}: BattleArmorBVBreakdownDialogProps): React.ReactElement {
  const d = breakdown.perTrooper.defensive;
  const o = breakdown.perTrooper.offensive;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-bg-theme-primary border-border-theme w-96 rounded border p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-text-theme-primary text-sm font-semibold tracking-wide uppercase">
            Battle Armor BV Breakdown
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-theme-secondary hover:text-text-theme-primary text-sm"
          >
            ×
          </button>
        </div>

        <section className="mb-3">
          <h4 className="text-text-theme-secondary mb-1 text-[11px] uppercase">
            Per Trooper — Defensive
          </h4>
          <BreakdownRow label="Armor BV" value={d.armorBV} indent />
          <BreakdownRow label="Move BV" value={d.moveBV} indent />
          <BreakdownRow label="Jump / UMU BV" value={d.jumpBV} indent />
          <BreakdownRow
            label="Anti-Mech Bonus"
            value={d.antiMechBonus}
            indent
          />
          <BreakdownRow label="Defensive Total" value={d.total} emphasis />
        </section>

        <section className="mb-3">
          <h4 className="text-text-theme-secondary mb-1 text-[11px] uppercase">
            Per Trooper — Offensive
          </h4>
          <BreakdownRow label="Weapon BV" value={o.weaponBV} indent />
          <BreakdownRow label="Ammo BV" value={o.ammoBV} indent />
          <BreakdownRow label="Manipulator BV" value={o.manipulatorBV} indent />
          <BreakdownRow label="Offensive Total" value={o.total} emphasis />
        </section>

        <section>
          <h4 className="text-text-theme-secondary mb-1 text-[11px] uppercase">
            Squad Scaling
          </h4>
          <BreakdownRow
            label="Trooper BV"
            value={breakdown.perTrooper.total}
            indent
          />
          <BreakdownRow
            label={`× ${breakdown.squadSize} troopers`}
            value={breakdown.squadTotal}
            indent
          />
          <BreakdownRow
            label="Pilot Multiplier"
            value={breakdown.pilotMultiplier}
            indent
          />
          <BreakdownRow label="Final BV" value={breakdown.final} emphasis />
        </section>
      </div>
    </div>
  );
}
