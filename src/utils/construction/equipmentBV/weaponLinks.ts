import type { BVWeaponLinkType } from './resolution';

import { hasNativeWeaponBVFlag } from './nativeWeaponFlags';
import { getEquipmentEntry } from './resolution';

/** Pinned native F_ARTEMIS_COMPATIBLE, including inherited weapon flags. */
export function isArtemisCompatibleBVWeapon(id: string): boolean {
  return (
    hasNativeWeaponBVFlag(getEquipmentEntry(id)?.id ?? id, 'artemis') === true
  );
}

/** First compatible unlinked launcher at the same physical location.
 * MegaMek 48fcb2f64, MekFileParser.java:425-449. Returns unmatched links.
 */
export function linkArtemisBVWeapons<
  Location,
  Link extends { location?: Location; type: 'iv' | 'v' },
>(
  weapons: {
    location: Location;
    compatible: boolean;
    artemisType?: 'iv' | 'v';
  }[],
  links: readonly Link[],
): Link[] {
  return linkBVWeapons(
    weapons,
    links,
    (w) => w.compatible && !w.artemisType,
    (w, link) => {
      w.artemisType = link.type;
    },
  );
}

export interface IMachineGunArrayBVWeapon<Location> {
  location: Location;
  baseBV: number;
  bv: number;
  ammoGroup?: string;
  arrayGroup?: string;
  /** Unscaled linked sum, retained for caller-specific admission guards. */
  linkedBaseBV?: number;
}

/** No-critical-slot fallback: MekFileParser.java:928-944; BVCalculator.java:807-816. */
export function linkMachineGunArrayBVWeapons<Location>(
  weapons: IMachineGunArrayBVWeapon<Location>[],
): void {
  const used = new Set<(typeof weapons)[number]>();
  for (const array of weapons) {
    const group = array.arrayGroup;
    if (!group) continue;
    let base = 0;
    for (let i = 0; i < 4; i++) {
      const unmatched = linkBVWeapons(
        weapons,
        [array],
        (w) => !used.has(w) && w.ammoGroup === group && !w.arrayGroup,
        (w) => {
          used.add(w);
          base += w.baseBV;
        },
      );
      if (unmatched.length) break;
    }
    array.linkedBaseBV = base;
    array.bv = base * 0.67;
  }
}

/** Compatibility export; the shared owner also serves non-aircraft callers. */
export { linkMachineGunArrayBVWeapons as linkAerospaceMachineGunArrayBVWeapons };

// MekFileParser.java:90-93; MiscType.java:1322-1347 (48fcb2f64).
const PPC_CAPACITOR_BV: Readonly<Record<string, number>> = {
  'light-ppc': 44,
  ppc: 88,
  'heavy-ppc': 53,
  'snub-nose-ppc': 87,
  'er-ppc': 114,
  'clan-er-ppc': 136,
  'improved-ppc': 88,
  'enhanced-ppc': 88,
};
export function isPPCCapacitorCompatibleBVWeapon(
  id: string,
  year = 0,
): boolean {
  return (
    Object.hasOwn(PPC_CAPACITOR_BV, id) &&
    (id !== 'clan-er-ppc' || year >= 3101)
  );
}

function linkBVWeapons<
  Location,
  Weapon extends { location: Location },
  Link extends { location?: Location },
>(
  weapons: Weapon[],
  links: readonly Link[],
  eligible: (weapon: Weapon) => boolean,
  assign: (weapon: Weapon, link: Link) => void,
  preferred?: (link: Link) => Weapon | undefined,
): Link[] {
  return links.filter((link) => {
    const candidate = preferred?.(link);
    const weapon =
      candidate && eligible(candidate) && candidate.location === link.location
        ? candidate
        : weapons.find((w) => eligible(w) && w.location === link.location);
    if (!weapon) return true;
    assign(weapon, link);
    return false;
  });
}

/** Shared native PPC pairing: MekFileParser.java:472-495 at 48fcb2f64. */
export function linkPPCCapacitorWeapons<
  Location,
  Weapon extends { id: string; location: Location },
  Link extends { location: Location },
>(
  weapons: Weapon[],
  links: readonly Link[],
  year: number | undefined,
  unlinked: (weapon: Weapon) => boolean,
  assign: (weapon: Weapon) => void,
): Link[] {
  return linkBVWeapons(
    weapons,
    links,
    (w) => unlinked(w) && isPPCCapacitorCompatibleBVWeapon(w.id, year),
    assign,
  );
}

