/**
 * Tests for CalculationUtilitiesManager
 * Tests calculation utilities, mathematical operations, and validation helper functions.
 */

import { CalculationUtilitiesManager } from '../../../services/calculation/CalculationUtilitiesManager';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManager';
import { ComponentConfiguration } from '../../../types/componentConfiguration';

describe('CalculationUtilitiesManager', () => {
  let calculationManager: CalculationUtilitiesManager;
  let mockConfig: UnitConfiguration;
  let mockEquipment: any[];

  beforeEach(() => {
    calculationManager = new CalculationUtilitiesManager();
    
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
        criticalSlots: 1
      },
      {
        name: 'AC/20',
        type: 'weapon',
        weight: 14,
        heat: 7,
        damage: 20,
        criticalSlots: 10
      },
      {
        name: 'Single Heat Sink',
        type: 'heat_sink',
        weight: 1,
        heat: 0,
        criticalSlots: 1
      }
    ];
  });

  describe('Weight Calculations', () => {
    test('should calculate total weight', () => {
      const result = calculationManager.calculateTotalWeight(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalWeight');
      expect(result).toHaveProperty('componentWeights');
      expect(result).toHaveProperty('equipmentWeight');
      expect(result).toHaveProperty('remainingWeight');
      expect(result).toHaveProperty('weightDistribution');
      
      expect(typeof result.totalWeight).toBe('number');
      expect(typeof result.componentWeights).toBe('object');
      expect(typeof result.equipmentWeight).toBe('number');
      expect(typeof result.remainingWeight).toBe('number');
      expect(result.totalWeight).toBeGreaterThan(0);
    });

    test('should calculate weight distribution', () => {
      const result = calculationManager.calculateWeightDistribution(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('engine');
      expect(result).toHaveProperty('structure');
      expect(result).toHaveProperty('armor');
      expect(result).toHaveProperty('gyro');
      expect(result).toHaveProperty('cockpit');
      expect(result).toHaveProperty('heatSinks');
      expect(result).toHaveProperty('weapons');
      expect(result).toHaveProperty('ammunition');
      expect(result).toHaveProperty('jumpJets');
      expect(result).toHaveProperty('specialEquipment');
      expect(result).toHaveProperty('remaining');
      
      // All weights should be numbers and non-negative
      Object.values(result).forEach(weight => {
        expect(typeof weight).toBe('number');
        expect(weight).toBeGreaterThanOrEqual(0);
      });
    });

    test('should validate weight limits', () => {
      const result = calculationManager.validateWeightLimits(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('totalWeight');
      expect(result).toHaveProperty('maxWeight');
      expect(result).toHaveProperty('overweight');
      expect(result).toHaveProperty('underweight');
      expect(result).toHaveProperty('efficiency');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.totalWeight).toBe('number');
      expect(typeof result.maxWeight).toBe('number');
      expect(typeof result.overweight).toBe('number');
      expect(typeof result.underweight).toBe('number');
      expect(typeof result.efficiency).toBe('number');
    });

    test('should calculate weight efficiency', () => {
      const result = calculationManager.calculateWeightEfficiency(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('efficiency');
      expect(result).toHaveProperty('waste');
      expect(result).toHaveProperty('optimization');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.efficiency).toBe('number');
      expect(result.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.efficiency).toBeLessThanOrEqual(100);
      expect(typeof result.waste).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Heat Calculations', () => {
    test('should calculate heat generation', () => {
      const result = calculationManager.calculateHeatGeneration(mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalHeat');
      expect(result).toHaveProperty('weaponHeat');
      expect(result).toHaveProperty('engineHeat');
      expect(result).toHaveProperty('componentHeat');
      expect(result).toHaveProperty('heatByLocation');
      
      expect(typeof result.totalHeat).toBe('number');
      expect(typeof result.weaponHeat).toBe('number');
      expect(typeof result.engineHeat).toBe('number');
      expect(typeof result.componentHeat).toBe('number');
      expect(typeof result.heatByLocation).toBe('object');
    });

    test('should calculate heat dissipation', () => {
      const result = calculationManager.calculateHeatDissipation(mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalDissipation');
      expect(result).toHaveProperty('engineHeatSinks');
      expect(result).toHaveProperty('externalHeatSinks');
      expect(result).toHaveProperty('heatSinkType');
      expect(result).toHaveProperty('efficiency');
      
      expect(typeof result.totalDissipation).toBe('number');
      expect(typeof result.engineHeatSinks).toBe('number');
      expect(typeof result.externalHeatSinks).toBe('number');
      expect(typeof result.heatSinkType).toBe('string');
      expect(typeof result.efficiency).toBe('number');
    });

    test('should analyze heat management', () => {
      const result = calculationManager.analyzeHeatManagement(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('heatGeneration');
      expect(result).toHaveProperty('heatDissipation');
      expect(result).toHaveProperty('heatDeficit');
      expect(result).toHaveProperty('heatSurplus');
      expect(result).toHaveProperty('minimumHeatSinks');
      expect(result).toHaveProperty('actualHeatSinks');
      expect(result).toHaveProperty('efficiency');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.heatGeneration).toBe('number');
      expect(typeof result.heatDissipation).toBe('number');
      expect(typeof result.heatDeficit).toBe('number');
      expect(typeof result.heatSurplus).toBe('number');
      expect(typeof result.minimumHeatSinks).toBe('number');
      expect(typeof result.actualHeatSinks).toBe('number');
      expect(typeof result.efficiency).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should calculate heat efficiency', () => {
      const result = calculationManager.calculateHeatEfficiency(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('efficiency');
      expect(result).toHaveProperty('waste');
      expect(result).toHaveProperty('optimization');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.efficiency).toBe('number');
      expect(result.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.efficiency).toBeLessThanOrEqual(100);
      expect(typeof result.waste).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Movement Calculations', () => {
    test('should calculate movement profile', () => {
      const result = calculationManager.calculateMovementProfile(mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('walkMP');
      expect(result).toHaveProperty('runMP');
      expect(result).toHaveProperty('jumpMP');
      expect(result).toHaveProperty('engineRating');
      expect(result).toHaveProperty('tonnage');
      expect(result).toHaveProperty('engineType');
      expect(result).toHaveProperty('efficiency');
      
      expect(typeof result.walkMP).toBe('number');
      expect(typeof result.runMP).toBe('number');
      expect(typeof result.jumpMP).toBe('number');
      expect(typeof result.engineRating).toBe('number');
      expect(typeof result.tonnage).toBe('number');
      expect(typeof result.engineType).toBe('string');
      expect(typeof result.efficiency).toBe('number');
    });

    test('should validate movement rules', () => {
      const result = calculationManager.validateMovementRules(mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('walkMP');
      expect(result).toHaveProperty('runMP');
      expect(result).toHaveProperty('jumpMP');
      expect(result).toHaveProperty('engineRating');
      expect(result).toHaveProperty('tonnage');
      expect(result).toHaveProperty('engineType');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.walkMP).toBe('number');
      expect(typeof result.runMP).toBe('number');
      expect(typeof result.jumpMP).toBe('number');
      expect(typeof result.engineRating).toBe('number');
      expect(typeof result.tonnage).toBe('number');
      expect(typeof result.engineType).toBe('string');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should calculate movement efficiency', () => {
      const result = calculationManager.calculateMovementEfficiency(mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('efficiency');
      expect(result).toHaveProperty('waste');
      expect(result).toHaveProperty('optimization');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.efficiency).toBe('number');
      expect(result.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.efficiency).toBeLessThanOrEqual(100);
      expect(typeof result.waste).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Armor Calculations', () => {
    test('should calculate armor distribution', () => {
      const result = calculationManager.calculateArmorDistribution(mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalArmor');
      expect(result).toHaveProperty('armorByLocation');
      expect(result).toHaveProperty('frontArmor');
      expect(result).toHaveProperty('rearArmor');
      expect(result).toHaveProperty('distribution');
      expect(result).toHaveProperty('efficiency');
      
      expect(typeof result.totalArmor).toBe('number');
      expect(typeof result.armorByLocation).toBe('object');
      expect(typeof result.frontArmor).toBe('number');
      expect(typeof result.rearArmor).toBe('number');
      expect(typeof result.distribution).toBe('object');
      expect(typeof result.efficiency).toBe('number');
    });

    test('should validate armor rules', () => {
      const result = calculationManager.validateArmorRules(mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('totalArmor');
      expect(result).toHaveProperty('maxArmor');
      expect(result).toHaveProperty('armorType');
      expect(result).toHaveProperty('distribution');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.totalArmor).toBe('number');
      expect(typeof result.maxArmor).toBe('number');
      expect(typeof result.armorType).toBe('string');
      expect(typeof result.distribution).toBe('object');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should calculate armor efficiency', () => {
      const result = calculationManager.calculateArmorEfficiency(mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('efficiency');
      expect(result).toHaveProperty('waste');
      expect(result).toHaveProperty('optimization');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.efficiency).toBe('number');
      expect(result.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.efficiency).toBeLessThanOrEqual(100);
      expect(typeof result.waste).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Critical Slot Calculations', () => {
    test('should calculate critical slot usage', () => {
      const result = calculationManager.calculateCriticalSlotUsage(mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalSlots');
      expect(result).toHaveProperty('usedSlots');
      expect(result).toHaveProperty('availableSlots');
      expect(result).toHaveProperty('slotByLocation');
      expect(result).toHaveProperty('efficiency');
      
      expect(typeof result.totalSlots).toBe('number');
      expect(typeof result.usedSlots).toBe('number');
      expect(typeof result.availableSlots).toBe('number');
      expect(typeof result.slotByLocation).toBe('object');
      expect(typeof result.efficiency).toBe('number');
    });

    test('should validate critical slot rules', () => {
      const result = calculationManager.validateCriticalSlotRules(mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('totalSlots');
      expect(result).toHaveProperty('usedSlots');
      expect(result).toHaveProperty('availableSlots');
      expect(result).toHaveProperty('slotByLocation');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.totalSlots).toBe('number');
      expect(typeof result.usedSlots).toBe('number');
      expect(typeof result.availableSlots).toBe('number');
      expect(typeof result.slotByLocation).toBe('object');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should calculate critical slot efficiency', () => {
      const result = calculationManager.calculateCriticalSlotEfficiency(mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('efficiency');
      expect(result).toHaveProperty('waste');
      expect(result).toHaveProperty('optimization');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.efficiency).toBe('number');
      expect(result.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.efficiency).toBeLessThanOrEqual(100);
      expect(typeof result.waste).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Mathematical Utilities', () => {
    test('should round to specified decimal places', () => {
      expect(calculationManager.round(3.14159, 2)).toBe(3.14);
      expect(calculationManager.round(3.14159, 0)).toBe(3);
      expect(calculationManager.round(3.14159, 4)).toBe(3.1416);
      expect(calculationManager.round(0, 2)).toBe(0);
      expect(calculationManager.round(-3.14159, 2)).toBe(-3.14);
    });

    test('should calculate percentages', () => {
      expect(calculationManager.calculatePercentage(50, 100)).toBe(50);
      expect(calculationManager.calculatePercentage(25, 50)).toBe(50);
      expect(calculationManager.calculatePercentage(0, 100)).toBe(0);
      expect(calculationManager.calculatePercentage(100, 100)).toBe(100);
      expect(calculationManager.calculatePercentage(150, 100)).toBe(150);
    });

    test('should calculate efficiency scores', () => {
      expect(calculationManager.calculateEfficiencyScore(80, 100)).toBe(80);
      expect(calculationManager.calculateEfficiencyScore(50, 100)).toBe(50);
      expect(calculationManager.calculateEfficiencyScore(0, 100)).toBe(0);
      expect(calculationManager.calculateEfficiencyScore(100, 100)).toBe(100);
      expect(calculationManager.calculateEfficiencyScore(120, 100)).toBe(100); // Capped at 100%
    });

    test('should validate numeric ranges', () => {
      expect(calculationManager.isInRange(5, 0, 10)).toBe(true);
      expect(calculationManager.isInRange(0, 0, 10)).toBe(true);
      expect(calculationManager.isInRange(10, 0, 10)).toBe(true);
      expect(calculationManager.isInRange(-1, 0, 10)).toBe(false);
      expect(calculationManager.isInRange(11, 0, 10)).toBe(false);
    });

    test('should clamp values to range', () => {
      expect(calculationManager.clamp(5, 0, 10)).toBe(5);
      expect(calculationManager.clamp(-1, 0, 10)).toBe(0);
      expect(calculationManager.clamp(11, 0, 10)).toBe(10);
      expect(calculationManager.clamp(0, 0, 10)).toBe(0);
      expect(calculationManager.clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero values', () => {
      const zeroConfig = { ...mockConfig, tonnage: 0, engineRating: 0 };
      const zeroEquipment: any[] = [];
      
      const weightResult = calculationManager.calculateTotalWeight(zeroConfig, zeroEquipment);
      const heatResult = calculationManager.calculateHeatGeneration(zeroEquipment);
      const movementResult = calculationManager.calculateMovementProfile(zeroConfig);
      
      expect(weightResult).toBeDefined();
      expect(heatResult).toBeDefined();
      expect(movementResult).toBeDefined();
    });

    test('should handle negative values gracefully', () => {
      const negativeConfig = { ...mockConfig, tonnage: -10, engineRating: -100 };
      
      const weightResult = calculationManager.calculateTotalWeight(negativeConfig, mockEquipment);
      const movementResult = calculationManager.calculateMovementProfile(negativeConfig);
      
      expect(weightResult).toBeDefined();
      expect(movementResult).toBeDefined();
    });

    test('should handle missing properties', () => {
      const incompleteConfig = {
        tonnage: 100,
        engineRating: 300
      } as UnitConfiguration;
      
      const result = calculationManager.calculateTotalWeight(incompleteConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(typeof result.totalWeight).toBe('number');
    });
  });

  describe('Performance', () => {
    test('should handle large equipment arrays efficiently', () => {
      const largeEquipment = Array.from({ length: 100 }, (_, i) => ({
        name: `Equipment ${i}`,
        type: 'weapon',
        weight: 1,
        heat: 1,
        criticalSlots: 1
      }));
      
      const startTime = Date.now();
      const result = calculationManager.calculateTotalWeight(mockConfig, largeEquipment);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle complex calculations efficiently', () => {
      const complexConfig = {
        ...mockConfig,
        tonnage: 100,
        engineRating: 400,
        walkMP: 4,
        jumpMP: 4
      };
      
      const startTime = Date.now();
      const weightResult = calculationManager.calculateTotalWeight(complexConfig, mockEquipment);
      const heatResult = calculationManager.calculateHeatGeneration(mockEquipment);
      const movementResult = calculationManager.calculateMovementProfile(complexConfig);
      const endTime = Date.now();
      
      expect(weightResult).toBeDefined();
      expect(heatResult).toBeDefined();
      expect(movementResult).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 