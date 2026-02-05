/**
 * Construction Rules Core
 *
 * Implements the 12-step BattleMech construction sequence
 * per TechManual specifications.
 *
 * @spec openspec/specs/construction-rules-core/spec.md
 */

import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '../../types/construction/ArmorType';
import {
  CockpitType,
  getCockpitDefinition,
} from '../../types/construction/CockpitType';
import {
  EngineType,
  getEngineDefinition,
} from '../../types/construction/EngineType';
import { GyroType } from '../../types/construction/GyroType';
import { HeatSinkType } from '../../types/construction/HeatSinkType';
import {
  InternalStructureType,
  getInternalStructureDefinition,
} from '../../types/construction/InternalStructureType';
import { ceilToHalfTon } from '../physical/weightUtils';
import { calculateArmorWeight } from './armorCalculations';
import {
  calculateEngineWeight,
  calculateIntegralHeatSinks,
  validateEngineRating,
} from './engineCalculations';
import { calculateGyroWeight, getGyroCriticalSlots } from './gyroCalculations';
import {
  MINIMUM_HEAT_SINKS,
  calculateHeatSinkWeight,
  calculateExternalHeatSinkSlots,
} from './heatSinkCalculations';

/**
 * Mech configuration for construction validation
 */
export interface MechBuildConfig {
  tonnage: number;
  engineRating: number;
  engineType: EngineType;
  gyroType: GyroType;
  internalStructureType: InternalStructureType;
  armorType: ArmorTypeEnum;
  totalArmorPoints: number;
  cockpitType: CockpitType;
  heatSinkType: HeatSinkType;
  totalHeatSinks: number;
  jumpMP: number;
}

/**
 * Construction step result
 */
export interface ConstructionStepResult {
  step: number;
  name: string;
  weight: number;
  criticalSlots: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Full construction result
 */
export interface ConstructionResult {
  steps: ConstructionStepResult[];
  totalWeight: number;
  remainingTonnage: number;
  totalCriticalSlots: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Step 1: Choose tonnage
 * Valid tonnages: 20-100 in 5-ton increments (standard mechs)
 */
export function validateTonnage(tonnage: number): ConstructionStepResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (tonnage < 20 || tonnage > 100) {
    errors.push(`Tonnage must be between 20 and 100 (got ${tonnage})`);
  }
  if (tonnage % 5 !== 0) {
    errors.push(`Tonnage must be a multiple of 5 (got ${tonnage})`);
  }

  return {
    step: 1,
    name: 'Choose Tonnage',
    weight: 0,
    criticalSlots: 0,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Step 2: Install internal structure
 */
export function calculateInternalStructure(
  tonnage: number,
  structureType: InternalStructureType,
): ConstructionStepResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const definition = getInternalStructureDefinition(structureType);
  if (!definition) {
    errors.push(`Unknown internal structure type: ${structureType}`);
    return {
      step: 2,
      name: 'Internal Structure',
      weight: 0,
      criticalSlots: 0,
      isValid: false,
      errors,
      warnings,
    };
  }

  const weight = ceilToHalfTon(tonnage * definition.weightMultiplier);
  const criticalSlots = definition.criticalSlots;

  return {
    step: 2,
    name: 'Internal Structure',
    weight,
    criticalSlots,
    isValid: true,
    errors,
    warnings,
  };
}

/**
 * Step 3: Install engine
 */
export function calculateEngine(
  tonnage: number,
  engineRating: number,
  engineType: EngineType,
): ConstructionStepResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ratingValidation = validateEngineRating(engineRating);
  if (!ratingValidation.isValid) {
    errors.push(...ratingValidation.errors);
  }

  const walkMP = Math.floor(engineRating / tonnage);
  if (walkMP < 1) {
    errors.push(
      `Engine rating ${engineRating} provides less than 1 walk MP for ${tonnage}t mech`,
    );
  }

  const weight = calculateEngineWeight(engineRating, engineType);
  const definition = getEngineDefinition(engineType);
  const ctSlots = definition?.ctSlots ?? 6;
  const sideSlots = (definition?.sideTorsoSlots ?? 0) * 2;
  const criticalSlots = ctSlots + sideSlots;

  return {
    step: 3,
    name: 'Engine',
    weight,
    criticalSlots,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Step 4: Install gyro
 */
export function calculateGyro(
  engineRating: number,
  gyroType: GyroType,
): ConstructionStepResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const weight = calculateGyroWeight(engineRating, gyroType);
  const criticalSlots = getGyroCriticalSlots(gyroType);

  return {
    step: 4,
    name: 'Gyro',
    weight,
    criticalSlots,
    isValid: true,
    errors,
    warnings,
  };
}

/**
 * Step 5: Install cockpit
 */
export function calculateCockpit(
  cockpitType: CockpitType,
): ConstructionStepResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const definition = getCockpitDefinition(cockpitType);
  if (!definition) {
    errors.push(`Unknown cockpit type: ${cockpitType}`);
    return {
      step: 5,
      name: 'Cockpit',
      weight: 0,
      criticalSlots: 0,
      isValid: false,
      errors,
      warnings,
    };
  }

