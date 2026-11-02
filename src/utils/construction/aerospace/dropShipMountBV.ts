import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';

import type { IDropShipBVUnit } from './dropShipBV';
import type { ILargeAerospaceArcBV } from './largeAerospaceFirePool';

import { addBVToAmmoCapGroup } from '../battleValueAmmo';
import {
  getArtemisBVMultiplier,
  getEquipmentEntry,
  getLargeAerospaceAmmoEntry,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { getAerospaceDefensiveEquipmentKind } from './aerospaceBVEquipment';

const ARCS = [
  CapitalArc.NOSE,
  CapitalArc.FRONT_LEFT,
  CapitalArc.AFT_LEFT,
  CapitalArc.AFT,
  CapitalArc.AFT_RIGHT,
  CapitalArc.FRONT_RIGHT,
] as const;
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
  'Variable Speed Pulse Laser',
  'X-Pulse Laser',
  'PPC',
  'Flamer',
]);

/** Closed subset whose catalog identity supplies a native type/rack cap group. */
function ammoGroup(id: string): string | undefined {
  const key = id
    .replace(/^ammo-/, '')
    .replace(/-ammo$/, '')
    .replace(/^clan-/, '');
  if (/^lb-\d+-x(?:-ac|-cluster)?$/.test(key))
    return key.replace(/-(?:ac|cluster)$/, '');
  if (/^(?:(?:light|heavy)-)?gauss(?:-rifle)?$/.test(key))
    return key.replace(/-rifle$/, '');
  if (/^improvedheavygauss(?:rifle)?$/.test(key)) return 'improvedheavygauss';
  return /^(?:ac|uac|rac|lac|lrm|srm|mrm|mml|streak-srm|streak-lrm)-\d+$/.test(
    key,
  )
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
 * Absent catalog types and unsupported links remain explicit diagnostics.
 * @spec establish-all-unit-data-parity: DropShip mount valuation
 */
export function resolveDropShipMountBV(
  mounts: NonNullable<IDropShipBVUnit['equipment']>,
): IDropShipMountBV {
  const arcs = ARCS.map((arc) => ({
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
  const weapons: {
    arc: (typeof arcs)[number];
    location: CapitalArc;
    battleValue: number;
    compatible: boolean;
    artemisType?: 'iv' | 'v';
  }[] = [];
  const links: {
    mountIndex: number;
    equipmentId: string;
    location?: CapitalArc;
    type: 'iv' | 'v';
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
    const entry = getEquipmentEntry(id);
    const physicalLocation =
      LOCATIONS[(mount.location ?? mount.arc ?? '').toUpperCase()];
    if (
      quantity === undefined &&
      (entry?.id === 'artemisiv' || entry?.id === 'artemisv')
    ) {
      links.push({
        mountIndex,
        equipmentId: mount.equipmentId,
        location: physicalLocation,
        type: entry.id === 'artemisiv' ? 'iv' : 'v',
      });
      return;
    }
    if (
      quantity === undefined &&
      entry &&
      [
        'nc3',
        'smallnavalcommscannersuite',
        'largenavalcommscannersuite',
        'navaltugadaptor',
      ].includes(entry.id)
    )
      return;
    let location = physicalLocation;
    if (rear && location === CapitalArc.FRONT_LEFT)
      location = CapitalArc.AFT_LEFT;
    if (rear && location === CapitalArc.FRONT_RIGHT)
      location = CapitalArc.AFT_RIGHT;
    const arc = arcs.find((a) => a.arc === location);
    if (!arc || physicalLocation === undefined) {
      fail('Unsupported firing arc');
      return;
    }
    if (/prototype|(?:^|-)i?-?os$|os$/.test(id)) {
      fail('Unsupported prototype or one-shot mount');
      return;
    }
    if (quantity !== undefined || /ammo|pods/.test(id)) {
      const entry = getLargeAerospaceAmmoEntry(id);
      const key = entry && ammoGroup(entry.id);
      const shots = Number(quantity);
      if (
        !entry ||
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
          entry.battleValue *
            Math.max(1, Math.floor(shots / entry.shotsPerTon)),
        );
      return;
    }
    if (!entry) {
      fail('Unresolved equipment identity');
      return;
    }
    const key = ammoGroup(entry.id);
    if (
      !(
        key &&
        (entry.category === 'Ballistic' || entry.category === 'Missile')
      ) &&
      !(entry.category === 'Energy' && ENERGY_SUBTYPES.has(entry.subType ?? ''))
    ) {
      fail('Unsupported weapon, linked modifier or offensive equipment');
      return;
    }
    const value = resolveEquipmentBV(id);
    weapons.push({
      arc,
      location: physicalLocation,
      battleValue: value.battleValue,
      compatible: /^(?:clan-)?(?:lrm|srm|mml)-\d+$/.test(entry.id),
    });
    arc.heat += value.heat;
    if (key)
      addBVToAmmoCapGroup(arc.weaponBVByAmmoType, key, value.battleValue);
  });
  // MekFileParser links to the first unlinked compatible launcher in the same
  // physical location, regardless of rear flags or adjacency in the BLK list.
  for (const link of links) {
    const weapon = weapons.find(
      (w) => w.compatible && !w.artemisType && w.location === link.location,
    );
    if (weapon) weapon.artemisType = link.type;
    else
      unresolved.push({
        mountIndex: link.mountIndex,
        equipmentId: link.equipmentId,
        reason: 'Unmatched Artemis launcher link',
      });
  }
  for (const weapon of weapons)
    weapon.arc.weaponBV +=
      weapon.battleValue * getArtemisBVMultiplier(weapon.artemisType);
  unresolved.sort((a, b) => a.mountIndex - b.mountIndex);
  return { arcs, unresolved };
}
