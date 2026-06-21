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

import React, { useMemo, useState } from 'react';

import type { IWeapon } from '@/simulation/ai/types';
import type {
  IAttackerState,
  ITargetState,
  RangeBracket,
  WeaponFireMode,
} from '@/types/gameplay';

import { getMinimumRangePenalty } from '@/utils/gameplay/range';
import {
  previewAttackOutcome,
  ZERO_PREVIEW,
  type IAttackPreview,
} from '@/utils/gameplay/toHit/preview';

import { WeaponModeControl } from './WeaponModeControl';
import { PreviewToggle } from './WeaponSelectorPreviewToggle';
import { StatusBadge } from './WeaponStatusBadge';

export interface WeaponSelectorProps {
  /** All weapons mounted on the attacker */
  weapons: readonly IWeapon[];
  /** Distance in hexes from attacker to target */
  rangeToTarget: number;
  /** Projection-derived range bracket. Undefined preserves legacy range inference. */
  activeRangeBracket?: RangeBracket | null;
  /** Currently selected weapon ids */
  selectedWeaponIds: readonly string[];
  /** Resolved or requested per-weapon fire modes for the active attacker. */
  weaponModesByWeaponId?: Readonly<Record<string, WeaponFireMode>>;
  /** Validation message from the last mode toggle attempt. */
  weaponModeError?: string | null;
  /** Ammo remaining per weapon id (-1 = energy / unlimited) */
  ammo: Readonly<Record<string, number>>;
  /** Callback fired when a weapon is toggled */
  onToggle: (weaponId: string) => void;
  /** Callback fired when a weapon fire mode is changed. */
  onModeChange?: (weaponId: string, mode: WeaponFireMode) => void;
  /**
   * Per `add-what-if-to-hit-preview` § 8: attacker/target projections
   * needed to compute `previewAttackOutcome` per weapon. Both must be
   * present (alongside `previewEnabled === true`) for the preview
   * columns to render. Optional so existing call sites that only need
   * the basic checkbox grid don't have to wire them up.
   */
  attacker?: IAttackerState | null;
  target?: ITargetState | null;
  /**
   * Per `add-what-if-to-hit-preview` § 7-8: when `true`, each weapon
   * row renders Exp. Dmg / ± stddev / Crit % columns. Sourced from
   * `useGameplayStore.previewEnabled` by the parent panel.
   */
  previewEnabled?: boolean;
  /**
   * Per `add-what-if-to-hit-preview` § 8.1: header toggle callback.
   * When provided, a "Preview Damage" switch is rendered in the
   * header. Pure UI — flipping it must not append events or mutate
   * the session (the parent wires this to `setPreviewEnabled`).
   */
  onTogglePreview?: (next: boolean) => void;
  /** Optional className */
  className?: string;
}

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
    : 'text-text-theme-muted bg-gray-100 border-transparent';
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

/**
 * Per `add-what-if-to-hit-preview` § 10: format helpers.
 *  - Expected damage → 1 decimal (e.g., `"8.4"`).
 *  - Stddev → `"±X.X"` (always prefixed with the plus-minus glyph).
 *  - Crit probability → percentage to 1 decimal (e.g., `"3.2%"`).
 *  - Out-of-range / `null` preview → `"—"` (em dash) so the player
 *    immediately distinguishes "not applicable" from a real "0%"
 *    chance — see § 10.4.
 */
const PREVIEW_NA = '—';

function formatExpectedDamage(preview: IAttackPreview | null): string {
  if (!preview || preview === ZERO_PREVIEW) return PREVIEW_NA;
  return preview.expectedDamage.toFixed(1);
}
function formatStddev(preview: IAttackPreview | null): string {
  if (!preview || preview === ZERO_PREVIEW) return PREVIEW_NA;
  return `±${preview.damageStddev.toFixed(1)}`;
}
function formatCritPercent(preview: IAttackPreview | null): string {
  if (!preview || preview === ZERO_PREVIEW) return PREVIEW_NA;
  return `${(preview.critProbability * 100).toFixed(1)}%`;
}

interface PreviewColumnsProps {
  weaponId: string;
  preview: IAttackPreview | null;
}

/**
 * Three preview spans rendered when `previewEnabled === true`. Kept
 * as its own component so the row stays readable AND so the
 * data-testids stay collocated with the formatter.
 */
