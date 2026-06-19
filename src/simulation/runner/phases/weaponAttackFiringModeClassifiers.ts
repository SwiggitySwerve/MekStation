import { isStreakWeapon } from '@/utils/gameplay/clusterWeapons';

import type { IWeapon, IWeaponFiringMode } from '../../ai/types';

import { weaponTypeFromMountId } from './weaponAttackHelpers';

export function isStreakWeaponMount(weapon: IWeapon): boolean {
  const baseId = weaponTypeFromMountId(weapon.id);
  return isStreakWeapon(baseId) || /streak/i.test(weapon.name);
}

export function isClusterSlugMode(
  weapon: IWeapon,
  mode: IWeaponFiringMode | undefined,
): boolean {
  return weapon.firingModes?.kind === 'cluster-slug' && mode?.id === 'cluster';
}
