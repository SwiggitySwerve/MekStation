import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';

import {
  isFireWeaponCategory,
  isWeaponCategory,
} from '../ammunitionCompatibility';

// The one owner of the vehicle weapon-versus-equipment split: every weapon
// category except physical weapons, in the registry enum form and in the BV
// catalog's string form.
describe('isFireWeaponCategory', () => {
  it.each([
    EquipmentCategory.ENERGY_WEAPON,
    EquipmentCategory.BALLISTIC_WEAPON,
    EquipmentCategory.MISSILE_WEAPON,
    EquipmentCategory.ARTILLERY,
    EquipmentCategory.CAPITAL_WEAPON,
    'Energy',
    'Ballistic',
    'Missile',
    'Artillery',
    'Capital',
  ])('accepts the weapon category %s', (category) => {
    expect(isFireWeaponCategory(category)).toBe(true);
  });

  it.each([
    EquipmentCategory.PHYSICAL_WEAPON,
    EquipmentCategory.AMMUNITION,
    EquipmentCategory.ELECTRONICS,
    EquipmentCategory.MOVEMENT,
    EquipmentCategory.STRUCTURAL,
    EquipmentCategory.MISC_EQUIPMENT,
    'Physical',
    'Ammunition',
    'ECM',
    'Miscellaneous',
    'TAG',
  ])('rejects the non-firing category %s', (category) => {
    expect(isFireWeaponCategory(category)).toBe(false);
  });

  it('is exactly isWeaponCategory minus physical weapons for every enum value', () => {
    for (const category of Object.values(EquipmentCategory))
      expect(isFireWeaponCategory(category)).toBe(
        isWeaponCategory(category) &&
          category !== EquipmentCategory.PHYSICAL_WEAPON,
      );
  });
});
