import React from 'react';

import type { StructureTabCalculations } from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';
import {
  STRUCTURE_HELP,
  STRUCTURE_META,
  STRUCTURE_ROW_GRID,
  STRUCTURE_ROW_LABEL,
  STRUCTURE_SELECT,
} from './StructureTabRowLayout';
import { StructureStepper } from './StructureTabStepper';

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
        heatSinkOptions={heatSinkOptions}
        handleHeatSinkTypeChange={handleHeatSinkTypeChange}
        handleHeatSinkCountChange={handleHeatSinkCountChange}
      />

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
    <div className="space-y-2">
      <div className={STRUCTURE_ROW_GRID}>
        <label className={STRUCTURE_ROW_LABEL} htmlFor="heat-sink-type">
          Heat sink type
        </label>
        <select
          id="heat-sink-type"
          className={STRUCTURE_SELECT}
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
      </div>

      <div className={STRUCTURE_ROW_GRID}>
        <label className={STRUCTURE_ROW_LABEL} htmlFor="heat-sink-count">
          Installed
        </label>
        <StructureStepper
          id="heat-sink-count"
          inputLabel="Heat sink count"
          decreaseLabel="Decrease heat sink count"
          increaseLabel="Increase heat sink count"
          value={heatSinkCount}
          min={10}
          disabled={readOnly}
          decreaseDisabled={heatSinkCount <= 10}
          increaseDisabled={false}
          decreaseTestId="structure-heat-sink-decrement"
          increaseTestId="structure-heat-sink-increment"
          onDecrease={() => handleHeatSinkCountChange(heatSinkCount - 1)}
          onIncrease={() => handleHeatSinkCountChange(heatSinkCount + 1)}
          onInputChange={(raw) =>
            handleHeatSinkCountChange(parseInt(raw, 10) || 10)
          }
        />
      </div>
    </div>
  );
}

/**
 * Compact cooling readout shown in the Cooling section header. Plain counts, so
 * no status colour; colour is reserved for state (over-budget, errors).
 */
export function HeatSinkStats({
  calculations,
}: {
  readonly calculations: StructureTabCalculations;
}): React.ReactElement {
  const stats: ReadonlyArray<{ label: string; value: number }> = [
    { label: 'in engine', value: calculations.integralHeatSinks },
    { label: 'external', value: calculations.externalHeatSinks },
    { label: 'dissipation', value: calculations.totalHeatDissipation },
  ];

  return (
    <p
      className="m-0 flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 text-right"
      data-testid="structure-heat-sink-stats"
    >
      {stats.map((stat, index) => (
        <React.Fragment key={stat.label}>
          {index > 0 && (
            <span className="text-text-theme-muted" aria-hidden="true">
              ·
            </span>
          )}
          <span className="inline-flex items-baseline gap-1">
            <span
              className={`text-sm font-semibold tabular-nums ${cs.text.value}`}
            >
              {stat.value}
            </span>
            <span className={cs.text.secondary}>{stat.label}</span>
          </span>
        </React.Fragment>
      ))}
    </p>
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
      <div className={STRUCTURE_ROW_GRID}>
        <label
          className={STRUCTURE_ROW_LABEL}
          htmlFor="base-chassis-heat-sinks"
        >
          Base chassis
        </label>
        <div className="flex w-full max-w-60 items-center gap-2">
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
          <StructureStepper
            id="base-chassis-heat-sinks"
            className="min-w-0 flex-1"
            inputLabel="Base chassis heat sinks"
            decreaseLabel="Decrease base chassis heat sinks"
            increaseLabel="Increase base chassis heat sinks"
            value={displayedCount}
            min={1}
            max={heatSinkCount}
            disabled={readOnly}
            decreaseDisabled={baseChassisHeatSinks <= 1}
            increaseDisabled={
              baseChassisHeatSinks !== -1 &&
              baseChassisHeatSinks >= heatSinkCount
            }
            onDecrease={() => onChange(displayedCount - 1)}
            onIncrease={() => onChange(displayedCount + 1)}
            onInputChange={(raw) => onChange(parseInt(raw, 10) || 10)}
          />{' '}
        </div>
        <span className={STRUCTURE_META}>
          {baseChassisHeatSinks === -1
            ? 'Auto'
            : `${baseChassisHeatSinks} fixed`}
        </span>
        <p className={`${STRUCTURE_HELP} m-0`}>
          Heat sinks permanently fixed to the base chassis (cannot be
          pod-mounted)
        </p>
      </div>
    </div>
  );
}
