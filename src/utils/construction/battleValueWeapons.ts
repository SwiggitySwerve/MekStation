import { hasNativeWeaponBVFlag } from './equipmentBV/nativeWeaponFlags';
import { getEquipmentEntry, resolveEquipmentBV } from './equipmentBVResolver';

/** Shared bonus for an already eligible mount. MegaMek 48fcb2f64,
 * BVCalculator.java:880-882. Callers retain their eligibility contracts.
 */
export function applyTargetingComputerBV(bv: number): number {
  return bv * 1.25;
}

/** Catalog-backed chassis capability, including native and Omni aliases.
 * MiscType.java:6799-6811,6836-6848 (48fcb2f64): F_TARGETING_COMPUTER.
 * Native registry entries lack a capability flag; recognize their resolved IDs
 * here while retaining their catalog category as a separate construction fact.
 */
export function hasBVTargetingComputer(ids: readonly string[]): boolean {
  return ids.some((id) => {
    const entry = getEquipmentEntry(id);
    return (
      entry?.category === 'Targeting' ||
      entry?.id === 'istargeting-computer-registry' ||
      entry?.id === 'cltargeting-computer-registry'
    );
  });
}

/** Callers retain their location parsing before testing mounted AES. */
export function hasBVActuatorEnhancement(
  locations: readonly string[],
  location: string,
): boolean {
  const key = location.toUpperCase();
  return locations.some((candidate) => candidate.toUpperCase() === key);
}

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
      bv = applyTargetingComputerBV(bv);
    }

    total += bv;
  }

  return total;
}

/** Direct-fire classification for normalized BV weapon identifiers. */
export function isDirectFireBVWeapon(id: string): boolean {
  const native = hasNativeWeaponBVFlag(
    getEquipmentEntry(id)?.id ?? id,
    'directFire',
  );
  if (native !== undefined) return native;
  // Unrepresented legacy IDs keep their existing compatibility policy.
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

/** BVCalculator.java:839-856: grouped additions follow arc weighting. */
export function calculateArcWeaponBV(
  bv: number,
  factor: number,
  addition = 0,
): number {
  return bv * factor + addition;
}

/** Eligible weapon stage before capacitor/TC; BVCalculator.java:845-847. */
export function applyDroneWeaponBV(bv: number): number {
  return bv * 0.8;
}
