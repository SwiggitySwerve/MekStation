import type { IVehicleBVBreakdown, VehicleBVInput } from './vehicleBVTypes';

import { calculateBaseBV } from '../battleValueTotals';

// MegaMek 48fcb2f64 Tank/VTOL/SuperHeavyTank/LargeSupportTank abbreviations.
const nativeLocations = new Map<string, string>([
  ['body', 'BD'],
  ['front', 'FR'],
  ['right', 'RS'],
  ['left', 'LS'],
  ['rear', 'RR'],
  ['rotor', 'RO'],
  ['front right', 'FRRS'],
  ['front left', 'FRLS'],
  ['rear right', 'RRRS'],
  ['rear left', 'RRLS'],
  ['rear turret', 'RT'],
  ['front turret', 'FT'],
  ['turret 2', 'FT'],
]);

/** Baseline reference trace; all nonneutral values come from their owning stages.
 * CombatVehicle inherits the empty offensive type stage at MegaMek 48fcb2f6.
 * Mount indices/IDs remain local; the comparator groups values by location.
 * Ammo type/rack pools come from the shared calculation owner.
 */
export function vehicleBVTerms(
  b: IVehicleBVBreakdown,
  layout?: Pick<VehicleBVInput, 'turret' | 'secondaryTurret'>,
): IVehicleBVBreakdown & {
  offensiveTypeModifier: number;
  adjustment: number | undefined;
} & Record<`weapon.${number}.${string}.${string}`, number> &
  Record<`ammo.${'available' | 'cap'}.${string}`, number> {
  const weaponTerms: Record<`weapon.${number}.${string}.${string}`, number> =
    {};
  const dual =
    layout?.turret?.kind === 'dual' ||
    (layout?.secondaryTurret !== undefined &&
      layout.secondaryTurret.kind !== 'sponson');
  for (const fact of b.weaponMountBV ?? []) {
    const location = fact.location.toLowerCase();
    const abbreviation =
      location === 'turret'
        ? dual
          ? 'RT'
          : 'TU'
        : nativeLocations.get(location);
    if (abbreviation === undefined) continue;
    weaponTerms[
      `weapon.${fact.equipmentIndex}.${abbreviation}.${fact.equipmentId}`
    ] = fact.battleValue;
  }
  const ammoTerms: Record<`ammo.${'available' | 'cap'}.${string}`, number> = {};
  const pools = b.ammoPools;
  if (pools) {
    for (const kind of ['available', 'cap'] as const) {
      for (const [group, bv] of Object.entries(pools[kind])) {
        ammoTerms[`ammo.${kind}.${group}`] = bv;
      }
    }
  }
  return {
    ...b,
    ...weaponTerms,
    ...ammoTerms,
    offensiveTypeModifier: 1,
    adjustment:
      b.summaryModifier === undefined
        ? undefined
        : b.final -
          calculateBaseBV(b.defensive, b.offensive, [b.summaryModifier]),
  };
}
