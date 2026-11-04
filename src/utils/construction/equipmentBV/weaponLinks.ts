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
