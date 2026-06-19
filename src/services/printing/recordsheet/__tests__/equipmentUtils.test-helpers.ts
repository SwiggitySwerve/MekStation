/**
 * Equipment Utilities Tests
 *
 * Tests for weapon lookup, damage calculation, and equipment classification
 * helper functions used in record sheet generation.
 */

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeaponCategory, IWeapon } from '@/types/equipment';

import {
  getDamageCode,
  formatMissileDamage,
  lookupWeapon,
  isUnhittableEquipmentName,
} from '../equipmentUtils';

/**
 * Helper to create a mock weapon for testing
 */
export function createMockWeapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'test-weapon',
    name: 'Test Weapon',
    category: WeaponCategory.ENERGY,
    subType: 'Laser',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 5,
    heat: 3,
    ranges: {
      minimum: 0,
      short: 3,
      medium: 6,
      long: 9,
    },
    weight: 1,
    criticalSlots: 1,
    costCBills: 40000,
    battleValue: 46,
    introductionYear: 2400,
    ...overrides,
  };
}
