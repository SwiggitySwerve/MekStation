import React from 'react';

import { BATTLEMECH_TONNAGE } from '@/services/construction/constructionConstants';

import type {
  StructureConfigurationOption,
  StructureTabCalculations,
  StructureTabFilteredOptions,
} from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';
import {
  STRUCTURE_HELP,
  STRUCTURE_META_END,
  STRUCTURE_ROW_GRID,
  STRUCTURE_ROW_LABEL,
  STRUCTURE_SELECT,
} from './StructureTabRowLayout';
import { StructureStepper } from './StructureTabStepper';

/** "19t · 6 slots": a component's weight and critical-slot cost. */
function formatCostMeta(weight: number, slots: number): string {
  return `${weight}t · ${slots} ${slots === 1 ? 'slot' : 'slots'}`;
}

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
    <div className={STRUCTURE_ROW_GRID}>
      <label className={STRUCTURE_ROW_LABEL} htmlFor="tonnage">
        Tonnage
      </label>
      <StructureStepper
        id="tonnage"
        inputLabel="Tonnage"
        decreaseLabel="Decrease tonnage"
        increaseLabel="Increase tonnage"
        value={tonnage}
        min={BATTLEMECH_TONNAGE.min}
        max={BATTLEMECH_TONNAGE.max}
        step={BATTLEMECH_TONNAGE.step}
        disabled={readOnly}
        decreaseDisabled={tonnage <= BATTLEMECH_TONNAGE.min}
        increaseDisabled={tonnage >= BATTLEMECH_TONNAGE.max}
        describedBy="tonnage-help"
        onDecrease={() => onChange(tonnage - BATTLEMECH_TONNAGE.step)}
        onIncrease={() => onChange(tonnage + BATTLEMECH_TONNAGE.step)}
        onInputChange={(raw) =>
          onChange(parseInt(raw, 10) || BATTLEMECH_TONNAGE.min)
        }
      />
      <p id="tonnage-help" className={`${STRUCTURE_HELP} m-0`}>
        Range {BATTLEMECH_TONNAGE.min}&ndash;{BATTLEMECH_TONNAGE.max}t.
      </p>
      {isSuperheavy && (
        <div className="col-span-full rounded border border-amber-600/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
          Superheavy: double-slot crits, SUPERHEAVY cockpit/gyro required
        </div>
      )}
    </div>
  );
}
/**
 * Motive Type (biped, quad, ...) is chassis configuration, so it sits with
 * Tonnage in the Chassis card. Its warning stays attached to the control.
 */
export function MotiveTypeControl({
  readOnly,
  configuration,
  options,
  onChange,
}: {
  readonly readOnly: boolean;
  readonly configuration: string;
  readonly options: readonly StructureConfigurationOption[];
  readonly onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}): React.ReactElement {
  return (
    <div className={STRUCTURE_ROW_GRID}>
      <label className={STRUCTURE_ROW_LABEL} htmlFor="motive-type">
        Motive Type
      </label>
      <select
        id="motive-type"
        className={STRUCTURE_SELECT}
        disabled={readOnly}
        aria-label="Motive type"
        aria-describedby="configuration-change-help"
        value={configuration}
        onChange={onChange}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <p id="configuration-change-help" className={`${STRUCTURE_HELP} m-0`}>
        Changing configuration clears armor in removed locations and returns
        their equipment to unassigned.
      </p>
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
          meta={formatCostMeta(
            calculations.engineWeight,
            calculations.engineSlots,
          )}
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
            meta={formatCostMeta(
              calculations.gyroWeight,
              calculations.gyroSlots,
            )}
            disabled={readOnly}
            value={gyroType}
            options={filteredOptions.gyros}
            onChange={handleGyroTypeChange}
          />
          <LabeledSelect
            label="Structure"
            meta={formatCostMeta(
              calculations.structureWeight,
              calculations.structureSlots,
            )}
            disabled={readOnly}
            value={internalStructureType}
            options={filteredOptions.structures}
            onChange={handleStructureTypeChange}
          />
          <LabeledSelect
            label="Cockpit"
            meta={formatCostMeta(
              calculations.cockpitWeight,
              calculations.cockpitSlots,
            )}
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
    <div className={STRUCTURE_ROW_GRID}>
      <label className={STRUCTURE_ROW_LABEL} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={STRUCTURE_SELECT}
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
      <span className={STRUCTURE_META_END}>{meta}</span>
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
      className={`${STRUCTURE_ROW_GRID} border-border-theme-subtle border-t pt-3`}
    >
      <span className={`text-sm ${cs.text.label}`}>Engine Rating</span>
      <span
        className={`text-sm tabular-nums ${isAtMaxEngineRating ? 'text-accent font-bold' : cs.text.value}`}
      >
        {engineRating}
      </span>
      <span className={STRUCTURE_META_END}>
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
