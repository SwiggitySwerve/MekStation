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

import React, { useMemo } from 'react';

import type { IWeapon } from '@/simulation/ai/types';
import type { IAttackerState, ITargetState } from '@/types/gameplay';

import {
  previewAttackOutcome,
  ZERO_PREVIEW,
  type IAttackPreview,
} from '@/utils/gameplay/toHit/preview';

export interface WeaponSelectorProps {
  /** All weapons mounted on the attacker */
  weapons: readonly IWeapon[];
  /** Distance in hexes from attacker to target */
  rangeToTarget: number;
  /** Currently selected weapon ids */
  selectedWeaponIds: readonly string[];
  /** Ammo remaining per weapon id (-1 = energy / unlimited) */
  ammo: Readonly<Record<string, number>>;
  /** Callback fired when a weapon is toggled */
  onToggle: (weaponId: string) => void;
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
}

function RangeBadge({ label, range }: RangeBadgeProps): React.ReactElement {
  return (
    <span
      className="text-text-theme-muted rounded bg-gray-100 px-1.5 py-0.5 text-xs"
      data-testid={`range-badge-${label.toLowerCase()}`}
    >
      {label}:{range}
    </span>
  );
}

interface StatusBadgeProps {
  label: string;
  testid: string;
  tone: 'red' | 'amber' | 'gray';
}

function StatusBadge({
  label,
  testid,
  tone,
}: StatusBadgeProps): React.ReactElement {
  const toneClasses =
    tone === 'red'
      ? 'bg-red-100 text-red-700'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-600';

  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${toneClasses}`}
      data-testid={testid}
    >
      {label}
    </span>
  );
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
  /**
   * Pre-computed preview for this weapon (null when preview disabled
   * or out-of-range — § 7.3 / spec scenario "Preview null for
   * out-of-range weapons"). Computed once at the parent so the
   * memoization shape per § 7.4 lives in one place.
   */
  preview: IAttackPreview | null;
  /** True if the parent has the toggle ON — controls column visibility. */
  showPreview: boolean;
}

/**
 * Single weapon row with its checkbox + badges. Out-of-range and
 * no-ammo conditions both disable the checkbox so the player can't
 * accidentally queue an unfireable weapon.
 */
function WeaponRow({
  weapon,
  rangeToTarget,
  selected,
  ammoRemaining,
  onToggle,
  preview,
  showPreview,
}: WeaponRowProps): React.ReactElement {
  const destroyed = weapon.destroyed;
  // Reasoning: ammoRemaining of -1 means energy weapon (unlimited).
  // Anything > 0 has ammo. Exactly 0 is empty. The lookup defaults to
  // -1 in the parent so weapons without bins are treated as energy.
  const noAmmo = ammoRemaining === 0;
  const outOfRange =
    rangeToTarget > weapon.longRange ||
    (weapon.minRange > 0 && rangeToTarget < weapon.minRange);

  const disabled = destroyed || noAmmo || outOfRange;

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
        <RangeBadge label="S" range={weapon.shortRange} />
        <RangeBadge label="M" range={weapon.mediumRange} />
        <RangeBadge label="L" range={weapon.longRange} />
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
          <StatusBadge
            label="Out of range"
            testid={`weapon-out-of-range-${weapon.id}`}
            tone="amber"
          />
        )}
      </div>
      {showPreview && <PreviewColumns weaponId={weapon.id} preview={preview} />}
    </li>
  );
}

/**
 * Per `add-what-if-to-hit-preview` § 8.1 / § 7.4: header toggle.
 * Renders only when `onTogglePreview` is wired so the legacy callers
 * (smoke tests that just want the checkbox grid) keep their compact
 * layout. Pure UI — never fires events.
 */
interface PreviewToggleProps {
  enabled: boolean;
  onToggle: (next: boolean) => void;
}

function PreviewToggle({
  enabled,
  onToggle,
}: PreviewToggleProps): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      data-testid="weapon-selector-preview-toggle"
      className={`min-h-[32px] rounded px-3 py-1 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
        enabled
          ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          : 'text-text-theme-secondary bg-gray-200 hover:bg-gray-300 focus:ring-gray-400'
      }`}
    >
      Preview Damage: {enabled ? 'ON' : 'OFF'}
    </button>
  );
}

export function WeaponSelector({
  weapons,
  rangeToTarget,
  selectedWeaponIds,
  ammo,
  onToggle,
  attacker = null,
  target = null,
  previewEnabled = false,
  onTogglePreview,
  className = '',
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
      const outOfRange =
        rangeToTarget > w.longRange ||
        (w.minRange > 0 && rangeToTarget < w.minRange);
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

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-testid="weapon-selector"
    >
      {onTogglePreview && (
        <header
          className="flex items-center justify-between"
          data-testid="weapon-selector-header"
        >
          <span className="text-text-theme-secondary text-xs font-semibold uppercase">
            Weapons
          </span>
          <PreviewToggle enabled={previewEnabled} onToggle={onTogglePreview} />
        </header>
      )}
      <ul className="flex flex-col gap-2" data-testid="weapon-list">
        {weapons.map((weapon) => {
          // Default to -1 (energy / unlimited) when the unit has no
          // ammo entry — matches how `IAIUnitState.ammo` is shaped.
          const ammoRemaining = ammo[weapon.id] ?? -1;
          const preview = previews[weapon.id] ?? null;
          return (
            <WeaponRow
              key={weapon.id}
              weapon={weapon}
              rangeToTarget={rangeToTarget}
              selected={selectedWeaponIds.includes(weapon.id)}
              ammoRemaining={ammoRemaining}
              onToggle={() => onToggle(weapon.id)}
              preview={preview}
              showPreview={previewEnabled && Boolean(attacker && target)}
            />
          );
        })}
      </ul>
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
