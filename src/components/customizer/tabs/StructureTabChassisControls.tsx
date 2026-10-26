import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { BATTLEMECH_TONNAGE } from '@/services/construction/constructionConstants';

import type {
  StructureTabCalculations,
  StructureTabFilteredOptions,
} from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';

interface StructureOption {
  readonly type: string;
  readonly name: string;
}

interface ChassisSelectHandlers {
  readonly handleEngineTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleGyroTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleStructureTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleCockpitTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
}

/**
 * One row template for every Chassis control: label | control | meta. Each row
 * is its own grid, so they all share this template to keep every control's
 * left edge (steppers and selects) on the same vertical line.
 */
export const CHASSIS_ROW_GRID =
  'grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(6rem,1fr)_minmax(0,1.35fr)_minmax(5rem,0.8fr)]';

/** Meta text sits under the control on narrow cards, in its own column on wide. */
export const CHASSIS_ROW_META = 'col-start-2 sm:col-start-auto sm:text-right';

export function TonnageControl({
  readOnly,
  tonnage,
  isSuperheavy,
  onChange,
}: {
  readonly readOnly: boolean;
  readonly tonnage: number;
  readonly isSuperheavy: boolean;
  readonly onChange: (newTonnage: number) => void;
}): React.ReactElement {
  return (
    <div className={CHASSIS_ROW_GRID}>
      <label className={`${cs.text.label} font-medium`} htmlFor="tonnage">
        Tonnage
      </label>
      <div className="flex items-center justify-self-start">
        <button
          type="button"
          onClick={() => onChange(tonnage - BATTLEMECH_TONNAGE.step)}
          disabled={readOnly || tonnage <= BATTLEMECH_TONNAGE.min}
          className={cs.button.stepperLeft}
          aria-label="Decrease tonnage"
        >
          <AppIcon name="remove" size="inline" aria-hidden="true" />{' '}
        </button>
        <input
          id="tonnage"
          type="number"
          aria-label="Tonnage"
          value={tonnage}
          onChange={(e) =>
            onChange(parseInt(e.target.value, 10) || BATTLEMECH_TONNAGE.min)
          }
          disabled={readOnly}
          min={BATTLEMECH_TONNAGE.min}
          max={BATTLEMECH_TONNAGE.max}
          step={BATTLEMECH_TONNAGE.step}
          className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
        />
        <button
          type="button"
          onClick={() => onChange(tonnage + BATTLEMECH_TONNAGE.step)}
          disabled={readOnly || tonnage >= BATTLEMECH_TONNAGE.max}
          className={cs.button.stepperRight}
          aria-label="Increase tonnage"
        >
          {' '}
          <AppIcon name="add" size="inline" aria-hidden="true" />
        </button>
      </div>
      <span className={`${cs.text.secondary} ${CHASSIS_ROW_META} tabular-nums`}>
        {BATTLEMECH_TONNAGE.min}–{BATTLEMECH_TONNAGE.max}t
      </span>
      {isSuperheavy && (
        <div className="col-span-full rounded border border-amber-600/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
          Superheavy: double-slot crits, SUPERHEAVY cockpit/gyro required
        </div>
      )}
    </div>
  );
}

export function SystemSelects({
  readOnly,
  calculations,
  filteredOptions,
  engineType,
  gyroType,
  internalStructureType,
  cockpitType,
  handleEngineTypeChange,
  handleGyroTypeChange,
  handleStructureTypeChange,
  handleCockpitTypeChange,
}: {
  readonly readOnly: boolean;
  readonly calculations: StructureTabCalculations;
  readonly filteredOptions: StructureTabFilteredOptions;
  readonly engineType: string;
  readonly gyroType: string;
  readonly internalStructureType: string;
  readonly cockpitType: string;
} & ChassisSelectHandlers): React.ReactElement {
  return (
    <div className="space-y-4">
      <section aria-labelledby="drive-system-heading">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h4 id="drive-system-heading" className={cs.text.subsection}>
            Drive system
          </h4>
          <span className={cs.text.secondary}>Engine output and balance</span>
        </div>
        <LabeledSelect
          label="Engine"
          meta={`${calculations.engineWeight}t / ${calculations.engineSlots} slots`}
          disabled={readOnly}
          value={engineType}
          options={filteredOptions.engines}
          onChange={handleEngineTypeChange}
        />
      </section>

      <section aria-labelledby="chassis-systems-heading">
        <h4
          id="chassis-systems-heading"
          className={`${cs.text.subsection} mb-2`}
        >
          Chassis systems
        </h4>
        <div className="space-y-2">
          <LabeledSelect
            label="Gyro"
            meta={`${calculations.gyroWeight}t / ${calculations.gyroSlots} slots`}
            disabled={readOnly}
            value={gyroType}
            options={filteredOptions.gyros}
            onChange={handleGyroTypeChange}
          />
          <LabeledSelect
            label="Structure"
            meta={`${calculations.structureWeight}t / ${calculations.structureSlots} slots`}
            disabled={readOnly}
            value={internalStructureType}
            options={filteredOptions.structures}
            onChange={handleStructureTypeChange}
          />
          <LabeledSelect
            label="Cockpit"
            meta={`${calculations.cockpitWeight}t / ${calculations.cockpitSlots} slots`}
            disabled={readOnly}
            value={cockpitType}
            options={filteredOptions.cockpits}
            onChange={handleCockpitTypeChange}
          />
        </div>
      </section>
    </div>
  );
}

function LabeledSelect({
  label,
  meta,
  disabled,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly meta: string;
  readonly disabled: boolean;
  readonly value: string;
  readonly options: readonly StructureOption[];
  readonly onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}): React.ReactElement {
  const id = `${label.toLowerCase()}-select`;

  return (
    <div className={CHASSIS_ROW_GRID}>
      <label className={`${cs.text.label} font-medium`} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={cs.select.full}
        disabled={disabled}
        aria-label={label}
        value={value}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.type} value={option.type}>
            {option.name}
          </option>
        ))}
      </select>
      <span className={`${cs.text.secondary} ${CHASSIS_ROW_META} tabular-nums`}>
        {meta}
      </span>
    </div>
  );
}

export function EngineRatingSummary({
  engineRating,
  isAtMaxEngineRating,
}: {
  readonly engineRating: number;
  readonly isAtMaxEngineRating: boolean;
}): React.ReactElement {
  return (
    <div
      className={`${CHASSIS_ROW_GRID} border-border-theme-subtle border-t pt-3`}
    >
      <span className={`text-sm ${cs.text.label}`}>Engine Rating</span>
      <span
        className={`text-sm tabular-nums ${isAtMaxEngineRating ? 'text-accent font-bold' : cs.text.value}`}
      >
        {engineRating}
      </span>
      <span className={`${cs.text.secondary} ${CHASSIS_ROW_META}`}>
        {isAtMaxEngineRating ? 'Maximum' : 'Derived'}
      </span>
      {isAtMaxEngineRating && (
        <p className="text-accent col-span-full text-xs">
          Warning: Maximum engine rating reached. Cannot increase Walk MP
          further.
        </p>
      )}
    </div>
  );
}
