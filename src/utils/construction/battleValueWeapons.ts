import { resolveEquipmentBV } from './equipmentBVResolver';

export function getWeaponBV(weaponId: string): number {
  return resolveEquipmentBV(weaponId).battleValue;
}

export function getWeaponHeat(weaponId: string): number {
  return resolveEquipmentBV(weaponId).heat;
}

export function calculateOffensiveBV(
  weapons: Array<{ id: string; rear?: boolean }>,
  hasTargetingComputer: boolean = false,
): number {
  let total = 0;

  for (const weapon of weapons) {
    const weaponId = weapon.id.toLowerCase();
    let bv = resolveEquipmentBV(weapon.id).battleValue;

    if (weapon.rear) {
      bv *= 0.5;
    }

    if (
      hasTargetingComputer &&
      !weaponId.includes('lrm') &&
      !weaponId.includes('srm') &&
      !weaponId.includes('mrm')
    ) {
      bv *= 1.25;
    }

    total += bv;
  }

  return total;
}
