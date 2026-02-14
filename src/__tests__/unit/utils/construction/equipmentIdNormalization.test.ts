/**
 * Equipment ID Normalization Tests
 *
 * Comprehensive test suite for the normalizeEquipmentId function in equipmentBVResolver.ts.
 * Tests the 6-stage normalization pipeline and known problematic IDs from EC findings.
 *
 * @spec openspec/specs/battle-value-system/spec.md
 */

import {
  normalizeEquipmentId,
  resolveEquipmentBV,
  resetCatalogCache,
} from '@/utils/construction/equipmentBVResolver';

describe('normalizeEquipmentId', () => {
  beforeEach(() => {
    resetCatalogCache();
  });

  describe('Stage 1: DIRECT_ALIAS_MAP resolution', () => {
    it('should resolve MegaMek crit name ISERLargeLaser to er-large-laser', () => {
      const result = normalizeEquipmentId('ISERLargeLaser');
      expect(result).toBe('er-large-laser');
    });

    it('should resolve MegaMek crit name CLERMediumLaser to clan-er-medium-laser', () => {
      const result = normalizeEquipmentId('CLERMediumLaser');
      expect(result).toBe('clan-er-medium-laser');
    });

    it('should resolve ultra-ac-10 to uac-10 via DIRECT_ALIAS_MAP', () => {
      const result = normalizeEquipmentId('ultra-ac-10');
      expect(result).toBe('uac-10');
    });

    it('should resolve rotary-ac-5 to rac-5 via DIRECT_ALIAS_MAP', () => {
      const result = normalizeEquipmentId('rotary-ac-5');
      expect(result).toBe('rac-5');
    });

    it('should resolve heavy-medium-laser to medium-heavy-laser via DIRECT_ALIAS_MAP', () => {
      const result = normalizeEquipmentId('heavy-medium-laser');
      expect(result).toBe('medium-heavy-laser');
    });
  });

  describe('Stage 2: name-mappings resolution', () => {
    it('should resolve display name "ER Large Laser" to er-large-laser', () => {
      const result = normalizeEquipmentId('ER Large Laser');
      expect(result).toBe('er-large-laser');
    });

    it('should resolve display name "Medium Pulse Laser" to medium-pulse-laser', () => {
      const result = normalizeEquipmentId('Medium Pulse Laser');
      expect(result).toBe('medium-pulse-laser');
    });

    it('should resolve MegaMek name ISMediumLaser to medium-laser', () => {
      const result = normalizeEquipmentId('ISMediumLaser');
      expect(result).toBe('medium-laser');
    });

    it('should resolve MegaMek name CLERPPC to clan-er-ppc', () => {
      const result = normalizeEquipmentId('CLERPPC');
      expect(result).toBe('clan-er-ppc');
    });
  });

  describe('Stage 3: lowercase + normalize', () => {
    it('should handle case-insensitive resolution for ER-LARGE-LASER', () => {
      const result = normalizeEquipmentId('ER-LARGE-LASER');
      expect(result).toBe('er-large-laser');
    });

    it('should handle case-insensitive resolution for Medium-Laser', () => {
      const result = normalizeEquipmentId('Medium-Laser');
      expect(result).toBe('medium-laser');
    });

    it('should handle mixed case for UAC-10', () => {
      const result = normalizeEquipmentId('UAC-10');
      expect(result).toBe('uac-10');
    });
  });

  describe('Stage 4: prefix stripping', () => {
    it('should strip IS prefix from ISMediumLaser', () => {
      const result = normalizeEquipmentId('ISMediumLaser');
      expect(result).toBe('medium-laser');
    });

    it('should normalize ClanERMediumLaser to lowercase concatenated form', () => {
      const result = normalizeEquipmentId('ClanERMediumLaser');
      expect(result).toBe('clanermediumlaser');
    });

    it('should strip CL prefix from CLERPPC', () => {
      const result = normalizeEquipmentId('CLERPPC');
      expect(result).toBe('clan-er-ppc');
    });

    it('should strip IS prefix from ISAC10', () => {
      const result = normalizeEquipmentId('ISAC10');
      expect(result).toBe('ac-10');
    });
  });

  describe('Stage 5: suffix stripping', () => {
    it('should strip numeric suffix from medium-laser-1', () => {
      const result = normalizeEquipmentId('medium-laser-1');
      expect(result).toBe('medium-laser');
    });

    it('should strip numeric suffix from er-large-laser-2', () => {
      const result = normalizeEquipmentId('er-large-laser-2');
      expect(result).toBe('er-large-laser');
    });

    it('should strip numeric prefix from 1-ismrm40', () => {
      const result = normalizeEquipmentId('1-ismrm40');
      expect(result).toBe('mrm-40');
    });

    it('should handle (R) rear-mount suffix in medium-laser-(r)', () => {
      // (R) suffix is typically stripped by lowercase normalization
      const result = normalizeEquipmentId('medium-laser-(r)');
      // Current behavior: (r) is part of the ID, not stripped by normalization
      // This documents current behavior
      expect(result).toBe('medium-laser-(r)');
    });
  });

  describe('Stage 6: catalog direct match', () => {
    it('should pass through already-normalized catalog ID er-large-laser', () => {
      const result = normalizeEquipmentId('er-large-laser');
      expect(result).toBe('er-large-laser');
    });

    it('should pass through already-normalized catalog ID uac-10', () => {
      const result = normalizeEquipmentId('uac-10');
      expect(result).toBe('uac-10');
    });

    it('should pass through already-normalized catalog ID clan-er-medium-laser', () => {
      const result = normalizeEquipmentId('clan-er-medium-laser');
      expect(result).toBe('clan-er-medium-laser');
    });

    it('should pass through already-normalized catalog ID gauss-rifle', () => {
      const result = normalizeEquipmentId('gauss-rifle');
      expect(result).toBe('gauss-rifle');
    });
  });

  describe('EC-14: ISEnhancedERPPC resolution', () => {
    it('should normalize ISEnhancedERPPC to lowercase concatenated form (requires name-mapping)', () => {
      const result = normalizeEquipmentId('ISEnhancedERPPC');
      expect(result).toBe('isenhancederppc');
    });

    it('should resolve iseherppc to enhanced-er-ppc via DIRECT_ALIAS_MAP', () => {
      const result = normalizeEquipmentId('iseherppc');
      expect(result).toBe('enhanced-er-ppc');
    });

    it('should resolve enhanced-ppc to enhanced-er-ppc via DIRECT_ALIAS_MAP', () => {
      const result = normalizeEquipmentId('enhanced-ppc');
      expect(result).toBe('enhanced-er-ppc');
    });
  });

  describe('EC-33: Torpedo weapon resolution', () => {
    it('should resolve lrt-10 to lrm-10 via DIRECT_ALIAS_MAP', () => {
      const result = normalizeEquipmentId('lrt-10');
      expect(result).toBe('lrm-10');
    });

    it('should resolve lrt-20 to lrm-20 via DIRECT_ALIAS_MAP', () => {
      const result = normalizeEquipmentId('lrt-20');
      expect(result).toBe('lrm-20');
    });

    it('should resolve srt-6 to srm-6 via DIRECT_ALIAS_MAP', () => {
      const result = normalizeEquipmentId('srt-6');
      expect(result).toBe('srm-6');
    });

    it('should resolve clan-lrt-15 to clan-lrm-15 via DIRECT_ALIAS_MAP', () => {
      const result = normalizeEquipmentId('clan-lrt-15');
      expect(result).toBe('clan-lrm-15');
    });

    it('should resolve clan-srt-4 to clan-srm-4 via DIRECT_ALIAS_MAP', () => {
      const result = normalizeEquipmentId('clan-srt-4');
      expect(result).toBe('clan-srm-4');
    });
  });

  describe('EC-6: IS vs Clan disambiguation', () => {
    it('should resolve er-medium-laser to IS variant (er-medium-laser)', () => {
      const result = normalizeEquipmentId('er-medium-laser');
      expect(result).toBe('er-medium-laser');
    });

    it('should resolve clan-er-medium-laser to Clan variant', () => {
      const result = normalizeEquipmentId('clan-er-medium-laser');
      expect(result).toBe('clan-er-medium-laser');
    });

    it('should resolve CLERMediumLaser to clan-er-medium-laser', () => {
      const result = normalizeEquipmentId('CLERMediumLaser');
      expect(result).toBe('clan-er-medium-laser');
    });

    it('should resolve ISERMediumLaser to er-medium-laser', () => {
      const result = normalizeEquipmentId('ISERMediumLaser');
      expect(result).toBe('er-medium-laser');
    });

    it('should resolve clan-lrm-10 to Clan variant', () => {
      const result = normalizeEquipmentId('clan-lrm-10');
      expect(result).toBe('clan-lrm-10');
    });

    it('should resolve lrm-10 to IS variant', () => {
      const result = normalizeEquipmentId('lrm-10');
      expect(result).toBe('lrm-10');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string input', () => {
      const result = normalizeEquipmentId('');
      expect(result).toBe('');
    });

    it('should handle whitespace-only input', () => {
      const result = normalizeEquipmentId('   ');
      expect(result).toBe('');
    });

    it('should handle unknown equipment ID gracefully', () => {
      const result = normalizeEquipmentId('unknown-weapon-xyz');
      expect(result).toBe('unknown-weapon-xyz');
    });

    it('should handle unmapped MegaMek ID gracefully', () => {
      const result = normalizeEquipmentId('ISFakeWeapon123');
      // Should return lowercase normalized form
      expect(result).toBe('isfakeweapon123');
    });

    it('should handle already-normalized IDs without modification', () => {
      const result = normalizeEquipmentId('medium-laser');
      expect(result).toBe('medium-laser');
    });

    it('should handle hyphenated IDs with spaces', () => {
      const result = normalizeEquipmentId('ER Large Laser');
      expect(result).toBe('er-large-laser');
    });
  });

  describe('Integration with resolveEquipmentBV', () => {
    it('should resolve ISERLargeLaser to valid BV and heat', () => {
      const result = resolveEquipmentBV('ISERLargeLaser');
      expect(result.resolved).toBe(true);
      expect(result.battleValue).toBeGreaterThan(0);
      expect(result.heat).toBeGreaterThan(0);
    });

    it('should resolve ultra-ac-10 to valid BV and heat', () => {
      const result = resolveEquipmentBV('ultra-ac-10');
      expect(result.resolved).toBe(true);
      expect(result.battleValue).toBeGreaterThan(0);
      expect(result.heat).toBeGreaterThan(0);
    });

    it('should resolve lrt-10 to lrm-10 BV and heat', () => {
      const lrtResult = resolveEquipmentBV('lrt-10');
      const lrmResult = resolveEquipmentBV('lrm-10');
      expect(lrtResult.resolved).toBe(true);
      expect(lrmResult.resolved).toBe(true);
      expect(lrtResult.battleValue).toBe(lrmResult.battleValue);
      expect(lrtResult.heat).toBe(lrmResult.heat);
    });

    it('should return resolved=false for unknown equipment', () => {
      const result = resolveEquipmentBV('unknown-weapon-xyz');
      expect(result.resolved).toBe(false);
      expect(result.battleValue).toBe(0);
      expect(result.heat).toBe(0);
    });
  });

  describe('Normalization pipeline completeness', () => {
    it('should handle concatenated weapon names without hyphens', () => {
      const result = normalizeEquipmentId('mediumlaser');
      expect(result).toBe('medium-laser');
    });

    it('should handle AC variants with numeric suffixes', () => {
      const result = normalizeEquipmentId('ac20');
      expect(result).toBe('ac-20');
    });

    it('should handle LRM variants with numeric suffixes', () => {
      const result = normalizeEquipmentId('lrm15');
      expect(result).toBe('lrm-15');
    });

    it('should handle SRM variants with numeric suffixes', () => {
      const result = normalizeEquipmentId('srm6');
      expect(result).toBe('srm-6');
    });

    it('should handle Clan UAC variants', () => {
      const result = normalizeEquipmentId('clan-ultra-ac-20');
      expect(result).toBe('clan-uac-20');
    });

    it('should handle LB-X AC variants', () => {
      const result = normalizeEquipmentId('lbxac10');
      expect(result).toBe('lb-10-x-ac');
    });

    it('should handle Streak SRM variants', () => {
      const result = normalizeEquipmentId('streaksrm4');
      expect(result).toBe('streak-srm-4');
    });

    it('should handle Clan Streak SRM variants via regex normalization', () => {
      const result = normalizeEquipmentId('clstreaksrm6');
      expect(result).toBe('streak-srm-6');
    });
  });
});
