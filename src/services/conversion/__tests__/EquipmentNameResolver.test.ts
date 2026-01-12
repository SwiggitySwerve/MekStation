/**
 * EquipmentNameResolver Tests
 *
 * Tests for equipment name resolution and mapping.
 * Note: Full resolution tests require equipment data to be loaded.
 * These tests focus on the mapping lookup and utility functions.
 */

import { EquipmentNameResolver, equipmentNameResolver } from '../EquipmentNameResolver';

describe('EquipmentNameResolver', () => {
  let resolver: EquipmentNameResolver;

  beforeEach(() => {
    resolver = new EquipmentNameResolver();
    resolver.initialize();
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      const freshResolver = new EquipmentNameResolver();
      expect(() => freshResolver.initialize()).not.toThrow();
    });

    it('should only initialize once', () => {
      const freshResolver = new EquipmentNameResolver();
      freshResolver.initialize();
      freshResolver.initialize(); // Second call should be no-op
      // No assertion needed - just ensure no error
    });
  });

  describe('resolve', () => {
    describe('behavior without loaded equipment data', () => {
      // Note: When equipment data isn't loaded, resolve returns found=false
      // even for valid type mappings, because the equipment lookup fails
      it('should return not found when equipment data is not loaded', () => {
        const result = resolver.resolve('MediumLaser', 'Medium Laser');
        // Without loaded equipment, the lookup fails after mapping
        expect(result.found).toBe(false);
        expect(result.originalName).toBe('Medium Laser');
        expect(result.originalType).toBe('MediumLaser');
      });

      it('should preserve original values in result', () => {
        const result = resolver.resolve('SomeType', 'Some Name');
        expect(result.originalName).toBe('Some Name');
        expect(result.originalType).toBe('SomeType');
      });

      it('should return none confidence for unknown equipment', () => {
        const result = resolver.resolve('UnknownWeapon', 'Unknown Weapon');
        expect(result.confidence).toBe('none');
        expect(result.found).toBe(false);
      });
    });
  });

  describe('getById', () => {
    it('should return undefined for unknown IDs', () => {
      expect(resolver.getById('unknown-id')).toBeUndefined();
    });
  });

  describe('isSystemComponent', () => {
    it('should identify system components', () => {
      expect(resolver.isSystemComponent('Life Support')).toBe(true);
      expect(resolver.isSystemComponent('Sensors')).toBe(true);
      expect(resolver.isSystemComponent('Cockpit')).toBe(true);
      expect(resolver.isSystemComponent('Gyro')).toBe(true);
    });

    it('should identify actuators', () => {
      expect(resolver.isSystemComponent('Shoulder')).toBe(true);
      expect(resolver.isSystemComponent('Upper Arm Actuator')).toBe(true);
      expect(resolver.isSystemComponent('Lower Arm Actuator')).toBe(true);
      expect(resolver.isSystemComponent('Hand Actuator')).toBe(true);
      expect(resolver.isSystemComponent('Hip')).toBe(true);
      expect(resolver.isSystemComponent('Upper Leg Actuator')).toBe(true);
      expect(resolver.isSystemComponent('Lower Leg Actuator')).toBe(true);
      expect(resolver.isSystemComponent('Foot Actuator')).toBe(true);
    });

    it('should identify engine components', () => {
      expect(resolver.isSystemComponent('Fusion Engine')).toBe(true);
      expect(resolver.isSystemComponent('Engine')).toBe(true);
    });

    it('should identify empty slots', () => {
      expect(resolver.isSystemComponent('-Empty-')).toBe(true);
      expect(resolver.isSystemComponent('Empty')).toBe(true);
    });

    it('should not identify equipment as system component', () => {
      expect(resolver.isSystemComponent('Medium Laser')).toBe(false);
      expect(resolver.isSystemComponent('LRM 20')).toBe(false);
      expect(resolver.isSystemComponent('Gauss Rifle')).toBe(false);
    });
  });

  describe('isHeatSink', () => {
    it('should identify heat sinks', () => {
      expect(resolver.isHeatSink('Heat Sink')).toBe(true);
      expect(resolver.isHeatSink('Double Heat Sink')).toBe(true);
      expect(resolver.isHeatSink('IS Double HeatSink')).toBe(true);
    });

    it('should not identify non-heat-sinks', () => {
      expect(resolver.isHeatSink('Medium Laser')).toBe(false);
      expect(resolver.isHeatSink('Engine')).toBe(false);
    });
  });

  describe('getMappings', () => {
    it('should return a copy of the mappings', () => {
      const mappings = resolver.getMappings();
      expect(typeof mappings).toBe('object');
      expect(mappings['MediumLaser']).toBe('medium-laser');
    });

    it('should not allow modification of internal mappings', () => {
      const mappings = resolver.getMappings();
      mappings['MediumLaser'] = 'modified';

      const newMappings = resolver.getMappings();
      expect(newMappings['MediumLaser']).toBe('medium-laser');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(equipmentNameResolver).toBeInstanceOf(EquipmentNameResolver);
    });
  });
});
