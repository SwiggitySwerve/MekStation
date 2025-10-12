/**
 * Tests for WeightCalculationService
 * 
 * Validates core weight calculations for components and equipment.
 * Tests the foundational calculations that other services depend on.
 */

import { WeightCalculationService } from '../../../services/weight-balance/WeightCalculationService';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManager';
import { Equipment } from '../../../services/weight-balance/types';

describe('WeightCalculationService', () => {
  let mockConfig: UnitConfiguration;
  let mockEquipment: Equipment[];

  beforeEach(() => {
    mockConfig = {
      chassis: 'Test Mech',
      model: 'TST-1',
      tonnage: 50,
      unitType: 'BattleMech',
      techBase: 'Inner Sphere',
      walkMP: 4,
      engineRating: 200,
      runMP: 6,
      engineType: 'Standard',
      gyroType: 'Standard',
      structureType: 'Standard',
      armorType: 'Standard',
      armorAllocation: {
        HD: { front: 9, rear: 0 },
        CT: { front: 15, rear: 4 },
        LT: { front: 12, rear: 3 },
        RT: { front: 12, rear: 3 },
        LA: { front: 10, rear: 0 },
        RA: { front: 10, rear: 0 },
        LL: { front: 10, rear: 0 },
        RL: { front: 10, rear: 0 }
      },
      armorTonnage: 6.5,
      heatSinkType: 'Single',
      totalHeatSinks: 10,
      internalHeatSinks: 8,
      externalHeatSinks: 2,
      enhancements: [],
      jumpMP: 0,
      jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
      jumpJetCounts: {},
      hasPartialWing: false,
      mass: 50
    };

    mockEquipment = [
      {
        equipmentData: {
          name: 'Large Laser',
          tonnage: 5,
          type: 'energy_weapon'
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

  describe('calculateTotalWeight', () => {
    it('should calculate total weight correctly', () => {
      const summary = WeightCalculationService.calculateTotalWeight(mockConfig, mockEquipment);
      
      expect(summary.totalWeight).toBeGreaterThan(0);
      expect(summary.maxTonnage).toBe(50);
      expect(summary.remainingTonnage).toBe(summary.maxTonnage - summary.totalWeight);
      expect(summary.percentageUsed).toBe((summary.totalWeight / summary.maxTonnage) * 100);
      expect(summary.isOverweight).toBe(summary.totalWeight > summary.maxTonnage);
      
      // Verify breakdown adds up
      const breakdownTotal = 
        summary.breakdown.structure +
        summary.breakdown.engine +
        summary.breakdown.gyro +
        summary.breakdown.heatSinks +
        summary.breakdown.armor +
        summary.breakdown.equipment +
        summary.breakdown.ammunition +
        summary.breakdown.jumpJets;
      
      expect(Math.abs(summary.totalWeight - breakdownTotal)).toBeLessThan(0.1);
    });

    it('should handle overweight units', () => {
      const heavyConfig = {
        ...mockConfig,
        tonnage: 20, // Very small tonnage
        engineRating: 400 // Very large engine
      };
      
      const summary = WeightCalculationService.calculateTotalWeight(heavyConfig, mockEquipment);
      
      expect(summary.isOverweight).toBe(true);
      expect(summary.remainingTonnage).toBeLessThanOrEqual(0);
      expect(summary.percentageUsed).toBeGreaterThan(100);
    });

    it('should handle empty equipment list', () => {
      const summary = WeightCalculationService.calculateTotalWeight(mockConfig, []);
      
      expect(summary.breakdown.equipment).toBe(0);
      expect(summary.breakdown.ammunition).toBe(0);
      expect(summary.totalWeight).toBeGreaterThan(0); // Should still have component weights
    });
  });

  describe('calculateComponentWeights', () => {
    it('should calculate all component weights', () => {
      const weights = WeightCalculationService.calculateComponentWeights(mockConfig);
      
      expect(weights.structure.weight).toBeGreaterThan(0);
      expect(weights.engine.weight).toBeGreaterThan(0);
      expect(weights.gyro.weight).toBeGreaterThan(0);
      expect(weights.heatSinks.total).toBeGreaterThanOrEqual(0);
      expect(weights.armor.weight).toBeGreaterThanOrEqual(0);
      expect(weights.jumpJets.weight).toBeGreaterThanOrEqual(0);
      
      // Verify component types
      expect(weights.structure).toBe('Standard');
      expect(weights.engine).toBe('Standard');
      expect(weights.gyro).toBe('Standard');
      expect(weights.heatSinks).toBe('Single');
      expect(weights.armor).toBe('Standard');
    });

    it('should calculate efficiency ratings', () => {
      const weights = WeightCalculationService.calculateComponentWeights(mockConfig);
      
      expect(weights.structure.efficiency).toBe(1.0); // Standard efficiency
      expect(weights.engine.efficiency).toBe(1.0);
      expect(weights.gyro.efficiency).toBe(1.0);
      expect(weights.heatSinks.efficiency).toBe(1.0);
      expect(weights.armor.efficiency).toBe(1.0);
    });
  });

  describe('calculateEquipmentWeight', () => {
    it('should calculate equipment weight correctly', () => {
      const weight = WeightCalculationService.calculateEquipmentWeight(mockEquipment);
      expect(weight).toBe(7); // 5 + (1 * 2) = 7 tons
    });

    it('should handle empty equipment array', () => {
      const weight = WeightCalculationService.calculateEquipmentWeight([]);
      expect(weight).toBe(0);
    });

    it('should handle invalid equipment data', () => {
      const invalidEquipment = [
        null as any,
        undefined as any,
        { equipmentData: null } as any,
        { equipmentData: { tonnage: null } } as any
      ];
      
      const weight = WeightCalculationService.calculateEquipmentWeight(invalidEquipment);
      expect(weight).toBe(0);
    });
  });

  describe('Component-Specific Calculations', () => {
    describe('calculateStructureWeight', () => {
      it('should calculate Standard structure weight', () => {
        const structure = WeightCalculationService.calculateStructureWeight(mockConfig);
        
        expect(structure.weight).toBe(5); // ceil(50/10) = 5
        expect(structure).toBe('Standard');
        expect(structure.efficiency).toBe(1.0);
      });

      it('should calculate Endo Steel structure weight', () => {
        const endoConfig = {
          ...mockConfig,
          structureType: { type: 'Endo Steel', techBase: 'Inner Sphere' as const }
        };
        
        const structure = WeightCalculationService.calculateStructureWeight(endoConfig);
        
        expect(structure.weight).toBe(2.5); // ceil(50/10) * 0.5 = 2.5
        expect(structure).toBe('Endo Steel');
        expect(structure.efficiency).toBe(2.0);
      });
    });

    describe('calculateEngineWeight', () => {
      it('should calculate Standard engine weight', () => {
        const engine = WeightCalculationService.calculateEngineWeight(mockConfig);
        
        expect(engine.weight).toBe(8); // 200/25 = 8
        expect(engine).toBe('Standard');
        expect(engine.rating).toBe(200);
        expect(engine.efficiency).toBe(1.0);
      });

      it('should calculate XL engine weight', () => {
        const xlConfig = { ...mockConfig, engineType: 'XL' as const };
        const engine = WeightCalculationService.calculateEngineWeight(xlConfig);
        
        expect(engine.weight).toBe(4); // 200/25 * 0.5 = 4
        expect(engine).toBe('XL');
        expect(engine.efficiency).toBe(2.0);
      });

      it('should calculate Light engine weight', () => {
        const lightConfig = { ...mockConfig, engineType: 'Light' as const };
        const engine = WeightCalculationService.calculateEngineWeight(lightConfig);
        
        expect(engine.weight).toBe(6); // 200/25 * 0.75 = 6
        expect(engine).toBe('Light');
        expect(engine.efficiency).toBe(1.33);
      });
    });

    describe('calculateGyroWeight', () => {
      it('should calculate Standard gyro weight', () => {
        const gyro = WeightCalculationService.calculateGyroWeight(mockConfig);
        
        expect(gyro.weight).toBe(2); // ceil(200/100) = 2
        expect(gyro).toBe('Standard');
        expect(gyro.efficiency).toBe(1.0);
      });

      it('should calculate XL gyro weight', () => {
        const xlGyroConfig = {
          ...mockConfig,
          gyroType: { type: 'XL', techBase: 'Inner Sphere' as const }
        };
        
        const gyro = WeightCalculationService.calculateGyroWeight(xlGyroConfig);
        
        expect(gyro.weight).toBe(1); // ceil(200/100) * 0.5 = 1
        expect(gyro).toBe('XL');
        expect(gyro.efficiency).toBe(2.0);
      });
    });

    describe('calculateHeatSinkWeight', () => {
      it('should calculate Single heat sink weight', () => {
        const heatSinks = WeightCalculationService.calculateHeatSinkWeight(mockConfig);
        
        expect(heatSinks.internal).toBe(0); // Internal heat sinks don't add weight
        expect(heatSinks.external).toBe(2); // 2 external * 1.0 = 2
        expect(heatSinks.total).toBe(2);
        expect(heatSinks).toBe('Single');
        expect(heatSinks.efficiency).toBe(1.0);
      });

      it('should calculate Double heat sink weight', () => {
        const doubleConfig = {
          ...mockConfig,
          heatSinkType: { type: 'Double', techBase: 'Inner Sphere' as const }
        };
        
        const heatSinks = WeightCalculationService.calculateHeatSinkWeight(doubleConfig);
        
        expect(heatSinks.external).toBe(2); // 2 external * 1.0 = 2
        expect(heatSinks).toBe('Double');
        expect(heatSinks.efficiency).toBe(2.0);
      });
    });

    describe('calculateArmorWeight', () => {
      it('should calculate Standard armor weight', () => {
        const armor = WeightCalculationService.calculateArmorWeight(mockConfig);
        
        expect(armor.weight).toBe(6.5);
        expect(armor).toBe('Standard');
        expect(armor.points).toBe(98); // Sum of all allocated armor points
        expect(armor.efficiency).toBe(1.0);
      });

      it('should calculate Ferro-Fibrous armor efficiency', () => {
        const ferroConfig = {
          ...mockConfig,
          armorType: { type: 'Ferro-Fibrous', techBase: 'Inner Sphere' as const }
        };
        
        const armor = WeightCalculationService.calculateArmorWeight(ferroConfig);
        
        expect(armor).toBe('Ferro-Fibrous');
        expect(armor.efficiency).toBeCloseTo(1.1, 2); // 35.2/32 ≈ 1.1
      });
    });

    describe('calculateJumpJetWeight', () => {
      it('should return zero weight for no jump jets', () => {
        const jumpJets = WeightCalculationService.calculateJumpJetWeight(mockConfig);
        
        expect(jumpJets.weight).toBe(0);
        expect(jumpJets.count).toBe(0);
        expect(jumpJets).toBe('None');
        expect(jumpJets.efficiency).toBe(0);
      });

      it('should calculate jump jet weight correctly', () => {
        const jumpConfig = { ...mockConfig, jumpMP: 4 };
        const jumpJets = WeightCalculationService.calculateJumpJetWeight(jumpConfig);
        
        // 50-ton mech with 4 jump MP: ceil(50/10) * 4 * 0.5 = 5 * 4 * 0.5 = 10 tons
        expect(jumpJets.weight).toBe(10);
        expect(jumpJets.count).toBe(4);
        expect(jumpJets).toBe('Standard Jump Jet');
        expect(jumpJets.efficiency).toBe(1.0);
      });

      it('should apply jump jet type modifiers', () => {
        const improvedConfig = {
          ...mockConfig,
          jumpMP: 2,
          jumpJetType: { type: 'Improved Jump Jet', techBase: 'Inner Sphere' as const }
        };
        
        const jumpJets = WeightCalculationService.calculateJumpJetWeight(improvedConfig);
        
        // Base weight * 2 for Improved Jump Jets
        const expectedBase = Math.ceil(50 / 10) * 2 * 0.5; // 5 tons
        expect(jumpJets.weight).toBe(expectedBase * 2); // 10 tons
        expect(jumpJets.efficiency).toBe(0.5);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('calculateRemainingTonnage', () => {
      it('should calculate remaining tonnage', () => {
        const remaining = WeightCalculationService.calculateRemainingTonnage(mockConfig, mockEquipment);
        
        expect(remaining).toBeGreaterThanOrEqual(0);
        expect(remaining).toBeLessThanOrEqual(mockConfig.tonnage);
        
        const totalWeight = WeightCalculationService.calculateTotalWeight(mockConfig, mockEquipment);
        const expected = Math.max(0, mockConfig.tonnage - totalWeight.totalWeight);
        expect(remaining).toBe(expected);
      });

      it('should return zero for overweight units', () => {
        const overweightConfig = { ...mockConfig, tonnage: 10 };
        const remaining = WeightCalculationService.calculateRemainingTonnage(overweightConfig, mockEquipment);
        
        expect(remaining).toBe(0);
      });
    });

    describe('isWithinTonnageLimit', () => {
      it('should return true for valid configurations', () => {
        const isValid = WeightCalculationService.isWithinTonnageLimit(mockConfig, mockEquipment);
        
        expect(typeof isValid).toBe('boolean');
        
        const totalWeight = WeightCalculationService.calculateTotalWeight(mockConfig, mockEquipment);
        expect(isValid).toBe(totalWeight.totalWeight <= mockConfig.tonnage);
      });

      it('should return false for overweight configurations', () => {
        const overweightConfig = { ...mockConfig, tonnage: 10 };
        const isValid = WeightCalculationService.isWithinTonnageLimit(overweightConfig, mockEquipment);
        
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero tonnage gracefully', () => {
      const zeroConfig = { ...mockConfig, tonnage: 0 };
      const summary = WeightCalculationService.calculateTotalWeight(zeroConfig, []);
      
      expect(summary.maxTonnage).toBe(0);
      expect(summary.isOverweight).toBe(true); // Any weight will be overweight
      expect(summary.percentageUsed).toBe(Infinity); // Division by zero case
    });

    it('should handle missing optional fields', () => {
      const minimalConfig = {
        ...mockConfig,
        armorTonnage: undefined,
        internalHeatSinks: undefined,
        externalHeatSinks: undefined
      };
      
      const weights = WeightCalculationService.calculateComponentWeights(minimalConfig);
      
      expect(weights.armor.weight).toBe(0);
      expect(weights.heatSinks.total).toBe(0);
    });

    it('should handle string component types', () => {
      const stringConfig = {
        ...mockConfig,
        structureType: 'Endo Steel',
        armorType: 'Ferro-Fibrous',
        heatSinkType: 'Double',
        gyroType: 'XL'
      };
      
      const weights = WeightCalculationService.calculateComponentWeights(stringConfig as any);
      
      expect(weights.structure).toBe('Endo Steel');
      expect(weights.armor).toBe('Ferro-Fibrous');
      expect(weights.heatSinks).toBe('Double');
      expect(weights.gyro).toBe('XL');
    });
  });
});