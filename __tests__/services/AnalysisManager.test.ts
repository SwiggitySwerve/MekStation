/**
 * Tests for AnalysisManager
 * Tests performance analysis, efficiency calculations, and optimization recommendations.
 */

import { AnalysisManager } from '../../services/analysis/AnalysisManager';
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManager';
import { ComponentConfiguration } from '../../types/componentConfiguration';

describe('AnalysisManager', () => {
  let analysisManager: AnalysisManager;
  let mockConfig: UnitConfiguration;
  let mockEquipment: any[];

  beforeEach(() => {
    analysisManager = new AnalysisManager();
    
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
        damage: 5,
        range: 'medium',
        location: 'RA'
      },
      {
        name: 'AC/20',
        type: 'weapon',
        weight: 14,
        heat: 7,
        damage: 20,
        criticalSlots: 10,
        range: 'short',
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

  describe('Performance Analysis', () => {
    test('should analyze overall performance', () => {
      const result = analysisManager.analyzePerformance(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('damageOutput');
      expect(result).toHaveProperty('heatManagement');
      expect(result).toHaveProperty('mobility');
      expect(result).toHaveProperty('survivability');
      expect(result).toHaveProperty('efficiency');
      
      expect(typeof result.overallScore).toBe('number');
      expect(typeof result.damageOutput).toBe('number');
      expect(typeof result.heatManagement).toBe('number');
      expect(typeof result.mobility).toBe('number');
      expect(typeof result.survivability).toBe('number');
      expect(typeof result.efficiency).toBe('number');
    });

    test('should analyze damage output', () => {
      const result = analysisManager.analyzeDamageOutput(mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalDamage');
      expect(result).toHaveProperty('damageByRange');
      expect(result).toHaveProperty('damageByLocation');
      expect(result).toHaveProperty('damageEfficiency');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.totalDamage).toBe('number');
      expect(typeof result.damageByRange).toBe('object');
      expect(typeof result.damageByLocation).toBe('object');
      expect(typeof result.damageEfficiency).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should analyze heat management', () => {
      const result = analysisManager.analyzeHeatManagement(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('heatGeneration');
      expect(result).toHaveProperty('heatDissipation');
      expect(result).toHaveProperty('heatBalance');
      expect(result).toHaveProperty('heatEfficiency');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.heatGeneration).toBe('number');
      expect(typeof result.heatDissipation).toBe('number');
      expect(typeof result.heatBalance).toBe('number');
      expect(typeof result.heatEfficiency).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should analyze mobility', () => {
      const result = analysisManager.analyzeMobility(mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('walkMP');
      expect(result).toHaveProperty('runMP');
      expect(result).toHaveProperty('jumpMP');
      expect(result).toHaveProperty('mobilityScore');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.walkMP).toBe('number');
      expect(typeof result.runMP).toBe('number');
      expect(typeof result.jumpMP).toBe('number');
      expect(typeof result.mobilityScore).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should analyze survivability', () => {
      const result = analysisManager.analyzeSurvivability(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('armorProtection');
      expect(result).toHaveProperty('structuralIntegrity');
      expect(result).toHaveProperty('criticalProtection');
      expect(result).toHaveProperty('survivabilityScore');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.armorProtection).toBe('number');
      expect(typeof result.structuralIntegrity).toBe('number');
      expect(typeof result.criticalProtection).toBe('number');
      expect(typeof result.survivabilityScore).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Efficiency Analysis', () => {
    test('should analyze weight efficiency', () => {
      const result = analysisManager.analyzeWeightEfficiency(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('weightUtilization');
      expect(result).toHaveProperty('weightDistribution');
      expect(result).toHaveProperty('weightWaste');
      expect(result).toHaveProperty('efficiencyScore');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.weightUtilization).toBe('number');
      expect(typeof result.weightDistribution).toBe('object');
      expect(typeof result.weightWaste).toBe('number');
      expect(typeof result.efficiencyScore).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should analyze critical slot efficiency', () => {
      const result = analysisManager.analyzeCriticalSlotEfficiency(mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('slotUtilization');
      expect(result).toHaveProperty('slotDistribution');
      expect(result).toHaveProperty('slotWaste');
      expect(result).toHaveProperty('efficiencyScore');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.slotUtilization).toBe('number');
      expect(typeof result.slotDistribution).toBe('object');
      expect(typeof result.slotWaste).toBe('number');
      expect(typeof result.efficiencyScore).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should analyze equipment efficiency', () => {
      const result = analysisManager.analyzeEquipmentEfficiency(mockEquipment, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('weaponEfficiency');
      expect(result).toHaveProperty('ammoEfficiency');
      expect(result).toHaveProperty('heatSinkEfficiency');
      expect(result).toHaveProperty('overallEfficiency');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.weaponEfficiency).toBe('number');
      expect(typeof result.ammoEfficiency).toBe('number');
      expect(typeof result.heatSinkEfficiency).toBe('number');
      expect(typeof result.overallEfficiency).toBe('number');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Optimization Analysis', () => {
    test('should identify optimization opportunities', () => {
      const result = analysisManager.identifyOptimizationOpportunities(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('weightOptimizations');
      expect(result).toHaveProperty('heatOptimizations');
      expect(result).toHaveProperty('slotOptimizations');
      expect(result).toHaveProperty('performanceOptimizations');
      expect(result).toHaveProperty('overallRecommendations');
      
      expect(Array.isArray(result.weightOptimizations)).toBe(true);
      expect(Array.isArray(result.heatOptimizations)).toBe(true);
      expect(Array.isArray(result.slotOptimizations)).toBe(true);
      expect(Array.isArray(result.performanceOptimizations)).toBe(true);
      expect(Array.isArray(result.overallRecommendations)).toBe(true);
    });

    test('should analyze optimization impact', () => {
      const optimizations = [
        { type: 'weight', description: 'Replace heavy weapon', impact: 0.1 },
        { type: 'heat', description: 'Add heat sinks', impact: 0.15 }
      ];
      
      const result = analysisManager.analyzeOptimizationImpact(optimizations, mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalImpact');
      expect(result).toHaveProperty('impactByCategory');
      expect(result).toHaveProperty('recommendedOrder');
      expect(result).toHaveProperty('expectedImprovements');
      
      expect(typeof result.totalImpact).toBe('number');
      expect(typeof result.impactByCategory).toBe('object');
      expect(Array.isArray(result.recommendedOrder)).toBe(true);
      expect(typeof result.expectedImprovements).toBe('object');
    });

    test('should generate optimization recommendations', () => {
      const result = analysisManager.generateOptimizationRecommendations(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      result.forEach(recommendation => {
        expect(recommendation).toHaveProperty('type');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('description');
        expect(recommendation).toHaveProperty('expectedImpact');
        expect(recommendation).toHaveProperty('effort');
        expect(recommendation).toHaveProperty('cost');
        
        expect(['weight', 'heat', 'slots', 'performance', 'efficiency']).toContain(recommendation);
        expect(['high', 'medium', 'low']).toContain(recommendation.priority);
        expect(typeof recommendation.expectedImpact).toBe('number');
        expect(['low', 'medium', 'high']).toContain(recommendation.effort);
        expect(typeof recommendation.cost).toBe('number');
      });
    });
  });

  describe('Comparative Analysis', () => {
    test('should compare configurations', () => {
      const config1 = { ...mockConfig };
      const config2 = { ...mockConfig, tonnage: 80, engineRating: 240 };
      
      const result = analysisManager.compareConfigurations(config1, config2, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('differences');
      expect(result).toHaveProperty('advantages');
      expect(result).toHaveProperty('disadvantages');
      expect(result).toHaveProperty('recommendation');
      
      expect(typeof result.differences).toBe('object');
      expect(Array.isArray(result.advantages)).toBe(true);
      expect(Array.isArray(result.disadvantages)).toBe(true);
      expect(typeof result.recommendation).toBe('string');
    });

    test('should compare equipment loadouts', () => {
      const loadout1 = mockEquipment;
      const loadout2 = [
        { name: 'PPC', type: 'weapon', weight: 7, heat: 10, criticalSlots: 3, damage: 10 },
        { name: 'Large Laser', type: 'weapon', weight: 5, heat: 8, criticalSlots: 2, damage: 8 }
      ];
      
      const result = analysisManager.compareEquipmentLoadouts(loadout1, loadout2, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('damageComparison');
      expect(result).toHaveProperty('heatComparison');
      expect(result).toHaveProperty('weightComparison');
      expect(result).toHaveProperty('efficiencyComparison');
      expect(result).toHaveProperty('recommendation');
      
      expect(typeof result.damageComparison).toBe('object');
      expect(typeof result.heatComparison).toBe('object');
      expect(typeof result.weightComparison).toBe('object');
      expect(typeof result.efficiencyComparison).toBe('object');
      expect(typeof result.recommendation).toBe('string');
    });
  });

  describe('Performance Metrics', () => {
    test('should calculate performance metrics', () => {
      const result = analysisManager.calculatePerformanceMetrics(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('damagePerTon');
      expect(result).toHaveProperty('damagePerHeat');
      expect(result).toHaveProperty('damagePerSlot');
      expect(result).toHaveProperty('heatEfficiency');
      expect(result).toHaveProperty('weightEfficiency');
      expect(result).toHaveProperty('slotEfficiency');
      
      expect(typeof result.damagePerTon).toBe('number');
      expect(typeof result.damagePerHeat).toBe('number');
      expect(typeof result.damagePerSlot).toBe('number');
      expect(typeof result.heatEfficiency).toBe('number');
      expect(typeof result.weightEfficiency).toBe('number');
      expect(typeof result.slotEfficiency).toBe('number');
    });

    test('should generate efficiency report', () => {
      const result = analysisManager.generateEfficiencyReport(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('overallEfficiency');
      expect(result).toHaveProperty('categoryEfficiencies');
      expect(result).toHaveProperty('bottlenecks');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.overallEfficiency).toBe('number');
      expect(typeof result.categoryEfficiencies).toBe('object');
      expect(Array.isArray(result.bottlenecks)).toBe(true);
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty equipment array', () => {
      const result = analysisManager.analyzePerformance(mockConfig, []);
      
      expect(result).toBeDefined();
      expect(result.damageOutput).toBe(0);
      expect(result.heatManagement).toBeDefined();
      expect(result.mobility).toBeDefined();
      expect(result.survivability).toBeDefined();
    });

    test('should handle missing configuration properties', () => {
      const incompleteConfig = {
        tonnage: 100,
        engineRating: 300
      } as UnitConfiguration;
      
      const result = analysisManager.analyzePerformance(incompleteConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe('number');
      expect(typeof result.damageOutput).toBe('number');
    });

    test('should handle extreme values', () => {
      const extremeConfig = {
        ...mockConfig,
        tonnage: 1, // Very small
        engineRating: 1 // Very small
      };
      
      const result = analysisManager.analyzePerformance(extremeConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(typeof result.overallScore).toBe('number');
      expect(typeof result.mobility).toBe('number');
    });
  });

  describe('Performance', () => {
    test('should handle large equipment arrays efficiently', () => {
      const largeEquipment = Array.from({ length: 100 }, (_, i) => ({
        name: `Equipment ${i}`,
        type: 'weapon',
        weight: 1,
        heat: 1,
        criticalSlots: 1,
        damage: 5
      }));
      
      const startTime = Date.now();
      const result = analysisManager.analyzePerformance(mockConfig, largeEquipment);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should handle complex analysis efficiently', () => {
      const complexConfig = {
        ...mockConfig,
        tonnage: 100,
        engineRating: 400,
        walkMP: 4,
        jumpMP: 4
      };
      
      const startTime = Date.now();
      const result = analysisManager.analyzePerformance(complexConfig, mockEquipment);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 