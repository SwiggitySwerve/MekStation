/**
 * Construction Validation
 *
 * Full construction validation orchestration.
 */

import { calculateArmor, validateTonnage } from './tonnage';
import {
  calculateCockpit,
  calculateEngine,
  calculateGyro,
  calculateHeatSinks,
  calculateInternalStructure,
} from './components';
import type {
  ConstructionResult,
  ConstructionStepResult,
  MechBuildConfig,
} from './types';

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
