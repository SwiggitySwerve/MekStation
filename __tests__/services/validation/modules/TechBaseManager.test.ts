/**
 * Tests for TechBaseManager
 * 
 * Validates tech base compatibility, validation, and conflict resolution.
 */

import { TechBaseManager } from '../../../../services/validation/modules/TechBaseManager';
import { ComponentInfo, TechLevelValidationContext } from '../../../../services/validation/types/TechLevelTypes';
import { UnitConfiguration } from '../../../../utils/criticalSlots/UnitCriticalManager';

// Helper function to create test unit configuration
function createTestConfig(overrides: Partial<UnitConfiguration> = {}): UnitConfiguration {
  return {
    tonnage: 50,
    engineRating: 200,
    engineType: 'Standard',
    structureType: 'Standard',
    armorType: 'Standard',
    gyroType: 'Standard',
    heatSinkType: 'Single',
    techBase: 'Inner Sphere',
    ...overrides
  } as UnitConfiguration;
}

// Helper function to create test components
function createTestComponents(items: Array<{ 
  name?: string, 
  techBase?: string,
  category?: string 
}> = []): ComponentInfo[] {
  return items.map((item, index) => ({
    name: item.name || `Test Component ${index}`,
    techBase: item.techBase || 'Inner Sphere',
    category: item.category || 'equipment'
  }));
}

// Helper function to create test context
function createTestContext(overrides: Partial<TechLevelValidationContext> = {}): TechLevelValidationContext {
  return {
    strictEraCompliance: false,
    allowMixedTech: false,
    targetAvailabilityRating: 'D',
    validateTechProgression: true,
    enforceCanonicalRestrictions: false,
    ...overrides
  };
}

