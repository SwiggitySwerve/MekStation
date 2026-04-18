/**
 * SPAItem — single row in the SPA picker list.
 *
 * Renders the SPA's display name, description, source/category badges,
 * and an XP-cost label whose styling depends on the picker `mode`.
 *
 * Designation flow (Wave 2b — typed):
 *   - When the SPA needs a designation, clicking "Select" reveals an
 *     inline form whose control varies per designation kind:
 *       * weapon_type / weapon_category / range_bracket / terrain / skill
 *         → `<select>` populated from the live registry
 *       * target → no select; an inline notice explains that the unit
 *         will be assigned later from the unit-card UI. The selection
 *         emits a `target` designation with empty `targetUnitId` so the
 *         purchase still completes.
 *   - When no designation is required, "Select" emits immediately.
 *
 * The emitted designation is the typed `ISPADesignation` variant whose
 * `kind` matches the SPA's `designationType`. The picker no longer
 * fabricates an `'unknown'` kind — SPAs that lack `designationType`
 * fall through to the no-designation branch.
 */

import React, { useState } from 'react';

import type {
  ISPADesignation,
  SPARangeBracket,
  SPAWeaponCategory,
} from '@/types/pilot/SPADesignation';
import type { ISPADefinition } from '@/types/spa/SPADefinition';

import {
  getDesignationOptions,
  SPA_CATEGORY_COLORS,
  SPA_CATEGORY_LABELS,
  type SPADesignation,
  type SPAPickerMode,
} from './types';

interface SPAItemProps {
  spa: ISPADefinition;
  mode: SPAPickerMode;
  /** True when the pilot already owns this SPA — disables Select. */
  excluded: boolean;
  /** True when the pilot can't afford this SPA in `purchase` mode. */
  unaffordable: boolean;
  /** Fires after Select (and Confirm if a designation was needed). */
  onSelect: (spa: ISPADefinition, designation?: SPADesignation) => void;
}

/**
 * Render one SPA row. Keeps designation state local — once Confirm fires
 * the parent owns the result.
 */