/** MekFileParser.java:360-388: shared insulator/RISC occupancy, predecessor first. */
export function linkLaserInsulatorWeapons<Location>(
  weapons: {
    id: string;
    location: Location;
    order: number;
    laser: boolean;
    linked: boolean;
    insulated: boolean;
  }[],
  links: readonly {
    location: Location;
    order: number;
    kind: 'insulator' | 'risc';
  }[],
): void {
  for (const link of links)
    linkBVWeapons(
      weapons,
      [link],
      (w) =>
        !w.linked && (link.kind === 'insulator' ? w.laser : isRiscLaser(w.id)),
      (w) => {
        w.linked = true;
        w.insulated = link.kind === 'insulator';
      },
      () => weapons.find((w) => w.order === link.order - 1),
    );
}

function isRiscLaser(id: string): boolean {
  return (
    hasNativeWeaponBVFlag(getEquipmentEntry(id)?.id ?? id, 'riscLaser') === true
  );
}

/** First unlinked compatible PPC at the same physical location, in source order. */
export function linkPPCCapacitorBVWeapons<
  Location,
  Link extends { location: Location },
>(
  weapons: { id: string; location: Location; capacitorBV?: number }[],
  links: readonly Link[],
  year?: number,
): Link[] {
  return linkPPCCapacitorWeapons(
    weapons,
    links,
    year,
    (w) => w.capacitorBV === undefined,
    (w) => {
      w.capacitorBV = PPC_CAPACITOR_BV[w.id];
    },
  );
}

/** MekFileParser.java:499-528: source-order, same-location MRM links. */
export function linkApolloBVWeapons<
  Location,
  Link extends { location: Location },
>(
  weapons: {
    id: string;
    location: Location;
    artemisType?: BVWeaponLinkType;
    apolloLinked?: boolean;
  }[],
  links: readonly Link[],
): Link[] {
  return linkBVWeapons(
    weapons,
    links,
    (w) =>
      !w.artemisType &&
      !w.apolloLinked &&
      hasNativeWeaponBVFlag(getEquipmentEntry(w.id)?.id ?? w.id, 'apollo') ===
        true,
    (w) => {
      w.apolloLinked = true;
    },
  );
}

/** Native module identities; MekFileParser.java:359-388,424-449,499-528. */
export function getMountedBVLinkType(id: string): BVWeaponLinkType | undefined {
  const types: Readonly<Record<string, BVWeaponLinkType>> = {
    artemisiv: 'iv',
    artemisv: 'v',
    artemisivproto: 'proto',
    apollo: 'apollo',
    risclaserpulsemodule: 'risc',
  };
  const key = getEquipmentEntry(id)?.id ?? id;
  return Object.hasOwn(types, key) ? types[key] : undefined;
}
export function linkMountedWeaponBVModifiers<
  Location,
  Mount extends { id: string; location: Location },
>(
  weapons: {
    id: string;
    location: Location;
    compatible: boolean;
    artemisType?: BVWeaponLinkType;
    apolloLinked?: boolean;
  }[],
  mounts: readonly Mount[],
): Mount[] {
  const unmatched: Mount[] = [];
  const order = new Map<(typeof weapons)[number], number>();
  mounts.forEach((mount, index) => {
    const id = getEquipmentEntry(mount.id)?.id ?? mount.id;
    const weapon = weapons.find(
      (w) =>
        !order.has(w) &&
        (getEquipmentEntry(w.id)?.id ?? w.id) === id &&
        w.location === mount.location,
    );
    if (weapon) order.set(weapon, index);
  });
  mounts.forEach((mount, index) => {
    const type = getMountedBVLinkType(mount.id);
    if (!type) return;
    if (type === 'apollo') {
      unmatched.push(...linkApolloBVWeapons(weapons, [mount]));
      weapons.forEach((w) => {
        if (w.apolloLinked && !w.artemisType) w.artemisType = 'apollo';
      });
      return;
    }
    const eligible = (w: (typeof weapons)[number]) =>
      !w.artemisType && (type === 'risc' ? isRiscLaser(w.id) : w.compatible);
    const previous =
      type === 'risc'
        ? weapons.find(
            (w) =>
              order.get(w) === index - 1 &&
              w.location === mount.location &&
              eligible(w),
          )
        : undefined;
    unmatched.push(
      ...linkBVWeapons(
        weapons,
        [mount],
        eligible,
        (w) => {
          w.artemisType = type;
        },
        () => previous,
      ),
    );
  });
  return unmatched;
}
