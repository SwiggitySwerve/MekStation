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
 *
 * Per `add-what-if-to-hit-preview` § 8: when `previewEnabled === true`
 * AND the parent passes the source `attackerWeapons` array, each
 * forecast row is augmented with a sub-row showing expected damage,
 * stddev, and crit probability — derived from `previewAttackOutcome`.
 * Same zero-commit guarantee as the WeaponSelector preview columns:
 * mounting / unmounting the modal never appends events or mutates
 * session state.
 */

import React, { useState } from 'react';

import type { IWeapon } from '@/simulation/ai/types';
import type { IAttackerState, ITargetState } from '@/types/gameplay';

import {
  buildToHitForecast,
  expectedHitsTotal,
  type IForecastInput,
  type IWeaponForecastRow,
} from '@/utils/gameplay/toHit/forecast';
import {
  previewAttackOutcome,
  type IAttackPreview,
} from '@/utils/gameplay/toHit/preview';

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
  /**
   * Per `add-what-if-to-hit-preview` § 8.2: when `true`, each row
   * renders an expected-damage / stddev / crit% sub-row. Sourced from
   * `useGameplayStore.previewEnabled` by the parent.
   */
  previewEnabled?: boolean;
  /**
   * Source `IWeapon` records (full catalog rows, not the trimmed
   * `IForecastInput`) — needed so `previewAttackOutcome` can read
   * damage / cluster shape / heat. Optional so legacy tests that
   * don't care about the preview can still render the modal.
   */
  attackerWeapons?: readonly IWeapon[];
  /** Callback when Confirm Fire is pressed (parent should call commitAttack) */
  onConfirm: () => void;
  /** Callback when Back is pressed or modal background is clicked */
  onClose: () => void;
}

/**
 * Per `add-what-if-to-hit-preview` § 10: same formatters as the
 * WeaponSelector. Kept as local helpers (rather than imported from
 * the picker) so the two surfaces can evolve independently — e.g.,
 * the modal might add CI bracket strings later.
 */
const PREVIEW_NA = '—';

function formatExpectedDamage(preview: IAttackPreview | null): string {
  if (!preview) return PREVIEW_NA;
  return preview.expectedDamage.toFixed(1);
}
function formatStddev(preview: IAttackPreview | null): string {
  if (!preview) return PREVIEW_NA;
  return `±${preview.damageStddev.toFixed(1)}`;
}
function formatCritPercent(preview: IAttackPreview | null): string {
  if (!preview) return PREVIEW_NA;
  return `${(preview.critProbability * 100).toFixed(1)}%`;
}

interface PreviewSubRowProps {
  weaponId: string;
  preview: IAttackPreview | null;
}

/**
 * Sub-row appended to each non-out-of-range forecast row when the
 * preview toggle is on. Pure presentation — the preview value is
 * computed once at the modal level and passed in.
 */