function PreviewColumns({
  weaponId,
  preview,
}: PreviewColumnsProps): React.ReactElement {
  return (
    <div
      className="mt-1 ml-6 grid grid-cols-3 gap-2 text-xs"
      data-testid={`weapon-preview-${weaponId}`}
    >
      <div className="flex flex-col">
        <span className="text-text-theme-muted uppercase">Exp. Dmg</span>
        <span
          className="text-text-theme-primary font-semibold"
          data-testid={`weapon-preview-expdmg-${weaponId}`}
        >
          {formatExpectedDamage(preview)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-text-theme-muted uppercase">Stddev</span>
        <span
          className="text-text-theme-secondary font-mono"
          data-testid={`weapon-preview-stddev-${weaponId}`}
        >
          {formatStddev(preview)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-text-theme-muted uppercase">Crit %</span>
        <span
          className="text-text-theme-secondary font-semibold"
          data-testid={`weapon-preview-crit-${weaponId}`}
        >
          {formatCritPercent(preview)}
        </span>
      </div>
    </div>
  );
}

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
      className={`bg-surface-base flex flex-col gap-1 rounded border border-gray-200 p-2 ${
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
            className="text-text-theme-muted rounded bg-gray-100 px-1.5 py-0.5 text-xs"
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

export function WeaponSelector({
  weapons,
  rangeToTarget,
  selectedWeaponIds,
  weaponModesByWeaponId = {},
  weaponModeError = null,
  ammo,
  onToggle,
  onModeChange,
  attacker = null,
  target = null,
  previewEnabled = false,
  onTogglePreview,
  className = '',
  activeRangeBracket,
}: WeaponSelectorProps): React.ReactElement {
  const totalHeat = useMemo(() => {
    return weapons
      .filter((w) => selectedWeaponIds.includes(w.id))
      .reduce((sum, w) => sum + w.heat, 0);
  }, [weapons, selectedWeaponIds]);

  /**
   * Per `add-what-if-to-hit-preview` § 7.4: memoize preview per
   * `{attackerId, targetId, weaponId, previewEnabled}` tuple. We don't
   * have ids in the projections so we close over their reference
   * identity — the parent already memoizes both via `useMemo`, so a
   * change in either flows through naturally. Spec scenario "Memo hit
   * when inputs unchanged" is satisfied because `previews` is a stable
   * reference until any of these inputs change.
   *
   * When `previewEnabled === false` OR attacker/target are missing,
   * the map is the empty object — the projection short-circuit per
   * § 7.2 ("no `previewAttackOutcome` computation SHALL occur").
   */
  const previews = useMemo<Record<string, IAttackPreview | null>>(() => {
    if (!previewEnabled || !attacker || !target) return {};
    const out: Record<string, IAttackPreview | null> = {};
    for (const w of weapons) {
      const outOfRange = rangeToTarget > w.longRange;
      // Per spec scenario "Preview null for out-of-range weapons":
      // out-of-range previews must be `null` so the row renders "—"
      // not zeroed numbers.
      if (outOfRange) {
        out[w.id] = null;
        continue;
      }
      out[w.id] = previewAttackOutcome({
        attacker,
        target,
        weapon: w,
        range: rangeToTarget,
      });
    }
    return out;
  }, [previewEnabled, attacker, target, weapons, rangeToTarget]);

  // Per `add-attack-phase-ui` task 3.1: the Weapons list is collapsible
  // so the action panel stays compact when the player has already
  // finalized their selection. Default is open — critical target info
  // must not hide itself on first render.
  const [expanded, setExpanded] = useState(true);

  if (weapons.length === 0) {
    return (
      <div
        className={`text-text-theme-muted text-sm ${className}`}
        data-testid="weapon-selector-empty"
      >
        No weapons available.
      </div>
    );
  }

  const selectedCount = selectedWeaponIds.length;

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-testid="weapon-selector"
      data-expanded={expanded}
    >
      <header
        className="flex items-center justify-between gap-2"
        data-testid="weapon-selector-header"
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="weapon-selector-list"
          onClick={() => setExpanded((v) => !v)}
          data-testid="weapon-selector-toggle"
          className="text-text-theme-secondary inline-flex items-center gap-1.5 rounded text-xs font-semibold uppercase hover:text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none"
        >
          <span
            aria-hidden="true"
            className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          <span>Weapons</span>
          <span
            className="text-text-theme-muted ml-1 font-normal normal-case"
            data-testid="weapon-selector-count"
          >
            ({selectedCount}/{weapons.length} selected)
          </span>
        </button>
        {onTogglePreview && (
          <PreviewToggle enabled={previewEnabled} onToggle={onTogglePreview} />
        )}
      </header>
      {expanded && (
        <ul
          id="weapon-selector-list"
          className="flex flex-col gap-2"
          data-testid="weapon-list"
        >
          {weapons.map((weapon) => {
            // Default to -1 (energy / unlimited) when the unit has no
            // ammo entry — matches how `IAIUnitState.ammo` is shaped.
            const ammoRemaining = ammo[weapon.id] ?? -1;
            const preview = previews[weapon.id] ?? null;
            const mode = weaponModesByWeaponId[weapon.id] ?? 'Direct';
            const activeBracket = bracketLabelForProjection(activeRangeBracket);
            return (
              <WeaponRow
                key={weapon.id}
                weapon={weapon}
                rangeToTarget={rangeToTarget}
                selected={selectedWeaponIds.includes(weapon.id)}
                ammoRemaining={ammoRemaining}
                onToggle={() => onToggle(weapon.id)}
                mode={mode}
                onModeChange={
                  onModeChange
                    ? (nextMode) => onModeChange(weapon.id, nextMode)
                    : undefined
                }
                preview={preview}
                showPreview={previewEnabled && Boolean(attacker && target)}
                activeRangeBracket={activeBracket}
              />
            );
          })}
        </ul>
      )}
      {weaponModeError && (
        <p
          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
          role="alert"
          data-testid="weapon-mode-error"
        >
          {weaponModeError}
        </p>
      )}
      <div
        className="text-text-theme-secondary border-t border-gray-200 pt-2 text-xs"
        data-testid="weapon-selector-total-heat"
      >
        Total heat if fired: <span className="font-semibold">+{totalHeat}</span>
      </div>
    </div>
  );
}

export default WeaponSelector;
