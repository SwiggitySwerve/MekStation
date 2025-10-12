/**
 * Tests for ValidationManager
 * Tests validation logic, error handling, and compliance checking functionality.
 */

import { ValidationManager } from '../../services/validation/ValidationManager';
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManager';
import { ComponentConfiguration } from '../../types/componentConfiguration';

describe('ValidationManager', () => {
  let validationManager: ValidationManager;
  let mockConfig: UnitConfiguration;
  let mockEquipment: any[];

  beforeEach(() => {
    validationManager = new ValidationManager();
    
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

  describe('Configuration Validation', () => {
    test('should validate unit configuration', () => {
      const result = validationManager.validateConfiguration(mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('score');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.score).toBe('number');
    });

    test('should validate weight limits', () => {
      const result = validationManager.validateWeightLimits(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('totalWeight');
      expect(result).toHaveProperty('maxWeight');
      expect(result).toHaveProperty('overweight');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.totalWeight).toBe('number');
      expect(typeof result.maxWeight).toBe('number');
      expect(typeof result.overweight).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should validate heat management', () => {
      const result = validationManager.validateHeatManagement(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('heatGeneration');
      expect(result).toHaveProperty('heatDissipation');
      expect(result).toHaveProperty('heatDeficit');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.heatGeneration).toBe('number');
      expect(typeof result.heatDissipation).toBe('number');
      expect(typeof result.heatDeficit).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should validate movement rules', () => {
      const result = validationManager.validateMovementRules(mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('walkMP');
      expect(result).toHaveProperty('runMP');
      expect(result).toHaveProperty('jumpMP');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.walkMP).toBe('number');
      expect(typeof result.runMP).toBe('number');
      expect(typeof result.jumpMP).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Equipment Validation', () => {
    test('should validate equipment loadout', () => {
      const result = validationManager.validateEquipmentLoadout(mockEquipment, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('weapons');
      expect(result).toHaveProperty('ammunition');
      expect(result).toHaveProperty('heatSinks');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.weapons).toBe('object');
      expect(typeof result.ammunition).toBe('object');
      expect(typeof result.heatSinks).toBe('object');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should validate weapon rules', () => {
      const result = validationManager.validateWeaponRules(mockEquipment, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('weaponCount');
      expect(result).toHaveProperty('totalWeaponWeight');
      expect(result).toHaveProperty('heatGeneration');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.weaponCount).toBe('number');
      expect(typeof result.totalWeaponWeight).toBe('number');
      expect(typeof result.heatGeneration).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should validate ammunition rules', () => {
      const result = validationManager.validateAmmoRules(mockEquipment, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('totalAmmoWeight');
      expect(result).toHaveProperty('ammoBalance');
      expect(result).toHaveProperty('caseProtection');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.totalAmmoWeight).toBe('number');
      expect(Array.isArray(result.ammoBalance)).toBe(true);
      expect(Array.isArray(result.caseProtection)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should validate critical slot rules', () => {
      const result = validationManager.validateCriticalSlotRules(mockEquipment, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('usedSlots');
      expect(result).toHaveProperty('availableSlots');
      expect(result).toHaveProperty('slotDeficit');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.usedSlots).toBe('number');
      expect(typeof result.availableSlots).toBe('number');
      expect(typeof result.slotDeficit).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Tech Level Validation', () => {
    test('should validate tech level', () => {
      const result = validationManager.validateTechLevel(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('unitTechLevel');
      expect(result).toHaveProperty('unitTechBase');
      expect(result).toHaveProperty('era');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.unitTechLevel).toBe('string');
      expect(typeof result.unitTechBase).toBe('string');
      expect(typeof result.era).toBe('string');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should validate mixed tech', () => {
      const result = validationManager.validateMixedTech(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isMixed');
      expect(result).toHaveProperty('innerSphereComponents');
      expect(result).toHaveProperty('clanComponents');
      expect(result).toHaveProperty('allowedMixed');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isMixed).toBe('boolean');
      expect(typeof result.innerSphereComponents).toBe('number');
      expect(typeof result.clanComponents).toBe('number');
      expect(typeof result.allowedMixed).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should validate era restrictions', () => {
      const result = validationManager.validateEraRestrictions(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('era');
      expect(result).toHaveProperty('invalidComponents');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.era).toBe('string');
      expect(Array.isArray(result.invalidComponents)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors gracefully', () => {
      const invalidConfig = { ...mockConfig, tonnage: -1 }; // Invalid configuration
      const result = validationManager.validateConfiguration(invalidConfig);
      
      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      result.errors.forEach(error => {
        expect(error).toHaveProperty('type');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('severity');
        expect(error).toHaveProperty('field');
        
        expect(['error', 'warning', 'info']).toContain(error.severity);
      });
    });

    test('should categorize errors by severity', () => {
      const result = validationManager.validateConfiguration(mockConfig);
      
      const errors = result.errors.filter(e => e.severity === 'error');
      const warnings = result.errors.filter(e => e.severity === 'warning');
      const info = result.errors.filter(e => e.severity === 'info');
      
      expect(Array.isArray(errors)).toBe(true);
      expect(Array.isArray(warnings)).toBe(true);
      expect(Array.isArray(info)).toBe(true);
    });

    test('should provide detailed error messages', () => {
      const invalidConfig = { ...mockConfig, tonnage: 150 }; // Overweight
      const result = validationManager.validateWeightLimits(invalidConfig, mockEquipment);
      
      expect(result.errors.length).toBeGreaterThan(0);
      
      result.errors.forEach(error => {
        expect(error.message).toBeTruthy();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Compliance Reporting', () => {
    test('should generate compliance report', () => {
      const result = validationManager.generateComplianceReport(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('overallCompliance');
      expect(result).toHaveProperty('ruleCompliance');
      expect(result).toHaveProperty('violationSummary');
      expect(result).toHaveProperty('recommendationSummary');
      expect(result).toHaveProperty('complianceMetrics');
      
      expect(typeof result.overallCompliance).toBe('number');
      expect(result.overallCompliance).toBeGreaterThanOrEqual(0);
      expect(result.overallCompliance).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.ruleCompliance)).toBe(true);
    });

    test('should calculate compliance score', () => {
      const result = validationManager.calculateComplianceScore(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('categoryScores');
      expect(result).toHaveProperty('penalties');
      expect(result).toHaveProperty('bonuses');
      
      expect(typeof result.overallScore).toBe('number');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(typeof result.categoryScores).toBe('object');
      expect(Array.isArray(result.penalties)).toBe(true);
      expect(Array.isArray(result.bonuses)).toBe(true);
    });

    test('should generate validation summary', () => {
      const result = validationManager.generateValidationSummary(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('totalErrors');
      expect(result).toHaveProperty('totalWarnings');
      expect(result).toHaveProperty('criticalIssues');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.totalErrors).toBe('number');
      expect(typeof result.totalWarnings).toBe('number');
      expect(Array.isArray(result.criticalIssues)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Validation Rules', () => {
    test('should validate weight distribution', () => {
      const result = validationManager.validateWeightDistribution(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('distribution');
      expect(result).toHaveProperty('balance');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.distribution).toBe('object');
      expect(typeof result.balance).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should validate heat balance', () => {
      const result = validationManager.validateHeatBalance(mockConfig, mockEquipment);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('heatGeneration');
      expect(result).toHaveProperty('heatDissipation');
      expect(result).toHaveProperty('balance');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.heatGeneration).toBe('number');
      expect(typeof result.heatDissipation).toBe('number');
      expect(typeof result.balance).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should validate equipment compatibility', () => {
      const result = validationManager.validateEquipmentCompatibility(mockEquipment, mockConfig);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('compatibleItems');
      expect(result).toHaveProperty('incompatibleItems');
      expect(result).toHaveProperty('errors');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.compatibleItems)).toBe(true);
      expect(Array.isArray(result.incompatibleItems)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty equipment array', () => {
      const result = validationManager.validateEquipmentLoadout([], mockConfig);
      
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should handle missing configuration properties', () => {
      const incompleteConfig = {
        tonnage: 100,
        engineRating: 300
      } as UnitConfiguration;
      
      const result = validationManager.validateConfiguration(incompleteConfig);
      
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should handle extreme values', () => {
      const extremeConfig = {
        ...mockConfig,
        tonnage: 1, // Very small
        engineRating: 1 // Very small
      };
      
      const result = validationManager.validateConfiguration(extremeConfig);
      
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
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
      const result = validationManager.validateEquipmentLoadout(largeEquipment, mockConfig);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should handle complex validations efficiently', () => {
      const complexConfig = {
        ...mockConfig,
        tonnage: 100,
        engineRating: 400,
        walkMP: 4,
        jumpMP: 4
      };
      
      const startTime = Date.now();
      const result = validationManager.validateConfiguration(complexConfig);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 