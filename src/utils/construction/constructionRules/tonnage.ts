/**
 * Tonnage Validation and Weight Calculations
 *
 * Tonnage validation, structural weight, remaining tonnage, and armor weight calculations.
 */

import type { ConstructionStepResult, MechBuildConfig } from './types';

import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '../../../types/construction/ArmorType';
import { getCockpitDefinition } from '../../../types/construction/CockpitType';
import { getInternalStructureDefinition } from '../../../types/construction/InternalStructureType';
import { ceilToHalfTon } from '../../physical/weightUtils';
import { calculateArmorWeight } from '../armorCalculations';
import { calculateEngineWeight } from '../engineCalculations';
import { calculateGyroWeight } from '../gyroCalculations';
import { calculateHeatSinkWeight } from '../heatSinkCalculations';

/**
 * Determine if a unit is a Superheavy BattleMech based on tonnage.
 * All superheavy-specific rules are gated on this classification.
 *
 * @spec openspec/specs/superheavy-mech-system/spec.md
 */
export function isSuperHeavy(tonnage: number): boolean {
  return tonnage > 100;
}

/**
 * Calculate the number of critical entries consumed by equipment on a superheavy mech.
 * Standard mechs use criticalSlots directly; superheavy mechs use ceil(N/2).
 *
 * @spec openspec/specs/superheavy-mech-system/spec.md
 */
export function getEquipmentCritEntries(
  criticalSlots: number,
  superheavy: boolean,
): number {
  if (!superheavy) return criticalSlots;
  return Math.ceil(criticalSlots / 2);
}

/**
 * Step 1: Choose tonnage
 * Valid tonnages: 20-200 in 5-ton increments
 * (20-100 for standard mechs, 105-200 for superheavy)
 *
 * @spec openspec/specs/superheavy-mech-system/spec.md
 */
export function validateTonnage(tonnage: number): ConstructionStepResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (tonnage < 20 || tonnage > 200) {
    errors.push(`Tonnage must be between 20 and 200 (got ${tonnage})`);
  }
  if (tonnage % 5 !== 0) {
    errors.push(`Tonnage must be a multiple of 5 (got ${tonnage})`);
  }
  // Warn for tonnages in the "gap" between standard and superheavy (101-104)
  if (tonnage > 100 && tonnage < 105) {
    errors.push(
      `Tonnage 101-104 is invalid. Superheavy mechs start at 105 tons (got ${tonnage})`,
    );
  }
  if (isSuperHeavy(tonnage)) {
    warnings.push(
      'Superheavy mech: requires SUPERHEAVY cockpit and gyro, double-slot critical system active',
    );
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
