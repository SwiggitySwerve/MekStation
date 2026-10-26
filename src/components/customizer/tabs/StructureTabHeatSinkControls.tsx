import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';

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
    <div className="space-y-3">
      <HeatSinkCountControl
        readOnly={readOnly}
        heatSinkType={heatSinkType}
        heatSinkCount={heatSinkCount}
        calculations={calculations}
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
  calculations,
  heatSinkOptions,
  handleHeatSinkTypeChange,
  handleHeatSinkCountChange,
}: {
  readonly readOnly: boolean;
  readonly heatSinkType: string;
  readonly heatSinkCount: number;
  readonly calculations: StructureTabCalculations;
  readonly heatSinkOptions: readonly StructureOption[];
  readonly handleHeatSinkTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleHeatSinkCountChange: (newCount: number) => void;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(6rem,1fr)_minmax(0,1.35fr)_minmax(5rem,0.8fr)] items-center gap-3">
        <label
          className={`${cs.text.label} font-medium`}
          htmlFor="heat-sink-type"
        >
          Heat sink type
        </label>
        <select
          id="heat-sink-type"
          className={cs.select.full}
          disabled={readOnly}
          aria-label="Heat sink type"
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
        <span aria-hidden="true" />
      </div>

      <div className="grid grid-cols-[minmax(6rem,1fr)_minmax(0,1.35fr)_minmax(5rem,0.8fr)] items-center gap-3">
        <label
          className={`${cs.text.label} font-medium`}
          htmlFor="heat-sink-count"
        >
          Installed
        </label>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => handleHeatSinkCountChange(heatSinkCount - 1)}
            disabled={readOnly || heatSinkCount <= 10}
            className={cs.button.stepperLeft}
            data-testid="structure-heat-sink-decrement"
            aria-label="Decrease heat sink count"
          >
            <AppIcon name="remove" size="inline" aria-hidden="true" />{' '}
          </button>
          <input
            id="heat-sink-count"
            type="number"
            aria-label="Heat sink count"
            value={heatSinkCount}
            onChange={(e) =>
              handleHeatSinkCountChange(parseInt(e.target.value, 10) || 10)
            }
            disabled={readOnly}
            min={10}
            className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
          />
          <button
            type="button"
            onClick={() => handleHeatSinkCountChange(heatSinkCount + 1)}
            disabled={readOnly}
            className={cs.button.stepperRight}
            data-testid="structure-heat-sink-increment"
            aria-label="Increase heat sink count"
          >
            {' '}
            <AppIcon name="add" size="inline" aria-hidden="true" />
          </button>
        </div>
        <span className={`${cs.text.secondary} text-right tabular-nums`}>
          {calculations.integralHeatSinks} fit in engine
        </span>
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
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="border-border-theme-subtle bg-surface-deep/50 rounded border px-2 py-2">
        <div
          className={`text-lg font-semibold tabular-nums ${cs.text.valuePositive}`}
        >
          {calculations.integralHeatSinks}
        </div>
        <div className="text-text-theme-secondary text-xs">In engine</div>
      </div>
      <div className="border-border-theme-subtle bg-surface-deep/50 rounded border px-2 py-2">
        <div
          className={`text-lg font-semibold tabular-nums ${calculations.externalHeatSinks > 0 ? cs.text.valueWarning : cs.text.value}`}
        >
          {calculations.externalHeatSinks}
        </div>
        <div className="text-text-theme-secondary text-xs">External</div>
      </div>
      <div className="border-border-theme-subtle bg-surface-deep/50 rounded border px-2 py-2">
        <div
          className={`text-lg font-semibold tabular-nums ${cs.text.valueHighlight}`}
        >
          {calculations.totalHeatDissipation}
        </div>
        <div className="text-text-theme-secondary text-xs">Dissipation</div>
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
    <div className="border-border-theme-subtle border-t pt-3">
      <div className="grid grid-cols-[minmax(6rem,1fr)_minmax(0,1.35fr)_minmax(5rem,0.8fr)] items-center gap-3">
        <label
          className={`${cs.text.label} font-medium`}
          htmlFor="base-chassis-heat-sinks"
        >
          Base chassis
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(-1)}
            disabled={readOnly}
            className={`border-border-theme min-h-11 rounded border px-3 py-1 text-xs font-medium ${
              baseChassisHeatSinks === -1
                ? 'bg-accent text-on-accent'
                : 'bg-surface-deep text-text-theme-muted hover:bg-surface-hover'
            }`}
            aria-label="Use automatic base chassis heat sinks"
          >
            Auto
          </button>
          <div className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => onChange(displayedCount - 1)}
              disabled={readOnly || baseChassisHeatSinks <= 1}
              className={cs.button.stepperLeft}
              aria-label="Decrease base chassis heat sinks"
            >
              <AppIcon name="remove" size="inline" aria-hidden="true" />{' '}
            </button>
            <input
              id="base-chassis-heat-sinks"
              type="number"
              aria-label="Base chassis heat sinks"
              value={displayedCount}
              onChange={(e) => onChange(parseInt(e.target.value, 10) || 10)}
              disabled={readOnly}
              min={1}
              max={heatSinkCount}
              className={`w-12 ${cs.input.number} border-y ${cs.input.noSpinners}`}
            />
            <button
              type="button"
              onClick={() => onChange(displayedCount + 1)}
              disabled={
                readOnly ||
                (baseChassisHeatSinks !== -1 &&
                  baseChassisHeatSinks >= heatSinkCount)
              }
              className={cs.button.stepperRight}
              aria-label="Increase base chassis heat sinks"
            >
              {' '}
              <AppIcon name="add" size="inline" aria-hidden="true" />
            </button>
          </div>
        </div>
        <span className={`${cs.text.secondary} text-right`}>
          {baseChassisHeatSinks === -1
            ? 'Auto'
            : `${baseChassisHeatSinks} fixed`}
        </span>
      </div>
      <p className="text-text-theme-muted mt-2 text-[10px]">
        Heat sinks permanently fixed to the base chassis (cannot be pod-mounted)
      </p>
    </div>
  );
}
