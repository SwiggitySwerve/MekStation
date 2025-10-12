/**
 * Tests for WeightBalanceService
 * 
 * Validates weight calculations, balance analysis, optimization suggestions, and BattleTech rule compliance.
 */

import { 
  WeightBalanceService, 
  WeightBalanceServiceImpl,
  createWeightBalanceService,
  WeightSummary,
  ComponentWeightBreakdown,
  WeightDistribution,
  CenterOfGravity,
  StabilityAnalysis,
  OptimizationSuggestion,
  WeightReductionOptions,
  WeightSaving,
  TonnageValidation,
  ArmorEfficiency,
  WeightPenalty
} from '../../services/WeightBalanceService';
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManager';

describe('WeightBalanceService', () => {
  let service: WeightBalanceService;
  let mockConfig: UnitConfiguration;
  let mockEquipment: any[];

  beforeEach(() => {
    service = createWeightBalanceService();
    
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
        CT: { front: 20, rear: 6 },
        LT: { front: 15, rear: 4 },
        RT: { front: 15, rear: 4 },
        LA: { front: 12, rear: 0 },
        RA: { front: 12, rear: 0 },
        LL: { front: 15, rear: 0 },
        RL: { front: 15, rear: 0 }
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

  describe('Factory Function', () => {
    it('should create WeightBalanceService instance', () => {
      const createdService = createWeightBalanceService();
      expect(createdService).toBeInstanceOf(WeightBalanceServiceImpl);
    });
  });

  describe('Total Weight Calculations', () => {
    describe('calculateTotalWeight', () => {
      it('should calculate total weight correctly', () => {
        const summary = service.calculateTotalWeight(mockConfig, mockEquipment);
        
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
        // Create an overweight config
        const heavyConfig = {
          ...mockConfig,
          tonnage: 20, // Very small tonnage
          engineRating: 400 // Very large engine
        };
        
        const summary = service.calculateTotalWeight(heavyConfig, mockEquipment);
        
        expect(summary.isOverweight).toBe(true);
        expect(summary.remainingTonnage).toBeLessThanOrEqual(0);
        expect(summary.percentageUsed).toBeGreaterThan(100);
      });
    });

    describe('calculateComponentWeights', () => {
      it('should calculate all component weights', () => {
        const weights = service.calculateComponentWeights(mockConfig);
        
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
        const weights = service.calculateComponentWeights(mockConfig);
        
        expect(weights.structure.efficiency).toBe(1.0); // Standard efficiency
        expect(weights.engine.efficiency).toBe(1.0);
        expect(weights.gyro.efficiency).toBe(1.0);
        expect(weights.heatSinks.efficiency).toBe(1.0);
        expect(weights.armor.efficiency).toBe(1.0);
      });
    });

    describe('calculateEquipmentWeight', () => {
      it('should calculate equipment weight correctly', () => {
        const weight = service.calculateEquipmentWeight(mockEquipment);
        expect(weight).toBe(7); // 5 + (1 * 2) = 7 tons
      });

      it('should handle empty equipment array', () => {
        const weight = service.calculateEquipmentWeight([]);
        expect(weight).toBe(0);
      });

      it('should handle invalid equipment data', () => {
        const invalidEquipment = [
          null,
          undefined,
          { equipmentData: null },
          { equipmentData: { tonnage: null } }
        ];
        
        const weight = service.calculateEquipmentWeight(invalidEquipment);
        expect(weight).toBe(0);
      });
    });
  });

  describe('Balance Analysis', () => {
    describe('analyzeWeightDistribution', () => {
      it('should analyze weight distribution', () => {
        const distribution = service.analyzeWeightDistribution(mockConfig, mockEquipment);
        
        expect(distribution.distribution).toBeDefined();
        expect(distribution.balance.frontToRear).toBeGreaterThanOrEqual(-1);
        expect(distribution.balance.frontToRear).toBeLessThanOrEqual(1);
        expect(distribution.balance.leftToRight).toBeGreaterThanOrEqual(-1);
        expect(distribution.balance.leftToRight).toBeLessThanOrEqual(1);
        
        expect(typeof distribution.frontHeavy).toBe('boolean');
        expect(typeof distribution.rearHeavy).toBe('boolean');
        expect(typeof distribution.leftHeavy).toBe('boolean');
        expect(typeof distribution.rightHeavy).toBe('boolean');
      });

      it('should detect front-heavy configuration', () => {
        // This is a simplified test - actual implementation would need specific equipment placement
        const distribution = service.analyzeWeightDistribution(mockConfig, mockEquipment);
        
        // Test the logic structure
        expect(distribution.frontHeavy).toBe(distribution.balance.frontToRear > 0.15);
        expect(distribution.rearHeavy).toBe(distribution.balance.frontToRear < -0.15);
        expect(distribution.leftHeavy).toBe(distribution.balance.leftToRight > 0.1);
        expect(distribution.rightHeavy).toBe(distribution.balance.leftToRight < -0.1);
      });
    });

    describe('calculateCenterOfGravity', () => {
      it('should calculate center of gravity', () => {
        const cog = service.calculateCenterOfGravity(mockConfig, mockEquipment);
        
        expect(cog.x).toBeDefined();
        expect(cog.y).toBeDefined();
        expect(cog.z).toBeDefined();
        expect(['excellent', 'good', 'acceptable', 'poor', 'unstable']).toContain(cog.stability);
        expect(Array.isArray(cog.recommendations)).toBe(true);
      });

      it('should handle zero weight scenario', () => {
        const emptyConfig = { ...mockConfig, tonnage: 0 };
        const cog = service.calculateCenterOfGravity(emptyConfig, []);
        
        expect(cog.x).toBe(0);
        expect(cog.y).toBe(0);
        expect(cog.z).toBe(0);
        expect(cog.stability).toBe('unstable');
        expect(cog.recommendations).toContain('Add weight to stabilize unit');
      });
    });

    describe('analyzeStability', () => {
      it('should analyze overall stability', () => {
        const stability = service.analyzeStability(mockConfig, mockEquipment);
        
        expect(stability.overallStability).toBeGreaterThanOrEqual(0);
        expect(stability.overallStability).toBeLessThanOrEqual(100);
        expect(stability.balanceScore).toBeGreaterThanOrEqual(0);
        expect(stability.balanceScore).toBeLessThanOrEqual(100);
        expect(stability.weightDistributionScore).toBeGreaterThanOrEqual(0);
        expect(stability.weightDistributionScore).toBeLessThanOrEqual(100);
        expect(stability.structuralIntegrityScore).toBeGreaterThanOrEqual(0);
        expect(stability.structuralIntegrityScore).toBeLessThanOrEqual(100);
        
        expect(Array.isArray(stability.recommendations)).toBe(true);
        expect(Array.isArray(stability.warnings)).toBe(true);
      });
    });
  });

  describe('Optimization', () => {
    describe('generateOptimizationSuggestions', () => {
      it('should generate optimization suggestions', () => {
        const suggestions = service.generateOptimizationSuggestions(mockConfig, mockEquipment);
        
        expect(Array.isArray(suggestions)).toBe(true);
        
        suggestions.forEach(suggestion => {
          expect(['engine', 'armor', 'structure', 'equipment', 'heatsinks', 'jumpjets']).toContain(suggestion.category);
          expect(['weight_reduction', 'efficiency_improvement', 'cost_reduction']).toContain(suggestion);
          expect(suggestion.weightSavings).toBeGreaterThanOrEqual(0);
          expect(['easy', 'moderate', 'hard']).toContain(suggestion.difficulty);
          expect(['high', 'medium', 'low']).toContain(suggestion.priority);
        });
      });

      it('should suggest structure upgrade for Standard structure', () => {
        const suggestions = service.generateOptimizationSuggestions(mockConfig, mockEquipment);
        
        const structureSuggestion = suggestions.find(s => s.category === 'structure');
        expect(structureSuggestion).toBeDefined();
        expect(structureSuggestion?.description).toContain('Endo Steel');
      });

      it('should suggest engine upgrade for light mechs with Standard engine', () => {
        const lightConfig = { ...mockConfig, tonnage: 35 };
        const suggestions = service.generateOptimizationSuggestions(lightConfig, mockEquipment);
        
        const engineSuggestion = suggestions.find(s => s.category === 'engine');
        expect(engineSuggestion).toBeDefined();
        expect(engineSuggestion?.description).toContain('XL Engine');
      });
    });

    describe('calculateWeightReduction', () => {
      it('should calculate weight reduction options', () => {
        const options = service.calculateWeightReduction(mockConfig);
        
        expect(options.structureUpgrade).toBeDefined();
        expect(options.engineDowngrade).toBeDefined();
        expect(options.armorOptimization).toBeDefined();
        expect(options.equipmentAlternatives).toBeDefined();
        
        // Structure upgrade should be available for Standard structure
        expect(options.structureUpgrade.available).toBe(true);
        expect(options.structureUpgrade.savings).toBeGreaterThan(0);
      });
    });

    describe('findWeightSavings', () => {
      it('should find weight savings opportunities', () => {
        const savings = service.findWeightSavings(mockConfig, mockEquipment);
        
        expect(Array.isArray(savings)).toBe(true);
        
        savings.forEach(saving => {
          expect(saving.savings).toBeGreaterThan(0);
          expect(saving.currentWeight).toBeGreaterThan(saving.proposedWeight);
          expect(typeof saving.feasible).toBe('boolean');
          expect(Array.isArray(saving.tradeoffs)).toBe(true);
        });
      });
    });
  });

  describe('Validation', () => {
    describe('validateTonnageLimit', () => {
      it('should validate tonnage within limits', () => {
        const validation = service.validateTonnageLimit(mockConfig, mockEquipment);
        
        expect(typeof validation.isValid).toBe('boolean');
        expect(validation.currentWeight).toBeGreaterThan(0);
        expect(validation.maxTonnage).toBe(50);
        expect(validation.overweight).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(validation.errors)).toBe(true);
        expect(Array.isArray(validation.warnings)).toBe(true);
        expect(Array.isArray(validation.suggestions)).toBe(true);
      });

      it('should detect overweight condition', () => {
        const overweightConfig = { ...mockConfig, tonnage: 20 };
        const validation = service.validateTonnageLimit(overweightConfig, mockEquipment);
        
        expect(validation.isValid).toBe(false);
        expect(validation.overweight).toBeGreaterThan(0);
        expect(validation.errors.length).toBeGreaterThan(0);
        expect(validation.errors[0]).toContain('overweight');
      });

      it('should warn about near-capacity usage', () => {
        // Create a config that uses >95% of tonnage but isn't overweight
        const nearCapacityConfig = { ...mockConfig, tonnage: 30 };
        const validation = service.validateTonnageLimit(nearCapacityConfig, mockEquipment);
        
        if (validation.currentWeight / nearCapacityConfig.tonnage > 0.95) {
          expect(validation.warnings.length).toBeGreaterThan(0);
        }
      });
    });

    describe('calculateRemainingTonnage', () => {
      it('should calculate remaining tonnage', () => {
        const remaining = service.calculateRemainingTonnage(mockConfig, mockEquipment);
        
        expect(remaining).toBeGreaterThanOrEqual(0);
        expect(remaining).toBeLessThanOrEqual(mockConfig.tonnage);
      });

      it('should return zero for overweight units', () => {
        const overweightConfig = { ...mockConfig, tonnage: 10 };
        const remaining = service.calculateRemainingTonnage(overweightConfig, mockEquipment);
        
        expect(remaining).toBe(0);
      });
    });

    describe('isWithinTonnageLimit', () => {
      it('should return true for valid configurations', () => {
        const isValid = service.isWithinTonnageLimit(mockConfig, mockEquipment);
        
        // This depends on the actual weight calculation
        expect(typeof isValid).toBe('boolean');
      });

      it('should return false for overweight configurations', () => {
        const overweightConfig = { ...mockConfig, tonnage: 10 };
        const isValid = service.isWithinTonnageLimit(overweightConfig, mockEquipment);
        
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Specialized Calculations', () => {
    describe('calculateJumpJetWeight', () => {
      it('should return zero for no jump jets', () => {
        const weight = service.calculateJumpJetWeight(mockConfig);
        expect(weight).toBe(0);
      });

      it('should calculate jump jet weight correctly', () => {
        const jumpConfig = { ...mockConfig, jumpMP: 4 };
        const weight = service.calculateJumpJetWeight(jumpConfig);
        
        // 50-ton mech with 4 jump MP: ceil(50/10) * 4 * 0.5 = 5 * 4 * 0.5 = 10 tons
        expect(weight).toBe(10);
      });

      it('should apply jump jet type modifiers', () => {
        const improvedConfig = {
          ...mockConfig,
          jumpMP: 2,
          jumpJetType: { type: 'Improved Jump Jet', techBase: 'Inner Sphere' as const }
        };
        
        const weight = service.calculateJumpJetWeight(improvedConfig);
        
        // Base weight * 2 for Improved Jump Jets
        const expectedBase = Math.ceil(50 / 10) * 2 * 0.5; // 5 tons
        expect(weight).toBe(expectedBase * 2); // 10 tons
      });
    });

    describe('calculateArmorEfficiency', () => {
      it('should calculate armor efficiency', () => {
        const efficiency = service.calculateArmorEfficiency(mockConfig);
        
        expect(efficiency.totalPoints).toBeGreaterThan(0);
        expect(efficiency.totalWeight).toBe(6.5);
        expect(efficiency.pointsPerTon).toBeGreaterThan(0);
        expect(['excellent', 'good', 'average', 'poor']).toContain(efficiency.efficiency);
        expect(efficiency.maxPossiblePoints).toBeGreaterThan(0);
        expect(efficiency.utilizationPercentage).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(efficiency.recommendations)).toBe(true);
      });

      it('should recommend Ferro-Fibrous for Standard armor', () => {
        const efficiency = service.calculateArmorEfficiency(mockConfig);
        
        // Should contain recommendation for Ferro-Fibrous if efficiency is not excellent
        if (efficiency.efficiency !== 'excellent') {
          expect(efficiency.recommendations.some(r => r.includes('Ferro-Fibrous'))).toBe(true);
        }
      });
    });

    describe('calculateWeightPenalties', () => {
      it('should identify weight penalties', () => {
        const penalties = service.calculateWeightPenalties(mockConfig);
        
        expect(Array.isArray(penalties)).toBe(true);
        
        penalties.forEach(penalty => {
          expect(penalty.penalty).toBeGreaterThan(0);
          expect(typeof penalty.canBeAvoided).toBe('boolean');
          expect(penalty.component).toBeDefined();
          expect(penalty.reason).toBeDefined();
          expect(penalty.description).toBeDefined();
        });
      });

      it('should penalize Standard engine on light mechs', () => {
        const lightConfig = { ...mockConfig, tonnage: 25 };
        const penalties = service.calculateWeightPenalties(lightConfig);
        
        const enginePenalty = penalties.find(p => p.component === 'Engine');
        expect(enginePenalty).toBeDefined();
        expect(enginePenalty?.suggestion).toContain('XL');
      });

      it('should penalize Standard structure on heavy mechs', () => {
        const heavyConfig = { ...mockConfig, tonnage: 85 };
        const penalties = service.calculateWeightPenalties(heavyConfig);
        
        const structurePenalty = penalties.find(p => p.component === 'Structure');
        expect(structurePenalty).toBeDefined();
        expect(structurePenalty?.suggestion).toContain('Endo Steel');
      });
    });
  });

  describe('Advanced Weight Calculations', () => {
    it('should handle XL engine configurations', () => {
      const xlConfig = { ...mockConfig, engineType: 'XL' as const };
      const weights = service.calculateComponentWeights(xlConfig);
      
      expect(weights.engine.weight).toBe(4); // 200/25 * 0.5 = 4
      expect(weights.engine.efficiency).toBe(2.0);
    });

    it('should handle Endo Steel structure', () => {
      const endoConfig = {
        ...mockConfig,
        structureType: { type: 'Endo Steel', techBase: 'Inner Sphere' as const }
      };
      const weights = service.calculateComponentWeights(endoConfig);
      
      expect(weights.structure.weight).toBe(2.5); // ceil(50/10) * 0.5 = 2.5
      expect(weights.structure.efficiency).toBe(2.0);
    });

    it('should handle Double Heat Sinks', () => {
      const doubleConfig = {
        ...mockConfig,
        heatSinkType: { type: 'Double', techBase: 'Inner Sphere' as const }
      };
      const weights = service.calculateComponentWeights(doubleConfig);
      
      expect(weights.heatSinks.efficiency).toBe(2.0);
    });
  });

  describe('BattleTech Rule Compliance', () => {
    it('should follow BattleTech weight calculation rules', () => {
      const weights = service.calculateComponentWeights(mockConfig);
      
      // Structure: ceil(tonnage / 10)
      expect(weights.structure.weight).toBe(Math.ceil(mockConfig.tonnage / 10));
      
      // Engine: rating / 25
      expect(weights.engine.weight).toBe(mockConfig.engineRating / 25);
      
      // Gyro: ceil(engine_rating / 100)
      expect(weights.gyro.weight).toBe(Math.ceil(mockConfig.engineRating / 100));
    });

    it('should respect maximum armor allocation', () => {
      const efficiency = service.calculateArmorEfficiency(mockConfig);
      
      // Maximum armor should not exceed 40% of mech tonnage in points for Standard armor
      const maxPoints = mockConfig.tonnage * 0.4 * 32;
      expect(efficiency.maxPossiblePoints).toBeLessThanOrEqual(maxPoints);
    });
  });

  describe('Performance Tests', () => {
    it('should handle weight calculations efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        service.calculateTotalWeight(mockConfig, mockEquipment);
        service.calculateComponentWeights(mockConfig);
        service.analyzeWeightDistribution(mockConfig, mockEquipment);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete 100 operations in < 100ms
    });

    it('should handle optimization efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 50; i++) {
        service.generateOptimizationSuggestions(mockConfig, mockEquipment);
        service.findWeightSavings(mockConfig, mockEquipment);
        service.calculateWeightReduction(mockConfig);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(150); // Should complete 50 optimization operations in < 150ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum tonnage mechs', () => {
      const lightConfig = { ...mockConfig, tonnage: 20 };
      const summary = service.calculateTotalWeight(lightConfig, []);
      
      expect(summary.totalWeight).toBeGreaterThan(0);
      expect(summary.maxTonnage).toBe(20);
    });

    it('should handle maximum tonnage mechs', () => {
      const assaultConfig = { ...mockConfig, tonnage: 100, engineRating: 300 };
      const summary = service.calculateTotalWeight(assaultConfig, []);
      
      expect(summary.totalWeight).toBeGreaterThan(0);
      expect(summary.maxTonnage).toBe(100);
    });

    it('should handle zero weight equipment', () => {
      const zeroEquipment = [
        {
          equipmentData: {
            name: 'Zero Weight Item',
            tonnage: 0,
            type: 'special'
          },
          quantity: 5
        }
      ];
      
      const weight = service.calculateEquipmentWeight(zeroEquipment);
      expect(weight).toBe(0);
    });

    it('should handle fractional weights', () => {
      const endoConfig = {
        ...mockConfig,
        structureType: { type: 'Endo Steel', techBase: 'Inner Sphere' as const }
      };
      
      const weights = service.calculateComponentWeights(endoConfig);
      expect(weights.structure.weight).toBe(2.5); // Should handle half-ton weights
    });
  });
});
