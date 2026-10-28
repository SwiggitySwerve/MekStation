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
import { formatTons } from '@/utils/formatting';

import type {
  StructureConfigurationOption,
  StructureEnhancementOption,
} from './StructureTabViewTypes';

import { customizerStyles as cs } from '../styles';
import {
  TONNAGE_SEGMENT_COLORS,
  type TonnageSegmentId,
} from './overview/tonnageBreakdown';
import { StructureTabChassisSection } from './StructureTabChassisSection';
import { StructureTabCoolingSection } from './StructureTabCoolingSection';
import { StructureTabMovementSection } from './StructureTabMovementSection';
import { useMechStructureFields } from './useMechStructureFields';

const CONFIGURATION_OPTIONS: StructureConfigurationOption[] = [
  { value: MechConfiguration.BIPED, label: 'Biped' },
  { value: MechConfiguration.QUAD, label: 'Quad' },
  { value: MechConfiguration.TRIPOD, label: 'Tripod' },
  { value: MechConfiguration.LAM, label: 'LAM' },
  { value: MechConfiguration.QUADVEE, label: 'QuadVee' },
];

/** The system's colour from the Overview tonnage bar, so the two read alike. */
function WeightDot({ id }: { id: TonnageSegmentId }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      data-weight-dot={id}
      className={`${TONNAGE_SEGMENT_COLORS[id]} h-2.5 w-2.5 shrink-0 rounded-sm`}
    />
  );
}

/**
 * One weight in the summary strip. Phones set the weights in a two-column
 * grid with each value pushed to its cell's right edge, so the values line up
 * instead of wrapping into ragged pairs; wider screens keep one inline row.
 */
const WEIGHT_ITEM = `${cs.layout.statRow} flex-shrink-0 max-sm:min-w-0`;
const WEIGHT_VALUE = `${cs.text.value} tabular-nums max-sm:ml-auto`;

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
  const {
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
  } = useMechStructureFields();
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
    configuration,
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
    },
    [setTonnage, tonnage],
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
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:flex sm:flex-wrap sm:items-center">
            <div className={WEIGHT_ITEM}>
              <WeightDot id="engine" />
              <span className={cs.text.label}>Engine:</span>
              <span className={WEIGHT_VALUE}>
                {formatTons(calculations.engineWeight)}
              </span>
            </div>
            <div className={WEIGHT_ITEM}>
              <WeightDot id="gyro" />
              <span className={cs.text.label}>Gyro:</span>
              <span className={WEIGHT_VALUE}>
                {formatTons(calculations.gyroWeight)}
              </span>
            </div>
            <div className={WEIGHT_ITEM}>
              <WeightDot id="structure" />
              <span className={cs.text.label}>Structure:</span>
              <span className={WEIGHT_VALUE}>
                {formatTons(calculations.structureWeight)}
              </span>
            </div>
            <div className={WEIGHT_ITEM}>
              <WeightDot id="cockpit" />
              <span className={cs.text.label}>Cockpit:</span>
              <span className={WEIGHT_VALUE}>
                {formatTons(calculations.cockpitWeight)}
              </span>
            </div>
            <div className={WEIGHT_ITEM}>
              <WeightDot id="heatSinks" />
              <span className={cs.text.label}>Heat Sinks:</span>
              <span className={WEIGHT_VALUE}>
                {formatTons(calculations.heatSinkWeight)}
              </span>
            </div>
            {calculations.jumpJetWeight > 0 && (
              <div className={WEIGHT_ITEM}>
                <WeightDot id="jumpJets" />
                <span className={cs.text.label}>Jump Jets:</span>
                <span className={WEIGHT_VALUE}>
                  {formatTons(calculations.jumpJetWeight)}
                </span>
              </div>
            )}
            <div className={WEIGHT_ITEM}>
              <WeightDot id="armor" />
              <span className={cs.text.label}>Armor:</span>
              <span className={WEIGHT_VALUE}>
                {formatTons(calculations.armorWeight)}
              </span>
            </div>
          </div>
          <div
            className={`${cs.layout.statRow} border-border-theme-subtle border-t pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4`}
            data-testid="structure-subtotal"
            title="Chassis, systems and armor only. Equipment weight is counted in the header total."
          >
            <span className={`text-sm ${cs.text.label}`}>
              Structure, Systems &amp; Armor:
            </span>
            {/* "66.0 / 100.0 t", the ratio format of the header stat strip. */}
            <span className="tabular-nums">
              <span className="text-text-theme-primary text-lg font-bold">
                {calculations.totalStructuralWeight.toFixed(1)}
              </span>
              <span className={`text-sm ${cs.text.label}`}>
                {' / '}
                {formatTons(tonnage)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Columns stretch to one height and Cooling fills the right column, so
          Chassis and Cooling end on the same line. */}
      <div className={cs.layout.twoColumnSidebar}>
        <StructureTabChassisSection
          readOnly={readOnly}
          tonnage={tonnage}
          isSuperheavy={isSuperheavy}
          configuration={configuration}
          configurationOptions={CONFIGURATION_OPTIONS}
          engineType={engineType}
          gyroType={gyroType}
          internalStructureType={internalStructureType}
          cockpitType={cockpitType}
          calculations={calculations}
          filteredOptions={filteredOptions}
          engineRating={engineRating}
          isAtMaxEngineRating={isAtMaxEngineRating}
          walkMP={walkMP}
          handleTonnageChange={handleTonnageChange}
          handleConfigurationChange={handleConfigurationChange}
          handleEngineTypeChange={handleEngineTypeChange}
          handleGyroTypeChange={handleGyroTypeChange}
          handleStructureTypeChange={handleStructureTypeChange}
          handleCockpitTypeChange={handleCockpitTypeChange}
        />

        <div className="flex flex-col gap-4">
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
            tonnage={tonnage}
            calculations={calculations}
            handleWalkMPChange={handleWalkMPChange}
            handleJumpMPChange={handleJumpMPChange}
            handleJumpJetTypeChange={handleJumpJetTypeChange}
            handleEnhancementChange={handleEnhancementChange}
          />
          <StructureTabCoolingSection
            readOnly={readOnly}
            isOmni={isOmni}
            heatSinkType={heatSinkType}
            heatSinkCount={heatSinkCount}
            baseChassisHeatSinks={baseChassisHeatSinks}
            calculations={calculations}
            filteredOptions={filteredOptions}
            handleHeatSinkTypeChange={handleHeatSinkTypeChange}
            handleHeatSinkCountChange={handleHeatSinkCountChange}
            handleBaseChassisHeatSinksChange={handleBaseChassisHeatSinksChange}
          />
        </div>
      </div>
    </div>
  );
}
