import { WeaponCategory } from '@/types/equipment';

import {
  getDamageCode,
  formatMissileDamage,
  lookupWeapon,
  isUnhittableEquipmentName,
} from '../equipmentUtils';
import { createMockWeapon } from './equipmentUtils.test-helpers';

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
      expect(
        isUnhittableEquipmentName('Blue Shield Particle Field Damper'),
      ).toBe(true);
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
