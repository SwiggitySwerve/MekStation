/**
 * Hydrated missile weapons carry the whole launcher's damage in
 * `IWeapon.damage` (LRM 16 = 16, SRM 6 = 12). This converts that total to the
 * damage of the projectiles that landed. Inputs that are already damage per hit
 * (`damagePerHit`, `damagePerMissile`) must not pass through it.
 */
export function damageForProjectiles(
  totalDamage: number,
  rackSize: number,
  landedProjectiles: number,
): number {
  return (totalDamage / rackSize) * landedProjectiles;
}
