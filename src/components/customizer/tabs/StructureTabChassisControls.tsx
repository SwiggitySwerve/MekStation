import React from 'react';

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
    <div className={cs.layout.field}>
      <label className={cs.text.label}>Tonnage</label>
      <div className={cs.layout.rowGap}>
        <button
          onClick={() => onChange(tonnage - BATTLEMECH_TONNAGE.step)}
          disabled={readOnly || tonnage <= BATTLEMECH_TONNAGE.min}
          className={cs.button.stepperMd}
        >
          -
        </button>
        <input
          type="number"
          value={tonnage}
          onChange={(e) =>
            onChange(parseInt(e.target.value, 10) || BATTLEMECH_TONNAGE.min)
          }
          disabled={readOnly}
          min={BATTLEMECH_TONNAGE.min}
          max={BATTLEMECH_TONNAGE.max}
          step={BATTLEMECH_TONNAGE.step}
          className={`w-20 ${cs.input.base} text-center ${cs.input.noSpinners}`}
        />
        <button
          onClick={() => onChange(tonnage + BATTLEMECH_TONNAGE.step)}
          disabled={readOnly || tonnage >= BATTLEMECH_TONNAGE.max}
          className={cs.button.stepperMd}
        >
          +
        </button>
      </div>
      {isSuperheavy && (
        <div className="mt-1 rounded border border-amber-600/40 bg-amber-900/20 px-2 py-1 text-xs text-amber-300">
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
    <>
      <LabeledSelect
        label="Engine"
        meta={`${calculations.engineWeight}t / ${calculations.engineSlots} slots`}
        disabled={readOnly}
        value={engineType}
        options={filteredOptions.engines}
        onChange={handleEngineTypeChange}
      />
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
    </>
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
  return (
    <div className={cs.layout.field}>
      <div className={cs.layout.rowBetween}>
        <label className={cs.text.label}>{label}</label>
        <span className={cs.text.secondary}>{meta}</span>
      </div>
      <select
        className={cs.select.compact}
        disabled={disabled}
        value={value}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.type} value={option.type}>
            {option.name}
          </option>
        ))}
      </select>
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
    <div className={cs.layout.divider}>
      <div className={cs.layout.rowBetween}>
        <span className={`text-sm ${cs.text.label}`}>Engine Rating</span>
        <span
          className={`text-sm ${isAtMaxEngineRating ? 'text-accent font-bold' : cs.text.valueHighlight}`}
        >
          {engineRating}
          {isAtMaxEngineRating && ' (MAX)'}
        </span>
      </div>
      {isAtMaxEngineRating && (
        <p className="text-accent mt-1 text-xs">
          Warning: Maximum engine rating reached. Cannot increase Walk MP
          further.
        </p>
      )}
    </div>
  );
}
