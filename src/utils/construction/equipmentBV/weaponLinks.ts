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
  return links.filter((link) => {
    const weapon = weapons.find(
      (w) => w.compatible && !w.artemisType && w.location === link.location,
    );
    if (!weapon) return true;
    weapon.artemisType = link.type;
    return false;
  });
}
