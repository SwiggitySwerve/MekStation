/**
 * ToHitForecastModal
 *
 * Per `add-combat-phase-ui-flows`: modal the player opens via the
 * "Preview Forecast" button below the WeaponSelector. Renders the
 * per-weapon forecast — final TN, modifier breakdown, hit probability —
 * and a footer with the expected-hits total. The "Confirm Fire" button
 * commits the attack via `useGameplayStore.commitAttack`; "Back"
 * dismisses the modal without committing.
 *
 * Pure presentational: forecast rows are computed by
 * `buildToHitForecast` in the parent and passed in.
 */

import React from 'react';

import type { IAttackerState, ITargetState } from '@/types/gameplay';

import {
  buildToHitForecast,
  expectedHitsTotal,
  type IForecastInput,
  type IWeaponForecastRow,
} from '@/utils/gameplay/toHit/forecast';

export interface ToHitForecastModalProps {
  /** True to render the modal */
  open: boolean;
  /** Attacker combat state for the to-hit calculation */
  attacker: IAttackerState;
  /** Target combat state for the to-hit calculation */
  target: ITargetState;
  /** Distance from attacker to target in hexes */
  range: number;
  /** Weapons selected for this attack */
  weapons: readonly IForecastInput[];
  /** Callback when Confirm Fire is pressed (parent should call commitAttack) */
  onConfirm: () => void;
  /** Callback when Back is pressed or modal background is clicked */
  onClose: () => void;
}

interface ForecastRowProps {
  row: IWeaponForecastRow;
}

function ForecastRow({ row }: ForecastRowProps): React.ReactElement {
  if (row.outOfRange) {
    return (
      <li
        className="bg-surface-base flex items-center justify-between rounded border border-red-300 p-2"
        data-testid={`forecast-row-${row.weaponId}`}
      >
        <span className="text-text-theme-primary font-medium">
          {row.weaponName}
        </span>
        <span className="text-xs font-semibold text-red-600 uppercase">
          Out of range
        </span>
      </li>
    );
  }

  return (
    <li
      className="bg-surface-base flex flex-col gap-1 rounded border border-gray-200 p-2"
      data-testid={`forecast-row-${row.weaponId}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-text-theme-primary font-medium">
          {row.weaponName}
        </span>
        <div className="flex items-center gap-3">
          <span
            className="text-text-theme-secondary text-sm"
            data-testid={`forecast-tn-${row.weaponId}`}
          >
            TN {row.finalToHit}+
          </span>
          <span
            className="font-semibold text-blue-600"
            data-testid={`forecast-prob-${row.weaponId}`}
          >
            {row.hitProbability}%
          </span>
        </div>
      </div>
      <ul
        className="text-text-theme-muted ml-2 text-xs"
        data-testid={`forecast-modifiers-${row.weaponId}`}
      >
        {row.modifiers.map((m, idx) => (
          <li
            key={`${row.weaponId}-mod-${idx}`}
            className="flex justify-between"
          >
            <span>{m.name}</span>
            <span className="font-mono">
              {m.value >= 0 ? `+${m.value}` : `${m.value}`}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function ToHitForecastModal({
  open,
  attacker,
  target,
  range,
  weapons,
  onConfirm,
  onClose,
}: ToHitForecastModalProps): React.ReactElement | null {
  if (!open) return null;

  const forecast = buildToHitForecast(attacker, target, weapons, range);
  const expected = expectedHitsTotal(forecast);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="To-hit forecast"
      data-testid="to-hit-forecast-modal"
      onClick={(e) => {
        // Click on the backdrop only (not the modal body)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-raised flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg p-4 shadow-xl">
        <header>
          <h2 className="text-text-theme-primary text-lg font-semibold">
            To-Hit Forecast
          </h2>
          <p className="text-text-theme-muted text-xs">
            Range: {range} hexes • {forecast.length} weapon
            {forecast.length === 1 ? '' : 's'}
          </p>
        </header>
        <ul className="flex flex-col gap-2" data-testid="forecast-list">
          {forecast.map((row) => (
            <ForecastRow key={row.weaponId} row={row} />
          ))}
        </ul>
        <footer className="flex items-center justify-between border-t border-gray-200 pt-3">
          <span
            className="text-text-theme-secondary text-sm"
            data-testid="expected-hits-total"
          >
            Expected hits:{' '}
            <span className="font-semibold">{expected.toFixed(2)}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-surface-deep text-text-theme-primary hover:bg-surface-base min-h-[44px] rounded px-4 py-2 font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
              data-testid="forecast-back-button"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-[44px] rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              data-testid="forecast-confirm-button"
            >
              Confirm Fire
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default ToHitForecastModal;
