/**
 * Dynamic Data Types Tests
 * 
 * Tests for type guards and safe property accessors
 */

import {
  isUnitConfigurationData,
  isEquipmentItemData,
  isEquipmentData,
  isRangeData,
  isCriticalSlotSections,
  getConfigurationProperty,
  getEquipmentItemProperty,
  getEquipmentDataProperty,
  IUnitConfigurationData,
  IEquipmentItemData,
  IEquipmentData,
  IRangeData
} from '../../../types/core/DynamicDataTypes';
import { TechBase, RulesLevel } from '../../../types/core/BaseTypes';

describe('DynamicDataTypes', () => {
  describe('isUnitConfigurationData', () => {
    it('should validate valid configuration data', () => {
      const config: IUnitConfigurationData = {
        tonnage: 50,
        engineType: 'Standard',
        gyroType: 'Standard',
        structureType: 'Standard',
        armorType: 'Standard',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD
      };

      expect(isUnitConfigurationData(config)).toBe(true);
    });

    it('should reject non-objects', () => {
      expect(isUnitConfigurationData(null)).toBe(false);
      expect(isUnitConfigurationData(undefined)).toBe(false);
      expect(isUnitConfigurationData('string')).toBe(false);
      expect(isUnitConfigurationData(123)).toBe(false);
    });

    it('should accept objects with additional properties', () => {
      const config = {
        tonnage: 50,
        customProperty: 'value'
      };

      expect(isUnitConfigurationData(config)).toBe(true);
    });
  });

  describe('isEquipmentItemData', () => {
    it('should validate valid equipment item data', () => {
      const item: IEquipmentItemData = {
        item_name: 'Medium Laser',
        item_type: 'weapon',
        location: 'Right Arm',
        heat: 3,
        damage: 5
      };

      expect(isEquipmentItemData(item)).toBe(true);
    });

    it('should reject non-objects', () => {
      expect(isEquipmentItemData(null)).toBe(false);
      expect(isEquipmentItemData(undefined)).toBe(false);
      expect(isEquipmentItemData('string')).toBe(false);
    });
  });

  describe('isEquipmentData', () => {
    it('should validate valid equipment data', () => {
      const data: IEquipmentData = {
        heat: 3,
        damage: 5,
        slots: 1,
        weight: 1.0
      };

      expect(isEquipmentData(data)).toBe(true);
    });

    it('should reject non-objects', () => {
      expect(isEquipmentData(null)).toBe(false);
      expect(isEquipmentData(undefined)).toBe(false);
    });
  });

  describe('isRangeData', () => {
    it('should validate valid range data', () => {
      const range: IRangeData = {
        short: 1,
        medium: 2,
        long: 3,
        extreme: 4
      };

      expect(isRangeData(range)).toBe(true);
    });

    it('should reject invalid range data', () => {
      expect(isRangeData({ short: 'invalid' })).toBe(false);
      expect(isRangeData({ medium: true })).toBe(false);
    });

    it('should accept range data with additional properties', () => {
      const range = {
        short: 1,
        custom: 'value'
      };

      expect(isRangeData(range)).toBe(true);
    });
  });

  describe('getConfigurationProperty', () => {
    it('should get existing property', () => {
      const config: IUnitConfigurationData = {
        tonnage: 50,
        engineType: 'Standard'
      };

      expect(getConfigurationProperty(config, 'tonnage')).toBe(50);
      expect(getConfigurationProperty(config, 'engineType')).toBe('Standard');
    });

    it('should return default for missing property', () => {
      const config: IUnitConfigurationData = {};

      expect(getConfigurationProperty(config, 'tonnage', 0)).toBe(0);
      expect(getConfigurationProperty(config, 'tonnage')).toBeUndefined();
    });
  });

  describe('getEquipmentItemProperty', () => {
    it('should get existing property', () => {
      const item: IEquipmentItemData = {
        item_name: 'Medium Laser',
        heat: 3
      };

      expect(getEquipmentItemProperty(item, 'item_name')).toBe('Medium Laser');
      expect(getEquipmentItemProperty(item, 'heat')).toBe(3);
    });

    it('should return default for missing property', () => {
      const item: IEquipmentItemData = {};

      expect(getEquipmentItemProperty(item, 'heat', 0)).toBe(0);
      expect(getEquipmentItemProperty(item, 'heat')).toBeUndefined();
    });
  });

  describe('getEquipmentDataProperty', () => {
    it('should get existing property', () => {
      const data: IEquipmentData = {
        heat: 3,
        slots: 1
      };

      expect(getEquipmentDataProperty(data, 'heat')).toBe(3);
      expect(getEquipmentDataProperty(data, 'slots')).toBe(1);
    });

    it('should return default for missing property', () => {
      const data: IEquipmentData = {};

      expect(getEquipmentDataProperty(data, 'heat', 0)).toBe(0);
      expect(getEquipmentDataProperty(data, 'heat')).toBeUndefined();
    });
  });
});
