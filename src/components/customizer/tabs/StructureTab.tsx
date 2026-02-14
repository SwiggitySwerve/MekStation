/**
 * Structure Tab Component
 *
 * Configuration of structural components (engine, gyro, structure, cockpit)
 * and movement settings. Uses movement-first design where Walk MP determines
 * engine rating.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, { useCallback } from 'react';

import {
  useMovementCalculations,
  getEnhancementOptions,
} from '@/hooks/useMovementCalculations';
import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { BATTLEMECH_TONNAGE } from '@/services/construction/constructionConstants';
import { useUnitStore } from '@/stores/useUnitStore';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import { JumpJetType } from '@/utils/construction/movementCalculations';

import type {
  StructureConfigurationOption,
  StructureEnhancementOption,
} from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';
import { StructureTabChassisSection } from './StructureTabChassisSection';
import { StructureTabMovementSection } from './StructureTabMovementSection';

const CONFIGURATION_OPTIONS: StructureConfigurationOption[] = [
  { value: MechConfiguration.BIPED, label: 'Biped' },
  { value: MechConfiguration.QUAD, label: 'Quad' },
  { value: MechConfiguration.TRIPOD, label: 'Tripod' },
  { value: MechConfiguration.LAM, label: 'LAM' },
  { value: MechConfiguration.QUADVEE, label: 'QuadVee' },
];

// =============================================================================
// Types
// =============================================================================

interface StructureTabProps {
  /** Read-only mode */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Structure configuration tab
 *
 * Uses useUnitStore() to access the current unit's state.
 * No tabId prop needed - context provides the active unit.
 */
