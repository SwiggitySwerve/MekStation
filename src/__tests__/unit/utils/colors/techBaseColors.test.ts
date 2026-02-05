/**
 * Tests for Tech Base Color System
 *
 * @spec openspec/specs/color-system/spec.md
 */

import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import {
  TECH_BASE_COLORS,
  TECH_BASE_MODE_COLORS,
  getTechBaseColors,
  getTechBaseModeColors,
  getTechBaseBadgeClass,
  getTechBaseShortName,
  getTechBaseModeShortName,
} from '@/utils/colors/techBaseColors';

describe('Tech Base Colors', () => {
  describe('TECH_BASE_COLORS constant', () => {
    it('should have Inner Sphere colors', () => {
      expect(TECH_BASE_COLORS[TechBase.INNER_SPHERE]).toBeDefined();
      expect(TECH_BASE_COLORS[TechBase.INNER_SPHERE].text).toBe(
        'text-blue-400',
      );
      expect(TECH_BASE_COLORS[TechBase.INNER_SPHERE].bg).toBe('bg-blue-900/50');
    });

    it('should have Clan colors', () => {
      expect(TECH_BASE_COLORS[TechBase.CLAN]).toBeDefined();
      expect(TECH_BASE_COLORS[TechBase.CLAN].text).toBe('text-green-400');
      expect(TECH_BASE_COLORS[TechBase.CLAN].bg).toBe('bg-green-900/50');
    });

    it('should have complete color definitions', () => {
      for (const techBase of Object.values(TechBase)) {
        const colors = TECH_BASE_COLORS[techBase];
        if (colors) {
          expect(colors.text).toBeDefined();
          expect(colors.bg).toBeDefined();
          expect(colors.border).toBeDefined();
          expect(colors.badge).toBeDefined();
          expect(colors.accent).toBeDefined();
        }
      }
    });
  });

  describe('TECH_BASE_MODE_COLORS constant', () => {
    it('should have Inner Sphere mode colors', () => {
      expect(TECH_BASE_MODE_COLORS[TechBaseMode.INNER_SPHERE]).toBeDefined();
    });

    it('should have Clan mode colors', () => {
      expect(TECH_BASE_MODE_COLORS[TechBaseMode.CLAN]).toBeDefined();
    });

    it('should have Mixed mode colors', () => {
      expect(TECH_BASE_MODE_COLORS[TechBaseMode.MIXED]).toBeDefined();
      expect(TECH_BASE_MODE_COLORS[TechBaseMode.MIXED].text).toBe(
        'text-purple-400',
      );
    });
  });

  describe('getTechBaseColors', () => {
    it('should return Inner Sphere colors', () => {
      const colors = getTechBaseColors(TechBase.INNER_SPHERE);

      expect(colors.text).toBe('text-blue-400');
      expect(colors.bg).toBe('bg-blue-900/50');
    });

    it('should return Clan colors', () => {
      const colors = getTechBaseColors(TechBase.CLAN);

      expect(colors.text).toBe('text-green-400');
      expect(colors.bg).toBe('bg-green-900/50');
    });

    it('should return default colors for unknown tech base', () => {
      const colors = getTechBaseColors('UNKNOWN' as TechBase);

      expect(colors).toBeDefined();
      expect(colors.text).toBe('text-slate-400');
    });
  });

  describe('getTechBaseModeColors', () => {
    it('should return Inner Sphere mode colors', () => {
      const colors = getTechBaseModeColors(TechBaseMode.INNER_SPHERE);

      expect(colors.text).toBe('text-blue-400');
    });

    it('should return Clan mode colors', () => {
      const colors = getTechBaseModeColors(TechBaseMode.CLAN);

      expect(colors.text).toBe('text-green-400');
    });

    it('should return Mixed mode colors', () => {
      const colors = getTechBaseModeColors(TechBaseMode.MIXED);

      expect(colors.text).toBe('text-purple-400');
      expect(colors.bg).toBe('bg-purple-900/50');
    });

    it('should return default colors for unknown mode', () => {
      const colors = getTechBaseModeColors('UNKNOWN' as TechBaseMode);

      expect(colors).toBeDefined();
      expect(colors.text).toBe('text-slate-400');
    });
  });

  describe('getTechBaseBadgeClass', () => {
    it('should return badge class for Inner Sphere', () => {
      const badgeClass = getTechBaseBadgeClass(TechBase.INNER_SPHERE);

      expect(badgeClass).toContain('bg-blue-700');
      expect(badgeClass).toContain('text-blue-100');
      expect(badgeClass).toContain('rounded');
      expect(badgeClass).toContain('text-xs');
    });

    it('should return badge class for Clan', () => {
      const badgeClass = getTechBaseBadgeClass(TechBase.CLAN);

      expect(badgeClass).toContain('bg-green-700');
      expect(badgeClass).toContain('text-green-100');
    });
  });

  describe('getTechBaseShortName', () => {
    it('should return "IS" for Inner Sphere', () => {
      expect(getTechBaseShortName(TechBase.INNER_SPHERE)).toBe('IS');
    });

    it('should return "Clan" for Clan', () => {
      expect(getTechBaseShortName(TechBase.CLAN)).toBe('Clan');
    });

    it('should return string representation for unknown', () => {
      const result = getTechBaseShortName('UNKNOWN' as TechBase);
      expect(typeof result).toBe('string');
    });
  });

  describe('getTechBaseModeShortName', () => {
    it('should return "IS" for Inner Sphere mode', () => {
      expect(getTechBaseModeShortName(TechBaseMode.INNER_SPHERE)).toBe('IS');
    });

    it('should return "Clan" for Clan mode', () => {
      expect(getTechBaseModeShortName(TechBaseMode.CLAN)).toBe('Clan');
    });

    it('should return "Mixed" for Mixed mode', () => {
      expect(getTechBaseModeShortName(TechBaseMode.MIXED)).toBe('Mixed');
    });

    it('should return string fallback for unknown modes', () => {
      const result = getTechBaseModeShortName('unknown-mode' as TechBaseMode);
      expect(result).toBe('unknown-mode');
    });
  });
});
