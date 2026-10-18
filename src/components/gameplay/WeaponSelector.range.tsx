/**
 * WeaponSelector
 *
 * Per `add-combat-phase-ui-flows`: list of the attacker's weapons in
 * the Attack-phase action panel. Each row exposes a checkbox so the
 * player can multi-select which weapons to fire this round, plus
 * status badges for "Destroyed", "No ammo", and "Out of range".
 *
 * Selection is propagated up via `onToggle` so the parent (the action
 * panel wrapper) can call `useGameplayStore.togglePlannedWeapon`.
 *
 * Heat impact: the footer sums the heat cost of the currently
 * selected weapons so the player can sanity-check before opening the
 * forecast modal.
 *
 * Per `add-what-if-to-hit-preview` § 8: when the parent wires in the
 * `attacker` + `target` projections AND flips `previewEnabled = true`,
 * each row reveals three extra columns — Exp. Dmg, ± stddev, Crit % —
 * derived from `previewAttackOutcome`. Toggling the "Preview Damage"
 * header switch never fires events or mutates session state (zero-
 * commit guarantee — see preview.ts and the integration test).
 */
import React from 'react';

import type { IWeapon } from '@/simulation/ai/types';
import type { RangeBracket } from '@/types/gameplay';

import { getMinimumRangePenalty } from '@/utils/gameplay/range';

interface RangeBadgeProps {
  label: string;
  range: number;
  /**
   * Per `add-attack-phase-ui` task 4.2: when `true`, the badge gets a
   * high-contrast highlight so the player can spot the live range
   * bracket without reading each value.
   */
  active?: boolean;
}

function RangeBadge({
  label,
  range,
  active = false,
}: RangeBadgeProps): React.ReactElement {
  const base = 'rounded px-1.5 py-0.5 text-xs transition-colors border';
  const tone = active
    ? 'bg-blue-600 text-white border-blue-700 font-semibold shadow-sm'
    : 'text-text-theme-muted bg-surface-base border-transparent';
  return (
    <span
      className={`${base} ${tone}`}
      data-testid={`range-badge-${label.toLowerCase()}`}
      data-active={active}
      aria-pressed={active}
    >
      {label}:{range}
    </span>
  );
}

/**
 * Pick the active range bracket for `range` vs the weapon's thresholds.
 * Minimum range is legal with a to-hit penalty, so the normal S/M/L bracket
 * remains active. Returns `null` only above long range.
 */
function pickActiveBracket(
  range: number,
  weapon: IWeapon,
): 'S' | 'M' | 'L' | null {
  if (range > weapon.longRange) return null;
  if (range <= weapon.shortRange) return 'S';
  if (range <= weapon.mediumRange) return 'M';
  return 'L';
}

function bracketLabelForProjection(
  rangeBracket: RangeBracket | null | undefined,
): 'S' | 'M' | 'L' | null | undefined {
  if (rangeBracket === undefined) return undefined;
  if (rangeBracket === null) return null;
  if (rangeBracket === 'short') return 'S';
  if (rangeBracket === 'medium') return 'M';
  if (rangeBracket === 'long') return 'L';
  return null;
}

function minimumRangePenaltyForWeapon(range: number, weapon: IWeapon): number {
  return getMinimumRangePenalty(range, {
    short: weapon.shortRange,
    medium: weapon.mediumRange,
    long: weapon.longRange,
    minimum: weapon.minRange,
  });
}

export {
  RangeBadge,
  pickActiveBracket,
  bracketLabelForProjection,
  minimumRangePenaltyForWeapon,
};
