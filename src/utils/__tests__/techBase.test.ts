/**
 * Tech Base Utility Tests
 */

import {
  isInnerSphere,
  isClan,
  isMixed,
  getTechBaseBadgeVariant,
  getTechBaseLabel,
  getTechBaseDisplay,
} from '../techBase';

describe('techBase utilities', () => {
  describe('isInnerSphere', () => {
    it('should return true for "Inner Sphere"', () => {
      expect(isInnerSphere('Inner Sphere')).toBe(true);
    });

    it('should return true for "inner sphere" (case insensitive)', () => {
      expect(isInnerSphere('inner sphere')).toBe(true);
    });

    it('should return true for "IS"', () => {
      expect(isInnerSphere('IS')).toBe(true);
    });

    it('should return true for "is" (case insensitive)', () => {
      expect(isInnerSphere('is')).toBe(true);
    });

    it('should return false for "Clan"', () => {
      expect(isInnerSphere('Clan')).toBe(false);
    });

    it('should return false for "Mixed"', () => {
      expect(isInnerSphere('Mixed')).toBe(false);
    });
  });

  describe('isClan', () => {
    it('should return true for "Clan"', () => {
      expect(isClan('Clan')).toBe(true);
    });

    it('should return true for "clan" (case insensitive)', () => {
      expect(isClan('clan')).toBe(true);
    });

    it('should return true for "Clan (Mixed)"', () => {
      expect(isClan('Clan (Mixed)')).toBe(true);
    });

    it('should return false for "Inner Sphere"', () => {
      expect(isClan('Inner Sphere')).toBe(false);
    });
  });

  describe('isMixed', () => {
    it('should return true for "Mixed"', () => {
      expect(isMixed('Mixed')).toBe(true);
    });

    it('should return true for "mixed" (case insensitive)', () => {
      expect(isMixed('mixed')).toBe(true);
    });

    it('should return true for "Mixed (IS Chassis)"', () => {
      expect(isMixed('Mixed (IS Chassis)')).toBe(true);
    });

    it('should return false for "Clan"', () => {
      expect(isMixed('Clan')).toBe(false);
    });

    it('should return false for "Inner Sphere"', () => {
      expect(isMixed('Inner Sphere')).toBe(false);
    });
  });

  describe('getTechBaseBadgeVariant', () => {
    it('should return "cyan" for Clan', () => {
      expect(getTechBaseBadgeVariant('Clan')).toBe('cyan');
    });

    it('should return "amber" for Inner Sphere', () => {
      expect(getTechBaseBadgeVariant('Inner Sphere')).toBe('amber');
    });

    it('should return "amber" for IS', () => {
      expect(getTechBaseBadgeVariant('IS')).toBe('amber');
    });

    it('should return "slate" for Mixed', () => {
      expect(getTechBaseBadgeVariant('Mixed')).toBe('slate');
    });

    it('should return "slate" for unknown tech base', () => {
      expect(getTechBaseBadgeVariant('Unknown')).toBe('slate');
    });

    it('should be case insensitive', () => {
      expect(getTechBaseBadgeVariant('CLAN')).toBe('cyan');
      expect(getTechBaseBadgeVariant('inner sphere')).toBe('amber');
    });
  });

  describe('getTechBaseLabel', () => {
    it('should return "Clan" for Clan tech base', () => {
      expect(getTechBaseLabel('Clan')).toBe('Clan');
    });

    it('should return "IS" for Inner Sphere', () => {
      expect(getTechBaseLabel('Inner Sphere')).toBe('IS');
    });

    it('should return "IS" for IS', () => {
      expect(getTechBaseLabel('IS')).toBe('IS');
    });

    it('should return original name for Mixed', () => {
      expect(getTechBaseLabel('Mixed')).toBe('Mixed');
    });

    it('should return original name for unknown tech base', () => {
      expect(getTechBaseLabel('Primitive')).toBe('Primitive');
    });

    it('should be case insensitive', () => {
      expect(getTechBaseLabel('CLAN')).toBe('Clan');
      expect(getTechBaseLabel('inner sphere')).toBe('IS');
    });
  });

  describe('getTechBaseDisplay', () => {
    it('should return both variant and label for Clan', () => {
      const result = getTechBaseDisplay('Clan');
      expect(result).toEqual({ variant: 'cyan', label: 'Clan' });
    });

    it('should return both variant and label for Inner Sphere', () => {
      const result = getTechBaseDisplay('Inner Sphere');
      expect(result).toEqual({ variant: 'amber', label: 'IS' });
    });

    it('should return both variant and label for Mixed', () => {
      const result = getTechBaseDisplay('Mixed');
      expect(result).toEqual({ variant: 'slate', label: 'Mixed' });
    });
  });
});
