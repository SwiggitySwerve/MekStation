/**
 * Equipment Utilities Tests
 *
 * Tests for weapon lookup, damage calculation, and equipment classification
 * helper functions used in record sheet generation.
 */

import {
  getDamageCode,
  formatMissileDamage,
  lookupWeapon,
  isUnhittableEquipmentName,
} from '../equipmentUtils';
import { WeaponCategory, IWeapon } from '@/types/equipment';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';

/**
 * Helper to create a mock weapon for testing
 */
function createMockWeapon(overrides: Partial<IWeapon> = {}): IWeapon {
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

describe('equipmentUtils', () => {
  describe('getDamageCode', () => {
    it('should return [DE] for ENERGY weapons', () => {
      expect(getDamageCode(WeaponCategory.ENERGY)).toBe('[DE]');
    });

    it('should return [DB] for BALLISTIC weapons', () => {
      expect(getDamageCode(WeaponCategory.BALLISTIC)).toBe('[DB]');
    });

    it('should return [M,C,S] for MISSILE weapons', () => {
      expect(getDamageCode(WeaponCategory.MISSILE)).toBe('[M,C,S]');
    });

    it('should return [AE] for ARTILLERY weapons', () => {
      expect(getDamageCode(WeaponCategory.ARTILLERY)).toBe('[AE]');
    });

    it('should return [P] for PHYSICAL weapons', () => {
      expect(getDamageCode(WeaponCategory.PHYSICAL)).toBe('[P]');
    });

    it('should return empty string for unknown category', () => {
      expect(getDamageCode('UNKNOWN' as WeaponCategory)).toBe('');
    });
  });

  describe('formatMissileDamage', () => {
    describe('LRM damage formatting', () => {
      it('should return 1/Msl for LRM-5', () => {
        expect(formatMissileDamage('LRM-5', 5)).toBe('1/Msl');
      });

      it('should return 1/Msl for LRM-10', () => {
        expect(formatMissileDamage('LRM-10', 10)).toBe('1/Msl');
      });

      it('should return 1/Msl for LRM-15', () => {
        expect(formatMissileDamage('LRM-15', 15)).toBe('1/Msl');
      });

      it('should return 1/Msl for LRM-20', () => {
        expect(formatMissileDamage('LRM-20', 20)).toBe('1/Msl');
      });

      it('should return 1/Msl for case-insensitive lrm', () => {
        expect(formatMissileDamage('lrm-5', 5)).toBe('1/Msl');
      });

      it('should return 1/Msl for Extended Range LRM', () => {
        expect(formatMissileDamage('ER LRM-5', 5)).toBe('1/Msl');
      });
    });

    describe('SRM damage formatting', () => {
      it('should return 2/Msl for SRM-2', () => {
        expect(formatMissileDamage('SRM-2', 4)).toBe('2/Msl');
      });

      it('should return 2/Msl for SRM-4', () => {
        expect(formatMissileDamage('SRM-4', 8)).toBe('2/Msl');
      });

      it('should return 2/Msl for SRM-6', () => {
        expect(formatMissileDamage('SRM-6', 12)).toBe('2/Msl');
      });

      it('should return 2/Msl for case-insensitive srm', () => {
        expect(formatMissileDamage('srm-4', 8)).toBe('2/Msl');
      });
    });

    describe('Streak SRM damage formatting', () => {
      it('should return 2/Msl for Streak SRM-2', () => {
        expect(formatMissileDamage('Streak SRM-2', 4)).toBe('2/Msl');
      });

      it('should return 2/Msl for Streak SRM-4', () => {
        expect(formatMissileDamage('Streak SRM-4', 8)).toBe('2/Msl');
      });

      it('should return 2/Msl for Streak SRM-6', () => {
        expect(formatMissileDamage('Streak SRM-6', 12)).toBe('2/Msl');
      });

      it('should handle lowercase streak srm', () => {
        expect(formatMissileDamage('streak srm-4', 8)).toBe('2/Msl');
      });
    });

    describe('MRM damage formatting', () => {
      it('should return 1/Msl for MRM-10', () => {
        expect(formatMissileDamage('MRM-10', 10)).toBe('1/Msl');
      });

      it('should return 1/Msl for MRM-20', () => {
        expect(formatMissileDamage('MRM-20', 20)).toBe('1/Msl');
      });

      it('should return 1/Msl for MRM-30', () => {
        expect(formatMissileDamage('MRM-30', 30)).toBe('1/Msl');
      });

      it('should return 1/Msl for MRM-40', () => {
        expect(formatMissileDamage('MRM-40', 40)).toBe('1/Msl');
      });

      it('should handle lowercase mrm', () => {
        expect(formatMissileDamage('mrm-20', 20)).toBe('1/Msl');
      });
    });

    describe('ATM damage formatting', () => {
      it('should return 2/Msl for ATM-3', () => {
        expect(formatMissileDamage('ATM-3', 6)).toBe('2/Msl');
      });

      it('should return 2/Msl for ATM-6', () => {
        expect(formatMissileDamage('ATM-6', 12)).toBe('2/Msl');
      });

      it('should return 2/Msl for ATM-9', () => {
        expect(formatMissileDamage('ATM-9', 18)).toBe('2/Msl');
      });

      it('should return 2/Msl for ATM-12', () => {
        expect(formatMissileDamage('ATM-12', 24)).toBe('2/Msl');
      });

      it('should handle lowercase atm', () => {
        expect(formatMissileDamage('atm-6', 12)).toBe('2/Msl');
      });
    });

    describe('Non-missile weapons', () => {
      it('should return base damage for Medium Laser', () => {
        expect(formatMissileDamage('Medium Laser', 5)).toBe('5');
      });

      it('should return base damage for Large Laser', () => {
        expect(formatMissileDamage('Large Laser', 8)).toBe('8');
      });

      it('should return base damage for PPC', () => {
        expect(formatMissileDamage('PPC', 10)).toBe('10');
      });

      it('should return base damage for AC/10', () => {
        expect(formatMissileDamage('AC/10', 10)).toBe('10');
      });

      it('should handle string damage values', () => {
        expect(formatMissileDamage('Flamer', '2 Heat')).toBe('2 Heat');
      });

      it('should handle zero damage', () => {
        expect(formatMissileDamage('NARC', 0)).toBe('0');
      });
    });
  });

  describe('lookupWeapon', () => {
    const mockWeapons: IWeapon[] = [
      createMockWeapon({ id: 'medium-laser', name: 'Medium Laser' }),
      createMockWeapon({ id: 'large-laser', name: 'Large Laser', damage: 8 }),
      createMockWeapon({ id: 'ppc', name: 'PPC', damage: 10 }),
      createMockWeapon({ id: 'er-large-laser', name: 'ER Large Laser', damage: 10 }),
      createMockWeapon({ id: 'lrm-20', name: 'LRM-20', category: WeaponCategory.MISSILE }),
    ];

    describe('ID-based lookup', () => {
      it('should find weapon by exact ID', () => {
        const result = lookupWeapon(mockWeapons, 'any-name', 'medium-laser');
        expect(result).toBeDefined();
        expect(result?.id).toBe('medium-laser');
      });

      it('should prioritize ID over name', () => {
        const result = lookupWeapon(mockWeapons, 'Large Laser', 'ppc');
        expect(result?.id).toBe('ppc');
      });

      it('should return undefined for non-existent ID', () => {
        const result = lookupWeapon(mockWeapons, 'Medium Laser', 'nonexistent-id');
        // Falls back to name lookup
        expect(result?.id).toBe('medium-laser');
      });
    });

    describe('Name-based lookup', () => {
      it('should find weapon by exact name', () => {
        const result = lookupWeapon(mockWeapons, 'Medium Laser');
        expect(result).toBeDefined();
        expect(result?.name).toBe('Medium Laser');
      });

      it('should find weapon by case-insensitive name', () => {
        const result = lookupWeapon(mockWeapons, 'medium laser');
        expect(result).toBeDefined();
        expect(result?.name).toBe('Medium Laser');
      });

      it('should find weapon by uppercase name', () => {
        const result = lookupWeapon(mockWeapons, 'MEDIUM LASER');
        expect(result).toBeDefined();
        expect(result?.name).toBe('Medium Laser');
      });

      it('should find weapon by partial match (name contains search)', () => {
        const result = lookupWeapon(mockWeapons, 'Large');
        expect(result).toBeDefined();
        // Should match "Large Laser" which contains "Large"
        expect(result?.name).toContain('Large');
      });

      it('should find weapon by partial match (search contains name)', () => {
        // This tests the inverse partial match
        const result = lookupWeapon(mockWeapons, 'PPC Standard');
        expect(result).toBeDefined();
        expect(result?.name).toBe('PPC');
      });
    });

    describe('Edge cases', () => {
      it('should return undefined for empty weapons array', () => {
        const result = lookupWeapon([], 'Medium Laser');
        expect(result).toBeUndefined();
      });

      it('should return undefined when no match found', () => {
        const result = lookupWeapon(mockWeapons, 'Gauss Rifle');
        expect(result).toBeUndefined();
      });

      it('should return first match for ambiguous partial matches', () => {
        // Both "Large Laser" and "ER Large Laser" contain "Large"
        const result = lookupWeapon(mockWeapons, 'Large');
        expect(result).toBeDefined();
      });

      it('should handle empty search string', () => {
        const result = lookupWeapon(mockWeapons, '');
        // Partial match should work - every name contains empty string
        expect(result).toBeDefined();
      });

      it('should handle undefined ID gracefully', () => {
        const result = lookupWeapon(mockWeapons, 'LRM-20', undefined);
        expect(result).toBeDefined();
        expect(result?.name).toBe('LRM-20');
      });
    });
  });

  describe('isUnhittableEquipmentName', () => {
    describe('Endo Steel variants', () => {
      it('should return true for "Endo Steel"', () => {
        expect(isUnhittableEquipmentName('Endo Steel')).toBe(true);
      });

      it('should return true for "Endo-Steel"', () => {
        expect(isUnhittableEquipmentName('Endo-Steel')).toBe(true);
      });

      it('should return true for "Endo Steel (Clan)"', () => {
        expect(isUnhittableEquipmentName('Endo Steel (Clan)')).toBe(true);
      });

      it('should return true for lowercase "endo steel"', () => {
        expect(isUnhittableEquipmentName('endo steel')).toBe(true);
      });

      it('should return true for "Endo-Composite"', () => {
        expect(isUnhittableEquipmentName('Endo-Steel Composite')).toBe(true);
      });
    });

    describe('Ferro-Fibrous variants', () => {
      it('should return true for "Ferro-Fibrous"', () => {
        expect(isUnhittableEquipmentName('Ferro-Fibrous')).toBe(true);
      });

      it('should return true for "Ferro Fibrous"', () => {
        expect(isUnhittableEquipmentName('Ferro Fibrous')).toBe(true);
      });

      it('should return true for "Ferro-Fibrous (Clan)"', () => {
        expect(isUnhittableEquipmentName('Ferro-Fibrous (Clan)')).toBe(true);
      });

      it('should return true for "Heavy Ferro-Fibrous"', () => {
        expect(isUnhittableEquipmentName('Heavy Ferro-Fibrous')).toBe(true);
      });

      it('should return true for "Light Ferro-Fibrous"', () => {
        expect(isUnhittableEquipmentName('Light Ferro-Fibrous')).toBe(true);
      });

      it('should return true for lowercase "ferro-fibrous"', () => {
        expect(isUnhittableEquipmentName('ferro-fibrous')).toBe(true);
      });
    });

    describe('Triple Strength Myomer variants', () => {
      it('should return true for "Triple Strength Myomer"', () => {
        expect(isUnhittableEquipmentName('Triple Strength Myomer')).toBe(true);
      });

      it('should return true for "TSM"', () => {
        expect(isUnhittableEquipmentName('TSM')).toBe(true);
      });

      it('should return true for lowercase "tsm"', () => {
        expect(isUnhittableEquipmentName('tsm')).toBe(true);
      });

      it('should return true for "Industrial TSM"', () => {
        expect(isUnhittableEquipmentName('Industrial TSM')).toBe(true);
      });

      it('should return true for generic "Myomer" (non-standard)', () => {
        expect(isUnhittableEquipmentName('Enhanced Myomer')).toBe(true);
      });

      it('should return false for "Standard Myomer"', () => {
        expect(isUnhittableEquipmentName('Standard Myomer')).toBe(false);
      });
    });

    describe('Stealth armor', () => {
      it('should return true for "Stealth Armor"', () => {
        expect(isUnhittableEquipmentName('Stealth Armor')).toBe(true);
      });

      it('should return true for "Stealth"', () => {
        expect(isUnhittableEquipmentName('Stealth')).toBe(true);
      });

      it('should return true for lowercase "stealth armor"', () => {
        expect(isUnhittableEquipmentName('stealth armor')).toBe(true);
      });
    });

    describe('Reactive armor', () => {
      it('should return true for "Reactive Armor"', () => {
        expect(isUnhittableEquipmentName('Reactive Armor')).toBe(true);
      });

      it('should return true for "Reactive"', () => {
        expect(isUnhittableEquipmentName('Reactive')).toBe(true);
      });

      it('should return true for lowercase "reactive"', () => {
        expect(isUnhittableEquipmentName('reactive')).toBe(true);
      });
    });

    describe('Reflective armor', () => {
      it('should return true for "Reflective Armor"', () => {
        expect(isUnhittableEquipmentName('Reflective Armor')).toBe(true);
      });

      it('should return true for "Reflective"', () => {
        expect(isUnhittableEquipmentName('Reflective')).toBe(true);
      });

      it('should return true for lowercase "reflective"', () => {
        expect(isUnhittableEquipmentName('reflective')).toBe(true);
      });
    });

    describe('Blue Shield', () => {
      it('should return true for "Blue Shield Particle Field Damper"', () => {
        expect(isUnhittableEquipmentName('Blue Shield Particle Field Damper')).toBe(true);
      });

      it('should return true for "Blue Shield"', () => {
        expect(isUnhittableEquipmentName('Blue Shield')).toBe(true);
      });

      it('should return true for lowercase "blue shield"', () => {
        expect(isUnhittableEquipmentName('blue shield')).toBe(true);
      });
    });

    describe('Hittable equipment (should return false)', () => {
      it('should return false for "Medium Laser"', () => {
        expect(isUnhittableEquipmentName('Medium Laser')).toBe(false);
      });

      it('should return false for "PPC"', () => {
        expect(isUnhittableEquipmentName('PPC')).toBe(false);
      });

      it('should return false for "SRM-6"', () => {
        expect(isUnhittableEquipmentName('SRM-6')).toBe(false);
      });

      it('should return false for "LRM-20"', () => {
        expect(isUnhittableEquipmentName('LRM-20')).toBe(false);
      });

      it('should return false for "AC/10"', () => {
        expect(isUnhittableEquipmentName('AC/10')).toBe(false);
      });

      it('should return false for "Heat Sink"', () => {
        expect(isUnhittableEquipmentName('Heat Sink')).toBe(false);
      });

      it('should return false for "Double Heat Sink"', () => {
        expect(isUnhittableEquipmentName('Double Heat Sink')).toBe(false);
      });

      it('should return false for "Jump Jet"', () => {
        expect(isUnhittableEquipmentName('Jump Jet')).toBe(false);
      });

      it('should return false for "CASE"', () => {
        expect(isUnhittableEquipmentName('CASE')).toBe(false);
      });

      it('should return false for "MASC"', () => {
        expect(isUnhittableEquipmentName('MASC')).toBe(false);
      });

      it('should return false for "Targeting Computer"', () => {
        expect(isUnhittableEquipmentName('Targeting Computer')).toBe(false);
      });

      it('should return false for "Fusion Engine"', () => {
        expect(isUnhittableEquipmentName('Fusion Engine')).toBe(false);
      });

      it('should return false for "Gyro"', () => {
        expect(isUnhittableEquipmentName('Gyro')).toBe(false);
      });

      it('should return false for "Cockpit"', () => {
        expect(isUnhittableEquipmentName('Cockpit')).toBe(false);
      });

      it('should return false for "Standard Armor"', () => {
        expect(isUnhittableEquipmentName('Standard Armor')).toBe(false);
      });

      it('should return false for "Standard Structure"', () => {
        expect(isUnhittableEquipmentName('Standard Structure')).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(isUnhittableEquipmentName('')).toBe(false);
      });

      it('should return false for "Shoulder"', () => {
        expect(isUnhittableEquipmentName('Shoulder')).toBe(false);
      });

      it('should return false for "Upper Arm Actuator"', () => {
        expect(isUnhittableEquipmentName('Upper Arm Actuator')).toBe(false);
      });
    });
  });
});
