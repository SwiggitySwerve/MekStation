/**
 * Vehicle Power Amplifier Calculations
 *
 * ICE and fuel-cell combat vehicles require power amplifiers for qualifying
 * energy weapons. Fusion and fission engines are exempt. Vehicle flamers and
 * Clan chemical lasers do not contribute amplifier weight.
 *
 * Rules (TechManual):
 * - Weight = ceil(totalEnergyWeaponWeight × 0.10 / 0.5) × 0.5
 */

import type { IEquipmentItem } from '@/types/equipment';

import { EngineType } from '@/types/construction/EngineType';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

import { NON_FUSION_ENGINE_TYPES } from './engine';

// =============================================================================
// Power Amplifier Weight
// =============================================================================

/**
 * Compute power amplifier weight required for a given total energy-weapon weight.
 *
 * @param totalEnergyWeaponWeight - Sum of weights of all energy weapons on the vehicle (tons)
 * @returns Power amplifier weight in tons
 */
export function computePowerAmplifierWeight(
  totalEnergyWeaponWeight: number,
): number {
  if (totalEnergyWeaponWeight <= 0) return 0;
  return ceilToHalfTon(totalEnergyWeaponWeight * 0.1);
}

/**
 * Check whether power amplifiers are required for this engine/vehicle combination.
 *
 * Fission engines are exempt (MegaMek TestTank.getWeightPowerAmp).
 *
 * @param engineType - The vehicle's engine type
 * @returns true if power amps are needed for any energy weapons
 */
export function requiresPowerAmplifiers(engineType: EngineType): boolean {
  return (
    NON_FUSION_ENGINE_TYPES.has(engineType) && engineType !== EngineType.FISSION
  );
}

/**
 * Whether a piece of equipment counts towards the power amplifier weight:
 * an energy weapon that is not ammunition-fed. Clan chemical lasers and
 * vehicle flamers burn ammunition, so they need no amplifier
 * (MegaMek TestTank.getWeightPowerAmp).
 */
export function isPowerAmplifierEnergyWeapon(
  item: Pick<IEquipmentItem, 'category' | 'special'>,
): boolean {
  return (
    item.category === EquipmentCategory.ENERGY_WEAPON &&
    !item.special?.includes('Requires ammo')
  );
}

// =============================================================================
// Validation
// =============================================================================

export interface PowerAmpValidationResult {
  isValid: boolean;
  required: boolean;
  computedWeight: number;
  errors: Array<{ ruleId: string; message: string }>;
}

/**
 * Validate power amplifier configuration.
 *
 * Emits VAL-VEHICLE-POWER-AMP when:
 * - Non-fusion engine has energy weapons but power amps are missing/underweight
 *
 * @param engineType - The vehicle's engine type
 * @param totalEnergyWeaponWeight - Total tons of energy weapons mounted
 * @param declaredPowerAmpWeight - The power amp weight declared in the build (0 if absent)
 */
export function validatePowerAmplifiers(
  engineType: EngineType,
  totalEnergyWeaponWeight: number,
  declaredPowerAmpWeight: number,
): PowerAmpValidationResult {
  const required = requiresPowerAmplifiers(engineType);
  const computedWeight = required
    ? computePowerAmplifierWeight(totalEnergyWeaponWeight)
    : 0;

  const errors: Array<{ ruleId: string; message: string }> = [];

  if (required && totalEnergyWeaponWeight > 0) {
    if (declaredPowerAmpWeight < computedWeight - 0.001) {
      errors.push({
        ruleId: 'VAL-VEHICLE-POWER-AMP',
        message:
          `Power amplifiers required for ${engineType} engine with ${totalEnergyWeaponWeight}t of energy weapons — ` +
          `need ${computedWeight}t, found ${declaredPowerAmpWeight}t`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    required,
    computedWeight,
    errors,
  };
}
