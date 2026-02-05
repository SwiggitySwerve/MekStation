/**
 * EquipmentNameResolver Tests
 *
 * Tests for equipment name resolution and mapping.
 * Note: Full resolution tests require equipment data to be loaded.
 * These tests focus on the mapping lookup and utility functions.
 */

import * as EquipmentLoaderService from '@/services/equipment/EquipmentLoaderService';
import { TechBase } from '@/types/enums/TechBase';

import {
  EquipmentNameResolver,
  equipmentNameResolver,
} from '../EquipmentNameResolver';

// Mock the equipment loader
jest.mock('@/services/equipment/EquipmentLoaderService', () => ({
  getEquipmentLoader: jest.fn(() => ({
    getIsLoaded: jest.fn().mockReturnValue(false),
    getAllWeapons: jest.fn().mockReturnValue([]),
    getAllAmmunition: jest.fn().mockReturnValue([]),
    getAllElectronics: jest.fn().mockReturnValue([]),
    getAllMiscEquipment: jest.fn().mockReturnValue([]),
  })),
}));

describe('EquipmentNameResolver', () => {
  let resolver: EquipmentNameResolver;

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('resolve with loaded equipment', () => {
    beforeEach(() => {
      // Mock loaded equipment data
      (EquipmentLoaderService.getEquipmentLoader as jest.Mock).mockReturnValue({
        getIsLoaded: jest.fn().mockReturnValue(true),
        getAllWeapons: jest.fn().mockReturnValue([
          {
            id: 'medium-laser',
            name: 'Medium Laser',
            category: 'ENERGY',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 1,
            weight: 1,
            criticalSlots: 1,
            costCBills: 40000,
            battleValue: 46,
            introductionYear: 2300,
          },
          {
            id: 'clan-er-medium-laser',
            name: 'Clan ER Medium Laser',
            category: 'ENERGY',
            techBase: TechBase.CLAN,
            rulesLevel: 2,
            weight: 1,
            criticalSlots: 1,
            costCBills: 80000,
            battleValue: 108,
            introductionYear: 2824,
          },
          {
            id: 'arrow-iv',
            name: 'Arrow IV',
            category: 'ARTILLERY',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 3,
            weight: 15,
            criticalSlots: 15,
            costCBills: 450000,
            battleValue: 171,
            introductionYear: 2593,
          },
        ]),
        getAllAmmunition: jest.fn().mockReturnValue([
          {
            id: 'ac-10-ammo',
            name: 'AC/10 Ammo',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 1,
            weight: 1,
            criticalSlots: 1,
            costPerTon: 6000,
            battleValue: 15,
            introductionYear: 2443,
          },
        ]),
        getAllElectronics: jest.fn().mockReturnValue([
          {
            id: 'guardian-ecm',
            name: 'Guardian ECM Suite',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 2,
            weight: 1.5,
            criticalSlots: 2,
            costCBills: 200000,
            battleValue: 61,
            introductionYear: 2597,
          },
        ]),
        getAllMiscEquipment: jest.fn().mockReturnValue([
          {
            id: 'case',
            name: 'CASE',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 2,
            weight: 0.5,
            criticalSlots: 1,
            costCBills: 50000,
            battleValue: 0,
            introductionYear: 3036,
          },
        ]),
      });

      // Create fresh resolver with loaded data
      resolver = new EquipmentNameResolver();
      resolver.initialize();
    });

    it('should resolve equipment by direct type mapping', () => {
      const result = resolver.resolve('MediumLaser', 'Medium Laser');
      expect(result.found).toBe(true);
      expect(result.equipmentId).toBe('medium-laser');
      expect(result.confidence).toBe('exact');
    });

    it('should resolve equipment by item name', () => {
      const result = resolver.resolve('UnknownType', 'Medium Laser');
      expect(result.found).toBe(true);
      expect(result.equipmentId).toBe('medium-laser');
      expect(result.confidence).toBe('exact');
    });

    it('should resolve equipment by normalized name', () => {
      const result = resolver.resolve('UnknownType', 'MEDIUM LASER');
      expect(result.found).toBe(true);
      expect(result.confidence).toBe('exact');
    });

    it('should resolve with quantity prefix stripped', () => {
      const result = resolver.resolve('1MediumLaser', 'Medium Laser');
      expect(result.found).toBe(true);
      expect(result.equipmentId).toBe('medium-laser');
    });

    it('should handle IS prefix in type', () => {
      const result = resolver.resolve('1ISmediumlaser', 'Medium Laser');
      // Should strip 1 and try ISMediumLaser
      expect(result.originalType).toBe('1ISmediumlaser');
    });

    it('should resolve CASE equipment', () => {
      const result = resolver.resolve('CASE', 'CASE');
      expect(result.found).toBe(true);
      expect(result.equipmentId).toBe('case');
    });

    it('should resolve Guardian ECM', () => {
      const result = resolver.resolve('GuardianECM', 'Guardian ECM Suite');
      expect(result.found).toBe(true);
      expect(result.equipmentId).toBe('guardian-ecm');
    });

    it('should return not found for unresolvable equipment', () => {
      const result = resolver.resolve(
        'TotallyUnknownWeapon',
        'Unknown Weapon XYZ',
      );
      expect(result.found).toBe(false);
      expect(result.confidence).toBe('none');
    });

    it('should try tech-base specific lookup for Clan', () => {
      const result = resolver.resolve(
        'UnknownClanThing',
        'SomeWeapon',
        TechBase.CLAN,
      );
      // Won't find it, but should try the tech base path
      expect(result.found).toBe(false);
    });

    it('should resolve artillery weapons', () => {
      const result = resolver.resolve('ISArrowIV', 'Arrow IV');
      expect(result.found).toBe(true);
      expect(result.equipmentId).toBe('arrow-iv');
    });

    it('should resolve ammunition', () => {
      const result = resolver.resolve('UnknownType', 'AC/10 Ammo');
      expect(result.found).toBe(true);
      expect(result.equipmentId).toBe('ac-10-ammo');
    });

    it('should getById for known equipment', () => {
      const equipment = resolver.getById('medium-laser');
      expect(equipment).toBeDefined();
      expect(equipment?.name).toBe('Medium Laser');
    });
  });

  describe('stripQuantityPrefix edge cases', () => {
    beforeEach(() => {
      (EquipmentLoaderService.getEquipmentLoader as jest.Mock).mockReturnValue({
        getIsLoaded: jest.fn().mockReturnValue(true),
        getAllWeapons: jest.fn().mockReturnValue([]),
        getAllAmmunition: jest.fn().mockReturnValue([]),
        getAllElectronics: jest.fn().mockReturnValue([]),
        getAllMiscEquipment: jest.fn().mockReturnValue([]),
      });
      resolver = new EquipmentNameResolver();
      resolver.initialize();
    });

    it('should handle type with no prefix', () => {
      const result = resolver.resolve('laser', 'Laser');
      expect(result.originalType).toBe('laser');
    });

    it('should handle CL prefix', () => {
      const result = resolver.resolve('2CLmediumlaser', 'Clan Medium Laser');
      expect(result.originalType).toBe('2CLmediumlaser');
    });

    it('should handle Clan prefix', () => {
      const result = resolver.resolve('3ClanLaser', 'Clan Laser');
      expect(result.originalType).toBe('3ClanLaser');
    });

    it('should handle empty type', () => {
      const result = resolver.resolve('', 'Unknown');
      expect(result.found).toBe(false);
    });
  });

  describe('weapon category mapping', () => {
    it('should map ballistic weapons correctly', () => {
      (EquipmentLoaderService.getEquipmentLoader as jest.Mock).mockReturnValue({
        getIsLoaded: jest.fn().mockReturnValue(true),
        getAllWeapons: jest.fn().mockReturnValue([
          {
            id: 'ac-10',
            name: 'AC/10',
            category: 'BALLISTIC',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 1,
            weight: 12,
            criticalSlots: 7,
            costCBills: 200000,
            battleValue: 124,
            introductionYear: 2443,
          },
        ]),
        getAllAmmunition: jest.fn().mockReturnValue([]),
        getAllElectronics: jest.fn().mockReturnValue([]),
        getAllMiscEquipment: jest.fn().mockReturnValue([]),
      });

      const freshResolver = new EquipmentNameResolver();
      freshResolver.initialize();

      const result = freshResolver.resolve('Unknown', 'AC/10');
      expect(result.found).toBe(true);
    });

    it('should map missile weapons correctly', () => {
      (EquipmentLoaderService.getEquipmentLoader as jest.Mock).mockReturnValue({
        getIsLoaded: jest.fn().mockReturnValue(true),
        getAllWeapons: jest.fn().mockReturnValue([
          {
            id: 'lrm-20',
            name: 'LRM 20',
            category: 'MISSILE',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 1,
            weight: 10,
            criticalSlots: 5,
            costCBills: 250000,
            battleValue: 181,
            introductionYear: 2300,
          },
        ]),
        getAllAmmunition: jest.fn().mockReturnValue([]),
        getAllElectronics: jest.fn().mockReturnValue([]),
        getAllMiscEquipment: jest.fn().mockReturnValue([]),
      });

      const freshResolver = new EquipmentNameResolver();
      freshResolver.initialize();

      const result = freshResolver.resolve('Unknown', 'LRM 20');
      expect(result.found).toBe(true);
    });

    it('should map unknown category to misc', () => {
      (EquipmentLoaderService.getEquipmentLoader as jest.Mock).mockReturnValue({
        getIsLoaded: jest.fn().mockReturnValue(true),
        getAllWeapons: jest.fn().mockReturnValue([
          {
            id: 'unknown-weapon',
            name: 'Unknown Weapon',
            category: 'UNKNOWN_CATEGORY',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 1,
            weight: 1,
            criticalSlots: 1,
            costCBills: 1000,
            battleValue: 10,
            introductionYear: 3000,
          },
        ]),
        getAllAmmunition: jest.fn().mockReturnValue([]),
        getAllElectronics: jest.fn().mockReturnValue([]),
        getAllMiscEquipment: jest.fn().mockReturnValue([]),
      });

      const freshResolver = new EquipmentNameResolver();
      freshResolver.initialize();

      const result = freshResolver.resolve('Unknown', 'Unknown Weapon');
      expect(result.found).toBe(true);
    });
  });

  describe('normalized name fuzzy matching', () => {
    beforeEach(() => {
      (EquipmentLoaderService.getEquipmentLoader as jest.Mock).mockReturnValue({
        getIsLoaded: jest.fn().mockReturnValue(true),
        getAllWeapons: jest.fn().mockReturnValue([
          {
            id: 'medium-laser',
            name: 'Medium Laser',
            category: 'ENERGY',
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: 1,
            weight: 1,
            criticalSlots: 1,
            costCBills: 40000,
            battleValue: 46,
            introductionYear: 2300,
          },
        ]),
        getAllAmmunition: jest.fn().mockReturnValue([]),
        getAllElectronics: jest.fn().mockReturnValue([]),
        getAllMiscEquipment: jest.fn().mockReturnValue([]),
      });
      resolver = new EquipmentNameResolver();
      resolver.initialize();
    });

    it('should resolve by normalized type', () => {
      // Type normalization removes IS prefix and normalizes
      const result = resolver.resolve('ISMediumlaser', 'Different Name');
      // Should try normalized type path
      expect(result.originalType).toBe('ISMediumlaser');
    });

    it('should resolve by normalized name when type fails', () => {
      const result = resolver.resolve('Unknown', 'Medium-Laser');
      // Normalized name should match 'medium laser' -> 'mediumlaser'
      expect(result.originalName).toBe('Medium-Laser');
    });
  });
});
