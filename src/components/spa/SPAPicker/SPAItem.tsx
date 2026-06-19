/**
 * SPAItem - single row in the SPA picker list.
 *
 * Renders the SPA display name, designation prompt, source/category badges,
 * and XP-cost label for browse or purchase mode.
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
  /** True when the pilot already owns this SPA; disables Select. */
  excluded: boolean;
  /** True when the pilot cannot afford this SPA in purchase mode. */
  unaffordable: boolean;
  /** Fires after Select, and after Confirm when designation is needed. */
  onSelect: (spa: ISPADefinition, designation?: SPADesignation) => void;
}

type DesignationOptionSet = ReturnType<typeof getDesignationOptions>;

interface ISPAItemPresentation {
  readonly colorSlug: string;
  readonly categoryLabel: string;
  readonly disabled: boolean;
  readonly needsPrompt: boolean;
}

function getSPAItemPresentation(
  spa: ISPADefinition,
  mode: SPAPickerMode,
  excluded: boolean,
  unaffordable: boolean,
  optionSet: DesignationOptionSet,
): ISPAItemPresentation {
  return {
    colorSlug: SPA_CATEGORY_COLORS[spa.category] ?? 'slate',
    categoryLabel: SPA_CATEGORY_LABELS[spa.category] ?? spa.category,
    disabled: excluded || (mode === 'purchase' && unaffordable),
    needsPrompt:
      spa.requiresDesignation &&
      optionSet.kind !== null &&
      (optionSet.options.length > 0 || optionSet.deferred),
  };
}

function buildDesignation(
  optionSet: DesignationOptionSet,
  chosenValue: string,
): ISPADesignation | null {
  const kind = optionSet.kind;
  if (!kind) return null;

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
      const _exhaustive: never = kind;
      void _exhaustive;
      return null;
    }
  }
}

function SPACostBadge({
  spa,
  mode,
  unaffordable,
}: {
  readonly spa: ISPADefinition;
  readonly mode: SPAPickerMode;
  readonly unaffordable: boolean;
}): React.ReactElement {
  if (spa.isFlaw && spa.xpCost !== null) {
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
}

function SPAHeader({
  spa,
  presentation,
}: {
  readonly spa: ISPADefinition;
  readonly presentation: ISPAItemPresentation;
}): React.ReactElement {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-label={`Category: ${presentation.categoryLabel}`}
          className={`inline-block h-2 w-2 rounded-full bg-${presentation.colorSlug}-400`}
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
  );
}

function SPASelectAction({
  excluded,
  disabled,
  onSelectClick,
}: {
  readonly excluded: boolean;
  readonly disabled: boolean;
  readonly onSelectClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelectClick}
      disabled={disabled}
      className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
        disabled
          ? 'bg-surface-raised text-text-theme-muted cursor-not-allowed'
          : 'bg-accent text-surface-base hover:bg-accent/90'
      }`}
    >
      {excluded ? 'Already owned' : 'Select'}
    </button>
  );
}

function SPADesignationPrompt({
  spaId,
  optionSet,
  chosenValue,
  onChosenValueChange,
  onCancel,
  onConfirm,
}: {
  readonly spaId: string;
  readonly optionSet: DesignationOptionSet;
  readonly chosenValue: string;
  readonly onChosenValueChange: (value: string) => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}): React.ReactElement {
  return (
    <div
      role="group"
      aria-label="Choose designation"
      className="border-border-theme-subtle bg-surface-base flex flex-wrap items-center gap-2 rounded border p-2"
    >
      {optionSet.deferred ? (
        <p className="text-text-theme-secondary text-xs">
          Target will be assigned during play from the unit card.
        </p>
      ) : (
        <>
          <label
            htmlFor={`designation-${spaId}`}
            className="text-text-theme-muted text-xs font-medium tracking-wide uppercase"
          >
            Designation
          </label>
          <select
            id={`designation-${spaId}`}
            value={chosenValue}
            onChange={(e) => onChosenValueChange(e.target.value)}
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
          onClick={onCancel}
          className="text-text-theme-secondary hover:text-text-theme-primary rounded px-2 py-1 text-xs font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="bg-accent text-surface-base hover:bg-accent/90 rounded px-3 py-1 text-xs font-semibold"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export function SPAItem({
  spa,
  mode,
  excluded,
  unaffordable,
  onSelect,
}: SPAItemProps): React.ReactElement {
  const [designating, setDesignating] = useState(false);
  const optionSet = getDesignationOptions(spa);
  const firstValue = optionSet.options[0]?.value ?? '';
  const [chosenValue, setChosenValue] = useState<string>(firstValue);
  const presentation = getSPAItemPresentation(
    spa,
    mode,
    excluded,
    unaffordable,
    optionSet,
  );

  const handleSelectClick = (): void => {
    if (presentation.disabled) return;
    if (presentation.needsPrompt) {
      setDesignating(true);
      return;
    }
    onSelect(spa);
  };

  const handleConfirm = (): void => {
    const designation = buildDesignation(optionSet, chosenValue);
    onSelect(spa, designation ?? undefined);
    setDesignating(false);
  };

  return (
    <li
      data-testid={`spa-item-${spa.id}`}
      className={`flex flex-col gap-2 rounded-lg border p-3 transition-colors ${
        presentation.disabled
          ? 'border-border-theme-subtle/40 bg-surface-raised/20 opacity-60'
          : 'border-border-theme-subtle bg-surface-raised/40 hover:border-accent/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <SPAHeader spa={spa} presentation={presentation} />
        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          <SPACostBadge spa={spa} mode={mode} unaffordable={unaffordable} />
          {!designating && (
            <SPASelectAction
              excluded={excluded}
              disabled={presentation.disabled}
              onSelectClick={handleSelectClick}
            />
          )}
        </div>
      </div>

      {designating && (
        <SPADesignationPrompt
          spaId={spa.id}
          optionSet={optionSet}
          chosenValue={chosenValue}
          onChosenValueChange={setChosenValue}
          onCancel={() => setDesignating(false)}
          onConfirm={handleConfirm}
        />
      )}
    </li>
  );
}

export default SPAItem;
