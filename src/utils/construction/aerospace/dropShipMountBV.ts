import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';

import type { BVWeaponLinkType } from '../equipmentBV/resolution';
import type { CapitalShipBVType } from './aerospaceBVTypes';
import type { IDropShipBVUnit } from './dropShipBV';
import type {
  ILargeAerospaceArcBV,
  ILargeAerospaceWeaponGroup,
} from './largeAerospaceFirePool';

import {
  addBVToAmmoCapGroup,
  getLargeAerospaceAmmoBVGroup,
  largeAerospaceAmmoBVMultiplier,
  getMachineGunArrayBVGroup,
} from '../battleValueAmmo';
import { isNonOffensiveLargeAerospaceMisc } from '../battleValueEquipment';
import { getCapitalEquipmentBVFacts } from '../equipmentBV/catalogLoader';
import {
  isArtemisCompatibleBVWeapon,
  getMountedBVLinkType,
  linkMountedWeaponBVModifiers,
  linkPPCCapacitorBVWeapons,
  linkMachineGunArrayBVWeapons,
} from '../equipmentBV/weaponLinks';
import {
  getWeaponLinkBVMultiplier,
  getEquipmentEntry,
  getLargeAerospaceAmmoEntry,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { getAerospaceDefensiveEquipmentKind } from './aerospaceBVEquipment';
import {
  isRearMountedAerospaceEquipment,
  largeAerospaceMountToken,
  parseLargeAerospaceMount,
} from './aerospaceMountFlags';
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
  year?: number,
): IDropShipMountBV {
  const arcs = getLargeAerospaceArcs(capitalType === UnitType.WARSHIP).map(
    (arc) => ({
      arc,
      weaponBV: 0,
      weaponSelectionBV: 0,
      arcIndependentWeaponBV: 0,
      heat: 0,
      ammoBVByType: {} as Record<string, number>,
      weaponBVByAmmoType: {} as Record<string, number>,
      nonOffensiveCapBVByAmmoType: {} as Record<string, number>,
      weaponGroups: [] as ILargeAerospaceWeaponGroup[],
    }),
  );
  const unresolved: {
    mountIndex: number;
    equipmentId: string;
    reason: string;
  }[] = [];
  const weapons: {
    id: string;
    arc: (typeof arcs)[number];
    location: CapitalArc;
    baseBV: number;
    bv: number;
    heat: number;
    rear: boolean;
    ammoGroup?: string;
    arrayGroup?: string;
    capacitorBV?: number;
    compatible: boolean;
    artemisType?: BVWeaponLinkType;
  }[] = [];
  const links: {
    mountIndex: number;
    equipmentId: string;
    location: CapitalArc;
    id: string;
  }[] = [];
  const capacitors: (typeof links)[number][] = [];
  mounts.forEach((mount, mountIndex) => {
    const fail = (reason: string): void => {
      unresolved.push({ mountIndex, equipmentId: mount.equipmentId, reason });
    };
    const parsed = parseLargeAerospaceMount(mount.equipmentId);
    if (!parsed) {
      fail('Unsupported mount suffix or ammunition quantity');
      return;
    }
    const { id, quantity, size } = parsed;
    if (size !== undefined) {
      const sized = getEquipmentEntry(id);
      if (!sized || !isNonOffensiveLargeAerospaceMisc(sized.id, size))
        fail('Unsupported variable-size equipment');
      return;
    }
    // The shared classifier owns defensive exclusions, including hull electronics.
    const defensiveKind = getAerospaceDefensiveEquipmentKind(id);
    if (defensiveKind) {
      if (
        quantity !== undefined &&
        (!['amsAmmo', 'screenAmmo'].includes(defensiveKind) ||
          !Number.isSafeInteger(Number(quantity)))
      )
        fail('Invalid defensive ammunition quantity');
      // assembleAmmo still lists a screen launcher as an ammo-using weapon
      // (SCREEN_LAUNCHER:0). No ammo bin keys on it, so this is trace-only.
      const screenEntry =
        defensiveKind === 'screen' && quantity === undefined
          ? getEquipmentEntry(id)
          : undefined;
      const screen = screenEntry && getCapitalEquipmentBVFacts(screenEntry.id);
      const screenArc = screen
        ? arcs.find((a) => a.arc === largeAerospaceMountArc(mount, capitalType))
        : undefined;
      if (screen && screenArc)
        addBVToAmmoCapGroup(
          screenArc.nonOffensiveCapBVByAmmoType,
          `${screen.ammoType}:${screen.rackSize}`,
          resolveEquipmentBV(id).battleValue,
        );
      return;
    }
    const entry = getEquipmentEntry(id);
    const physicalLocation = largeAerospaceMountArc(mount, capitalType, false);
    const linkType = entry && getMountedBVLinkType(entry.id);
    if (
      quantity === undefined &&
      entry &&
      (['iv', 'v', 'apollo'].includes(linkType ?? '') ||
        entry.id === 'ppc-capacitor')
    ) {
      if (physicalLocation === undefined) {
        fail('Unsupported weapon link location');
        return;
      }
      (entry.id === 'ppc-capacitor' ? capacitors : links).push({
        mountIndex,
        equipmentId: mount.equipmentId,
        location: physicalLocation,
        id: entry.id,
      });
      return;
    }
    if (
      quantity === undefined &&
      entry &&
      isNonOffensiveLargeAerospaceMisc(entry.id)
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
    const arrayGroup = getMachineGunArrayBVGroup(entry.id);
    const capital = getCapitalEquipmentBVFacts(entry.id);
    if (
      !(
        key && ['Ballistic', 'Missile', 'Artillery'].includes(entry.category)
      ) &&
      !arrayGroup &&
      !(capital?.isCapital || capital?.isSubCapital) &&
      !(entry.category === 'Energy' && ENERGY_SUBTYPES.has(entry.subType ?? ''))
    ) {
      fail('Unsupported weapon, linked modifier or offensive equipment');
      return;
    }
    const value = resolveEquipmentBV(id);
    weapons.push({
      id: entry.id,
      arc,
      location: physicalLocation,
      baseBV: value.battleValue,
      bv: value.battleValue,
      heat: value.heat,
      rear: isRearMountedAerospaceEquipment(mount.equipmentId),
      ammoGroup: key,
      arrayGroup,
      compatible: isArtemisCompatibleBVWeapon(entry.id),
    });
    if (key)
      addBVToAmmoCapGroup(arc.weaponBVByAmmoType, key, value.battleValue);
  });
  // MekFileParser links to the first unlinked compatible launcher in the same
  // physical location, regardless of rear flags or adjacency in the BLK list.
  linkMachineGunArrayBVWeapons(weapons);
  const unmatched = [
    ...linkMountedWeaponBVModifiers(weapons, links),
    ...linkPPCCapacitorBVWeapons(weapons, capacitors, year),
  ];
  for (const link of unmatched) {
    unresolved.push({
      mountIndex: link.mountIndex,
      equipmentId: link.equipmentId,
      reason: 'Unmatched native weapon link',
    });
  }
  const capacitorGroups = new Set<string>();
  const summed = new Map<
    string,
    {
      -readonly [K in keyof ILargeAerospaceWeaponGroup]: ILargeAerospaceWeaponGroup[K];
    }
  >();
  for (const weapon of weapons) {
    const value = weapon.bv * getWeaponLinkBVMultiplier(weapon.artemisType);
    const capacitor = weapon.capacitorBV ?? 0;
    // LargeAeroBVCalculator.canBeSummed: type, location, rear flag, link type.
    const summedKey = `${weapon.id}|${weapon.location}|${weapon.rear}|${weapon.artemisType ?? ''}|${capacitor ? 'cap' : ''}`;
    const sum = summed.get(summedKey);
    if (sum) {
      sum.count += 1;
      sum.weaponBV += value;
    } else {
      const created = {
        id: weapon.id,
        location: weapon.location,
        count: 1,
        weaponBV: value,
        capacitorBV: capacitor,
      };
      summed.set(summedKey, created);
      weapon.arc.weaponGroups.push(created);
    }
    weapon.arc.weaponSelectionBV += value + capacitor;
    weapon.arc.weaponBV += value;
    weapon.arc.heat += weapon.heat + (capacitor ? 5 : 0);
    const group = `${weapon.id}|${weapon.location}|${weapon.rear}`;
    // LargeAeroBVCalculator.java:246-269 groups equal mounts before processWeapon;
    // BVCalculator.java:853-857 adds one capacitor after arc weighting per group.
    if (capacitor && !capacitorGroups.has(group)) {
      capacitorGroups.add(group);
      weapon.arc.arcIndependentWeaponBV += capacitor;
    }
  }
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
    if (kind && !['amsAmmo', 'screenAmmo'].includes(kind) && arc)
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
