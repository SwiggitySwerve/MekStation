import {
  getLocationShorthand,
  getLocationFullName,
} from '@/utils/locationUtils';

describe('locationUtils', () => {
  describe('getLocationShorthand', () => {
    it('should return shorthand for known locations', () => {
      expect(getLocationShorthand('Head')).toBe('HD');
      expect(getLocationShorthand('Center Torso')).toBe('CT');
      expect(getLocationShorthand('Left Arm')).toBe('LA');
      expect(getLocationShorthand('Rear Right Leg')).toBe('RRL');
    });

    it('should return original string for unknown locations', () => {
      expect(getLocationShorthand('Unknown')).toBe('Unknown');
    });
  });

  describe('getLocationFullName', () => {
    it('should return full name for known shorthands', () => {
      expect(getLocationFullName('HD')).toBe('Head');
      expect(getLocationFullName('CT')).toBe('Center Torso');
      expect(getLocationFullName('LA')).toBe('Left Arm');
      expect(getLocationFullName('RRL')).toBe('Rear Right Leg');
    });

    it('should return original shorthand for unknown shorthands', () => {
      expect(getLocationFullName('XX')).toBe('XX');
    });
  });
});
