/**
 * Data Integrity Validator Tests
 * 
 * Tests for validating and repairing unit data integrity.
 * 
 * @spec openspec/specs/data-integrity-validation/spec.md
 */

import {
  checkEquipmentReferences,
  checkWeightConsistency,
  checkArmorConsistency,
  checkRequiredFields,
  validateDataIntegrity,
  createDataIntegrityValidator,
} from '@/utils/serialization/DataIntegrityValidator';
import { IntegritySeverity, IntegrityIssueCodes } from '@/types/unit/DataIntegrity';

describe('DataIntegrityValidator', () => {
  // ============================================================================
  // checkEquipmentReferences()
  // ============================================================================
  describe('checkEquipmentReferences()', () => {
    it('should return empty array for null data', () => {
      expect(checkEquipmentReferences(null)).toEqual([]);
    });

    it('should return empty array for non-object data', () => {
      expect(checkEquipmentReferences('string')).toEqual([]);
      expect(checkEquipmentReferences(123)).toEqual([]);
    });

    it('should return empty array for missing equipment', () => {
      expect(checkEquipmentReferences({})).toEqual([]);
    });

    it('should return empty array for valid equipment', () => {
      const data = {
        equipment: [
          { id: 'medium-laser', location: 'RA' },
          { id: 'large-laser', location: 'LT' },
        ],
      };
      expect(checkEquipmentReferences(data)).toEqual([]);
    });

    it('should detect equipment missing ID', () => {
      const data = {
        equipment: [
          { location: 'RA' }, // missing id
        ],
      };
      const issues = checkEquipmentReferences(data);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(IntegrityIssueCodes.EQUIPMENT_NOT_FOUND);
      expect(issues[0].severity).toBe(IntegritySeverity.ERROR);
    });

    it('should detect equipment missing location', () => {
      const data = {
        equipment: [
          { id: 'medium-laser' }, // missing location
        ],
      };
      const issues = checkEquipmentReferences(data);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(IntegrityIssueCodes.INVALID_LOCATION);
    });

    it('should detect multiple issues', () => {
      const data = {
        equipment: [
          { id: 'medium-laser', location: 'RA' },
          { location: 'LT' }, // missing id
          { id: 'ac-20' }, // missing location
        ],
      };
      const issues = checkEquipmentReferences(data);
      
      expect(issues).toHaveLength(2);
    });
  });

  // ============================================================================
  // checkWeightConsistency()
  // ============================================================================
  describe('checkWeightConsistency()', () => {
    it('should return empty array for null data', () => {
      expect(checkWeightConsistency(null)).toEqual([]);
    });

    it('should return empty array for missing weight fields', () => {
      expect(checkWeightConsistency({})).toEqual([]);
    });

    it('should return empty array when weight is under tonnage', () => {
      const data = { tonnage: 50, totalWeight: 49.5 };
      expect(checkWeightConsistency(data)).toEqual([]);
    });

    it('should return empty array when weight equals tonnage', () => {
      const data = { tonnage: 50, totalWeight: 50 };
      expect(checkWeightConsistency(data)).toEqual([]);
    });

    it('should detect weight exceeding tonnage', () => {
      const data = { tonnage: 50, totalWeight: 52 };
      const issues = checkWeightConsistency(data);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(IntegrityIssueCodes.WEIGHT_MISMATCH);
      expect(issues[0].severity).toBe(IntegritySeverity.ERROR);
      expect(issues[0].message).toContain('52');
      expect(issues[0].message).toContain('50');
    });
  });

  // ============================================================================
  // checkArmorConsistency()
  // ============================================================================
  describe('checkArmorConsistency()', () => {
    it('should return empty array for null data', () => {
      expect(checkArmorConsistency(null)).toEqual([]);
    });

    it('should detect missing armor configuration', () => {
      const issues = checkArmorConsistency({});
      
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(IntegrityIssueCodes.MISSING_REQUIRED_FIELD);
      expect(issues[0].path).toBe('armor');
    });

    it('should detect missing armor allocation', () => {
      const data = { armor: {} };
      const issues = checkArmorConsistency(data);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(IntegrityIssueCodes.MISSING_REQUIRED_FIELD);
      expect(issues[0].path).toBe('armor.allocation');
    });

    it('should return empty array for valid armor', () => {
      const data = {
        armor: {
          allocation: {
            head: 9,
            centerTorso: 23,
            leftArm: 16,
          },
        },
      };
      expect(checkArmorConsistency(data)).toEqual([]);
    });

    it('should detect negative armor values', () => {
      const data = {
        armor: {
          allocation: {
            head: 9,
            leftArm: -5, // negative
          },
        },
      };
      const issues = checkArmorConsistency(data);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe(IntegrityIssueCodes.ARMOR_EXCEEDS_MAX);
      expect(issues[0].canAutoRepair).toBe(true);
    });

    it('should detect multiple negative armor values', () => {
      const data = {
        armor: {
          allocation: {
            head: -1,
            leftArm: -5,
            rightArm: 10, // valid
          },
        },
      };
      const issues = checkArmorConsistency(data);
      
      expect(issues).toHaveLength(2);
    });
  });

  // ============================================================================
  // checkRequiredFields()
  // ============================================================================
  describe('checkRequiredFields()', () => {
    it('should detect non-object data', () => {
      const issues = checkRequiredFields(null);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('not an object');
    });

    it('should detect missing required fields', () => {
      const issues = checkRequiredFields({});
      
      // Should have issues for: chassis, model, unitType, tonnage, engine, armor, techBase, rulesLevel
      expect(issues.length).toBeGreaterThanOrEqual(8);
    });

    it('should return empty for complete data', () => {
      const data = {
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        tonnage: 100,
        engine: { type: 'Standard', rating: 300 },
        armor: { type: 'Standard' },
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
      };
      const issues = checkRequiredFields(data);
      
      expect(issues).toHaveLength(0);
    });

    it('should detect null fields', () => {
      const data = {
        chassis: 'Atlas',
        model: null, // null is like missing
        unitType: 'BattleMech',
        tonnage: 100,
        engine: { type: 'Standard', rating: 300 },
        armor: { type: 'Standard' },
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
      };
      const issues = checkRequiredFields(data);
      
      expect(issues.some(i => i.path === 'model')).toBe(true);
    });
  });

  // ============================================================================
  // validateDataIntegrity()
  // ============================================================================
  describe('validateDataIntegrity()', () => {
    it('should return valid for good data', () => {
      const data = {
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        tonnage: 100,
        totalWeight: 99,
        engine: { type: 'Standard', rating: 300 },
        armor: { type: 'Standard', allocation: { head: 9 } },
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        equipment: [{ id: 'medium-laser', location: 'RA' }],
      };
      
      const result = validateDataIntegrity(data);
      
      expect(result.isValid).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    it('should aggregate all issues', () => {
      const data = {
        // Missing most required fields
        equipment: [{ location: 'RA' }], // missing id
        armor: { allocation: { head: -5 } }, // negative armor
      };
      
      const result = validateDataIntegrity(data);
      
      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should include timestamp', () => {
      const result = validateDataIntegrity({});
      
      expect(result.checkedAt).toBeDefined();
      expect(() => new Date(result.checkedAt)).not.toThrow();
    });

    it('should count errors and warnings separately', () => {
      const data = {
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        tonnage: 100,
        engine: { type: 'Standard', rating: 300 },
        armor: { allocation: { head: -5 } }, // error: negative armor
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
      };
      
      const result = validateDataIntegrity(data);
      
      expect(result.errorCount).toBeGreaterThan(0);
      expect(typeof result.warningCount).toBe('number');
    });
  });

  // ============================================================================
  // createDataIntegrityValidator()
  // ============================================================================
  describe('createDataIntegrityValidator()', () => {
    it('should create validator with validate method', () => {
      const validator = createDataIntegrityValidator();
      
      expect(validator.validate).toBeDefined();
      expect(typeof validator.validate).toBe('function');
    });

    it('should create validator with repair method', () => {
      const validator = createDataIntegrityValidator();
      
      expect(validator.repair).toBeDefined();
      expect(typeof validator.repair).toBe('function');
    });

    it('should create validator with getAvailableRepairs method', () => {
      const validator = createDataIntegrityValidator();
      
      expect(validator.getAvailableRepairs).toBeDefined();
      expect(Array.isArray(validator.getAvailableRepairs())).toBe(true);
    });
  });

  // ============================================================================
  // Validator.repair()
  // ============================================================================
  describe('Validator.repair()', () => {
    it('should return success for data with no repairable issues', () => {
      const validator = createDataIntegrityValidator();
      const data = {
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        tonnage: 100,
        engine: { type: 'Standard', rating: 300 },
        armor: { allocation: { head: 9 } },
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
      };
      
      const result = validator.repair(data);
      
      expect(result.success).toBe(true);
      expect(result.data!.appliedRepairs).toHaveLength(0);
    });

    it('should repair negative armor values', () => {
      const validator = createDataIntegrityValidator();
      const data = {
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        tonnage: 100,
        engine: { type: 'Standard', rating: 300 },
        armor: { allocation: { head: 9, leftArm: -5 } },
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
      };
      
      const result = validator.repair(data);
      
      expect(result.data!.appliedRepairs).toContain(IntegrityIssueCodes.ARMOR_EXCEEDS_MAX);
      expect(result.data!.repairedData).toBeDefined();
      
      const repaired = result.data!.repairedData as Record<string, unknown>;
      const armor = repaired.armor as Record<string, unknown>;
      const allocation = armor.allocation as Record<string, number>;
      expect(allocation.leftArm).toBe(0);
    });

    it('should support dry run mode', () => {
      const validator = createDataIntegrityValidator();
      const data = {
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        tonnage: 100,
        engine: { type: 'Standard', rating: 300 },
        armor: { allocation: { head: 9, leftArm: -5 } },
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
      };
      
      const result = validator.repair(data, { dryRun: true });
      
      expect(result.data!.appliedRepairs).toContain(IntegrityIssueCodes.ARMOR_EXCEEDS_MAX);
      // In dry run, repairedData should not be set
      expect(result.data!.repairedData).toBeUndefined();
    });

    it('should support selective repair codes', () => {
      const validator = createDataIntegrityValidator();
      const data = {
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        tonnage: 100,
        engine: { type: 'Standard', rating: 300 },
        armor: { allocation: { head: 9, leftArm: -5 } },
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
      };
      
      // Only repair specific codes (not the armor one)
      const result = validator.repair(data, { 
        repairCodes: ['SOME_OTHER_CODE'] 
      });
      
      // Should not have applied the armor repair
      const repairData = result.success ? result.data : result.error;
      expect(repairData.appliedRepairs).not.toContain(IntegrityIssueCodes.ARMOR_EXCEEDS_MAX);
    });

    it('should track remaining issues after repair', () => {
      const validator = createDataIntegrityValidator();
      const data = {
        // Missing required fields - not repairable
        armor: { allocation: { head: 9, leftArm: -5 } }, // negative armor - repairable
      };
      
      const result = validator.repair(data);
      
      const repairData = result.success ? result.data : result.error;
      expect(repairData.remainingIssues.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Validator.getAvailableRepairs()
  // ============================================================================
  describe('Validator.getAvailableRepairs()', () => {
    it('should return available repair operations', () => {
      const validator = createDataIntegrityValidator();
      const repairs = validator.getAvailableRepairs();
      
      expect(repairs.length).toBeGreaterThan(0);
    });

    it('should return operations with required properties', () => {
      const validator = createDataIntegrityValidator();
      const repairs = validator.getAvailableRepairs();
      
      for (const repair of repairs) {
        expect(repair.issueCode).toBeDefined();
        expect(repair.description).toBeDefined();
        expect(typeof repair.repair).toBe('function');
      }
    });

    it('should include armor repair operation', () => {
      const validator = createDataIntegrityValidator();
      const repairs = validator.getAvailableRepairs();
      
      expect(repairs.some(r => r.issueCode === IntegrityIssueCodes.ARMOR_EXCEEDS_MAX)).toBe(true);
    });
  });
});

