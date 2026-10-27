import { EquipmentBehaviorFlag } from '@/types/enums/EquipmentFlag';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';

/** Catalog naming convention, shared with the browser's one-shot filter. */
export function isOneShotEquipment(
  item: Pick<IEquipmentItem, 'name'>,
): boolean {
  return /(?:one[ -]shot|\((?:i-)?os\))/i.test(item.name);
}

/** Weapons with self-contained ammunition do not need a separate bin. */
export function requiresExternalAmmunition(
  weapon: IEquipmentItem,
  catalog: readonly IEquipmentItem[],
): boolean {
  if (
    !isWeaponCategory(weapon.category) ||
    weapon.category === EquipmentCategory.PHYSICAL_WEAPON
  )
    return false;
  if (
    isOneShotEquipment(weapon) ||
    weapon.flags?.includes(EquipmentBehaviorFlag.OneShot) ||
    weapon.flags?.includes('INTERNAL_AMMO') ||
    weapon.special?.some((value) =>
      /one[ -]shot|internal[ -]amm(?:o|unition)/i.test(value),
    )
  )
    return false;
  const matches = createAmmoWeaponMatcher([weapon.id], catalog);
  return (
    (weapon.ammoPerTon ?? 0) > 0 ||
    catalog.some(
      (item) => item.category === EquipmentCategory.AMMUNITION && matches(item),
    )
  );
}

const WEAPON_CATEGORIES: ReadonlySet<EquipmentCategory> = new Set([
  EquipmentCategory.ENERGY_WEAPON,
  EquipmentCategory.BALLISTIC_WEAPON,
  EquipmentCategory.MISSILE_WEAPON,
  EquipmentCategory.ARTILLERY,
  EquipmentCategory.CAPITAL_WEAPON,
  EquipmentCategory.PHYSICAL_WEAPON,
]);

export function isWeaponCategory(category: EquipmentCategory): boolean {
  return WEAPON_CATEGORIES.has(category);
}

function normalizeIdentity(identity: string): string {
  return identity.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Exact fallback for imported ammunition whose compatibility list is absent.
 * A trailing bin size ("Machine Gun Ammo [Full]") names the bin, not the weapon.
 */
function ammunitionIdentity(identity: string): string {
  return normalizeIdentity(
    identity
      .replace(/\s*\[(?:full|half)\]$/i, '')
      .replace(/^ammo[-\s]+/i, '')
      .replace(/[-\s]+ammo(?:unition)?$/i, ''),
  );
}

export function createAmmoWeaponMatcher(
  weaponIds: readonly string[],
  equipment: readonly IEquipmentItem[],
): (ammunition: IEquipmentItem) => boolean {
  const mountedIds = new Set(weaponIds);
  const identities = new Set(weaponIds.map(normalizeIdentity));
  for (const item of equipment) {
    if (mountedIds.has(item.id) && isWeaponCategory(item.category)) {
      identities.add(normalizeIdentity(item.name));
    }
  }
  return (ammunition) => {
    if (ammunition.compatibleWeaponIds?.length) {
      return ammunition.compatibleWeaponIds.some((id) => mountedIds.has(id));
    }
    return (
      identities.has(ammunitionIdentity(ammunition.id)) ||
      identities.has(ammunitionIdentity(ammunition.name))
    );
  };
}
