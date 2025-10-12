/**
 * MovementRulesValidator Test Suite
 * Tests for BattleTech movement validation rules
 */

import { MovementRulesValidator } from '../../../services/validation/MovementRulesValidator';
import type { UnitConfiguration } from '../../../utils/criticalSlots/UnitCriticalManager';

// Helper function to create test unit configuration
function createTestConfig(overrides: Partial<UnitConfiguration> = {}): UnitConfiguration {
  return {
    tonnage: 65,
    engineRating: 260,
    engineType: 'Standard',
    structureType: 'Standard',
    armorType: 'Standard',
    gyroType: 'Standard',
    heatSinkType: 'Single',
    techBase: 'Inner Sphere',
    jumpMP: 0,
    ...overrides
  } as UnitConfiguration;
}

describe('MovementRulesValidator', () => {
  describe('validateMovementRules', () => {
    test('should validate standard movement configuration', () => {
      const config = createTestConfig({
        tonnage: 65,
        engineRating: 260,
        engineType: 'Standard'
      });
      
      const result = MovementRulesValidator.validateMovementRules(config);
      
      expect(result.isValid).toBe(true);
      expect(result.walkMP).toBe(4); // 260 / 65 = 4
      expect(result.runMP).toBe(6); // 4 * 1.5 = 6
      expect(result.engineType).toBe('Standard');
      expect(result.violations).toHaveLength(0);
    });

    test('should detect low mobility warnings', () => {
      const config = createTestConfig({
        tonnage: 100,
        engineRating: 50 // Below tonnage to trigger recommendation
      });
      
      const result = MovementRulesValidator.validateMovementRules(config);
      
      expect(result.walkMP).toBe(0); // No movement
      expect(result.recommendations.some(r => r.includes('Engine rating is very low'))).toBe(true);
    });

    test('should validate XL Engine configuration', () => {
      const standardConfig = createTestConfig({
        tonnage: 65,
        engineRating: 260,
        engineType: 'Standard'
      });
      
      const xlConfig = createTestConfig({
        tonnage: 65,
        engineRating: 260,
        engineType: 'XL'
      });
      
      const standardResult = MovementRulesValidator.validateMovementRules(standardConfig);
      const xlResult = MovementRulesValidator.validateMovementRules(xlConfig);
      
      expect(standardResult.walkMP).toBe(xlResult.walkMP); // Same movement
      expect(xlResult.isValid).toBe(true);
    });

    test('should handle maximum engine ratings', () => {
      const config = createTestConfig({
        tonnage: 100,
        engineRating: 400
      });
      
      const result = MovementRulesValidator.validateMovementRules(config);
      
      expect(result.isValid).toBe(true);
      expect(result.walkMP).toBe(4);
    });

    test('should validate engine rating limits', () => {
      const lowConfig = createTestConfig({
        tonnage: 65,
        engineRating: 5 // Below minimum
      });
      
      const highConfig = createTestConfig({
        tonnage: 65,
        engineRating: 450 // Above maximum
      });
      
      const lowResult = MovementRulesValidator.validateMovementRules(lowConfig);
      const highResult = MovementRulesValidator.validateMovementRules(highConfig);
      
      expect(lowResult.isValid).toBe(false);
      expect(highResult.isValid).toBe(false);
      expect(lowResult.violations.some(v => v === 'invalid_engine_rating')).toBe(true);
      expect(highResult.violations.some(v => v === 'invalid_engine_rating')).toBe(true);
    });

    test('should handle zero engine rating', () => {
      const config = createTestConfig({
        tonnage: 65,
        engineRating: 0
      });
      
      const result = MovementRulesValidator.validateMovementRules(config);
      
      expect(result.walkMP).toBe(0);
      expect(result.isValid).toBe(false); // Should be invalid due to low rating
    });
  });

  describe('calculateEngineWeight', () => {
    test('should calculate standard engine weights correctly', () => {
      const testCases = [
        { rating: 100, type: 'Standard', expectedWeight: 10 }, // (100 * 100) / 1000 = 10
        { rating: 200, type: 'Standard', expectedWeight: 20 }, // (200 * 100) / 1000 = 20
        { rating: 300, type: 'Standard', expectedWeight: 30 }  // (300 * 100) / 1000 = 30
      ];
      
      testCases.forEach(({ rating, type, expectedWeight }) => {
        const weight = MovementRulesValidator.calculateEngineWeight(rating, type);
        expect(weight).toBeCloseTo(expectedWeight, 1);
      });
    });

    test('should apply XL engine weight reduction', () => {
      const standardWeight = MovementRulesValidator.calculateEngineWeight(260, 'Standard');
      const xlWeight = MovementRulesValidator.calculateEngineWeight(260, 'XL (IS)');
      
      expect(xlWeight).toBe(standardWeight * 0.5);
    });

    test('should handle Light engine weights', () => {
      const standardWeight = MovementRulesValidator.calculateEngineWeight(260, 'Standard');
      const lightWeight = MovementRulesValidator.calculateEngineWeight(260, 'Light');
      
      expect(lightWeight).toBe(standardWeight * 0.75);
    });
  });

  describe('getMaxEngineRating', () => {
    test('should calculate maximum engine rating correctly', () => {
      expect(MovementRulesValidator.getMaxEngineRating(50)).toBe(400); // 50 * 8 = 400, capped at 400
      expect(MovementRulesValidator.getMaxEngineRating(25)).toBe(200); // 25 * 8 = 200
      expect(MovementRulesValidator.getMaxEngineRating(100)).toBe(400); // Capped at 400
    });
  });

  describe('getMinRecommendedEngineRating', () => {
    test('should calculate minimum recommended engine rating', () => {
      expect(MovementRulesValidator.getMinRecommendedEngineRating(50)).toBe(100); // 50 * 2
      expect(MovementRulesValidator.getMinRecommendedEngineRating(75)).toBe(150); // 75 * 2
    });
  });

  describe('getEngineInternalHeatSinks', () => {
    test('should calculate internal heat sinks correctly', () => {
      expect(MovementRulesValidator.getEngineInternalHeatSinks(250, 'Standard')).toBe(10);
      expect(MovementRulesValidator.getEngineInternalHeatSinks(100, 'Standard')).toBe(4); // 100/25 = 4
      expect(MovementRulesValidator.getEngineInternalHeatSinks(200, 'ICE')).toBe(0); // ICE engines have no heat sinks
    });
  });

  describe('getEngineCriticalSlots', () => {
    test('should return correct critical slots for engine types', () => {
      const standardSlots = MovementRulesValidator.getEngineCriticalSlots(250, 'Standard');
      expect(standardSlots.centerTorso).toBe(6);
      expect(standardSlots.sideTorsos).toBe(0);
      expect(standardSlots.total).toBe(6);

      const xlSlots = MovementRulesValidator.getEngineCriticalSlots(250, 'XL');
      expect(xlSlots.centerTorso).toBe(6);
      expect(xlSlots.sideTorsos).toBe(3);
      expect(xlSlots.total).toBe(12);
    });
  });

  describe('getMovementClassification', () => {
    test('should classify movement speeds correctly', () => {
      expect(MovementRulesValidator.getMovementClassification(1).class).toBe('Very Slow');
      expect(MovementRulesValidator.getMovementClassification(3).class).toBe('Slow');
      expect(MovementRulesValidator.getMovementClassification(5).class).toBe('Medium');
      expect(MovementRulesValidator.getMovementClassification(7).class).toBe('Fast');
      expect(MovementRulesValidator.getMovementClassification(9).class).toBe('Very Fast');
    });
  });

  describe('calculateMovementHeat', () => {
    test('should calculate movement heat correctly', () => {
      expect(MovementRulesValidator.calculateMovementHeat(4, 6, 4, 'walk')).toBe(1);
      expect(MovementRulesValidator.calculateMovementHeat(4, 6, 4, 'run')).toBe(2);
      expect(MovementRulesValidator.calculateMovementHeat(4, 6, 4, 'jump')).toBe(4);
    });
  });

  describe('Jump Jet Validation', () => {
    test('should validate jump jet limits', () => {
      const config = createTestConfig({
        tonnage: 65,
        jumpMP: 6
      });
      
      const result = MovementRulesValidator.validateMovementRules(config);
      
      expect(result.jumpMP).toBe(6);
      expect(result.isValid).toBe(true); // 6 is within limits for 65-ton unit
    });

    test('should detect excessive jump jets', () => {
      const config = createTestConfig({
        tonnage: 30,
        jumpMP: 5 // Exceeds maximum of 3 for 30-ton unit
      });
      
      const result = MovementRulesValidator.validateMovementRules(config);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v === 'jump_mp_violation')).toBe(true);
    });
  });

  describe('Performance Analysis', () => {
    test('should analyze movement efficiency', () => {
      const slowConfig = createTestConfig({
        tonnage: 100,
        engineRating: 50 // Below tonnage to trigger recommendation
      });
      
      const fastConfig = createTestConfig({
        tonnage: 100,
        engineRating: 300 // Fast
      });
      
      const slowResult = MovementRulesValidator.validateMovementRules(slowConfig);
      const fastResult = MovementRulesValidator.validateMovementRules(fastConfig);
      
      expect(fastResult.walkMP).toBeGreaterThan(slowResult.walkMP);
      expect(slowResult.recommendations.some(r => r.includes('Engine rating is very low'))).toBe(true);
    });

    test('should recommend engine optimizations', () => {
      const config = createTestConfig({
        tonnage: 65,
        engineRating: 50 // Below tonnage to trigger recommendation
      });
      
      const result = MovementRulesValidator.validateMovementRules(config);
      
      expect(result.recommendations.some(r => r.includes('Engine rating is very low'))).toBe(true);
    });

    test('should validate movement vs tonnage ratios', () => {
      const lightConfig = createTestConfig({ tonnage: 25, engineRating: 150 });
      const heavyConfig = createTestConfig({ tonnage: 75, engineRating: 225 });
      
      const lightResult = MovementRulesValidator.validateMovementRules(lightConfig);
      const heavyResult = MovementRulesValidator.validateMovementRules(heavyConfig);
      
      expect(lightResult.walkMP).toBe(6);
      expect(heavyResult.walkMP).toBe(3);
      expect(lightResult.isValid).toBe(true);
      expect(heavyResult.isValid).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing engine configuration', () => {
      const config = createTestConfig({
        engineRating: undefined,
        engineType: undefined
      });
      
      const result = MovementRulesValidator.validateMovementRules(config);
      
      expect(result.engineRating).toBe(0); // Default fallback
      expect(result.engineType).toBe('Standard'); // Default fallback
      expect(result.walkMP).toBe(0);
    });

    test('should handle extreme tonnage values', () => {
      const lightConfig = createTestConfig({
        tonnage: 10,
        engineRating: 30
      });
      
      const superHeavyConfig = createTestConfig({
        tonnage: 200,
        engineRating: 400
      });
      
      const lightResult = MovementRulesValidator.validateMovementRules(lightConfig);
      const heavyResult = MovementRulesValidator.validateMovementRules(superHeavyConfig);
      
      expect(lightResult.walkMP).toBe(3);
      expect(heavyResult.walkMP).toBe(2);
      expect(lightResult.isValid).toBe(true);
      expect(heavyResult.isValid).toBe(true);
    });

    test('should validate performance efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const config = createTestConfig({
          tonnage: 20 + (i % 80),
          engineRating: 100 + (i * 3)
        });
        MovementRulesValidator.validateMovementRules(config);
      }
      
      const end = performance.now();
      const totalTime = end - start;
      
      expect(totalTime).toBeLessThan(50); // Should complete 100 validations quickly
    });
  });
});