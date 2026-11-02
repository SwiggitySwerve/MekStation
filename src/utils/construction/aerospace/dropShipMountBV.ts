import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';

import type { IDropShipBVUnit } from './dropShipBV';
import type { ILargeAerospaceArcBV } from './largeAerospaceFirePool';

import { addBVToAmmoCapGroup } from '../battleValueAmmo';
import {
  getAmmunitionEntry,
  getEquipmentEntry,
  resolveAmmoBV,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { getAerospaceDefensiveEquipmentKind } from './aerospaceBVEquipment';
import { LARGE_AEROSPACE_ARCS } from './largeAerospaceFirePool';

const LOCATIONS: Readonly<Record<string, CapitalArc>> = {
  NOSE: CapitalArc.NOSE,
  AFT: CapitalArc.AFT,
  LEFT_SIDE: CapitalArc.FRONT_LEFT,
  RIGHT_SIDE: CapitalArc.FRONT_RIGHT,
  'LEFT SIDE': CapitalArc.FRONT_LEFT,
  'RIGHT SIDE': CapitalArc.FRONT_RIGHT,
  FL: CapitalArc.FRONT_LEFT,
  FR: CapitalArc.FRONT_RIGHT,
  AL: CapitalArc.AFT_LEFT,
  AR: CapitalArc.AFT_RIGHT,
};
const ENERGY_SUBTYPES = new Set([
  'Laser',
  'ER Laser',
  'Pulse Laser',
  'PPC',
  'Flamer',
]);

/** Closed subset whose catalog identity supplies a native type/rack cap group. */
function ammoGroup(id: string): string | undefined {
  const key = id.replace(/^clan-/, '');
  return /^(?:ac|uac|rac|lac|lrm|srm|mrm|streak-srm|streak-lrm)-\d+$/.test(key)
    ? key
    : undefined;
}

export interface IDropShipMountBV {
  /** Partial diagnostic facts when unresolved is nonempty; never a unit BV. */
  readonly arcs: readonly ILargeAerospaceArcBV[];
  readonly unresolved: readonly {
    readonly mountIndex: number;
    readonly equipmentId: string;
    readonly reason: string;
  }[];
}

/**
 * DropShip/LargeAero raw mount boundary, MegaMek 48fcb2f64.
 * (B) starts a bay with this weapon; it is not an extra weapon or a bay total.
 * Capital/link metadata absent from the catalog is reported, never inferred.
 * @spec establish-all-unit-data-parity: DropShip mount valuation
 */
export function resolveDropShipMountBV(
  mounts: NonNullable<IDropShipBVUnit['equipment']>,
): IDropShipMountBV {
  const arcs = LARGE_AEROSPACE_ARCS.map((arc) => ({
    arc,
    weaponBV: 0,
    heat: 0,
    ammoBVByType: {} as Record<string, number>,
    weaponBVByAmmoType: {} as Record<string, number>,
  }));
  const unresolved: {
    mountIndex: number;
    equipmentId: string;
    reason: string;
  }[] = [];
  mounts.forEach((mount, mountIndex) => {
    const fail = (reason: string): void => {
      unresolved.push({ mountIndex, equipmentId: mount.equipmentId, reason });
    };
    const raw = mount.equipmentId.trim().toLowerCase();
    const rear = raw.startsWith('r-');
    const token = raw.replace(/^r-/, '').replace(/^b-/, '');
    const [id, quantity, ...extra] = token.split(':');
    if (extra.length || (quantity !== undefined && !/^\d+$/.test(quantity))) {
      fail('Unsupported mount suffix or ammunition quantity');
      return;
    }
    // The shared classifier owns defensive exclusions, including hull electronics.
    if (getAerospaceDefensiveEquipmentKind(id)) return;
    let location = LOCATIONS[(mount.location ?? mount.arc ?? '').toUpperCase()];
    if (rear && location === CapitalArc.FRONT_LEFT)
      location = CapitalArc.AFT_LEFT;
    if (rear && location === CapitalArc.FRONT_RIGHT)
      location = CapitalArc.AFT_RIGHT;
    const arc = arcs.find((a) => a.arc === location);
    if (!arc) {
      fail('Unsupported firing arc');
      return;
    }
    if (/capital|naval|screen|prototype|(?:^|-)i?-?os$|os$/.test(id)) {
      fail('Unsupported capital, screen, prototype or one-shot mount');
      return;
    }
    if (quantity !== undefined || /ammo|pods/.test(id)) {
      const entry = getAmmunitionEntry(id);
      const ammo = resolveAmmoBV(id);
      const key = ammoGroup(ammo.weaponType);
      const shots = Number(quantity);
      if (
        !entry ||
        !ammo.resolved ||
        !key ||
        quantity === undefined ||
        !Number.isSafeInteger(shots) ||
        !entry.shotsPerTon ||
        entry.shotsPerTon <= 0
      ) {
        fail('Unresolved native ammo identity, type/rack or bin shot count');
        return;
      }
      if (shots > 0)
        addBVToAmmoCapGroup(
          arc.ammoBVByType,
          key,
          ammo.battleValue * Math.max(1, Math.floor(shots / entry.shotsPerTon)),
        );
      return;
    }
    const entry = getEquipmentEntry(id);
    if (!entry) {
      fail('Unresolved equipment identity');
      return;
    }
    const key = ammoGroup(entry.id);
    if (
      !key &&
      !(entry.category === 'Energy' && ENERGY_SUBTYPES.has(entry.subType ?? ''))
    ) {
      fail('Unsupported weapon, linked modifier or offensive equipment');
      return;
    }
    const value = resolveEquipmentBV(id);
    arc.weaponBV += value.battleValue;
    arc.heat += value.heat;
    if (key)
      addBVToAmmoCapGroup(arc.weaponBVByAmmoType, key, value.battleValue);
  });
  return { arcs, unresolved };
}
