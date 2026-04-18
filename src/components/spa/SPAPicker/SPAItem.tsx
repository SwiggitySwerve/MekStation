/**
 * SPAItem — single row in the SPA picker list.
 *
 * Renders the SPA's display name, description, source/category badges,
 * and an XP-cost label whose styling depends on the picker `mode`.
 *
 * Designation flow (Wave 1, stub):
 *   - When the row's SPA has `requiresDesignation === true`, clicking
 *     "Select" reveals an inline designation form with a `<select>`
 *     populated from `getDesignationOptions(spa)`. Confirm emits
 *     `{ kind, value }`; Cancel restores the row to its idle state.
 *   - When no designation is required, "Select" emits immediately.
 *
 * Wave 2b replaces the `<select>` with real designation UI sourced from
 * the equipment + terrain catalogs.
 */

import React, { useState } from 'react';

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
  const designationOptions = getDesignationOptions(spa);
  const [chosen, setChosen] = useState<string>(designationOptions[0] ?? '');

  const colorSlug = SPA_CATEGORY_COLORS[spa.category] ?? 'slate';
  const categoryLabel = SPA_CATEGORY_LABELS[spa.category] ?? spa.category;
  const disabled = excluded || (mode === 'purchase' && unaffordable);

  /**
   * Click handler for the primary Select button. When a designation is
   * required, reveal the inline form instead of emitting immediately.
   */
  const handleSelectClick = (): void => {
    if (disabled) return;
    if (spa.requiresDesignation && designationOptions.length > 0) {
      setDesignating(true);
      return;
    }
    onSelect(spa);
  };

  /** Confirm the designation and emit the selection. */
  const handleConfirm = (): void => {
    onSelect(spa, {
      kind: spa.designationType ?? 'unknown',
      value: chosen,
    });
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
          <label
            htmlFor={`designation-${spa.id}`}
            className="text-text-theme-muted text-xs font-medium tracking-wide uppercase"
          >
            Designation
          </label>
          <select
            id={`designation-${spa.id}`}
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
            className="border-border-theme-subtle bg-surface-raised text-text-theme-primary rounded border px-2 py-1 text-sm"
          >
            {designationOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
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
