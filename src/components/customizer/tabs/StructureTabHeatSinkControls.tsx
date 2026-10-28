import React from 'react';

import { formatTons } from '@/utils/formatting';

import type { StructureTabCalculations } from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';
import {
  STRUCTURE_HELP,
  STRUCTURE_CONTROL_WIDTH,
  STRUCTURE_META_END,
  STRUCTURE_ROW_GRID,
  STRUCTURE_ROW_LABEL,
  STRUCTURE_ROW_STACK,
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
    <div className={STRUCTURE_ROW_STACK}>
      <HeatSinkCountControl
        readOnly={readOnly}
        heatSinkType={heatSinkType}
        heatSinkCount={heatSinkCount}
        heatSinkOptions={heatSinkOptions}
        handleHeatSinkTypeChange={handleHeatSinkTypeChange}
        handleHeatSinkCountChange={handleHeatSinkCountChange}
      />

      {/* Two lines: where the heat sinks sit, then what they weigh. Helper
          text uses the 13px helper step of the other Structure rows. */}
      <div
        className="text-text-theme-secondary space-y-0.5 text-[13px] leading-snug"
        data-testid="structure-heat-sink-weight-help"
      >
        <p className="m-0">
          {heatSinkCount} heat sinks {'\u00b7'} {calculations.integralHeatSinks}{' '}
          fit inside the engine, {calculations.externalHeatSinks} mounted
          outside
        </p>
        {/* The extras clause only when some heat sinks carry weight, so a
            blank unit never reads "0 add 0.0 t". */}
        <p className="m-0">
          First {calculations.freeHeatSinks} weigh nothing
          {calculations.heatSinksRequiringWeight > 0 &&
            `; ${calculations.heatSinksRequiringWeight} add ${formatTons(calculations.heatSinkWeight)}`}
        </p>
      </div>

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
    <div className={STRUCTURE_ROW_STACK}>
      <div className={STRUCTURE_ROW_GRID}>
        <label className={STRUCTURE_ROW_LABEL} htmlFor="heat-sink-type">
          Heat Sink Type
        </label>
        <select
          id="heat-sink-type"
          className={STRUCTURE_SELECT}
          disabled={readOnly}
          aria-label="Heat Sink Type"
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
  return (
    <p
      className="m-0 flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 text-right"
      data-testid="structure-heat-sink-stats"
    >
      <span className="inline-flex items-baseline gap-1">
        <span className={`text-sm font-semibold tabular-nums ${cs.text.value}`}>
          {calculations.totalHeatDissipation}
        </span>
        <span className={cs.text.secondary}>dissipation</span>
      </span>
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
          Base Chassis
        </label>
        <div className={`flex items-center gap-2 ${STRUCTURE_CONTROL_WIDTH}`}>
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
        <span className={STRUCTURE_META_END}>
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
