import React from 'react';

import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import type {
  StructureConfigurationOption,
  StructureTabCalculations,
  StructureTabFilteredOptions,
} from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';
import {
  EngineRatingSummary,
  MotiveTypeControl,
  SystemSelects,
  TonnageControl,
} from './StructureTabChassisControls';
import { STRUCTURE_CARD } from './StructureTabRowLayout';

interface StructureTabChassisSectionProps {
  readonly readOnly: boolean;
  readonly tonnage: number;
  readonly isSuperheavy: boolean;
  readonly configuration: MechConfiguration;
  readonly configurationOptions: readonly StructureConfigurationOption[];
  readonly engineType: EngineType;
  readonly gyroType: GyroType;
  readonly internalStructureType: InternalStructureType;
  readonly cockpitType: CockpitType;
  readonly calculations: StructureTabCalculations;
  readonly filteredOptions: StructureTabFilteredOptions;
  readonly engineRating: number;
  readonly isAtMaxEngineRating: boolean;
  readonly handleTonnageChange: (newTonnage: number) => void;
  readonly handleConfigurationChange: (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
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

export function StructureTabChassisSection({
  readOnly,
  tonnage,
  isSuperheavy,
  configuration,
  configurationOptions,
  engineType,
  gyroType,
  internalStructureType,
  cockpitType,
  calculations,
  filteredOptions,
  engineRating,
  isAtMaxEngineRating,
  handleTonnageChange,
  handleConfigurationChange,
  handleEngineTypeChange,
  handleGyroTypeChange,
  handleStructureTypeChange,
  handleCockpitTypeChange,
}: StructureTabChassisSectionProps): React.ReactElement {
  return (
    <div className={`${cs.panel.main} ${STRUCTURE_CARD}`}>
      <div className="border-border-theme mb-4 border-b pb-3">
        <h3 className={cs.text.cardTitle}>Chassis</h3>
        <p className={`${cs.text.secondary} mt-0.5`}>
          Core structure and drive system
        </p>
      </div>

      <div className="space-y-5">
        <section aria-labelledby="chassis-configuration-heading">
          <h4
            id="chassis-configuration-heading"
            className={`${cs.text.subsection} mb-2`}
          >
            Chassis
          </h4>
          <div className="space-y-3">
            <TonnageControl
              readOnly={readOnly}
              tonnage={tonnage}
              isSuperheavy={isSuperheavy}
              onChange={handleTonnageChange}
            />
            <MotiveTypeControl
              readOnly={readOnly}
              configuration={configuration}
              options={configurationOptions}
              onChange={handleConfigurationChange}
            />
          </div>
        </section>

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
      </div>
    </div>
  );
}
