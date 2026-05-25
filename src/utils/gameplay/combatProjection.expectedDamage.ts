import { getTwoD6HitProbability } from './toHit/forecast';

export function expectedDamageForProjection(
  availableWeaponDamage: number,
  toHitNumber: number | undefined,
): number | undefined {
  if (toHitNumber === undefined) return undefined;
  return availableWeaponDamage * (getTwoD6HitProbability(toHitNumber) / 100);
}
