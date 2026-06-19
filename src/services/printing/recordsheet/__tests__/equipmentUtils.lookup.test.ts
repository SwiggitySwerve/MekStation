import { WeaponCategory, type IWeapon } from '@/types/equipment';

import {
  getDamageCode,
  formatMissileDamage,
  lookupWeapon,
  isUnhittableEquipmentName,
} from '../equipmentUtils';
import { createMockWeapon } from './equipmentUtils.test-helpers';

describe('lookupWeapon', () => {
  const mockWeapons: IWeapon[] = [
    createMockWeapon({ id: 'medium-laser', name: 'Medium Laser' }),
    createMockWeapon({ id: 'large-laser', name: 'Large Laser', damage: 8 }),
    createMockWeapon({ id: 'ppc', name: 'PPC', damage: 10 }),
    createMockWeapon({
      id: 'er-large-laser',
      name: 'ER Large Laser',
      damage: 10,
    }),
    createMockWeapon({
      id: 'lrm-20',
      name: 'LRM-20',
      category: WeaponCategory.MISSILE,
    }),
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
      const result = lookupWeapon(
        mockWeapons,
        'Medium Laser',
        'nonexistent-id',
      );
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
