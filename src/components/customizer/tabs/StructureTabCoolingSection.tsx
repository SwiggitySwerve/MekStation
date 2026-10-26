import React from 'react';

import type {
  StructureTabCalculations,
  StructureTabFilteredOptions,
} from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';
import { HeatSinkSection, HeatSinkStats } from './StructureTabHeatSinkControls';
import { STRUCTURE_CARD } from './StructureTabRowLayout';

interface StructureTabCoolingSectionProps {
  readonly readOnly: boolean;
  readonly isOmni: boolean;
  readonly heatSinkType: string;
  readonly heatSinkCount: number;
  readonly baseChassisHeatSinks: number;
  readonly calculations: StructureTabCalculations;
  readonly filteredOptions: StructureTabFilteredOptions;
  readonly handleHeatSinkTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleHeatSinkCountChange: (newCount: number) => void;
  readonly handleBaseChassisHeatSinksChange: (newCount: number) => void;
}

/**
 * Cooling card: heat sink type and count on the same label / control / meta
 * grid as Chassis and Mobility. It sits under Mobility so the two columns stay
 * balanced.
 */
export function StructureTabCoolingSection({
  readOnly,
  isOmni,
  heatSinkType,
  heatSinkCount,
  baseChassisHeatSinks,
  calculations,
  filteredOptions,
  handleHeatSinkTypeChange,
  handleHeatSinkCountChange,
  handleBaseChassisHeatSinksChange,
}: StructureTabCoolingSectionProps): React.ReactElement {
  return (
    <section
      aria-labelledby="cooling-heading"
      className={`${cs.panel.main} ${STRUCTURE_CARD}`}
    >
      <div className="border-border-theme mb-4 border-b pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id="cooling-heading" className={cs.text.cardTitle}>
            Cooling
          </h3>
          <HeatSinkStats calculations={calculations} />
        </div>
        <p className={`${cs.text.secondary} mt-0.5`}>
          Heat sink type and how many are installed
        </p>
      </div>

      <HeatSinkSection
        readOnly={readOnly}
        isOmni={isOmni}
        heatSinkType={heatSinkType}
        heatSinkCount={heatSinkCount}
        baseChassisHeatSinks={baseChassisHeatSinks}
        calculations={calculations}
        heatSinkOptions={filteredOptions.heatSinks}
        handleHeatSinkTypeChange={handleHeatSinkTypeChange}
        handleHeatSinkCountChange={handleHeatSinkCountChange}
        handleBaseChassisHeatSinksChange={handleBaseChassisHeatSinksChange}
      />
    </section>
  );
}
