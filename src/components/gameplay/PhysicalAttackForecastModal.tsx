/**
 * PhysicalAttackForecastModal
 *
 * Per `add-physical-attack-phase-ui`: physical-attack analogue of
 * `ToHitForecastModal`. The player opens it via the "Preview Forecast"
 * button on the `PhysicalAttackPanel`, sees the TN + modifier
 * breakdown + expected damage + hit-location table for the chosen
 * attack type, then either confirms (commits the
 * `PhysicalAttackDeclared` event) or backs out.
 *
 * Pure presentational: TN / damage are computed by the engine helpers
 * (`calculatePhysicalToHit` / `calculatePhysicalDamage`) the parent
 * forwards in via `attackInput`. Hit probability follows the standard
 * 2d6 roll-or-better curve we use for weapon attacks (matches
 * `forecast.ts` percentages so the two modals feel consistent).
 */

import React from 'react';

import type {
  IPhysicalAttackInput,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

import { calculatePhysicalDamage } from '@/utils/gameplay/physicalAttacks/damage';
import { calculatePhysicalToHit } from '@/utils/gameplay/physicalAttacks/toHit';

export interface PhysicalAttackForecastModalProps {
  /** True to render the modal */
  open: boolean;
  /**
   * Hydrated attack input — combines the picker's chosen attack type
   * with the attacker context (tonnage, piloting, component damage).
   * The modal runs the engine helpers against this input to produce
   * the forecast rows.
   */
  attackInput: IPhysicalAttackInput;
  /**
   * Optional human-readable target name for the modal header. Falls
   * back to "Target" when absent so the modal still renders during
   * unit tests with bare-bones props.
   */
  targetName?: string;
  /** Callback when Confirm Attack is pressed. */
  onConfirm: () => void;
  /** Callback when Back / backdrop is pressed. */
  onClose: () => void;
}

/**
 * Standard 2d6 roll-or-better probability table used across the
 * combat UI. Mirrors `hitProbability` from `forecast.ts` so the
 * physical and weapon forecast modals report the same numbers for the
 * same TNs.
 */
function hitProbability(tn: number): number {
  if (!Number.isFinite(tn)) return 0;
  if (tn <= 2) return 100;
  if (tn === 3) return 97;
  if (tn === 4) return 92;
  if (tn === 5) return 83;
  if (tn === 6) return 72;
  if (tn === 7) return 58;
  if (tn === 8) return 42;
  if (tn === 9) return 28;
  if (tn === 10) return 17;
  if (tn === 11) return 8;
  if (tn === 12) return 3;
  return 0;
}

/**
 * Map an attack type to the human-readable hit-location-table label
 * the modal surfaces at the bottom of the breakdown. Per
 * `IPhysicalDamageResult.hitTable` we only have two tables today
 * ('punch' / 'kick'); the rest fall back to 'punch'.
 */
function attackTypeLabel(attackType: PhysicalAttackType): string {
  switch (attackType) {
    case 'punch':
      return 'Punch';
    case 'kick':
      return 'Kick';
    case 'charge':
      return 'Charge';
    case 'dfa':
      return 'Death From Above';
    case 'push':
      return 'Push';
    case 'hatchet':
      return 'Hatchet';
    case 'sword':
      return 'Sword';
    case 'mace':
      return 'Mace';
  }
}

export function PhysicalAttackForecastModal({
  open,
  attackInput,
  targetName,
  onConfirm,
  onClose,
}: PhysicalAttackForecastModalProps): React.ReactElement | null {
  if (!open) return null;

  const toHit = calculatePhysicalToHit(attackInput);
  const damage = calculatePhysicalDamage(attackInput);
  const probability = toHit.allowed ? hitProbability(toHit.finalToHit) : 0;
  const label = attackTypeLabel(attackInput.attackType);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Physical attack forecast"
      data-testid="physical-attack-forecast-modal"
      onClick={(e) => {
        // Click on the backdrop only (not the modal body)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-raised flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg p-4 shadow-xl">
        <header>
          <h2 className="text-text-theme-primary text-lg font-semibold">
            {label} Forecast
          </h2>
          <p className="text-text-theme-muted text-xs">
            Target: {targetName ?? 'Target'}
          </p>
        </header>

        {!toHit.allowed && (
          <div
            className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700"
            data-testid="physical-forecast-restriction"
          >
            {toHit.restrictionReason ?? 'Attack not allowed'}
          </div>
        )}

        {toHit.allowed && (
          <>
            <section
              className="bg-surface-base rounded border border-gray-200 p-2"
              data-testid="physical-forecast-tn-section"
            >
              <div className="flex items-center justify-between">
                <span className="text-text-theme-primary font-medium">
                  Target Number
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className="text-text-theme-secondary text-sm"
                    data-testid="physical-forecast-tn"
                  >
                    TN {toHit.finalToHit}+
                  </span>
                  <span
                    className="font-semibold text-blue-600"
                    data-testid="physical-forecast-prob"
                  >
                    {probability}%
                  </span>
                </div>
              </div>
              <ul
                className="text-text-theme-muted mt-1 ml-2 text-xs"
                data-testid="physical-forecast-modifiers"
              >
                <li className="flex justify-between">
                  <span>Piloting base</span>
                  <span className="font-mono">
                    {toHit.baseToHit >= 0
                      ? `+${toHit.baseToHit}`
                      : `${toHit.baseToHit}`}
                  </span>
                </li>
                {toHit.modifiers.map((m, idx) => (
                  <li
                    key={`mod-${idx}`}
                    className="flex justify-between"
                    data-testid={`physical-forecast-modifier-${idx}`}
                  >
                    <span>{m.name}</span>
                    <span className="font-mono">
                      {m.value >= 0 ? `+${m.value}` : `${m.value}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section
              className="bg-surface-base rounded border border-gray-200 p-2"
              data-testid="physical-forecast-damage-section"
            >
              <div className="flex items-center justify-between">
                <span className="text-text-theme-primary font-medium">
                  Expected damage
                </span>
                <span
                  className="font-semibold text-amber-700"
                  data-testid="physical-forecast-damage"
                >
                  {damage.targetDamage}
                </span>
              </div>
              <p
                className="text-text-theme-muted mt-1 text-xs"
                data-testid="physical-forecast-hit-table"
              >
                Damage location:{' '}
                {damage.hitTable === 'kick'
                  ? 'Kick table (1d6 — leg locations)'
                  : 'Punch table (1d6 — upper-body locations)'}
              </p>
              {damage.attackerDamage > 0 && (
                <p
                  className="mt-1 text-xs text-red-700"
                  data-testid="physical-forecast-self-damage"
                >
                  Self-risk: {damage.attackerDamage} damage to attacker
                  {damage.attackerPSR ? ' (auto PSR)' : ''}
                </p>
              )}
              {damage.attackerLegDamagePerLeg > 0 && (
                <p
                  className="mt-1 text-xs text-red-700"
                  data-testid="physical-forecast-leg-damage"
                >
                  Leg damage: {damage.attackerLegDamagePerLeg} per leg
                </p>
              )}
            </section>
          </>
        )}

        <footer className="flex items-center justify-end border-t border-gray-200 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-surface-deep text-text-theme-primary hover:bg-surface-base min-h-[44px] rounded px-4 py-2 font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
              data-testid="physical-forecast-back-button"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!toHit.allowed}
              className={`min-h-[44px] rounded px-4 py-2 font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                toHit.allowed
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                  : 'cursor-not-allowed bg-gray-300 text-gray-500'
              }`}
              data-testid="physical-forecast-confirm-button"
            >
              Confirm Attack
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default PhysicalAttackForecastModal;