export function SPAItem({
  spa,
  mode,
  excluded,
  unaffordable,
  onSelect,
}: SPAItemProps): React.ReactElement {
  // Local designation-prompt state. Only matters when the SPA needs one.
  const [designating, setDesignating] = useState(false);
  const optionSet = getDesignationOptions(spa);
  const firstValue = optionSet.options[0]?.value ?? '';
  const [chosenValue, setChosenValue] = useState<string>(firstValue);

  const colorSlug = SPA_CATEGORY_COLORS[spa.category] ?? 'slate';
  const categoryLabel = SPA_CATEGORY_LABELS[spa.category] ?? spa.category;
  const disabled = excluded || (mode === 'purchase' && unaffordable);

  // True when this SPA needs a designation prompt that the picker can
  // actually render (either real options or the deferred `target` notice).
  const needsPrompt =
    spa.requiresDesignation &&
    optionSet.kind !== null &&
    (optionSet.options.length > 0 || optionSet.deferred);

  /**
   * Click handler for the primary Select button. When a designation is
   * required and the registry can render a prompt, reveal the inline
   * form; otherwise emit immediately.
   */
  const handleSelectClick = (): void => {
    if (disabled) return;
    if (needsPrompt) {
      setDesignating(true);
      return;
    }
    onSelect(spa);
  };

  /**
   * Build the typed designation payload for the user's selection. Returns
   * `null` when the SPA's kind doesn't map to any variant (defensive —
   * shouldn't happen with the canonical catalog).
   */
  const buildDesignation = (): ISPADesignation | null => {
    const kind = optionSet.kind;
    if (!kind) return null;

    // Deferred target binding — no select to read; we emit a placeholder
    // designation so the SPA is still purchasable. The real unit binding
    // happens later from the unit-card UI.
    if (kind === 'target') {
      return {
        kind: 'target',
        targetUnitId: '',
        displayLabel: 'To be assigned',
      };
    }

    const opt = optionSet.options.find((o) => o.value === chosenValue);
    if (!opt) return null;

    switch (kind) {
      case 'weapon_type':
        return {
          kind: 'weapon_type',
          weaponTypeId: opt.value,
          displayLabel: opt.label,
        };
      case 'weapon_category':
        return {
          kind: 'weapon_category',
          category: opt.value as SPAWeaponCategory,
          displayLabel: opt.label,
        };
      case 'range_bracket':
        return {
          kind: 'range_bracket',
          bracket: opt.value as SPARangeBracket,
          displayLabel: opt.label,
        };
      case 'terrain':
        return {
          kind: 'terrain',
          terrainTypeId: opt.value,
          displayLabel: opt.label,
        };
      case 'skill':
        return {
          kind: 'skill',
          skillId: opt.value,
          displayLabel: opt.label,
        };
      default: {
        // Exhaustiveness — adding a new kind without updating this switch
        // is a compile error.
        const _exhaustive: never = kind;
        void _exhaustive;
        return null;
      }
    }
  };

  /** Confirm the designation and emit the selection. */
  const handleConfirm = (): void => {
    const designation = buildDesignation();
    if (designation) {
      onSelect(spa, designation);
    } else {
      // Defensive fallback — if we couldn't build a typed payload, emit
      // the bare selection and let the service layer reject it.
      onSelect(spa);
    }
    setDesignating(false);
  };

  /** Render the XP-cost label appropriate for the current mode + spa flags. */
  const renderCostBadge = (): React.ReactElement => {
    if (spa.isFlaw && spa.xpCost !== null) {
      // Flaws GRANT XP — show a positive "+N XP" label.
      return (
        <span className="rounded bg-emerald-900/30 px-2 py-0.5 text-xs font-semibold text-emerald-300">
          +{Math.abs(spa.xpCost)} XP
        </span>
      );
    }
    if (spa.xpCost === null) {
      return (
        <span className="rounded bg-slate-700/50 px-2 py-0.5 text-xs font-semibold text-slate-200">
          {spa.isOriginOnly ? 'Origin-Only' : 'No XP'}
        </span>
      );
    }
    const colorClass =
      mode === 'purchase' && unaffordable
        ? 'bg-red-900/30 text-red-300'
        : 'bg-accent/20 text-accent';
    return (
      <span
        className={`rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${colorClass}`}
      >
        {spa.xpCost} XP
      </span>
    );
  };

  return (
    <li
      data-testid={`spa-item-${spa.id}`}
      className={`flex flex-col gap-2 rounded-lg border p-3 transition-colors ${
        disabled
          ? 'border-border-theme-subtle/40 bg-surface-raised/20 opacity-60'
          : 'border-border-theme-subtle bg-surface-raised/40 hover:border-accent/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-label={`Category: ${categoryLabel}`}
              className={`inline-block h-2 w-2 rounded-full bg-${colorSlug}-400`}
            />
            <h4 className="text-text-theme-primary font-semibold">
              {spa.displayName}
            </h4>
            {spa.isOriginOnly && (
              <span className="rounded border border-amber-600/40 bg-amber-900/20 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-300 uppercase">
                Origin-Only
              </span>
            )}
            {spa.isFlaw && (
              <span className="rounded border border-rose-600/40 bg-rose-900/20 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-rose-300 uppercase">
                Flaw
              </span>
            )}
            <span
              aria-label={`Source: ${spa.source}`}
              className="border-border-theme-subtle bg-surface-base text-text-theme-secondary rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase"
            >
              {spa.source}
            </span>
          </div>
          <p className="text-text-theme-secondary mt-1 text-sm">
            {spa.description}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          {renderCostBadge()}
          {!designating && (
            <button
              type="button"
              onClick={handleSelectClick}
              disabled={disabled}
              className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                disabled
                  ? 'bg-surface-raised text-text-theme-muted cursor-not-allowed'
                  : 'bg-accent text-surface-base hover:bg-accent/90'
              }`}
            >
              {excluded ? 'Already owned' : 'Select'}
            </button>
          )}
        </div>
      </div>

      {designating && (
        <div
          role="group"
          aria-label="Choose designation"
          className="border-border-theme-subtle bg-surface-base flex flex-wrap items-center gap-2 rounded border p-2"
        >
          {optionSet.deferred ? (
            // Target designation: deferred binding. No select; the real
            // unit id is bound later from the unit-card UI.
            <p className="text-text-theme-secondary text-xs">
              Target will be assigned during play from the unit card.
            </p>
          ) : (
            <>
              <label
                htmlFor={`designation-${spa.id}`}
                className="text-text-theme-muted text-xs font-medium tracking-wide uppercase"
              >
                Designation
              </label>
              <select
                id={`designation-${spa.id}`}
                value={chosenValue}
                onChange={(e) => setChosenValue(e.target.value)}
                className="border-border-theme-subtle bg-surface-raised text-text-theme-primary rounded border px-2 py-1 text-sm"
              >
                {optionSet.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setDesignating(false)}
              className="text-text-theme-secondary hover:text-text-theme-primary rounded px-2 py-1 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="bg-accent text-surface-base hover:bg-accent/90 rounded px-3 py-1 text-xs font-semibold"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default SPAItem;