  return {
    step: 5,
    name: 'Cockpit',
    weight: definition.weight,
    criticalSlots: definition.headSlots + definition.otherSlots,
    isValid: true,
    errors,
    warnings,
  };
}

/**
 * Step 6: Install heat sinks
 */
export function calculateHeatSinks(
  heatSinkType: HeatSinkType,
  totalHeatSinks: number,
  engineRating: number,
  engineType: EngineType,
): ConstructionStepResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (totalHeatSinks < MINIMUM_HEAT_SINKS) {
    errors.push(
      `Minimum ${MINIMUM_HEAT_SINKS} heat sinks required (have ${totalHeatSinks})`,
    );
  }

  const integrated = calculateIntegralHeatSinks(engineRating, engineType);
  const external = Math.max(0, totalHeatSinks - integrated);

  // First 10 heat sinks are weight-free per BattleTech rules
  const weight = calculateHeatSinkWeight(totalHeatSinks, heatSinkType);
  const criticalSlots = calculateExternalHeatSinkSlots(external, heatSinkType);

  if (external > integrated) {
    warnings.push(
      `${external} external heat sinks require significant critical space`,
    );
  }

  return {
    step: 6,
    name: 'Heat Sinks',
    weight,
    criticalSlots,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Step 7: Install armor
 */
export function calculateArmor(
  armorType: ArmorTypeEnum,
  totalArmorPoints: number,
  _tonnage: number,
): ConstructionStepResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const definition = getArmorDefinition(armorType);
  if (!definition) {
    errors.push(`Unknown armor type: ${armorType}`);
    return {
      step: 7,
      name: 'Armor',
      weight: 0,
      criticalSlots: 0,
      isValid: false,
      errors,
      warnings,
    };
  }

  const weight = calculateArmorWeight(totalArmorPoints, armorType);
  const criticalSlots = definition.criticalSlots;

  // Maximum armor check would need structure points which we don't have here
  // That's handled in full validation

  return {
    step: 7,
    name: 'Armor',
    weight,
    criticalSlots,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate total weight of structural components
 */
export function calculateStructuralWeight(config: MechBuildConfig): number {
  const structureWeight = ceilToHalfTon(
    config.tonnage *
      (getInternalStructureDefinition(config.internalStructureType)
        ?.weightMultiplier ?? 0.1),
  );
  const engineWeight = calculateEngineWeight(
    config.engineRating,
    config.engineType,
  );
  const gyroWeight = calculateGyroWeight(config.engineRating, config.gyroType);
  const cockpitWeight = getCockpitDefinition(config.cockpitType)?.weight ?? 3;

  // First 10 heat sinks are weight-free per BattleTech rules
  const heatSinkWeight = calculateHeatSinkWeight(
    config.totalHeatSinks,
    config.heatSinkType,
  );

  const armorWeight = calculateArmorWeight(
    config.totalArmorPoints,
    config.armorType,
  );

  return (
    structureWeight +
    engineWeight +
    gyroWeight +
    cockpitWeight +
    heatSinkWeight +
    armorWeight
  );
}

/**
 * Calculate remaining tonnage for weapons/equipment
 */
export function calculateRemainingTonnage(config: MechBuildConfig): number {
  const structuralWeight = calculateStructuralWeight(config);
  return Math.max(0, config.tonnage - structuralWeight);
}

/**
 * Run full construction validation
 */
export function validateConstruction(
  config: MechBuildConfig,
): ConstructionResult {
  const steps: ConstructionStepResult[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Tonnage
  steps.push(validateTonnage(config.tonnage));

  // Step 2: Internal Structure
  steps.push(
    calculateInternalStructure(config.tonnage, config.internalStructureType),
  );

  // Step 3: Engine
  steps.push(
    calculateEngine(config.tonnage, config.engineRating, config.engineType),
  );

  // Step 4: Gyro
  steps.push(calculateGyro(config.engineRating, config.gyroType));

  // Step 5: Cockpit
  steps.push(calculateCockpit(config.cockpitType));

  // Step 6: Heat Sinks
  steps.push(
    calculateHeatSinks(
      config.heatSinkType,
      config.totalHeatSinks,
      config.engineRating,
      config.engineType,
    ),
  );

  // Step 7: Armor
  steps.push(
    calculateArmor(config.armorType, config.totalArmorPoints, config.tonnage),
  );

  // Aggregate results
  let totalWeight = 0;
  let totalCriticalSlots = 0;

  for (const step of steps) {
    totalWeight += step.weight;
    totalCriticalSlots += step.criticalSlots;
    errors.push(...step.errors);
    warnings.push(...step.warnings);
  }

  // Check total weight
  if (totalWeight > config.tonnage) {
    errors.push(
      `Total weight (${totalWeight}t) exceeds tonnage (${config.tonnage}t)`,
    );
  }

  const remainingTonnage = config.tonnage - totalWeight;

  return {
    steps,
    totalWeight,
    remainingTonnage,
    totalCriticalSlots,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
