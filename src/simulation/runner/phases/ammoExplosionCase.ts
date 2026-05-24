import type { CombatLocation, IUnitGameState } from '@/types/gameplay';
import type { CASEProtectionLevel } from '@/utils/gameplay/ammoTracking';

const STANDARD_CASE_DAMAGE_CAP = 10;
const CASE_II_DAMAGE_CAP = 1;

function structureLocation(location: CombatLocation): string {
  return location.replace(/_rear$/, '');
}

function locationDamageCapacity(
  unit: IUnitGameState,
  location: CombatLocation,
): number {
  const armor = unit.armor[location] ?? 0;
  const structure = unit.structure[structureLocation(location)] ?? 0;
  return Math.max(0, armor + structure);
}

export function caseProtectionForLocation(
  unit: IUnitGameState,
  location: CombatLocation,
): CASEProtectionLevel {
  return unit.caseProtection?.[location] ?? 'none';
}

export function resolveCaseAdjustedAmmoExplosionDamage(
  unit: IUnitGameState,
  location: CombatLocation,
  totalDamage: number,
): {
  readonly caseProtection: CASEProtectionLevel;
  readonly damageToApply: number;
} {
  const caseProtection = caseProtectionForLocation(unit, location);
  if (caseProtection === 'none') {
    return { caseProtection, damageToApply: totalDamage };
  }

  const cap =
    caseProtection === 'case_ii'
      ? CASE_II_DAMAGE_CAP
      : STANDARD_CASE_DAMAGE_CAP;
  const damageToApply = Math.min(
    totalDamage,
    cap,
    locationDamageCapacity(unit, location),
  );
  return { caseProtection, damageToApply };
}
