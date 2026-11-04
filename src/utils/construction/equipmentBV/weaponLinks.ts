import type { BVWeaponLinkType } from './resolution';

import { hasNativeWeaponBVFlag } from './nativeWeaponFlags';
import { getEquipmentEntry } from './resolution';
/** Closed catalog subset carrying native F_ARTEMIS_COMPATIBLE. */
export function isArtemisCompatibleBVWeapon(id: string): boolean {
  return /^(?:clan-)?(?:(?:lrm|srm|mml)-|(?:lr|sr)torpedo)\d+$/.test(id);
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
): Link[] {
  return links.filter((link) => {
    const weapon = weapons.find(
      (w) => eligible(w) && w.location === link.location,
    );
    if (!weapon) return true;
    assign(weapon, link);
    return false;
  });
}

/** First unlinked compatible PPC at the same physical location, in source order. */
export function linkPPCCapacitorBVWeapons<Location>(
  weapons: { id: string; location: Location; capacitorBV?: number }[],
  links: readonly { location: Location }[],
  year?: number,
): void {
  linkBVWeapons(
    weapons,
    links,
    (w) =>
      w.capacitorBV === undefined &&
      isPPCCapacitorCompatibleBVWeapon(w.id, year),
    (w) => {
      w.capacitorBV = PPC_CAPACITOR_BV[w.id];
    },
  );
}

/** MekFileParser.java:499-528: source-order, same-location MRM links. */
export function linkApolloBVWeapons<Location>(
  weapons: {
    id: string;
    location: Location;
    artemisType?: BVWeaponLinkType;
    apolloLinked?: boolean;
  }[],
  links: readonly { location: Location }[],
): void {
  linkBVWeapons(
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
export function linkMountedWeaponBVModifiers<Location>(
  weapons: {
    id: string;
    location: Location;
    compatible: boolean;
    artemisType?: BVWeaponLinkType;
    apolloLinked?: boolean;
  }[],
  mounts: readonly { id: string; location: Location }[],
): void {
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
      linkApolloBVWeapons(weapons, [mount]);
      weapons.forEach((w) => {
        if (w.apolloLinked && !w.artemisType) w.artemisType = 'apollo';
      });
      return;
    }
    const eligible = (w: (typeof weapons)[number]) =>
      !w.artemisType &&
      (type === 'risc'
        ? hasNativeWeaponBVFlag(
            getEquipmentEntry(w.id)?.id ?? w.id,
            'riscLaser',
          ) === true
        : w.compatible);
    const previous =
      type === 'risc'
        ? weapons.find(
            (w) =>
              order.get(w) === index - 1 &&
              w.location === mount.location &&
              eligible(w),
          )
        : undefined;
    linkBVWeapons(
      weapons,
      [mount],
      (w) => eligible(w) && (!previous || w === previous),
      (w) => {
        w.artemisType = type;
      },
    );
  });
}
