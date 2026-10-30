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

import { AppIcon } from '@/components/ui/AppIcon';
import {
  previewAttackOutcome,
  type IAttackPreview,
} from '@/utils/gameplay/toHit/preview';

import type { WeaponSelectorProps } from './WeaponSelector.types';

import { bracketLabelForProjection } from './WeaponSelector.range';
import { WeaponRow } from './WeaponSelector.row';
import { PreviewToggle } from './WeaponSelectorPreviewToggle';

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
        remainingShots: ammo[w.id],
      });
    }
    return out;
  }, [previewEnabled, attacker, target, weapons, rangeToTarget, ammo]);

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
            <AppIcon name="chevron-right" size="inline" aria-hidden="true" />
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
        className="text-text-theme-secondary border-border-theme-subtle border-t pt-2 text-xs"
        data-testid="weapon-selector-total-heat"
      >
        Total heat if fired: <span className="font-semibold">+{totalHeat}</span>
      </div>
    </div>
  );
}