describe('TechBaseManager', () => {
  describe('validateTechBaseCompliance', () => {
    it('should validate compatible Inner Sphere tech base', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' });
      const components = createTestComponents([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'AC/10', techBase: 'Inner Sphere' },
        { name: 'Star League Engine', techBase: 'Star League' }
      ]);
      const context = createTestContext();

      const result = TechBaseManager.validateTechBaseCompliance(config, components, context);

      expect(result.isValid).toBe(true);
      expect(result.unitTechBase).toBe('Inner Sphere');
      expect(result.conflicts).toHaveLength(0);
      expect(result.complianceScore).toBe(100);
      expect(result.componentTechBases.every(ctb => ctb.isCompliant)).toBe(true);
    });

    it('should validate compatible Clan tech base', () => {
      const config = createTestConfig({ techBase: 'Clan' });
      const components = createTestComponents([
        { name: 'ER Medium Laser', techBase: 'Clan' },
        { name: 'Ultra AC/10', techBase: 'Clan' },
        { name: 'Star League Engine', techBase: 'Star League' }
      ]);
      const context = createTestContext();

      const result = TechBaseManager.validateTechBaseCompliance(config, components, context);

      expect(result.isValid).toBe(true);
      expect(result.unitTechBase).toBe('Clan');
      expect(result.conflicts).toHaveLength(0);
      expect(result.complianceScore).toBe(100);
    });

    it('should detect Clan components on Inner Sphere unit', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' });
      const components = createTestComponents([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'ER Large Laser', techBase: 'Clan' }
      ]);
      const context = createTestContext();

      const result = TechBaseManager.validateTechBaseCompliance(config, components, context);

      expect(result.isValid).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.complianceScore).toBeLessThan(100);
      
      const conflict = result.conflicts[0];
      expect(conflict.component).toBe('ER Large Laser');
      expect(conflict.unitTechBase).toBe('Inner Sphere');
      expect(conflict.componentTechBase).toBe('Clan');
    });

    it('should detect Inner Sphere components on Clan unit', () => {
      const config = createTestConfig({ techBase: 'Clan' });
      const components = createTestComponents([
        { name: 'ER Large Laser', techBase: 'Clan' },
        { name: 'AC/10', techBase: 'Inner Sphere' }
      ]);
      const context = createTestContext();

      const result = TechBaseManager.validateTechBaseCompliance(config, components, context);

      expect(result.isValid).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);
      
      const conflict = result.conflicts[0];
      expect(conflict.component).toBe('AC/10');
      expect(conflict.unitTechBase).toBe('Clan');
      expect(conflict.componentTechBase).toBe('Inner Sphere');
    });

    it('should allow mixed tech when enabled', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' });
      const components = createTestComponents([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'ER Large Laser', techBase: 'Clan' }
      ]);
      const context = createTestContext({ allowMixedTech: true });

      const result = TechBaseManager.validateTechBaseCompliance(config, components, context);

      expect(result.isValid).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.complianceScore).toBe(100);
    });

    it('should allow Mixed tech base unit', () => {
      const config = createTestConfig({ techBase: 'Mixed' });
      const components = createTestComponents([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'ER Large Laser', techBase: 'Clan' }
      ]);
      const context = createTestContext();

      const result = TechBaseManager.validateTechBaseCompliance(config, components, context);

      expect(result.isValid).toBe(true);
      expect(result.unitTechBase).toBe('Mixed');
      expect(result.conflicts).toHaveLength(0);
    });

    it('should calculate compliance score correctly', () => {
      const config = createTestConfig({ techBase: 'Inner Sphere' });
      const components = createTestComponents([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'AC/10', techBase: 'Inner Sphere' },
        { name: 'ER Large Laser', techBase: 'Clan' },
        { name: 'Ultra AC/20', techBase: 'Clan' }
      ]);
      const context = createTestContext();

      const result = TechBaseManager.validateTechBaseCompliance(config, components, context);

      expect(result.complianceScore).toBe(50); // 2 out of 4 compliant
      expect(result.conflicts).toHaveLength(2);
    });
  });

  describe('isTechBaseCompatible', () => {
    it('should allow Inner Sphere with Inner Sphere', () => {
      const context = createTestContext();
      
      expect(TechBaseManager.isTechBaseCompatible('Inner Sphere', 'Inner Sphere', context)).toBe(true);
    });

    it('should allow Inner Sphere with Star League', () => {
      const context = createTestContext();
      
      expect(TechBaseManager.isTechBaseCompatible('Inner Sphere', 'Star League', context)).toBe(true);
    });

    it('should not allow Inner Sphere with Clan by default', () => {
      const context = createTestContext();
      
      expect(TechBaseManager.isTechBaseCompatible('Inner Sphere', 'Clan', context)).toBe(false);
    });

    it('should allow Inner Sphere with Clan when mixed tech enabled', () => {
      const context = createTestContext({ allowMixedTech: true });
      
      expect(TechBaseManager.isTechBaseCompatible('Inner Sphere', 'Clan', context)).toBe(true);
    });

    it('should allow Clan with Clan', () => {
      const context = createTestContext();
      
      expect(TechBaseManager.isTechBaseCompatible('Clan', 'Clan', context)).toBe(true);
    });

    it('should allow Clan with Star League', () => {
      const context = createTestContext();
      
      expect(TechBaseManager.isTechBaseCompatible('Clan', 'Star League', context)).toBe(true);
    });

    it('should not allow Clan with Inner Sphere by default', () => {
      const context = createTestContext();
      
      expect(TechBaseManager.isTechBaseCompatible('Clan', 'Inner Sphere', context)).toBe(false);
    });

    it('should allow Mixed tech base with everything', () => {
      const context = createTestContext();
      
      expect(TechBaseManager.isTechBaseCompatible('Mixed', 'Inner Sphere', context)).toBe(true);
      expect(TechBaseManager.isTechBaseCompatible('Mixed', 'Clan', context)).toBe(true);
      expect(TechBaseManager.isTechBaseCompatible('Mixed', 'Star League', context)).toBe(true);
    });
  });

  describe('getConflictType', () => {
    it('should return requires_mixed for Inner Sphere with Clan', () => {
      expect(TechBaseManager.getConflictType('Inner Sphere', 'Clan')).toBe('requires_mixed');
    });

    it('should return requires_mixed for Clan with Inner Sphere', () => {
      expect(TechBaseManager.getConflictType('Clan', 'Inner Sphere')).toBe('requires_mixed');
    });

    it('should return incompatible for forbidden combinations', () => {
      expect(TechBaseManager.getConflictType('Inner Sphere', 'Alien')).toBe('incompatible');
      expect(TechBaseManager.getConflictType('Clan', 'Prototype')).toBe('incompatible');
    });
  });

  describe('getConflictResolution', () => {
    it('should provide resolution for Inner Sphere-Clan conflict', () => {
      const resolution = TechBaseManager.getConflictResolution('Inner Sphere', 'Clan');
      
      expect(resolution).toContain('Inner Sphere equivalent');
      expect(resolution).toContain('mixed tech');
    });

    it('should provide resolution for Clan-Inner Sphere conflict', () => {
      const resolution = TechBaseManager.getConflictResolution('Clan', 'Inner Sphere');
      
      expect(resolution).toContain('Clan equivalent');
      expect(resolution).toContain('mixed tech');
    });

    it('should provide generic resolution for other conflicts', () => {
      const resolution = TechBaseManager.getConflictResolution('Inner Sphere', 'Alien');
      
      expect(resolution).toContain('Inner Sphere tech base');
    });
  });

  describe('getConflictSeverity', () => {
    it('should return critical for forbidden tech bases', () => {
      expect(TechBaseManager.getConflictSeverity('Inner Sphere', 'Alien')).toBe('critical');
      expect(TechBaseManager.getConflictSeverity('Clan', 'Prototype')).toBe('critical');
    });

    it('should return major for restricted tech bases', () => {
      expect(TechBaseManager.getConflictSeverity('Inner Sphere', 'Clan')).toBe('major');
      expect(TechBaseManager.getConflictSeverity('Clan', 'Inner Sphere')).toBe('major');
    });
  });

  describe('getTechCompatibility', () => {
    it('should return tech compatibility matrix', () => {
      const compatibility = TechBaseManager.getTechCompatibility();
      
      expect(compatibility['Inner Sphere']).toBeDefined();
      expect(compatibility['Clan']).toBeDefined();
      expect(compatibility['Mixed']).toBeDefined();
      expect(compatibility['Star League']).toBeDefined();
      
      expect(compatibility['Inner Sphere'].compatible).toContain('Inner Sphere');
      expect(compatibility['Inner Sphere'].compatible).toContain('Star League');
      expect(compatibility['Inner Sphere'].restricted).toContain('Clan');
    });
  });

  describe('getRestrictedCombinations', () => {
    it('should return list of restricted combinations', () => {
      const combinations = TechBaseManager.getRestrictedCombinations();
      
      expect(combinations.length).toBeGreaterThan(0);
      expect(combinations.some(c => c.includes('Clan weapons'))).toBe(true);
      expect(combinations.some(c => c.includes('targeting computer'))).toBe(true);
    });
  });

  describe('checkRestrictedCombinations', () => {
    it('should detect Clan weapons with Inner Sphere targeting computer', () => {
      const components = createTestComponents([
        { name: 'Clan ER Large Laser', techBase: 'Clan', category: 'weapon' },
        { name: 'Targeting Computer', techBase: 'Inner Sphere', category: 'equipment' }
      ]);

      const violations = TechBaseManager.checkRestrictedCombinations(components);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some(v => v.includes('targeting computer'))).toBe(true);
    });

    it('should not detect violations for compatible combinations', () => {
      const components = createTestComponents([
        { name: 'Medium Laser', techBase: 'Inner Sphere', category: 'weapon' },
        { name: 'Targeting Computer', techBase: 'Inner Sphere', category: 'equipment' }
      ]);

      const violations = TechBaseManager.checkRestrictedCombinations(components);

      expect(violations).toHaveLength(0);
    });
  });

  describe('getAvailableTechBases', () => {
    it('should return list of available tech bases', () => {
      const techBases = TechBaseManager.getAvailableTechBases();
      
      expect(techBases).toContain('Inner Sphere');
      expect(techBases).toContain('Clan');
      expect(techBases).toContain('Mixed');
      expect(techBases).toContain('Star League');
    });
  });

  describe('isValidTechBase', () => {
    it('should validate known tech bases', () => {
      expect(TechBaseManager.isValidTechBase('Inner Sphere')).toBe(true);
      expect(TechBaseManager.isValidTechBase('Clan')).toBe(true);
      expect(TechBaseManager.isValidTechBase('Mixed')).toBe(true);
      expect(TechBaseManager.isValidTechBase('Star League')).toBe(true);
    });

    it('should reject unknown tech bases', () => {
      expect(TechBaseManager.isValidTechBase('Unknown')).toBe(false);
      expect(TechBaseManager.isValidTechBase('Alien')).toBe(false);
    });
  });

  describe('calculateComplianceScore', () => {
    it('should return 100 for empty component list', () => {
      expect(TechBaseManager.calculateComplianceScore([])).toBe(100);
    });

    it('should calculate percentage correctly', () => {
      const componentTechBases = [
        { component: 'A', techBase: 'IS', category: 'weapon', isCompliant: true, notes: '' },
        { component: 'B', techBase: 'IS', category: 'weapon', isCompliant: true, notes: '' },
        { component: 'C', techBase: 'Clan', category: 'weapon', isCompliant: false, notes: '' },
        { component: 'D', techBase: 'Clan', category: 'weapon', isCompliant: false, notes: '' }
      ];

      expect(TechBaseManager.calculateComplianceScore(componentTechBases)).toBe(50);
    });
  });
});