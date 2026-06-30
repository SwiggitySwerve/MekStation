import React from 'react';

import type { StructureTabCalculations } from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';

interface StructureOption {
  readonly type: string;
  readonly name: string;
}

export function HeatSinkSection({
  readOnly,
  isOmni,
  heatSinkType,
  heatSinkCount,
  baseChassisHeatSinks,
  calculations,
  heatSinkOptions,
  handleHeatSinkTypeChange,
  handleHeatSinkCountChange,
  handleBaseChassisHeatSinksChange,
}: {
  readonly readOnly: boolean;
  readonly isOmni: boolean;
  readonly heatSinkType: string;
  readonly heatSinkCount: number;
  readonly baseChassisHeatSinks: number;
  readonly calculations: StructureTabCalculations;
  readonly heatSinkOptions: readonly StructureOption[];
  readonly handleHeatSinkTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleHeatSinkCountChange: (newCount: number) => void;
  readonly handleBaseChassisHeatSinksChange: (newCount: number) => void;
}): React.ReactElement {
  return (
    <div className={`${cs.layout.divider} mt-2`}>
      <div className={cs.layout.rowBetween}>
        <h4 className="text-sm font-semibold text-slate-300">Heat Sinks</h4>
        <span className={cs.text.secondary}>
          {calculations.heatSinkWeight}t / {calculations.heatSinkSlots} slots
        </span>
      </div>

      <HeatSinkCountControl
        readOnly={readOnly}
        heatSinkType={heatSinkType}
        heatSinkCount={heatSinkCount}
        heatSinkOptions={heatSinkOptions}
        handleHeatSinkTypeChange={handleHeatSinkTypeChange}
        handleHeatSinkCountChange={handleHeatSinkCountChange}
      />

      <HeatSinkStats calculations={calculations} />

      {isOmni && (
        <BaseChassisHeatSinkControl
          readOnly={readOnly}
          heatSinkCount={heatSinkCount}
          baseChassisHeatSinks={baseChassisHeatSinks}
          integralHeatSinks={calculations.integralHeatSinks}
          onChange={handleBaseChassisHeatSinksChange}
        />
      )}
    </div>
  );
}

function HeatSinkCountControl({
  readOnly,
  heatSinkType,
  heatSinkCount,
  heatSinkOptions,
  handleHeatSinkTypeChange,
  handleHeatSinkCountChange,
}: {
  readonly readOnly: boolean;
  readonly heatSinkType: string;
  readonly heatSinkCount: number;
  readonly heatSinkOptions: readonly StructureOption[];
  readonly handleHeatSinkTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleHeatSinkCountChange: (newCount: number) => void;
}): React.ReactElement {
  return (
    <div className="mt-2 flex items-center gap-3">
      <select
        className={`${cs.select.compact} flex-1`}
        disabled={readOnly}
        value={heatSinkType}
        onChange={handleHeatSinkTypeChange}
        data-testid="structure-heat-sink-type"
      >
        {heatSinkOptions.map((hs) => (
          <option key={hs.type} value={hs.type}>
            {hs.name}
          </option>
        ))}
      </select>
      <div className="flex items-center">
        <button
          onClick={() => handleHeatSinkCountChange(heatSinkCount - 1)}
          disabled={readOnly || heatSinkCount <= 10}
          className={cs.button.stepperLeft}
          data-testid="structure-heat-sink-decrement"
        >
          -
        </button>
        <input
          type="number"
          value={heatSinkCount}
          onChange={(e) =>
            handleHeatSinkCountChange(parseInt(e.target.value, 10) || 10)
          }
          disabled={readOnly}
          min={10}
          className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
          data-testid="structure-heat-sink-count"
        />
        <button
          onClick={() => handleHeatSinkCountChange(heatSinkCount + 1)}
          disabled={readOnly}
          className={cs.button.stepperRight}
          data-testid="structure-heat-sink-increment"
        >
          +
        </button>
      </div>
    </div>
  );
}

function HeatSinkStats({
  calculations,
}: {
  readonly calculations: StructureTabCalculations;
}): React.ReactElement {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      <div className="bg-surface-deep/50 rounded p-2">
        <div className={`text-lg font-bold ${cs.text.valuePositive}`}>
          {calculations.integralHeatSinks}
        </div>
        <div className="text-text-theme-muted text-[10px]">Free</div>
      </div>
      <div className="bg-surface-deep/50 rounded p-2">
        <div
          className={`text-lg font-bold ${calculations.externalHeatSinks > 0 ? cs.text.valueWarning : cs.text.value}`}
        >
          {calculations.externalHeatSinks}
        </div>
        <div className="text-text-theme-muted text-[10px]">External</div>
      </div>
      <div className="bg-surface-deep/50 rounded p-2">
        <div className={`text-lg font-bold ${cs.text.valueHighlight}`}>
          {calculations.totalHeatDissipation}
        </div>
        <div className="text-text-theme-muted text-[10px]">Dissipation</div>
      </div>
    </div>
  );
}

function BaseChassisHeatSinkControl({
  readOnly,
  heatSinkCount,
  baseChassisHeatSinks,
  integralHeatSinks,
  onChange,
}: {
  readonly readOnly: boolean;
  readonly heatSinkCount: number;
  readonly baseChassisHeatSinks: number;
  readonly integralHeatSinks: number;
  readonly onChange: (newCount: number) => void;
}): React.ReactElement {
  const displayedCount =
    baseChassisHeatSinks === -1 ? integralHeatSinks : baseChassisHeatSinks;

  return (
    <div className="border-border-theme-subtle mt-3 border-t pt-3">
      <div className={cs.layout.rowBetween}>
        <label className={cs.text.label}>Base Chassis Heat Sinks</label>
        <span className={cs.text.secondary}>
          {baseChassisHeatSinks === -1
            ? 'Auto'
            : `${baseChassisHeatSinks} fixed`}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => onChange(-1)}
          disabled={readOnly}
          className={`rounded px-2 py-1 text-xs ${
            baseChassisHeatSinks === -1
              ? 'bg-accent text-white'
              : 'bg-surface-deep text-text-theme-muted hover:bg-surface-hover'
          }`}
        >
          Auto
        </button>
        <div className="flex flex-1 items-center">
          <button
            onClick={() => onChange(displayedCount - 1)}
            disabled={readOnly || baseChassisHeatSinks <= 1}
            className={cs.button.stepperLeft}
          >
            -
          </button>
          <input
            type="number"
            value={displayedCount}
            onChange={(e) => onChange(parseInt(e.target.value, 10) || 10)}
            disabled={readOnly}
            min={1}
            max={heatSinkCount}
            className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
          />
          <button
            onClick={() => onChange(displayedCount + 1)}
            disabled={
              readOnly ||
              (baseChassisHeatSinks !== -1 &&
                baseChassisHeatSinks >= heatSinkCount)
            }
            className={cs.button.stepperRight}
          >
            +
          </button>
        </div>
      </div>
      <p className="text-text-theme-muted mt-1 text-[10px]">
        Heat sinks permanently fixed to the base chassis (cannot be pod-mounted)
      </p>
    </div>
  );
}
