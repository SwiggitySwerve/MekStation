import type {
  IInfantryBVBreakdown,
  InfantryBVAmmoTerm,
  InfantryBVWeaponTerm,
} from '@/types/unit/BVBreakdownTypes';

import type { InfantryAmmoBVPools } from './infantryBV';

import { calculateBaseBV } from '../battleValueTotals';

/** Baseline source trace: structure precedes movement, weapons precede speed.
 * The owner has no separate armor/equipment/type/weight contribution. Missing
 * source facts remain absent. Weapon values are retained by the calculation owner.
 * @spec establish-all-unit-data-parity: Infantry per-weapon BV diagnostic projection
 */
export function infantryBVTerms(
  b: IInfantryBVBreakdown,
  source?: {
    readonly primary: number;
    readonly secondary?: number;
    readonly antiMek: number;
    readonly remainder: number;
    readonly trooperWeapons: ReadonlyMap<string, number>;
    readonly fieldGunWeapons: readonly { id: string; battleValue: number }[];
    readonly ammoPools?: InfantryAmmoBVPools;
  },
): IInfantryBVBreakdown {
  const weapons: Partial<Record<InfantryBVWeaponTerm, number>> = {};
  for (const [id, value] of source?.trooperWeapons ?? [])
    weapons[`weapon.-1.TPRS.${id}`] = value;
  source?.fieldGunWeapons.forEach((gun, index) => {
    weapons[`weapon.${index}.FGUN.${gun.id}`] = gun.battleValue;
  });
  const ammo: Partial<Record<InfantryBVAmmoTerm, number>> = {};
  for (const kind of ['cap', 'available'] as const) {
    for (const [group, value] of Object.entries(
      source?.ammoPools?.[kind] ?? {},
    ))
      ammo[`ammo.${kind}.${group}` as InfantryBVAmmoTerm] = value;
  }
  return {
    ...b,
    armorBV: 0,
    defensiveEquipmentBV: 0,
    explosivePenalty: 0,
    typeModifier: 1,
    ammoBV: b.fieldGunAmmoBV,
    speedFactor: b.motiveMultiplier,
    offensiveEquipmentBV: 0,
    weightBV: 0,
    offensiveTypeModifier: 1,
    ...(b.baseBV === undefined
      ? {}
      : { adjustment: b.final - calculateBaseBV(b.baseBV, 0) }),
    ...(source
      ? {
          'infantry.primaryWeaponBV': source.primary,
          ...(source.secondary === undefined
            ? {}
            : { 'infantry.secondaryWeaponBV': source.secondary }),
          'infantry.antiMekWeaponBV': source.antiMek,
          'infantry.weaponRemainderBV': source.remainder,
        }
      : {}),
    ...weapons,
    ...ammo,
  };
}
