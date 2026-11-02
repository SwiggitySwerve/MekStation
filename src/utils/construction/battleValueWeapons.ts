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

/** Direct-fire classification for normalized BV weapon identifiers. */
export function isDirectFireBVWeapon(id: string): boolean {
  return (
    !id.includes('lrm') &&
    !id.includes('srm') &&
    !id.includes('mrm') &&
    !id.includes('atm') &&
    !id.includes('mml') &&
    !id.includes('narc') &&
    !id.includes('inarc') &&
    !id.includes('lrt') &&
    !id.includes('srt') &&
    !id.includes('thunderbolt') &&
    !id.includes('rocket') &&
    !id.includes('arrow') &&
    !id.includes('mortar') &&
    !id.includes('sniper') &&
    !id.includes('thumper') &&
    !id.includes('long-tom') &&
    // Per MegaMek: MGs, Flamers, AMS and TAG do NOT have F_DIRECT_FIRE
    !id.includes('machine-gun') &&
    !id.includes('flamer') &&
    !id.includes('anti-missile') &&
    !id.includes('ams') &&
    id !== 'tag' &&
    !id.includes('light-tag') &&
    !id.includes('clan-tag')
  );
}
