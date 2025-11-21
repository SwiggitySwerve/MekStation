/**
 * Tests for location mapping utilities
 */

import {
  locationNameToProperty,
  propertyToLocationName,
  isValidLocationName,
  isValidArmorProperty,
  getAllLocationNames,
  getAllArmorProperties,
} from '../../../utils/typeConversion/locationMappers';

describe('locationMappers', () => {
  describe('locationNameToProperty', () => {
    it('should convert valid location names to properties', () => {
      expect(locationNameToProperty('Head')).toBe('head');
      expect(locationNameToProperty('Center Torso')).toBe('centerTorso');
      expect(locationNameToProperty('Left Torso')).toBe('leftTorso');
      expect(locationNameToProperty('Right Torso')).toBe('rightTorso');
      expect(locationNameToProperty('Left Arm')).toBe('leftArm');
      expect(locationNameToProperty('Right Arm')).toBe('rightArm');
      expect(locationNameToProperty('Left Leg')).toBe('leftLeg');
      expect(locationNameToProperty('Right Leg')).toBe('rightLeg');
    });

    it('should return null for invalid location names', () => {
      expect(locationNameToProperty('Invalid Location')).toBeNull();
      expect(locationNameToProperty('')).toBeNull();
      expect(locationNameToProperty('head')).toBeNull(); // Case sensitive
    });
  });

  describe('propertyToLocationName', () => {
    it('should convert valid properties to location names', () => {
      expect(propertyToLocationName('head')).toBe('Head');
      expect(propertyToLocationName('centerTorso')).toBe('Center Torso');
      expect(propertyToLocationName('leftTorso')).toBe('Left Torso');
      expect(propertyToLocationName('rightTorso')).toBe('Right Torso');
      expect(propertyToLocationName('leftArm')).toBe('Left Arm');
      expect(propertyToLocationName('rightArm')).toBe('Right Arm');
      expect(propertyToLocationName('leftLeg')).toBe('Left Leg');
      expect(propertyToLocationName('rightLeg')).toBe('Right Leg');
    });

    it('should handle rear armor properties', () => {
      expect(propertyToLocationName('centerTorsoRear')).toBe('Center Torso (Rear)');
      expect(propertyToLocationName('leftTorsoRear')).toBe('Left Torso (Rear)');
      expect(propertyToLocationName('rightTorsoRear')).toBe('Right Torso (Rear)');
    });
  });

  describe('isValidLocationName', () => {
    it('should return true for valid location names', () => {
      expect(isValidLocationName('Head')).toBe(true);
      expect(isValidLocationName('Center Torso')).toBe(true);
      expect(isValidLocationName('Left Arm')).toBe(true);
    });

    it('should return false for invalid location names', () => {
      expect(isValidLocationName('Invalid')).toBe(false);
      expect(isValidLocationName('')).toBe(false);
      expect(isValidLocationName('head')).toBe(false); // Case sensitive
    });
  });

  describe('isValidArmorProperty', () => {
    it('should return true for valid property names', () => {
      expect(isValidArmorProperty('head')).toBe(true);
      expect(isValidArmorProperty('centerTorso')).toBe(true);
      expect(isValidArmorProperty('centerTorsoRear')).toBe(true);
      expect(isValidArmorProperty('leftArm')).toBe(true);
    });

    it('should return false for invalid property names', () => {
      expect(isValidArmorProperty('invalid')).toBe(false);
      expect(isValidArmorProperty('')).toBe(false);
      expect(isValidArmorProperty('Head')).toBe(false); // Case sensitive
    });
  });

  describe('getAllLocationNames', () => {
    it('should return all valid location names', () => {
      const names = getAllLocationNames();
      expect(names).toContain('Head');
      expect(names).toContain('Center Torso');
      expect(names).toContain('Left Torso');
      expect(names).toContain('Right Torso');
      expect(names).toContain('Left Arm');
      expect(names).toContain('Right Arm');
      expect(names).toContain('Left Leg');
      expect(names).toContain('Right Leg');
      expect(names.length).toBe(8);
    });
  });

  describe('getAllArmorProperties', () => {
    it('should return all valid property names', () => {
      const properties = getAllArmorProperties();
      expect(properties).toContain('head');
      expect(properties).toContain('centerTorso');
      expect(properties).toContain('centerTorsoRear');
      expect(properties).toContain('leftTorso');
      expect(properties).toContain('leftTorsoRear');
      expect(properties).toContain('rightTorso');
      expect(properties).toContain('rightTorsoRear');
      expect(properties).toContain('leftArm');
      expect(properties).toContain('rightArm');
      expect(properties).toContain('leftLeg');
      expect(properties).toContain('rightLeg');
      expect(properties.length).toBe(11);
    });
  });
});
