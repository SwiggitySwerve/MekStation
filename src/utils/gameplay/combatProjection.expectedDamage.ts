import type {
  ICombatWeaponImpact,
  ICombatWeaponRangeOption,
} from '@/types/gameplay';

import { getTwoD6HitProbability } from './toHit/forecast';

function roundExpectedDamage(value: number): number {
  return Math.round(value * 100) / 100;
}

export function expectedDamageForProjection(
  availableWeaponImpacts: readonly ICombatWeaponImpact[],
  weaponRangeOptions: readonly ICombatWeaponRangeOption[],
  fallbackToHitNumber: number | undefined,
): number | undefined {
  const expectedDamageByWeaponId = new Map(
    weaponRangeOptions.flatMap((option) =>
      option.available && option.expectedDamage !== undefined
        ? [[option.weaponId, option.expectedDamage] as const]
        : [],
    ),
  );
  const perWeaponExpectedDamage = availableWeaponImpacts.flatMap((impact) => {
    const expectedDamage = expectedDamageByWeaponId.get(impact.weaponId);
    return expectedDamage === undefined ? [] : [expectedDamage];
  });

  if (
    perWeaponExpectedDamage.length > 0 &&
    perWeaponExpectedDamage.length === availableWeaponImpacts.length
  ) {
    return roundExpectedDamage(
      perWeaponExpectedDamage.reduce((sum, value) => sum + value, 0),
    );
  }
  if (fallbackToHitNumber === undefined) return undefined;
  return roundExpectedDamage(
    availableWeaponImpacts.reduce((sum, impact) => sum + impact.damage, 0) *
      (getTwoD6HitProbability(fallbackToHitNumber) / 100),
  );
}
