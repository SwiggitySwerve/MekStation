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

import {
  ZERO_PREVIEW,
  type IAttackPreview,
} from '@/utils/gameplay/toHit/preview';

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

export { PreviewColumns };
