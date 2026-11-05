import type { AmmoBVPools } from './battleValueOffensiveTypes';

/** Per-mount weapon values keyed like the Java trace's weapon.<n>.<loc>.<name>
 * (getEquipmentNum, getLocationAbbr, getInternalName). The index is MekStation's
 * processing order, not MegaMek's equipment number; the comparator folds both.
 */
export function weaponMountTerms(
  mounts: readonly { name: string; location?: string; bv: number }[] = [],
  locationAbbr: (location: string) => string,
): Record<string, number> {
  const terms: Record<string, number> = {};
  mounts.forEach(({ name, location, bv }, index) => {
    terms[`weapon.${index}.${locationAbbr(location ?? '')}.${name}`] = bv;
  });
  return terms;
}

/** Native ammo pools keyed like the Java trace's ammo.available / ammo.cap. */
export function ammoPoolTerms(pools?: AmmoBVPools): Record<string, number> {
  const terms: Record<string, number> = {};
  for (const [key, bv] of Object.entries(pools?.available ?? {}))
    terms[`ammo.available.${key}`] = bv;
  for (const [key, bv] of Object.entries(pools?.cap ?? {}))
    terms[`ammo.cap.${key}`] = bv;
  return terms;
}
