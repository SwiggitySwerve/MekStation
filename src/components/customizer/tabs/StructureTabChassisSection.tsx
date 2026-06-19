import React from 'react';

import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import type {
  StructureTabCalculations,
  StructureTabFilteredOptions,
} from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';
import {
  EngineRatingSummary,
  SystemSelects,
  TonnageControl,
} from './StructureTabChassisControls';
import { HeatSinkSection } from './StructureTabHeatSinkControls';

interface StructureTabChassisSectionProps {
  readonly readOnly: boolean;
  readonly tonnage: number;
  readonly isSuperheavy: boolean;
  readonly isOmni: boolean;
  readonly engineType: EngineType;
  readonly gyroType: GyroType;
  readonly internalStructureType: InternalStructureType;
  readonly cockpitType: CockpitType;
  readonly heatSinkType: HeatSinkType;
  readonly heatSinkCount: number;
  readonly baseChassisHeatSinks: number;
  readonly calculations: StructureTabCalculations;
  readonly filteredOptions: StructureTabFilteredOptions;
  readonly engineRating: number;
  readonly isAtMaxEngineRating: boolean;
  readonly handleTonnageChange: (newTonnage: number) => void;
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
  readonly handleHeatSinkTypeChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  readonly handleHeatSinkCountChange: (newCount: number) => void;
  readonly handleBaseChassisHeatSinksChange: (newCount: number) => void;
}

export function StructureTabChassisSection({
  readOnly,
  tonnage,
  isSuperheavy,
  isOmni,
  engineType,
  gyroType,
  internalStructureType,
  cockpitType,
  heatSinkType,
  heatSinkCount,
  baseChassisHeatSinks,
  calculations,
  filteredOptions,
  engineRating,
  isAtMaxEngineRating,
  handleTonnageChange,
  handleEngineTypeChange,
  handleGyroTypeChange,
  handleStructureTypeChange,
  handleCockpitTypeChange,
  handleHeatSinkTypeChange,
  handleHeatSinkCountChange,
  handleBaseChassisHeatSinksChange,
}: StructureTabChassisSectionProps): React.ReactElement {
  return (
    <div className={cs.panel.main}>
      <h3 className={cs.text.sectionTitle}>Chassis</h3>

      <div className={cs.layout.formStack}>
        <TonnageControl
          readOnly={readOnly}
          tonnage={tonnage}
          isSuperheavy={isSuperheavy}
          onChange={handleTonnageChange}
        />

        <SystemSelects
          readOnly={readOnly}
          calculations={calculations}
          filteredOptions={filteredOptions}
          engineType={engineType}
          gyroType={gyroType}
          internalStructureType={internalStructureType}
          cockpitType={cockpitType}
          handleEngineTypeChange={handleEngineTypeChange}
          handleGyroTypeChange={handleGyroTypeChange}
          handleStructureTypeChange={handleStructureTypeChange}
          handleCockpitTypeChange={handleCockpitTypeChange}
        />

        <EngineRatingSummary
          engineRating={engineRating}
          isAtMaxEngineRating={isAtMaxEngineRating}
        />

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
      </div>
    </div>
  );
}
