/**
 * Tests for AutoAllocationManager
 * Tests automatic equipment allocation, optimization, and validation functionality.
 */

import { AutoAllocationManager } from '../../services/allocation/AutoAllocationManager';
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManager';
import { ComponentConfiguration } from '../../types/componentConfiguration';

describe('AutoAllocationManager', () => {
  let autoAllocationManager: AutoAllocationManager;
  let mockConfig: UnitConfiguration;
  let mockEquipment: any[];

  beforeEach(() => {
    autoAllocationManager = new AutoAllocationManager();
    
    // Create mock unit configuration
    mockConfig = {
      chassis: 'Atlas',
      model: 'AS7-D',
      tonnage: 100,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 3,
      engineRating: 300,
      runMP: 5,
      engineType: 'Standard',
      jumpMP: 0,
      jumpJetType: { type: 'Standard', techBase: 'Inner Sphere' } as ComponentConfiguration,
      jumpJetCounts: {},
      hasPartialWing: false,
      gyroType: 'Standard' as ComponentConfiguration,
      structureType: 'Standard' as ComponentConfiguration,
      armorType: 'Standard' as ComponentConfiguration,
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 31, rear: 10 },
        LT: { front: 21, rear: 7 },
        RT: { front: 21, rear: 7 },
        LA: { front: 15, rear: 5 },
        RA: { front: 15, rear: 5 },
        LL: { front: 21, rear: 7 },
        RL: { front: 21, rear: 7 }
      },
      armorTonnage: 19.5,
      heatSinkType: 'Single' as ComponentConfiguration,
      totalHeatSinks: 20,
      internalHeatSinks: 12,
      externalHeatSinks: 8,
      enhancements: [],
      mass: 100
    };

    // Create mock equipment
    mockEquipment = [
      {
        name: 'Medium Laser',
        type: 'weapon',
        weight: 1,
        heat: 3,
        criticalSlots: 1,
        location: 'RA'
      },
      {
        name: 'AC/20',
        type: 'weapon',
        weight: 14,
        heat: 7,
        damage: 20,
        criticalSlots: 10,
        location: 'RT'
      },
      {
        name: 'Single Heat Sink',
        type: 'heat_sink',
        weight: 1,
        heat: 0,
        criticalSlots: 1,
        location: 'CT'
      }
    ];
  });

  describe('Equipment Allocation', () => {
    test('should allocate weapons automatically', () => {
      const weapons = mockEquipment.filter(eq => eq === 'weapon');
      const result = autoAllocationManager.autoAllocateWeapons(weapons, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('allocated');
      expect(result).toHaveProperty('unallocated');
      expect(result).toHaveProperty('strategy');
      expect(result).toHaveProperty('heatEfficiency');
      expect(result).toHaveProperty('firepower');
      expect(result).toHaveProperty('recommendations');
      
      expect(Array.isArray(result.allocated)).toBe(true);
      expect(Array.isArray(result.unallocated)).toBe(true);
      expect(['balanced', 'front_loaded', 'distributed', 'concentrated']).toContain(result.strategy);
      expect(typeof result.heatEfficiency).toBe('number');
      expect(typeof result.firepower).toBe('object');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should allocate ammunition with CASE protection', () => {
      const ammunition = [
        { name: 'AC/20 Ammo', type: 'ammunition', weight: 2, explosive: true },
        { name: 'LRM Ammo', type: 'ammunition', weight: 1, explosive: true }
      ];
      
      const result = autoAllocationManager.autoAllocateAmmunition(ammunition, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('allocated');
      expect(result).toHaveProperty('unallocated');
      expect(result).toHaveProperty('caseProtection');
      expect(result).toHaveProperty('ammoBalance');
      expect(result).toHaveProperty('suggestions');
      
      expect(Array.isArray(result.allocated)).toBe(true);
      expect(Array.isArray(result.unallocated)).toBe(true);
      expect(typeof result.caseProtection).toBe('object');
      expect(Array.isArray(result.ammoBalance)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    test('should allocate heat sinks for optimal heat management', () => {
      const heatSinks = [
        { name: 'Single Heat Sink', type: 'heat_sink', weight: 1 },
        { name: 'Single Heat Sink', type: 'heat_sink', weight: 1 }
      ];
      
      const result = autoAllocationManager.autoAllocateHeatSinks(heatSinks, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('allocated');
      expect(result).toHaveProperty('engineHeatSinks');
      expect(result).toHaveProperty('externalHeatSinks');
      expect(result).toHaveProperty('heatDissipation');
      expect(result).toHaveProperty('heatBalance');
      expect(result).toHaveProperty('optimization');
      
      expect(Array.isArray(result.allocated)).toBe(true);
      expect(typeof result.engineHeatSinks).toBe('number');
      expect(typeof result.externalHeatSinks).toBe('number');
      expect(typeof result.heatDissipation).toBe('number');
      expect(typeof result.heatBalance).toBe('object');
      expect(Array.isArray(result.optimization)).toBe(true);
    });

    test('should allocate jump jets with optimal distribution', () => {
      const jumpJets = [
        { name: 'Jump Jet', type: 'jump_jet', weight: 0.5 },
        { name: 'Jump Jet', type: 'jump_jet', weight: 0.5 }
      ];
      
      const result = autoAllocationManager.autoAllocateJumpJets(jumpJets, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('allocated');
      expect(result).toHaveProperty('jumpMP');
      expect(result).toHaveProperty('distribution');
      expect(result).toHaveProperty('validation');
      
      expect(Array.isArray(result.allocated)).toBe(true);
      expect(typeof result.jumpMP).toBe('number');
      expect(typeof result.distribution).toBe('object');
      expect(typeof result.validation).toBe('object');
    });
  });

  describe('Allocation Results', () => {
    test('should return proper weapon allocation results', () => {
      const weapons = mockEquipment.filter(eq => eq === 'weapon');
      const result = autoAllocationManager.autoAllocateWeapons(weapons, mockConfig);
      
      // Test that the result structure is correct
      expect(result.allocated).toBeDefined();
      expect(result.unallocated).toBeDefined();
      expect(result.strategy).toBeDefined();
      expect(result.heatEfficiency).toBeDefined();
      expect(result.firepower).toBeDefined();
      expect(result.recommendations).toBeDefined();
      
      // Test that arrays are arrays
      expect(Array.isArray(result.allocated)).toBe(true);
      expect(Array.isArray(result.unallocated)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      
      // Test that strategy is valid
      expect(['balanced', 'front_loaded', 'distributed', 'concentrated']).toContain(result.strategy);
      
      // Test that numbers are numbers
      expect(typeof result.heatEfficiency).toBe('number');
      expect(typeof result.firepower).toBe('object');
    });

    test('should return proper ammunition allocation results', () => {
      const ammunition = [
        { name: 'AC/20 Ammo', type: 'ammunition', weight: 2, explosive: true },
        { name: 'LRM Ammo', type: 'ammunition', weight: 1, explosive: true }
      ];
      
      const result = autoAllocationManager.autoAllocateAmmunition(ammunition, mockConfig);
      
      // Test that the result structure is correct
      expect(result.allocated).toBeDefined();
      expect(result.unallocated).toBeDefined();
      expect(result.caseProtection).toBeDefined();
      expect(result.ammoBalance).toBeDefined();
      expect(result.suggestions).toBeDefined();
      
      // Test that arrays are arrays
      expect(Array.isArray(result.allocated)).toBe(true);
      expect(Array.isArray(result.unallocated)).toBe(true);
      expect(Array.isArray(result.ammoBalance)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      
      // Test that objects are objects
      expect(typeof result.caseProtection).toBe('object');
    });

    test('should return proper heat sink allocation results', () => {
      const heatSinks = [
        { name: 'Single Heat Sink', type: 'heat_sink', weight: 1 },
        { name: 'Single Heat Sink', type: 'heat_sink', weight: 1 }
      ];
      
      const result = autoAllocationManager.autoAllocateHeatSinks(heatSinks, mockConfig);
      
      // Test that the result structure is correct
      expect(result.allocated).toBeDefined();
      expect(result.engineHeatSinks).toBeDefined();
      expect(result.externalHeatSinks).toBeDefined();
      expect(result.heatDissipation).toBeDefined();
      expect(result.heatBalance).toBeDefined();
      expect(result.optimization).toBeDefined();
      
      // Test that arrays are arrays
      expect(Array.isArray(result.allocated)).toBe(true);
      expect(Array.isArray(result.optimization)).toBe(true);
      
      // Test that numbers are numbers
      expect(typeof result.engineHeatSinks).toBe('number');
      expect(typeof result.externalHeatSinks).toBe('number');
      expect(typeof result.heatDissipation).toBe('number');
      
      // Test that objects are objects
      expect(typeof result.heatBalance).toBe('object');
    });

    test('should return proper jump jet allocation results', () => {
      const jumpJets = [
        { name: 'Jump Jet', type: 'jump_jet', weight: 0.5 },
        { name: 'Jump Jet', type: 'jump_jet', weight: 0.5 }
      ];
      
      const result = autoAllocationManager.autoAllocateJumpJets(jumpJets, mockConfig);
      
      // Test that the result structure is correct
      expect(result.allocated).toBeDefined();
      expect(result.jumpMP).toBeDefined();
      expect(result.distribution).toBeDefined();
      expect(result.validation).toBeDefined();
      
      // Test that arrays are arrays
      expect(Array.isArray(result.allocated)).toBe(true);
      
      // Test that numbers are numbers
      expect(typeof result.jumpMP).toBe('number');
      
      // Test that objects are objects
      expect(typeof result.distribution).toBe('object');
      expect(typeof result.validation).toBe('object');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty weapon arrays', () => {
      const result = autoAllocationManager.autoAllocateWeapons([], mockConfig);
      
      expect(result).toBeDefined();
      expect(result.allocated).toEqual([]);
      expect(result.unallocated).toEqual([]);
      expect(result.strategy).toBeDefined();
      expect(result.heatEfficiency).toBeDefined();
    });

    test('should handle empty ammunition arrays', () => {
      const result = autoAllocationManager.autoAllocateAmmunition([], mockConfig);
      
      expect(result).toBeDefined();
      expect(result.allocated).toEqual([]);
      expect(result.unallocated).toEqual([]);
      expect(result.caseProtection).toBeDefined();
      expect(result.ammoBalance).toEqual([]);
    });

    test('should handle empty heat sink arrays', () => {
      const result = autoAllocationManager.autoAllocateHeatSinks([], mockConfig);
      
      expect(result).toBeDefined();
      expect(result.allocated).toEqual([]);
      expect(result.engineHeatSinks).toBeDefined();
      expect(result.externalHeatSinks).toBe(0);
      expect(result.heatDissipation).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should handle large weapon arrays efficiently', () => {
      const largeWeapons = Array.from({ length: 20 }, (_, i) => ({
        name: `Weapon ${i}`,
        type: 'weapon',
        weight: 1,
        heat: 1,
        criticalSlots: 1,
        equipmentData: { type: 'energy', heat: 1, damage: 5 }
      }));
      
      const startTime = Date.now();
      const result = autoAllocationManager.autoAllocateWeapons(largeWeapons, mockConfig);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should handle large ammunition arrays efficiently', () => {
      const largeAmmo = Array.from({ length: 20 }, (_, i) => ({
        name: `Ammo ${i}`,
        type: 'ammunition',
        weight: 1,
        explosive: true,
        equipmentData: { weapon: `Weapon ${i}`, tonnage: 1 }
      }));
      
      const startTime = Date.now();
      const result = autoAllocationManager.autoAllocateAmmunition(largeAmmo, mockConfig);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
}); 