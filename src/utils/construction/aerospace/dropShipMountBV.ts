import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';

import type { CapitalShipBVType } from './aerospaceBVTypes';
import type { IDropShipBVUnit } from './dropShipBV';
import type { ILargeAerospaceArcBV } from './largeAerospaceFirePool';

import {
  addBVToAmmoCapGroup,
  getLargeAerospaceAmmoBVGroup,
  largeAerospaceAmmoBVMultiplier,
} from '../battleValueAmmo';
import { getCapitalEquipmentBVFacts } from '../equipmentBV/catalogLoader';
import {
  isArtemisCompatibleBVWeapon,
  linkArtemisBVWeapons,
} from '../equipmentBV/weaponLinks';
import {
  getArtemisBVMultiplier,
  getEquipmentEntry,
  getLargeAerospaceAmmoEntry,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { getAerospaceDefensiveEquipmentKind } from './aerospaceBVEquipment';
import { isRearMountedAerospaceEquipment } from './aerospaceMountFlags';
import { getLargeAerospaceArcs } from './largeAerospaceFirePool';

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
const CAPITAL_LOCATIONS: Readonly<Record<string, CapitalArc>> = {
  FRONT_LEFT_SIDE: CapitalArc.FRONT_LEFT,
  FRONT_RIGHT_SIDE: CapitalArc.FRONT_RIGHT,
  AFT_LEFT_SIDE: CapitalArc.AFT_LEFT,
  AFT_RIGHT_SIDE: CapitalArc.AFT_RIGHT,
  LEFT_BROADSIDE: CapitalArc.LEFT_BROADSIDE,
  RIGHT_BROADSIDE: CapitalArc.RIGHT_BROADSIDE,
  LBS: CapitalArc.LEFT_BROADSIDE,
  RBS: CapitalArc.RIGHT_BROADSIDE,
};
/** Native physical/rear arc mapping shared by BV and capital sheet consumers. */
export function largeAerospaceMountArc(
  mount: {
    readonly equipmentId: string;
    readonly location?: string;
    readonly arc?: string;
  },
  capitalType?: CapitalShipBVType,
  applyRear = true,
): CapitalArc | undefined {
  const tag = (mount.location ?? mount.arc ?? '').toUpperCase();
  const physical =
    (capitalType ? CAPITAL_LOCATIONS[tag] : undefined) ?? LOCATIONS[tag];
  if (
    applyRear &&
    !capitalType &&
    isRearMountedAerospaceEquipment(mount.equipmentId)
  ) {
    if (physical === CapitalArc.FRONT_LEFT) return CapitalArc.AFT_LEFT;
    if (physical === CapitalArc.FRONT_RIGHT) return CapitalArc.AFT_RIGHT;
  }
  return physical;
}

function largeAerospaceMountToken(id: string): string {
  return id.trim().toLowerCase().replace(/^r-/, '').replace(/^b-/, '');
}

const ENERGY_SUBTYPES = new Set([
  'Laser',
  'ER Laser',
  'Pulse Laser',
  'Variable Speed Pulse Laser',
  'X-Pulse Laser',
  'PPC',
  'Flamer',
  'Heavy Laser',
]);

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
export function resolveLargeAerospaceMountBV(
  mounts: NonNullable<IDropShipBVUnit['equipment']>,
  capitalType?: CapitalShipBVType,
): IDropShipMountBV {
  const arcs = getLargeAerospaceArcs(capitalType === UnitType.WARSHIP).map(
    (arc) => ({
      arc,
      weaponBV: 0,
      heat: 0,
      ammoBVByType: {} as Record<string, number>,
      weaponBVByAmmoType: {} as Record<string, number>,
    }),
  );
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
    const token = largeAerospaceMountToken(mount.equipmentId);
    const [id, quantity, ...extra] = token.split(':');
    if (extra.length || (quantity !== undefined && !/^\d+$/.test(quantity))) {
      fail('Unsupported mount suffix or ammunition quantity');
      return;
    }
    // The shared classifier owns defensive exclusions, including hull electronics.
    const defensiveKind = getAerospaceDefensiveEquipmentKind(id);
    if (defensiveKind) {
      if (
        quantity !== undefined &&
        (defensiveKind !== 'amsAmmo' || !Number.isSafeInteger(Number(quantity)))
      )
        fail('Invalid defensive ammunition quantity');
      return;
    }
    const entry = getEquipmentEntry(id);
    const physicalLocation = largeAerospaceMountArc(mount, capitalType, false);
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
        'mobilehpg',
        'groundmobilehpg',
        'smallnavalcommscannersuite',
        'largenavalcommscannersuite',
        'navaltugadaptor',
      ].includes(entry.id)
    )
      return;
    const location = largeAerospaceMountArc(mount, capitalType);
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
      const key = entry && getLargeAerospaceAmmoBVGroup(entry.id);
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
            largeAerospaceAmmoBVMultiplier(shots, entry.shotsPerTon),
        );
      return;
    }
    if (!entry) {
      fail('Unresolved equipment identity');
      return;
    }
    const key = getLargeAerospaceAmmoBVGroup(entry.id);
    const capital = getCapitalEquipmentBVFacts(entry.id);
    if (
      !(
        key && ['Ballistic', 'Missile', 'Artillery'].includes(entry.category)
      ) &&
      !(capital?.isCapital || capital?.isSubCapital) &&
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
      compatible: isArtemisCompatibleBVWeapon(entry.id),
    });
    arc.heat += value.heat;
    if (key)
      addBVToAmmoCapGroup(arc.weaponBVByAmmoType, key, value.battleValue);
  });
  // MekFileParser links to the first unlinked compatible launcher in the same
  // physical location, regardless of rear flags or adjacency in the BLK list.
  for (const link of linkArtemisBVWeapons(weapons, links)) {
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

/** Compatibility entry retains the DropShip-only arc and exclusion contract. */
export function resolveDropShipMountBV(
  mounts: NonNullable<IDropShipBVUnit['equipment']>,
): IDropShipMountBV {
  return resolveLargeAerospaceMountBV(mounts);
}

/** Source (B) boundaries retain the first weapon; unknown tokens stay visible. */
interface ILargeAerospaceSourceBay {
  arc: string;
  number: number;
  indices: number[];
}

export function groupLargeAerospaceMounts(
  mounts: NonNullable<IDropShipBVUnit['equipment']>,
  capitalType?: CapitalShipBVType,
): ILargeAerospaceSourceBay[] {
  const bays: ILargeAerospaceSourceBay[] = [];
  const numbers = new Map<string, number>();
  mounts.forEach((mount, index) => {
    const arc =
      largeAerospaceMountArc(mount, capitalType) ??
      mount.location ??
      'Unknown arc';
    const previous = bays.at(-1);
    const starts = /^(?:r-)?b-/i.test(mount.equipmentId.trim());
    if (starts || previous?.arc !== arc) {
      const number = (numbers.get(arc) ?? 0) + Number(starts);
      numbers.set(arc, number);
      bays.push({ arc, number, indices: [] });
    }
    bays.at(-1)!.indices.push(index);
  });
  return bays;
}

/** An affected arc has no complete heat figure; never publish its partial sum. */
export function largeAerospaceHeatByArc(
  resolution: IDropShipMountBV,
  mounts: NonNullable<IDropShipBVUnit['equipment']>,
  capitalType?: CapitalShipBVType,
): readonly { arc: CapitalArc; heat: number | undefined }[] {
  const unresolved = resolution.unresolved.map((u) =>
    largeAerospaceMountArc(mounts[u.mountIndex], capitalType),
  );
  const defensive = new Map<CapitalArc, number>();
  for (const mount of mounts) {
    const id = largeAerospaceMountToken(mount.equipmentId).split(':')[0];
    const kind = getAerospaceDefensiveEquipmentKind(id);
    const arc = largeAerospaceMountArc(mount, capitalType);
    if (kind && kind !== 'amsAmmo' && arc)
      defensive.set(
        arc,
        (defensive.get(arc) ?? 0) + (getEquipmentEntry(id)?.heat ?? 0),
      );
  }
  return resolution.arcs.map((a) => ({
    arc: a.arc,
    heat: unresolved.some((arc) => arc === undefined || arc === a.arc)
      ? undefined
      : a.heat + (defensive.get(a.arc) ?? 0),
  }));
}
