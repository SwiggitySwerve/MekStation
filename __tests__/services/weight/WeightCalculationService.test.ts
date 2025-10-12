/**
 * Tests for WeightCalculationService
 */

import {
  WeightCalculationService,
  createWeightCalculationService
} from '../../../services/weight/WeightCalculationService';
import {
  WeightSummary,
  ComponentWeightBreakdown,
  TonnageValidation
} from '../../../services/weight/IWeightCalculationService';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManager';

describe('WeightCalculationService', () => {
  let service: WeightCalculationService;
  let mockConfig: UnitConfiguration;
  let mockEquipment: any[];

  beforeEach(() => {
    service = createWeightCalculationService();
    
    mockConfig = {
      chassis: 'Test Mech',
      model: 'TST-1',
      tonnage: 75,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 300,
      runMP: 6,
      engineType: 'Standard' as any,
      jumpMP: 0,
      jumpJetType: { type: 'Standard', techBase: 'Inner Sphere' } as any,
      jumpJetCounts: {},
      hasPartialWing: false,
      gyroType: 'Standard' as any,
      structureType: 'Standard' as any,
      armorType: 'Standard' as any,
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 23, rear: 12 },
        LT: { front: 16, rear: 8 },
        RT: { front: 16, rear: 8 },
        LA: { front: 12, rear: 0 },
        RA: { front: 12, rear: 0 },
        LL: { front: 16, rear: 0 },
        RL: { front: 16, rear: 0 }
      },
      armorTonnage: 12,
      heatSinkType: 'Single' as any,
      totalHeatSinks: 10,
      internalHeatSinks: 10,
      externalHeatSinks: 0,
      enhancements: [],
      mass: 75
    };

    mockEquipment = [
      {
        equipmentData: {
          name: 'AC/10',
          tonnage: 12,
          type: 'ballistic_weapon'
        },
        quantity: 1
      },
      {
        equipmentData: {
          name: 'AC/10 Ammo',
          tonnage: 1,
          type: 'ammunition'
        },
        quantity: 2
      }
    ];
  });

  describe('Factory Function', () => {
    it('should create WeightCalculationService instance', () => {
      const service = createWeightCalculationService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(WeightCalculationService);
    });
  });

  describe('calculateTotalWeight', () => {
    it('should calculate total weight correctly', () => {
      const result: WeightSummary = service.calculateTotalWeight(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result.totalWeight).toBeGreaterThan(0);
      expect(result.maxTonnage).toBe(75);
      expect(result.remainingTonnage).toBeLessThan(75);
      expect(result.percentageUsed).toBeGreaterThan(0);
      expect(result.isOverweight).toBeDefined();
      expect(result.breakdown).toBeDefined();
    });

    it('should handle empty equipment array', () => {
      const result = service.calculateTotalWeight(mockConfig, []);
      
      expect(result.breakdown.equipment).toBe(0);
      expect(result.breakdown.ammunition).toBe(0);
    });

    it('should detect overweight condition', () => {
      const heavyEquipment = Array(20).fill({
        equipmentData: { tonnage: 5 },
        quantity: 1
      });
      
      const result = service.calculateTotalWeight(mockConfig, heavyEquipment);
      expect(result.isOverweight).toBe(true);
    });
  });

  describe('calculateComponentWeights', () => {
    it('should calculate all component weights', () => {
      const result: ComponentWeightBreakdown = service.calculateComponentWeights(mockConfig);
      
      expect(result.structure).toBeDefined();
      expect(result.engine).toBeDefined();
      expect(result.gyro).toBeDefined();
      expect(result.heatSinks).toBeDefined();
      expect(result.armor).toBeDefined();
      expect(result.jumpJets).toBeDefined();
    });

    it('should handle Standard components', () => {
      const result = service.calculateComponentWeights(mockConfig);
      
      expect(result.structure).toBe('Standard');
      expect(result.engine).toBe('Standard');
      expect(result.armor).toBe('Standard');
    });

    it('should handle advanced components', () => {
      const advancedConfig = {
        ...mockConfig,
        structureType: 'Endo Steel',
        engineType: 'XL',
        armorType: 'Ferro-Fibrous'
      };
      
      const result = service.calculateComponentWeights(advancedConfig);
      
      expect(result.structure).toBe('Endo Steel');
      expect(result.engine).toBe('XL');
      expect(result.armor).toBe('Ferro-Fibrous');
    });
  });

  describe('calculateEquipmentWeight', () => {
    it('should calculate equipment weight correctly', () => {
      const result = service.calculateEquipmentWeight(mockEquipment);
      expect(result).toBe(14); // 12 + 1*2
    });

    it('should handle equipment with quantities', () => {
      const equipment = [
        { equipmentData: { tonnage: 3 }, quantity: 2 },
        { equipmentData: { tonnage: 1 }, quantity: 5 }
      ];
      
      const result = service.calculateEquipmentWeight(equipment);
      expect(result).toBe(11); // 3*2 + 1*5
    });

    it('should handle missing equipment data', () => {
      const equipment = [
        { equipmentData: null },
        { equipmentData: { tonnage: undefined } },
        {}
      ];
      
      const result = service.calculateEquipmentWeight(equipment);
      expect(result).toBe(0);
    });
  });

  describe('validateTonnageLimit', () => {
    it('should validate tonnage within limits', () => {
      const result: TonnageValidation = service.validateTonnageLimit(mockConfig, []);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.currentWeight).toBeLessThan(result.maxTonnage);
    });

    it('should detect overweight condition', () => {
      const heavyEquipment = Array(30).fill({
        equipmentData: { tonnage: 3 },
        quantity: 1
      });
      
      const result = service.validateTonnageLimit(mockConfig, heavyEquipment);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.overweight).toBeGreaterThan(0);
    });

    it('should warn about near-capacity usage', () => {
      // Create equipment that uses ~96% of capacity
      const nearCapacityEquipment = [
        { equipmentData: { tonnage: 40 }, quantity: 1 }
      ];
      
      const result = service.validateTonnageLimit(mockConfig, nearCapacityEquipment);
      
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('calculateRemainingTonnage', () => {
    it('should calculate remaining tonnage correctly', () => {
      const result = service.calculateRemainingTonnage(mockConfig, mockEquipment);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(mockConfig.tonnage);
    });

    it('should return zero for overweight units', () => {
      const heavyEquipment = Array(50).fill({
        equipmentData: { tonnage: 2 },
        quantity: 1
      });
      
      const result = service.calculateRemainingTonnage(mockConfig, heavyEquipment);
      expect(result).toBe(0);
    });
  });

  describe('isWithinTonnageLimit', () => {
    it('should return true for valid configurations', () => {
      const result = service.isWithinTonnageLimit(mockConfig, mockEquipment);
      expect(result).toBe(true);
    });

    it('should return false for overweight configurations', () => {
      const heavyEquipment = Array(50).fill({
        equipmentData: { tonnage: 2 },
        quantity: 1
      });
      
      const result = service.isWithinTonnageLimit(mockConfig, heavyEquipment);
      expect(result).toBe(false);
    });
  });

  describe('calculateJumpJetWeight', () => {
    it('should return zero for no jump jets', () => {
      const result = service.calculateJumpJetWeight(mockConfig);
      expect(result).toBe(0);
    });

    it('should calculate jump jet weight correctly', () => {
      const jumpConfig = { ...mockConfig, jumpMP: 3 };
      const result = service.calculateJumpJetWeight(jumpConfig);
      expect(result).toBeGreaterThan(0);
    });

    it('should apply jump jet type modifiers', () => {
      const standardConfig = { ...mockConfig, jumpMP: 3, jumpJetType: 'Standard Jump Jet' };
      const improvedConfig = { ...mockConfig, jumpMP: 3, jumpJetType: 'Improved Jump Jet' };
      
      const standardWeight = service.calculateJumpJetWeight(standardConfig);
      const improvedWeight = service.calculateJumpJetWeight(improvedConfig);
      
      expect(improvedWeight).toBeGreaterThan(standardWeight);
    });
  });

  describe('Engine Types', () => {
    it('should calculate Standard engine weight', () => {
      const result = service.calculateComponentWeights(mockConfig);
      expect(result.engine.weight).toBe(12); // 300/25 = 12
      expect(result.engine.efficiency).toBe(1.0);
    });

    it('should calculate XL engine weight', () => {
      const xlConfig = { ...mockConfig, engineType: 'XL' };
      const result = service.calculateComponentWeights(xlConfig);
      expect(result.engine.weight).toBe(6); // (300/25) * 0.5 = 6
      expect(result.engine.efficiency).toBe(2.0);
    });
  });

  describe('Structure Types', () => {
    it('should calculate Standard structure weight', () => {
      const result = service.calculateComponentWeights(mockConfig);
      expect(result.structure.weight).toBe(8); // ceil(75/10) = 8
      expect(result.structure.efficiency).toBe(1.0);
    });

    it('should calculate Endo Steel structure weight', () => {
      const endoConfig = { ...mockConfig, structureType: 'Endo Steel' };
      const result = service.calculateComponentWeights(endoConfig);
      expect(result.structure.weight).toBe(4); // ceil(75/10) * 0.5 = 4
      expect(result.structure.efficiency).toBe(2.0);
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined configuration values', () => {
      const incompleteConfig = {
        tonnage: 50,
        engineRating: undefined,
        engineType: undefined
      } as any;
      
      expect(() => {
        service.calculateComponentWeights(incompleteConfig);
      }).not.toThrow();
    });

    it('should handle invalid equipment data', () => {
      const invalidEquipment = [
        null,
        undefined,
        { invalid: 'data' },
        { equipmentData: null }
      ];
      
      const result = service.calculateEquipmentWeight(invalidEquipment);
      expect(result).toBe(0);
    });
  });
});