export function StructureTab({
  readOnly = false,
  className = '',
}: StructureTabProps): React.ReactElement {
  // Get unit state from context
  const tonnage = useUnitStore((s) => s.tonnage);
  const configuration = useUnitStore((s) => s.configuration);
  const componentTechBases = useUnitStore((s) => s.componentTechBases);
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const cockpitType = useUnitStore((s) => s.cockpitType);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const armorType = useUnitStore((s) => s.armorType);
  const armorTonnage = useUnitStore((s) => s.armorTonnage);
  const enhancement = useUnitStore((s) => s.enhancement);
  const jumpMP = useUnitStore((s) => s.jumpMP);
  const jumpJetType = useUnitStore((s) => s.jumpJetType);

  // OmniMech-specific state
  const isOmni = useUnitStore((s) => s.isOmni);
  const baseChassisHeatSinks = useUnitStore((s) => s.baseChassisHeatSinks);

  // Get actions from context
  const setTonnage = useUnitStore((s) => s.setTonnage);
  const setConfiguration = useUnitStore((s) => s.setConfiguration);
  const setEngineType = useUnitStore((s) => s.setEngineType);
  const setEngineRating = useUnitStore((s) => s.setEngineRating);
  const setGyroType = useUnitStore((s) => s.setGyroType);
  const setInternalStructureType = useUnitStore(
    (s) => s.setInternalStructureType,
  );
  const setCockpitType = useUnitStore((s) => s.setCockpitType);
  const setHeatSinkType = useUnitStore((s) => s.setHeatSinkType);
  const setHeatSinkCount = useUnitStore((s) => s.setHeatSinkCount);
  const setEnhancement = useUnitStore((s) => s.setEnhancement);
  const setJumpMP = useUnitStore((s) => s.setJumpMP);
  const setJumpJetType = useUnitStore((s) => s.setJumpJetType);
  const setBaseChassisHeatSinks = useUnitStore(
    (s) => s.setBaseChassisHeatSinks,
  );

  // Get filtered options based on tech base
  const { filteredOptions } = useTechBaseSync(componentTechBases);

  // Calculate weights and slots (weight is based on armorTonnage, not allocated points)
  const calculations = useUnitCalculations(
    tonnage,
    {
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      heatSinkType,
      heatSinkCount,
      armorType,
      jumpMP,
      jumpJetType,
    },
    armorTonnage,
  );

  // Movement calculations - extracted to useMovementCalculations hook
  const {
    walkMP,
    runMP,
    walkMPRange,
    maxJumpMP,
    maxRunMP,
    isAtMaxEngineRating,
    getEngineRatingForWalkMP,
    clampWalkMP,
    clampJumpMP,
  } = useMovementCalculations({
    tonnage,
    engineRating,
    jumpMP,
    jumpJetType,
    enhancement,
  });

  // Enhancement options (static data from hook module)
  const enhancementOptions: readonly StructureEnhancementOption[] =
    getEnhancementOptions();

  // Superheavy detection
  const isSuperheavy = tonnage > 100;

  // Handlers - Tonnage and Configuration
  const handleTonnageChange = useCallback(
    (newTonnage: number) => {
      const clamped = Math.max(
        BATTLEMECH_TONNAGE.min,
        Math.min(BATTLEMECH_TONNAGE.max, newTonnage),
      );
      let rounded =
        Math.round(clamped / BATTLEMECH_TONNAGE.step) * BATTLEMECH_TONNAGE.step;

      // Skip the invalid 101-104 gap when stepping
      if (rounded > 100 && rounded < 105) {
        rounded = newTonnage > tonnage ? 105 : 100;
      }

      setTonnage(rounded);

      // Auto-set cockpit and gyro when crossing into superheavy range
      if (rounded > 100) {
        setCockpitType(CockpitType.SUPER_HEAVY);
        setGyroType(GyroType.SUPERHEAVY);
      }
    },
    [setTonnage, setCockpitType, setGyroType, tonnage],
  );

  const handleConfigurationChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setConfiguration(e.target.value as MechConfiguration);
    },
    [setConfiguration],
  );

  // Handlers - Components
  const handleEngineTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setEngineType(e.target.value as EngineType);
    },
    [setEngineType],
  );

  const handleWalkMPChange = useCallback(
    (newWalkMP: number) => {
      const clampedWalk = clampWalkMP(newWalkMP);
      const newRating = getEngineRatingForWalkMP(clampedWalk);
      setEngineRating(newRating);
    },
    [clampWalkMP, getEngineRatingForWalkMP, setEngineRating],
  );

  const handleGyroTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setGyroType(e.target.value as GyroType);
    },
    [setGyroType],
  );

  const handleStructureTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setInternalStructureType(e.target.value as InternalStructureType);
    },
    [setInternalStructureType],
  );

  const handleCockpitTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setCockpitType(e.target.value as CockpitType);
    },
    [setCockpitType],
  );

  const handleEnhancementChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setEnhancement(value === '' ? null : (value as MovementEnhancementType));
    },
    [setEnhancement],
  );

  const handleJumpMPChange = useCallback(
    (newJumpMP: number) => {
      const clampedJump = clampJumpMP(newJumpMP);
      setJumpMP(clampedJump);
    },
    [clampJumpMP, setJumpMP],
  );

  const handleJumpJetTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setJumpJetType(e.target.value as JumpJetType);
    },
    [setJumpJetType],
  );

  // Heat sink handlers
  const handleHeatSinkTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setHeatSinkType(e.target.value as HeatSinkType);
    },
    [setHeatSinkType],
  );

  const handleHeatSinkCountChange = useCallback(
    (newCount: number) => {
      // Minimum 10 heat sinks, no explicit maximum (limited by tonnage/slots)
      const clampedCount = Math.max(10, newCount);
      setHeatSinkCount(clampedCount);
    },
    [setHeatSinkCount],
  );

  const handleBaseChassisHeatSinksChange = useCallback(
    (newCount: number) => {
      // Base chassis heat sinks: minimum 1, maximum is heatSinkCount
      // -1 means "use engine integral capacity" (default)
      const clampedCount = Math.max(-1, Math.min(heatSinkCount, newCount));
      setBaseChassisHeatSinks(clampedCount);
    },
    [setBaseChassisHeatSinks, heatSinkCount],
  );

  return (
    <div className={`${cs.layout.tabContent} ${className}`}>
      <div className={cs.panel.summary}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 text-sm sm:gap-6 sm:pb-0">
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Engine:</span>
              <span className={cs.text.value}>
                {calculations.engineWeight}t
              </span>
            </div>
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Gyro:</span>
              <span className={cs.text.value}>{calculations.gyroWeight}t</span>
            </div>
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Structure:</span>
              <span className={cs.text.value}>
                {calculations.structureWeight}t
              </span>
            </div>
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Cockpit:</span>
              <span className={cs.text.value}>
                {calculations.cockpitWeight}t
              </span>
            </div>
            <div className={`${cs.layout.statRow} flex-shrink-0`}>
              <span className={cs.text.label}>Heat Sinks:</span>
              <span className={cs.text.value}>
                {calculations.heatSinkWeight}t
              </span>
            </div>
            {calculations.jumpJetWeight > 0 && (
              <div className={`${cs.layout.statRow} flex-shrink-0`}>
                <span className={cs.text.label}>Jump Jets:</span>
                <span className={cs.text.value}>
                  {calculations.jumpJetWeight}t
                </span>
              </div>
            )}
          </div>
          <div
            className={`${cs.layout.statRow} sm:${cs.layout.dividerV} border-border-theme-subtle border-t pt-2 sm:border-t-0 sm:pt-0`}
          >
            <span className={`text-sm ${cs.text.label}`}>Total:</span>
            <span className="text-accent text-lg font-bold">
              {calculations.totalStructuralWeight}t
            </span>
          </div>
        </div>
      </div>

      <div className={cs.layout.twoColumnSidebar}>
        <StructureTabChassisSection
          readOnly={readOnly}
          tonnage={tonnage}
          isSuperheavy={isSuperheavy}
          isOmni={isOmni}
          engineType={engineType}
          gyroType={gyroType}
          internalStructureType={internalStructureType}
          cockpitType={cockpitType}
          heatSinkType={heatSinkType}
          heatSinkCount={heatSinkCount}
          baseChassisHeatSinks={baseChassisHeatSinks}
          calculations={calculations}
          filteredOptions={filteredOptions}
          engineRating={engineRating}
          isAtMaxEngineRating={isAtMaxEngineRating}
          handleTonnageChange={handleTonnageChange}
          handleEngineTypeChange={handleEngineTypeChange}
          handleGyroTypeChange={handleGyroTypeChange}
          handleStructureTypeChange={handleStructureTypeChange}
          handleCockpitTypeChange={handleCockpitTypeChange}
          handleHeatSinkTypeChange={handleHeatSinkTypeChange}
          handleHeatSinkCountChange={handleHeatSinkCountChange}
          handleBaseChassisHeatSinksChange={handleBaseChassisHeatSinksChange}
        />

        <StructureTabMovementSection
          readOnly={readOnly}
          walkMP={walkMP}
          runMP={runMP}
          walkMPRange={walkMPRange}
          maxJumpMP={maxJumpMP}
          maxRunMP={maxRunMP}
          jumpMP={jumpMP}
          jumpJetType={jumpJetType}
          enhancement={enhancement}
          enhancementOptions={enhancementOptions}
          configuration={configuration}
          configurationOptions={CONFIGURATION_OPTIONS}
          tonnage={tonnage}
          calculations={calculations}
          handleWalkMPChange={handleWalkMPChange}
          handleJumpMPChange={handleJumpMPChange}
          handleJumpJetTypeChange={handleJumpJetTypeChange}
          handleEnhancementChange={handleEnhancementChange}
          handleConfigurationChange={handleConfigurationChange}
        />
      </div>
    </div>
  );
}
