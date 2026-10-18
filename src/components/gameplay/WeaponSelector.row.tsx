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
import type { WeaponFireMode } from '@/types/gameplay';

import { type IAttackPreview } from '@/utils/gameplay/toHit/preview';

import { WeaponModeControl } from './WeaponModeControl';
import { PreviewColumns } from './WeaponSelector.preview';
import {
  minimumRangePenaltyForWeapon,
  pickActiveBracket,
  RangeBadge,
} from './WeaponSelector.range';
import { StatusBadge } from './WeaponStatusBadge';

interface WeaponRowProps {
  weapon: IWeapon;
  rangeToTarget: number;
  selected: boolean;
  ammoRemaining: number;
  onToggle: () => void;
  mode: WeaponFireMode;
  onModeChange?: (mode: WeaponFireMode) => void;
  /**
   * Pre-computed preview for this weapon (null when preview disabled
   * or out-of-range — § 7.3 / spec scenario "Preview null for
   * out-of-range weapons"). Computed once at the parent so the
   * memoization shape per § 7.4 lives in one place.
   */
  preview: IAttackPreview | null;
  /** True if the parent has the toggle ON — controls column visibility. */
  showPreview: boolean;
  /** Projection-derived bracket label. Undefined preserves range inference. */
  activeRangeBracket?: 'S' | 'M' | 'L' | null;
}

/**
 * Single weapon row with its checkbox + badges. Out-of-range and
 * no-ammo conditions both disable the checkbox so the player can't
 * accidentally queue an unfireable weapon. Minimum range remains legal
 * and displays as a penalty warning, matching the map combat projection.
 */
function WeaponRow({
  weapon,
  rangeToTarget,
  selected,
  ammoRemaining,
  onToggle,
  mode,
  onModeChange,
  preview,
  showPreview,
  activeRangeBracket,
}: WeaponRowProps): React.ReactElement {
  const destroyed = weapon.destroyed;
  // Reasoning: ammoRemaining of -1 means energy weapon (unlimited).
  // Anything > 0 has ammo. Exactly 0 is empty. The lookup defaults to
  // -1 in the parent so weapons without bins are treated as energy.
  const noAmmo = ammoRemaining === 0;
  const outOfRange = rangeToTarget > weapon.longRange;
  const minimumRangePenalty = minimumRangePenaltyForWeapon(
    rangeToTarget,
    weapon,
  );
  const insideMinimumRange = minimumRangePenalty > 0;

  const disabled = destroyed || noAmmo || outOfRange;
  // Per `add-attack-phase-ui` task 4.2: highlight the bracket that the
  // current range falls into (null only when out of range).
  const activeBracket =
    activeRangeBracket === undefined
      ? pickActiveBracket(rangeToTarget, weapon)
      : activeRangeBracket;

  return (
    <li
      className={`bg-surface-base border-border-theme-subtle flex flex-col gap-1 rounded border p-2 ${
        disabled ? 'opacity-60' : ''
      }`}
      data-testid={`weapon-row-${weapon.id}`}
      data-disabled={disabled}
    >
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled}
          onChange={onToggle}
          className="h-4 w-4"
          data-testid={`weapon-checkbox-${weapon.id}`}
        />
        <span className="text-text-theme-primary flex-1 text-sm font-medium">
          {weapon.name}
        </span>
        <span className="text-text-theme-muted text-xs">
          Heat {weapon.heat}
        </span>
      </label>
      <div className="ml-6 flex flex-wrap items-center gap-1.5">
        <RangeBadge
          label="S"
          range={weapon.shortRange}
          active={activeBracket === 'S'}
        />
        <RangeBadge
          label="M"
          range={weapon.mediumRange}
          active={activeBracket === 'M'}
        />
        <RangeBadge
          label="L"
          range={weapon.longRange}
          active={activeBracket === 'L'}
        />
        {ammoRemaining >= 0 && (
          <span
            className="text-text-theme-muted bg-surface-base rounded px-1.5 py-0.5 text-xs"
            data-testid={`ammo-remaining-${weapon.id}`}
          >
            Ammo: {ammoRemaining}
          </span>
        )}
        {destroyed && (
          <StatusBadge
            label="Destroyed"
            testid={`weapon-destroyed-${weapon.id}`}
            tone="gray"
          />
        )}
        {!destroyed && noAmmo && (
          <StatusBadge
            label="No ammo"
            testid={`weapon-no-ammo-${weapon.id}`}
            tone="red"
          />
        )}
        {!destroyed && outOfRange && (
          /*
           * Per `add-attack-phase-ui` task 4.3: out-of-range indicator
           * uses the red tone so it's visually distinct from amber
           * warnings (previously both used amber which blurred meaning).
           */
          <StatusBadge
            label="Out of range"
            testid={`weapon-out-of-range-${weapon.id}`}
            tone="red"
          />
        )}
        {!destroyed && !outOfRange && insideMinimumRange && (
          <StatusBadge
            label={`Min +${minimumRangePenalty}`}
            testid={`weapon-min-range-${weapon.id}`}
            tone="amber"
          />
        )}
      </div>
      {onModeChange && (
        <WeaponModeControl
          weaponId={weapon.id}
          weaponName={weapon.name}
          mode={mode}
          onModeChange={onModeChange}
        />
      )}
      {showPreview && <PreviewColumns weaponId={weapon.id} preview={preview} />}
    </li>
  );
}

export { WeaponRow };
