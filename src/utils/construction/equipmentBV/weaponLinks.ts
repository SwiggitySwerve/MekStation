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

/** No-critical-slot fallback: MekFileParser.java:928-944; BVCalculator.java:807-816. */
export function linkAerospaceMachineGunArrayBVWeapons<Location>(
  weapons: {
    location: Location;
    baseBV: number;
    bv: number;
    ammoGroup?: string;
    arrayGroup?: string;
  }[],
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
    array.bv = base * 0.67;
  }
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
    artemisType?: 'iv' | 'v';
    apolloLinked?: boolean;
  }[],
  links: readonly { location: Location }[],
): void {
  linkBVWeapons(
    weapons,
    links,
    (w) => !w.artemisType && !w.apolloLinked && /^mrm-\d+$/.test(w.id),
    (w) => {
      w.apolloLinked = true;
    },
  );
}
