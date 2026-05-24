import type { IWeaponStatus } from '@/types/gameplay';

export function selectCombatProjectionWeapons(
  weapons: readonly IWeaponStatus[],
  selectedWeaponIds?: readonly string[] | null,
): readonly IWeaponStatus[] {
  if (!selectedWeaponIds || selectedWeaponIds.length === 0) return weapons;

  const selectedIds = new Set(selectedWeaponIds);
  return weapons.filter((weapon) => selectedIds.has(weapon.id));
}
