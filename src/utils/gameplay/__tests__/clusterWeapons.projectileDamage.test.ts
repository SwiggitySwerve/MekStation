/**
 * Total launcher damage to landed-projectile damage.
 *
 * Hydrated missile weapons carry the launcher total in `IWeapon.damage`
 * (LRM 16 = 16), so the damage for the projectiles that landed is the
 * per-projectile share times the landed count.
 */
import { damageForProjectiles } from '../clusterWeapons';

// [family, rack size, hydrated total damage]
const CATALOG_LAUNCHERS: readonly (readonly [string, number, number])[] = [
  ...[5, 10, 15, 20].map((n) => ['LRM', n, n] as const),
  ...[2, 4, 6].map((n) => ['SRM', n, 2 * n] as const),
  ...[10, 20, 30, 40].map((n) => ['MRM', n, n] as const),
  ...[3, 6, 9, 12].map((n) => ['ATM', n, 2 * n] as const),
  ...[2, 4, 6].map((n) => ['Streak SRM', n, 2 * n] as const),
];

describe('damageForProjectiles', () => {
  it('returns exact values for known launchers', () => {
    expect(damageForProjectiles(16, 16, 9)).toBe(9);
    expect(damageForProjectiles(12, 6, 4)).toBe(8);
    expect(damageForProjectiles(30, 10, 0)).toBe(0);
    expect(damageForProjectiles(40, 40, 40)).toBe(40);
  });

  it.each(CATALOG_LAUNCHERS)(
    '%s %i delivers the full total only when every projectile lands',
    (_family, rackSize, total) => {
      expect(damageForProjectiles(total, rackSize, rackSize)).toBe(total);
      expect(damageForProjectiles(total, rackSize, 0)).toBe(0);
    },
  );

  it('scales linearly with landed projectiles for racks 1 through 20', () => {
    for (let rackSize = 1; rackSize <= 20; rackSize++) {
      for (const perProjectile of [1, 2]) {
        const total = rackSize * perProjectile;
        for (let landed = 0; landed <= rackSize; landed++) {
          expect(damageForProjectiles(total, rackSize, landed)).toBe(
            landed * perProjectile,
          );
        }
      }
    }
  });

  it('keeps the per-projectile share first so fractional shares match the old arithmetic', () => {
    // 10 / 3 is inexact; the old call sites computed (total / rack) * landed.
    for (let landed = 0; landed <= 3; landed++) {
      expect(damageForProjectiles(10, 3, landed)).toBe((10 / 3) * landed);
      expect(damageForProjectiles(10, 3, landed)).toBe(landed * (10 / 3));
    }
  });
});
