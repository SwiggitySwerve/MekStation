/**
 * Tests for EraManager
 * 
 * Validates era restrictions, timeline management, and technology introduction tracking.
 */

import { EraManager } from '../../../../services/validation/modules/EraManager';
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

describe('EraManager', () => {
  describe('validateEraRestrictions', () => {
    it('should allow era-appropriate components', () => {
      const config = createTestConfig();
      const components = createTestComponents([
        { name: 'Medium Laser', techBase: 'Inner Sphere' },
        { name: 'AC/10', techBase: 'Inner Sphere' }
      ]);
      const context = createTestContext({ strictEraCompliance: true });

      const result = EraManager.validateEraRestrictions(config, components, 'Succession Wars', context);

      expect(result.isValid).toBe(true);
      expect(result.era).toBe('Succession Wars');
      expect(result.invalidComponents).toHaveLength(0);
      expect(result.eraProgression.currentEra).toBe('Succession Wars');
    });

    it('should detect Star League tech in Succession Wars', () => {
      const config = createTestConfig();
      const components = createTestComponents([
        { name: 'Double Heat Sink', techBase: 'Star League' },
        { name: 'Endo Steel Structure', techBase: 'Star League' }
      ]);
      const context = createTestContext({ strictEraCompliance: true });

      const result = EraManager.validateEraRestrictions(config, components, 'Succession Wars', context);

      expect(result.isValid).toBe(false);
      expect(result.invalidComponents.length).toBeGreaterThan(0);
      expect(result.invalidComponents.some(c => c.component.includes('Double Heat Sink'))).toBe(true);
      expect(result.invalidComponents.some(c => c.component.includes('Endo Steel'))).toBe(true);
    });

    it('should detect Clan tech in Succession Wars', () => {
      const config = createTestConfig();
      const components = createTestComponents([
        { name: 'ER Large Laser', techBase: 'Clan' },
        { name: 'Ultra AC/20', techBase: 'Clan' }
      ]);
      const context = createTestContext({ strictEraCompliance: true });

      const result = EraManager.validateEraRestrictions(config, components, 'Succession Wars', context);

      expect(result.isValid).toBe(false);
      expect(result.invalidComponents.length).toBeGreaterThan(0);
      expect(result.invalidComponents.every(c => c.severity === 'critical' || c.severity === 'major' || c.severity === 'minor')).toBe(true);
    });

    it('should allow Clan tech in Clan Invasion era', () => {
      const config = createTestConfig();
      const components = createTestComponents([
        { name: 'ER Large Laser', techBase: 'Clan' },
        { name: 'Ultra AC/20', techBase: 'Clan' }
      ]);
      const context = createTestContext({ strictEraCompliance: true });

      const result = EraManager.validateEraRestrictions(config, components, 'Clan Invasion', context);

      expect(result.isValid).toBe(true);
      expect(result.invalidComponents).toHaveLength(0);
    });

    it('should allow Star League tech in Star League era', () => {
      const config = createTestConfig();
      const components = createTestComponents([
        { name: 'Double Heat Sink', techBase: 'Star League' },
        { name: 'Endo Steel Structure', techBase: 'Star League' }
      ]);
      const context = createTestContext({ strictEraCompliance: true });

      const result = EraManager.validateEraRestrictions(config, components, 'Star League', context);

      expect(result.isValid).toBe(true);
      expect(result.invalidComponents).toHaveLength(0);
    });

    it('should allow Star League tech in post-Clan Invasion eras', () => {
      const config = createTestConfig();
      const components = createTestComponents([
        { name: 'Double Heat Sink', techBase: 'Star League' },
        { name: 'Endo Steel Structure', techBase: 'Star League' }
      ]);
      const context = createTestContext({ strictEraCompliance: true });

      const result = EraManager.validateEraRestrictions(config, components, 'Dark Age', context);

      expect(result.isValid).toBe(true);
      expect(result.invalidComponents).toHaveLength(0);
    });

    it('should skip era checking when strictEraCompliance is false', () => {
      const config = createTestConfig();
      const components = createTestComponents([
        { name: 'Double Heat Sink', techBase: 'Star League' },
        { name: 'ER Large Laser', techBase: 'Clan' }
      ]);
      const context = createTestContext({ strictEraCompliance: false });

      const result = EraManager.validateEraRestrictions(config, components, 'Succession Wars', context);

      expect(result.isValid).toBe(true);
      expect(result.invalidComponents).toHaveLength(0);
    });

    it('should provide era progression information', () => {
      const config = createTestConfig();
      const components = createTestComponents([]);
      const context = createTestContext();

      const result = EraManager.validateEraRestrictions(config, components, 'Clan Invasion', context);

      expect(result.eraProgression.availableEras.length).toBeGreaterThan(0);
      expect(result.eraProgression.eraTimeline.length).toBeGreaterThan(0);
      expect(result.eraProgression.technologyIntroductions.length).toBeGreaterThan(0);
      expect(result.eraProgression.availableEras).toContain('Succession Wars');
      expect(result.eraProgression.availableEras).toContain('Clan Invasion');
      expect(result.eraProgression.availableEras).toContain('Star League');
    });

    it('should provide recommendations for era violations', () => {
      const config = createTestConfig();
      const components = createTestComponents([
        { name: 'Double Heat Sink', techBase: 'Star League' }
      ]);
      const context = createTestContext({ strictEraCompliance: true });

      const result = EraManager.validateEraRestrictions(config, components, 'Succession Wars', context);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('era'))).toBe(true);
    });
  });

  describe('getEraTimeline', () => {
    it('should return era timeline', () => {
      const timeline = EraManager.getEraTimeline();

      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline.every(era => era.era && era.startYear && era.endYear)).toBe(true);
      expect(timeline.some(era => era.era === 'Star League')).toBe(true);
      expect(timeline.some(era => era.era === 'Succession Wars')).toBe(true);
      expect(timeline.some(era => era.era === 'Clan Invasion')).toBe(true);
    });

    it('should have properly ordered timeline', () => {
      const timeline = EraManager.getEraTimeline();

      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].startYear).toBeGreaterThan(timeline[i-1].startYear);
      }
    });
  });

  describe('getEra', () => {
    it('should return era by name', () => {
      const starLeague = EraManager.getEra('Star League');
      const successionWars = EraManager.getEra('Succession Wars');

      expect(starLeague).toBeTruthy();
      expect(starLeague?.era).toBe('Star League');
      expect(successionWars).toBeTruthy();
      expect(successionWars?.era).toBe('Succession Wars');
    });

    it('should return null for unknown era', () => {
      const unknown = EraManager.getEra('Unknown Era');

      expect(unknown).toBeNull();
    });
  });

  describe('determineEra', () => {
    it('should return default era for basic config', () => {
      const config = createTestConfig();

      const era = EraManager.determineEra(config);

      expect(era).toBe('Succession Wars');
    });
  });

  describe('isAvailableInEra', () => {
    it('should handle Star League tech availability correctly', () => {
      // Star League tech available in Star League era
      expect(EraManager.isAvailableInEra('Star League', 'Star League')).toBe(true);
      
      // Star League tech NOT available in Succession Wars
      expect(EraManager.isAvailableInEra('Star League', 'Succession Wars')).toBe(false);
      
      // Star League tech available again from Clan Invasion onward
      expect(EraManager.isAvailableInEra('Star League', 'Clan Invasion')).toBe(true);
      expect(EraManager.isAvailableInEra('Star League', 'Dark Age')).toBe(true);
    });

    it('should handle Clan tech availability correctly', () => {
      // Clan tech NOT available before Clan Invasion
      expect(EraManager.isAvailableInEra('Clan Invasion', 'Succession Wars')).toBe(false);
      expect(EraManager.isAvailableInEra('Clan Invasion', 'Star League')).toBe(false);
      
      // Clan tech available from Clan Invasion onward
      expect(EraManager.isAvailableInEra('Clan Invasion', 'Clan Invasion')).toBe(true);
      expect(EraManager.isAvailableInEra('Clan Invasion', 'Dark Age')).toBe(true);
    });

    it('should handle standard tech availability correctly', () => {
      // Standard Inner Sphere tech available throughout
      expect(EraManager.isAvailableInEra('Succession Wars', 'Succession Wars')).toBe(true);
      expect(EraManager.isAvailableInEra('Succession Wars', 'Clan Invasion')).toBe(true);
      expect(EraManager.isAvailableInEra('Succession Wars', 'Dark Age')).toBe(true);
    });

    it('should default to available for unknown eras', () => {
      expect(EraManager.isAvailableInEra('Unknown Era', 'Succession Wars')).toBe(true);
      expect(EraManager.isAvailableInEra('Succession Wars', 'Unknown Era')).toBe(true);
    });
  });
});