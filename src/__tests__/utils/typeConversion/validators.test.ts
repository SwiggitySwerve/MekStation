/**
 * Tests for validation utilities
 */

import {
  validateFullUnit,
  validateUnitData,
  isValidTechBaseString,
  isValidRulesLevelValue,
} from '../../../utils/typeConversion/validators';
import { FullUnit } from '../../../types';

describe('validators', () => {
  describe('validateFullUnit', () => {
    it('should validate a complete valid unit', () => {
      const unit: FullUnit = {
        id: 'test-1',
        chassis: 'Atlas',
        model: 'AS7-D',
        mass: 100,
        era: '3025',
        tech_base: 'Inner Sphere',
        rules_level: 'Standard',
        data: {
          chassis: 'Atlas',
          model: 'AS7-D',
          mass: 100,
        },
      };

      const result = validateFullUnit(unit);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const unit: Partial<FullUnit> = {
        id: '',
        chassis: '',
        model: '',
        mass: 0,
      };

      const result = validateFullUnit(unit as FullUnit);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
      expect(result.errors.some(e => e.includes('chassis'))).toBe(true);
      expect(result.errors.some(e => e.includes('model'))).toBe(true);
      expect(result.errors.some(e => e.includes('mass'))).toBe(true);
    });

    it('should warn about missing optional fields', () => {
      const unit: FullUnit = {
        id: 'test-1',
        chassis: 'Atlas',
        model: 'AS7-D',
        mass: 100,
        era: '',
        tech_base: undefined,
        rules_level: undefined,
        data: {},
      };

      const result = validateFullUnit(unit);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('tech_base'))).toBe(true);
      expect(result.warnings.some(w => w.includes('rules_level'))).toBe(true);
    });

    it('should warn about invalid tech base', () => {
      const unit: FullUnit = {
        id: 'test-1',
        chassis: 'Atlas',
        model: 'AS7-D',
        mass: 100,
        era: '3025',
        tech_base: 'Invalid Tech Base',
        data: {},
      };

      const result = validateFullUnit(unit);
      expect(result.warnings.some(w => w.includes('tech base'))).toBe(true);
    });

    it('should validate unit data if present', () => {
      const unit: FullUnit = {
        id: 'test-1',
        chassis: 'Atlas',
        model: 'AS7-D',
        mass: 100,
        era: '3025',
        tech_base: 'Inner Sphere',
        data: {
          armor: {
            locations: [
              { location: 'Head', armor_points: 9 },
            ],
          },
        },
      };

      const result = validateFullUnit(unit);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateUnitData', () => {
    it('should validate valid unit data', () => {
      const data = {
        armor: {
          locations: [
            { location: 'Head', armor_points: 9 },
            { location: 'Center Torso', armor_points: 20 },
          ],
        },
        weapons_and_equipment: [
          { item_name: 'AC/20', item_type: 'weapon', location: 'Right Arm' },
        ],
        movement: {
          walk_mp: 3,
          run_mp: 5,
        },
      };

      const result = validateUnitData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid armor structure', () => {
      const data = {
        armor: {
          locations: 'not an array',
        },
      };

      const result = validateUnitData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('locations'))).toBe(true);
    });

    it('should detect invalid armor points', () => {
      const data = {
        armor: {
          locations: [
            { location: 'Head', armor_points: -5 },
            { location: 'Center Torso' }, // Missing armor_points
          ],
        },
      };

      const result = validateUnitData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing equipment fields', () => {
      const data = {
        weapons_and_equipment: [
          { item_name: 'AC/20' }, // Missing item_type
          { item_type: 'weapon' }, // Missing item_name
        ],
      };

      const result = validateUnitData(data);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle missing data', () => {
      const result = validateUnitData(null);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('missing'))).toBe(true);
    });
  });

  describe('isValidTechBaseString', () => {
    it('should return true for valid tech bases', () => {
      expect(isValidTechBaseString('Inner Sphere')).toBe(true);
      expect(isValidTechBaseString('Clan')).toBe(true);
      expect(isValidTechBaseString('Mixed (IS Chassis)')).toBe(true);
    });

    it('should return false for invalid tech bases', () => {
      expect(isValidTechBaseString('Invalid')).toBe(false);
      expect(isValidTechBaseString('')).toBe(false);
      expect(isValidTechBaseString(null)).toBe(false);
      expect(isValidTechBaseString(undefined)).toBe(false);
    });
  });

  describe('isValidRulesLevelValue', () => {
    it('should return true for valid rules levels', () => {
      expect(isValidRulesLevelValue('Standard')).toBe(true);
      expect(isValidRulesLevelValue(1)).toBe(true);
      expect(isValidRulesLevelValue('Advanced')).toBe(true);
    });

    it('should return false for invalid rules levels', () => {
      expect(isValidRulesLevelValue('Invalid')).toBe(false);
      expect(isValidRulesLevelValue(99)).toBe(false);
      expect(isValidRulesLevelValue(null)).toBe(false);
      expect(isValidRulesLevelValue(undefined)).toBe(false);
    });
  });
});
