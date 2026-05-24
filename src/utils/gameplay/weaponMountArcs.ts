import { FiringArc } from '@/types/gameplay';

import { canFireFromArc } from './firingArcs';

export interface IWeaponMountArcProfile {
  readonly mountingArc?: FiringArc;
  readonly mountingArcs?: readonly FiringArc[];
}

export function representedWeaponMountArcs(
  weapon: IWeaponMountArcProfile,
): readonly FiringArc[] | undefined {
  if (weapon.mountingArcs !== undefined) return weapon.mountingArcs;
  if (weapon.mountingArc !== undefined) return [weapon.mountingArc];
  return undefined;
}

export function weaponMountCoversTargetArc(
  weapon: IWeaponMountArcProfile,
  targetArc: FiringArc | null | undefined,
): boolean {
  if (!targetArc) return false;

  const arcs = representedWeaponMountArcs(weapon);
  if (arcs === undefined) return true;

  return arcs.some((arc) => canFireFromArc(arc, targetArc));
}
