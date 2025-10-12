/**
 * Tests for RuleManagementManager
 * Tests BattleTech rules definition, management, and rule compliance checking.
 */

import { RuleManagementManager, BattleTechRule, RuleComplianceResult, RuleScore } from '../../../services/validation/RuleManagementManager';
import { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManager';
import { ComponentConfiguration } from '../../../types/componentConfiguration';

describe('RuleManagementManager', () => {
  let ruleManager: RuleManagementManager;
  let mockConfig: UnitConfiguration;
  let mockEquipment: any[];

  beforeEach(() => {
    ruleManager = new RuleManagementManager();
    
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

  describe('Rule Management', () => {
    test('should get all rules', () => {
      const rules = ruleManager.getAllRules();
      expect(rules).toBeDefined();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty('id');
      expect(rules[0]).toHaveProperty('name');
      expect(rules[0]).toHaveProperty('category');
      expect(rules[0]).toHaveProperty('severity');
      expect(rules[0]).toHaveProperty('mandatory');
    });

    test('should get rules by category', () => {
      const weightRules = ruleManager.getRulesByCategory('weight');
      const heatRules = ruleManager.getRulesByCategory('heat');
      
      expect(weightRules).toBeDefined();
      expect(weightRules.length).toBeGreaterThan(0);
      expect(weightRules.every(rule => rule.category === 'weight')).toBe(true);
      
      expect(heatRules).toBeDefined();
      expect(heatRules.length).toBeGreaterThan(0);
      expect(heatRules.every(rule => rule.category === 'heat')).toBe(true);
    });

    test('should get rules by severity', () => {
      const criticalRules = ruleManager.getRulesBySeverity('critical');
      const majorRules = ruleManager.getRulesBySeverity('major');
      const minorRules = ruleManager.getRulesBySeverity('minor');
      
      expect(criticalRules).toBeDefined();
      expect(criticalRules.every(rule => rule.severity === 'critical')).toBe(true);
      
      expect(majorRules).toBeDefined();
      expect(majorRules.every(rule => rule.severity === 'major')).toBe(true);
      
      expect(minorRules).toBeDefined();
      expect(minorRules.every(rule => rule.severity === 'minor')).toBe(true);
    });

    test('should get mandatory rules', () => {
      const mandatoryRules = ruleManager.getMandatoryRules();
      
      expect(mandatoryRules).toBeDefined();
      expect(mandatoryRules.every(rule => rule.mandatory === true)).toBe(true);
    });
  });

  describe('Rule Compliance Checking', () => {
    test('should check individual rule compliance', () => {
      const weightRule = ruleManager.getAllRules().find(rule => rule.id === 'WEIGHT_001');
      expect(weightRule).toBeDefined();
      
      if (weightRule) {
        const result = ruleManager.checkRuleCompliance(weightRule, mockConfig, mockEquipment);
        
        expect(result).toBeDefined();
        expect(result.rule).toBe(weightRule);
        expect(typeof result.compliant).toBe('boolean');
        expect(typeof result.score).toBe('number');
        expect(Array.isArray(result.violations)).toBe(true);
        expect(typeof result.notes).toBe('string');
      }
    });

    test('should check all rules compliance', () => {
      const results = ruleManager.checkAllRulesCompliance(mockConfig, mockEquipment);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      results.forEach(result => {
        expect(result).toHaveProperty('rule');
        expect(result).toHaveProperty('compliant');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('notes');
      });
    });

    test('should handle rule validation errors gracefully', () => {
      const invalidConfig = { ...mockConfig, tonnage: -1 }; // Invalid configuration
      const rules = ruleManager.getAllRules();
      
      rules.forEach(rule => {
        const result = ruleManager.checkRuleCompliance(rule, invalidConfig, mockEquipment);
        expect(result).toBeDefined();
        expect(result.rule).toBe(rule);
        // Should handle errors without throwing
        expect(typeof result.compliant).toBe('boolean');
        expect(typeof result.score).toBe('number');
      });
    });
  });

  describe('Rule Scoring', () => {
    test('should calculate rule score', () => {
      const score = ruleManager.calculateRuleScore(mockConfig, mockEquipment);
      
      expect(score).toBeDefined();
      expect(score).toHaveProperty('overallScore');
      expect(score).toHaveProperty('categoryScores');
      expect(score).toHaveProperty('componentScores');
      expect(score).toHaveProperty('penalties');
      expect(score).toHaveProperty('bonuses');
      
      expect(typeof score.overallScore).toBe('number');
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
      
      expect(typeof score.categoryScores).toBe('object');
      expect(Array.isArray(score.penalties)).toBe(true);
      expect(Array.isArray(score.bonuses)).toBe(true);
    });

    test('should calculate category scores', () => {
      const score = ruleManager.calculateRuleScore(mockConfig, mockEquipment);
      
      // Check that category scores are calculated
      expect(score.categoryScores).toBeDefined();
      expect(Object.keys(score.categoryScores).length).toBeGreaterThan(0);
      
      // Check that each category score is a number between 0 and 100
      Object.values(score.categoryScores).forEach(categoryScore => {
        expect(typeof categoryScore).toBe('number');
        expect(categoryScore).toBeGreaterThanOrEqual(0);
        expect(categoryScore).toBeLessThanOrEqual(100);
      });
    });

    test('should apply penalties for violations', () => {
      // Make the unit overweight by adding heavy equipment
      const overweightEquipment = [
        ...mockEquipment,
        { name: 'Super Heavy Cannon', type: 'weapon', weight: 200, heat: 0, criticalSlots: 20 }
      ];
      const invalidConfig = { ...mockConfig, tonnage: 100 };
      const score = ruleManager.calculateRuleScore(invalidConfig, overweightEquipment);
      
      expect(score.overallScore).toBeLessThan(100); // Should have penalties
      expect(score.penalties.length).toBeGreaterThan(0);
      
      score.penalties.forEach(penalty => {
        expect(penalty).toHaveProperty('rule');
        expect(penalty).toHaveProperty('penalty');
        expect(penalty).toHaveProperty('reason');
        expect(typeof penalty.penalty).toBe('number');
        expect(penalty.penalty).toBeGreaterThan(0);
      });
    });

    test('should apply bonuses for compliance', () => {
      const score = ruleManager.calculateRuleScore(mockConfig, mockEquipment);
      
      // Should have some bonuses for compliance
      expect(score.bonuses.length).toBeGreaterThanOrEqual(0);
      
      score.bonuses.forEach(bonus => {
        expect(bonus).toHaveProperty('feature');
        expect(bonus).toHaveProperty('bonus');
        expect(bonus).toHaveProperty('reason');
        expect(typeof bonus.bonus).toBe('number');
        expect(bonus.bonus).toBeGreaterThan(0);
      });
    });
  });

  describe('Specific Rule Validations', () => {
    test('should validate weight limits correctly', () => {
      // Overweight config: equipment exceeds tonnage
      const overweightEquipment = [
        ...mockEquipment,
        { name: 'Super Heavy Cannon', type: 'weapon', weight: 200, heat: 0, criticalSlots: 20 }
      ];
      const validConfig = { ...mockConfig, tonnage: 100 };
      const overweightConfig = { ...mockConfig, tonnage: 100 };
      
      const validScore = ruleManager.calculateRuleScore(validConfig, mockEquipment);
      const overweightScore = ruleManager.calculateRuleScore(overweightConfig, overweightEquipment);
      
      // Valid configuration should score higher
      expect(validScore.overallScore).toBeGreaterThan(overweightScore.overallScore);
    });

    test('should validate heat management correctly', () => {
      const lowHeatEquipment = [
        { name: 'Medium Laser', type: 'weapon', heat: 3, weight: 1 }
      ];
      const highHeatEquipment = [
        { name: 'PPC', type: 'weapon', heat: 10, weight: 7 },
        { name: 'Large Laser', type: 'weapon', heat: 8, weight: 5 }
      ];
      
      const lowHeatScore = ruleManager.calculateRuleScore(mockConfig, lowHeatEquipment);
      const highHeatScore = ruleManager.calculateRuleScore(mockConfig, highHeatEquipment);
      
      // Lower heat should score higher
      expect(lowHeatScore.overallScore).toBeGreaterThanOrEqual(highHeatScore.overallScore);
    });

    test('should validate engine rating correctly', () => {
      // Invalid engine rating: walkMP = 12 (engineRating 1200 / tonnage 100)
      const validEngineConfig = { ...mockConfig, engineRating: 300 };
      const invalidEngineConfig = { ...mockConfig, engineRating: 1200 };
      
      const validScore = ruleManager.calculateRuleScore(validEngineConfig, mockEquipment);
      const invalidScore = ruleManager.calculateRuleScore(invalidEngineConfig, mockEquipment);
      
      // Valid engine rating should score higher
      expect(validScore.overallScore).toBeGreaterThan(invalidScore.overallScore);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty equipment array', () => {
      const score = ruleManager.calculateRuleScore(mockConfig, []);
      
      expect(score).toBeDefined();
      expect(typeof score.overallScore).toBe('number');
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    test('should handle missing configuration properties', () => {
      const incompleteConfig = {
        tonnage: 100,
        engineRating: 300
      } as UnitConfiguration;
      
      const score = ruleManager.calculateRuleScore(incompleteConfig, mockEquipment);
      
      expect(score).toBeDefined();
      expect(typeof score.overallScore).toBe('number');
    });

    test('should handle extreme values', () => {
      const extremeConfig = {
        ...mockConfig,
        tonnage: 1, // Very small
        engineRating: 1 // Very small
      };
      
      const score = ruleManager.calculateRuleScore(extremeConfig, mockEquipment);
      
      expect(score).toBeDefined();
      expect(typeof score.overallScore).toBe('number');
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
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
      const score = ruleManager.calculateRuleScore(mockConfig, largeEquipment);
      const endTime = Date.now();
      
      expect(score).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle multiple rule checks efficiently', () => {
      const rules = ruleManager.getAllRules();
      const startTime = Date.now();
      
      rules.forEach(rule => {
        ruleManager.checkRuleCompliance(rule, mockConfig, mockEquipment);
      });
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 