function PreviewSubRow({
  weaponId,
  preview,
}: PreviewSubRowProps): React.ReactElement {
  return (
    <div
      className="text-text-theme-secondary mt-1 grid grid-cols-3 gap-2 border-t border-dashed border-gray-300 pt-1 text-xs"
      data-testid={`forecast-preview-${weaponId}`}
    >
      <div className="flex flex-col">
        <span className="text-text-theme-muted uppercase">Exp. Dmg</span>
        <span
          className="text-text-theme-primary font-semibold"
          data-testid={`forecast-preview-expdmg-${weaponId}`}
        >
          {formatExpectedDamage(preview)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-text-theme-muted uppercase">Stddev</span>
        <span
          className="font-mono"
          data-testid={`forecast-preview-stddev-${weaponId}`}
        >
          {formatStddev(preview)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-text-theme-muted uppercase">Crit %</span>
        <span
          className="font-semibold"
          data-testid={`forecast-preview-crit-${weaponId}`}
        >
          {formatCritPercent(preview)}
        </span>
      </div>
    </div>
  );
}

interface ForecastRowProps {
  row: IWeaponForecastRow;
  preview: IAttackPreview | null;
  showPreview: boolean;
}

function ForecastRow({
  row,
  preview,
  showPreview,
}: ForecastRowProps): React.ReactElement {
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

  // Per `add-attack-phase-ui` task 6.3: the per-weapon modifier
  // breakdown collapses by default. Clicking the row toggles it open.
  // Per spec "Modifier breakdown expands" + "zero-value modifiers SHALL
  // be omitted" — we filter to non-zero modifiers before render. Also
  // covers task 10.2 (zero-impact SPAs SHALL NOT render).
  const [expanded, setExpanded] = useState(false);
  const visibleModifiers = row.modifiers.filter((m) => m.value !== 0);

  return (
    <li
      className="bg-surface-base flex flex-col gap-1 rounded border border-gray-200 p-2"
      data-testid={`forecast-row-${row.weaponId}`}
      data-expanded={expanded}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`forecast-modifiers-${row.weaponId}`}
        className="flex items-center justify-between gap-2 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none"
        data-testid={`forecast-row-toggle-${row.weaponId}`}
      >
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`inline-block text-xs transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          <span className="text-text-theme-primary font-medium">
            {row.weaponName}
          </span>
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
      </button>
      {expanded && (
        <ul
          id={`forecast-modifiers-${row.weaponId}`}
          className="text-text-theme-muted ml-2 text-xs"
          data-testid={`forecast-modifiers-${row.weaponId}`}
        >
          {visibleModifiers.length === 0 ? (
            <li
              className="text-text-theme-muted italic"
              data-testid={`forecast-modifiers-empty-${row.weaponId}`}
            >
              No modifiers applied
            </li>
          ) : (
            visibleModifiers.map((m, idx) => (
              <li
                key={`${row.weaponId}-mod-${idx}`}
                className="flex justify-between"
                data-testid={`forecast-modifier-${row.weaponId}-${idx}`}
              >
                <span>{m.name}</span>
                <span className="font-mono">
                  {m.value >= 0 ? `+${m.value}` : `${m.value}`}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
      {showPreview && (
        <PreviewSubRow weaponId={row.weaponId} preview={preview} />
      )}
    </li>
  );
}

export function ToHitForecastModal({
  open,
  attacker,
  target,
  range,
  weapons,
  previewEnabled = false,
  attackerWeapons = [],
  onConfirm,
  onClose,
}: ToHitForecastModalProps): React.ReactElement | null {
  if (!open) return null;

  const forecast = buildToHitForecast(attacker, target, weapons, range);
  const expected = expectedHitsTotal(forecast);

  /**
   * Per `add-what-if-to-hit-preview` § 7.4: build a per-weapon
   * preview map once. Skipped entirely when the toggle is off OR
   * when the parent didn't pass the source `IWeapon` records — in
   * either case the sub-rows simply don't render.
   *
   * The map is keyed by `weaponId` so the per-row lookup is O(1) and
   * doesn't iterate over `attackerWeapons` for every forecast row.
   */
  const previews: Record<string, IAttackPreview | null> = {};
  if (previewEnabled && attackerWeapons.length > 0) {
    for (const row of forecast) {
      if (row.outOfRange) {
        previews[row.weaponId] = null;
        continue;
      }
      const weapon = attackerWeapons.find((w) => w.id === row.weaponId);
      if (!weapon) {
        previews[row.weaponId] = null;
        continue;
      }
      previews[row.weaponId] = previewAttackOutcome({
        attacker,
        target,
        weapon,
        range,
      });
    }
  }

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
            {previewEnabled && (
              <span data-testid="forecast-preview-on"> • Preview ON</span>
            )}
          </p>
        </header>
        <ul className="flex flex-col gap-2" data-testid="forecast-list">
          {forecast.map((row) => (
            <ForecastRow
              key={row.weaponId}
              row={row}
              preview={previews[row.weaponId] ?? null}
              showPreview={previewEnabled && attackerWeapons.length > 0}
            />
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
