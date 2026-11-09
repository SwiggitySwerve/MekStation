/**
 * The one heat-neutral load of a vehicle. The combat/editor mounted-weight owner
 * and the support-vehicle payload both call it, so insulator, capacitor and
 * miscellaneous heat cannot drift apart between the two paths.
 */
import type { VehicleEngineType } from '@/types/construction/EngineType';

import { EngineType } from '@/types/construction';

import {
  getMountedBVLinkType,
  linkLaserInsulatorWeapons,
  linkPPCCapacitorWeapons,
} from '../equipmentBV/weaponLinks';
import { NON_FUSION_ENGINE_TYPES } from './engine';

/** Native MiscType.getHeat(), not weapon heat metadata. 48fcb2f6:1423-1441. */
const MISC_HEAT = new Map([
  ['groundmobilehpg', 20],
  ['risc-viral-jammer-decoy', 12],
  ['risc-viral-jammer-homing', 12],
  ['risclaserpulsemodule', 2],
  ['nova-combined-electronic-warfare-system-cews', 2],
  ['spot-welder', 2],
]);

/** One mount as the heat-neutral load sees it (see `sumVehicleHeatLoad`). */
export interface IHeatLoadMount<Location> {
  id: string;
  location: Location;
  /** Position in the unit's equipment order; an insulator links its predecessor. */
  order: number;
  laser: boolean;
  linked: boolean;
  insulated: boolean;
  capacitor: boolean;
  /** Weapon heat; null for an unresolved or invalid definition. */
  heat: number | null;
  /** Unresolved definitions, weapons and ammunition carry no miscellaneous heat. */
  miscHeatExcluded: boolean;
}

/**
 * TestEntity.calcHeatNeutralHSRequirement (TestEntity.java:945-984, MegaMek
 * 48fcb2f64). Links laser insulators and PPC capacitors in place (sets
 * `linked`, `insulated` and `capacitor` on `mounted`), sums linked weapon heat,
 * then adds miscellaneous heat. Null when any heat or the welder's engine class
 * is unresolved.
 */
export function sumVehicleHeatLoad<Location>(
  mounted: IHeatLoadMount<Location>[],
  context: { year?: number; engineType?: VehicleEngineType },
): number | null {
  linkLaserInsulatorWeapons(
    mounted,
    mounted
      .filter(
        (m) =>
          m.id === 'laserinsulator' || getMountedBVLinkType(m.id) === 'risc',
      )
      .map((m) => ({
        ...m,
        kind:
          m.id === 'laserinsulator'
            ? ('insulator' as const)
            : ('risc' as const),
      })),
  );
  linkPPCCapacitorWeapons(
    mounted,
    mounted.filter((m) => m.id === 'ppc-capacitor'),
    context.year,
    (w) => !w.linked,
    (w) => {
      w.linked = true;
      w.capacitor = true;
    },
  );
  const rawWeaponHeat = mounted.reduce<number | null>((total, mount) => {
    if (total === null || mount.heat === null) return null;
    // TestEntity.java:951-966 at 48fcb2f64: keep its running-total zero guard.
    let heat = total + mount.heat;
    if (mount.insulated) {
      heat--;
      if (heat === 0) heat++;
    }
    return heat + (mount.capacitor ? 5 : 0);
  }, 0);
  // TestEntity.java:971-979 adds miscellaneous heat after all linked weapons;
  // including it in that running total would change the insulator zero guard.
  return mounted.reduce<number | null>((total, mount) => {
    if (total === null) return null;
    if (mount.miscHeatExcluded) return total;
    if (mount.id === 'spot-welder') {
      const type = context.engineType;
      if (type === undefined) return null;
      // TestEntity.java:974-977: fusion/fission does not add welder heat.
      if (!NON_FUSION_ENGINE_TYPES.has(type))
        return Object.values(EngineType).some((t) => t === type) ? total : null;
      if (type === EngineType.FISSION) return total;
    }
    return total + (MISC_HEAT.get(mount.id) ?? 0);
  }, rawWeaponHeat);
}
