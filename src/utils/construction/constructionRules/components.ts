/**
 * Component Calculations
 *
 * Engine, gyro, cockpit, heat sink, and internal structure calculations.
 */

import {
  getCockpitDefinition,
} from '../../../types/construction/CockpitType';
import {
  getEngineDefinition,
} from '../../../types/construction/EngineType';
import {
  getInternalStructureDefinition,
} from '../../../types/construction/InternalStructureType';
import { ceilToHalfTon } from '../../physical/weightUtils';
import {
  calculateEngineWeight,
  calculateIntegralHeatSinks,
  validateEngineRating,
} from '../engineCalculations';
import { calculateGyroWeight, getGyroCriticalSlots } from '../gyroCalculations';
import {
  MINIMUM_HEAT_SINKS,
  calculateHeatSinkWeight,
  calculateExternalHeatSinkSlots,
} from '../heatSinkCalculations';
import type {
  ConstructionStepResult,
} from './types';
import type { CockpitType } from '../../../types/construction/CockpitType';
import type { EngineType } from '../../../types/construction/EngineType';
import type { GyroType } from '../../../types/construction/GyroType';
import type { HeatSinkType } from '../../../types/construction/HeatSinkType';
import type {
  InternalStructureType,
} from '../../../types/construction/InternalStructureType';

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
