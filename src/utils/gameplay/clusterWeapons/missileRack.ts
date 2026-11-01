/**
 * Missile rack identification shared by the firing side (runner cluster/Streak
 * resolution, selected-AMS session cluster) and the damage previews, so a
 * hydrated mount id such as `lrm-16-0` reads as the same rack everywhere.
 *
 * The family check mirrors `isMissileWeapon` in `specialWeaponMechanics`; it is
 * kept local because that module imports this one's facade.
 */

const MISSILE_FAMILY = /lrm|srm|mml|mrm|atm/i;
const MISSILE_RACK = /(?:lrm|srm|mrm|atm|mml)[\s-]?(\d+)/i;

/** Drop the trailing `-<mountIndex>` hydration adds to catalog ids. */
function mountBaseId(weaponId: string): string {
  const match = weaponId.match(/^(.+)-(\d+)$/);
  return match ? match[1] : weaponId;
}

/** True for LRM/SRM/MRM/ATM/MML mounts, judged by base id or display name. */
export function isMissileClusterWeapon(
  weaponId: string,
  weaponName: string,
): boolean {
  return (
    MISSILE_FAMILY.test(mountBaseId(weaponId)) ||
    MISSILE_FAMILY.test(weaponName)
  );
}

/** Rack size read from the base id, the full id, then the name; else undefined. */
export function missileRackSize(
  weaponId: string,
  weaponName: string,
): number | undefined {
  for (const candidate of [mountBaseId(weaponId), weaponId, weaponName]) {
    const match = candidate.match(MISSILE_RACK);
    if (!match) continue;
    const size = parseInt(match[1], 10);
    if (Number.isFinite(size) && size > 0) return size;
  }
  return undefined;
}
