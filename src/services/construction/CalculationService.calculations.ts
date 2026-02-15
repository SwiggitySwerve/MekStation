/**
 * Calculation Service - Calculation Logic
 *
 * Complex calculation methods extracted from CalculationService.
 */

import { getStructurePoints } from '@/types/construction/InternalStructureType';

import { IEditableMech } from './MechBuilderService';

/**
 * Calculate total structure points for the mech
 */
export function calculateTotalStructurePoints(mech: IEditableMech): number {
  const locations = [
    'head',
    'centerTorso',
    'leftTorso',
    'rightTorso',
    'leftArm',
    'rightArm',
    'leftLeg',
    'rightLeg',
  ];
  let total = 0;

  for (const location of locations) {
    total += getStructurePoints(mech.tonnage, location);
  }

  return total;
}

/**
 * Calculate total armor points from allocation
 */
export function calculateTotalArmorPoints(mech: IEditableMech): number {
  const a = mech.armorAllocation;
  return (
    a.head +
    a.centerTorso +
    a.centerTorsoRear +
    a.leftTorso +
    a.leftTorsoRear +
    a.rightTorso +
    a.rightTorsoRear +
    a.leftArm +
    a.rightArm +
    a.leftLeg +
    a.rightLeg
  );
}

/**
 * Calculate armor weight from total points
 */
export function calculateArmorWeight(mech: IEditableMech): number {
  const totalPoints = calculateTotalArmorPoints(mech);
  return Math.ceil((totalPoints / 16) * 2) / 2;
}

/**
 * Calculate maximum armor points from internal structure
 * Per TechManual: max armor = 2 × structure points (head = 9)
 */
export function calculateMaxArmorPoints(tonnage: number): number {
  const locations = [
    'head',
    'centerTorso',
    'leftTorso',
    'rightTorso',
    'leftArm',
    'rightArm',
    'leftLeg',
    'rightLeg',
  ];
  let maxArmor = 0;

  for (const location of locations) {
    if (location === 'head') {
      maxArmor += 9; // Head max is always 9
    } else {
      const structure = getStructurePoints(tonnage, location);
      maxArmor += structure * 2;
    }
  }

  return maxArmor;
}

/**
 * Extract jump MP from equipment
 */
export function extractJumpMP(mech: IEditableMech): number {
  const jumpJetIds = [
    'jump-jet',
    'jump-jet-light',
    'jump-jet-medium',
    'jump-jet-heavy',
    'improved-jump-jet',
    'improved-jump-jet-light',
    'improved-jump-jet-medium',
    'improved-jump-jet-heavy',
  ];
  return mech.equipment.filter((eq) =>
    jumpJetIds.some((id) =>
      eq.equipmentId.toLowerCase().includes(id.toLowerCase()),
    ),
  ).length;
}
