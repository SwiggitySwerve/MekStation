/**
 * Conversion Validation Tests
 * 
 * Tests for validating converted units against BattleTech construction rules.
 * 
 * @spec openspec/specs/validation-patterns/spec.md
 */

import {
  validateConvertedUnit,
  validateBatch,
  ConversionValidationSeverity,
} from '@/services/conversion/ConversionValidation';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { TechBase } from '@/types/enums/TechBase';

describe('ConversionValidation', () => {
  /**
   * Create a valid base unit for testing
   */
  function createValidUnit(overrides: Partial<ISerializedUnit> = {}): ISerializedUnit {
    return {
      id: 'test-unit-id',
      chassis: 'Test Mech',
      model: 'TST-1A',
      unitType: 'BattleMech',
      configuration: 'Biped',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: 'Standard',
      era: 'Succession Wars',
      year: 3025,
      tonnage: 50,
      engine: { type: 'Standard', rating: 200 },
      gyro: { type: 'Standard' },
      cockpit: 'Standard',
      structure: { type: 'Standard' },
      armor: {
        type: 'Standard',
        allocation: {
          head: 9,
          centerTorso: 23,
          leftTorso: 18,
          rightTorso: 18,
          leftArm: 16,
          rightArm: 16,
          leftLeg: 20,
          rightLeg: 20,
        },
      },
      heatSinks: { type: 'Single', count: 10 },
      movement: { walk: 4, jump: 0 },
      equipment: [
        { id: 'medium-laser', location: 'RA' },
        { id: 'medium-laser', location: 'LA' },
      ],
      criticalSlots: {},
      ...overrides,
    };
  }

  // ============================================================================
  // validateConvertedUnit() - Valid Units
  // ============================================================================
  describe('validateConvertedUnit() - Valid Units', () => {
    it('should pass valid unit', () => {
      const unit = createValidUnit();
      const result = validateConvertedUnit(unit);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return proper structure', () => {
      const unit = createValidUnit();
      const result = validateConvertedUnit(unit);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('info');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.info)).toBe(true);
    });
  });

  // ============================================================================
  // validateConvertedUnit() - Tonnage Validation
  // ============================================================================
  describe('validateConvertedUnit() - Tonnage Validation', () => {
    it('should warn on non-standard tonnage', () => {
      const unit = createValidUnit({ tonnage: 47 }); // Not in 5-ton increments
      const result = validateConvertedUnit(unit);
      
      expect(result.warnings.some(w => w.code === 'INVALID_TONNAGE')).toBe(true);
    });

    it('should accept standard tonnages', () => {
      const tonnages = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
      
      for (const tonnage of tonnages) {
        const unit = createValidUnit({ 
          tonnage,
          engine: { type: 'Standard', rating: tonnage * 4 },
          movement: { walk: 4, jump: 0 },
        });
        const result = validateConvertedUnit(unit);
        
        expect(result.warnings.find(w => w.code === 'INVALID_TONNAGE')).toBeUndefined();
      }
    });
  });

  // ============================================================================
  // validateConvertedUnit() - Engine Validation
  // ============================================================================
  describe('validateConvertedUnit() - Engine Validation', () => {
    it('should error on engine rating below 10', () => {
      const unit = createValidUnit({
        engine: { type: 'Standard', rating: 5 },
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ENGINE_RATING')).toBe(true);
    });

    it('should error on engine rating above 500', () => {
      const unit = createValidUnit({
        engine: { type: 'Standard', rating: 550 },
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ENGINE_RATING')).toBe(true);
    });

    it('should error on engine rating not multiple of 5', () => {
      const unit = createValidUnit({
        engine: { type: 'Standard', rating: 203 },
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_ENGINE_RATING')).toBe(true);
    });

    it('should accept valid engine ratings', () => {
      const ratings = [100, 150, 200, 250, 300, 400];
      
      for (const rating of ratings) {
        const tonnage = Math.floor(rating / 4);
        const unit = createValidUnit({
          tonnage: tonnage > 20 ? tonnage : 20,
          engine: { type: 'Standard', rating },
        });
        const result = validateConvertedUnit(unit);
        
        expect(result.errors.find(e => e.code === 'INVALID_ENGINE_RATING')).toBeUndefined();
      }
    });
  });

  // ============================================================================
  // validateConvertedUnit() - Movement Validation
  // ============================================================================
  describe('validateConvertedUnit() - Movement Validation', () => {
    it('should error on walk MP less than 1', () => {
      const unit = createValidUnit({
        movement: { walk: 0, jump: 0 },
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_WALK_MP')).toBe(true);
    });

    it('should info on walk MP mismatch with engine', () => {
      // Engine 200 / tonnage 50 = 4 walk MP expected
      const unit = createValidUnit({
        tonnage: 50,
        engine: { type: 'Standard', rating: 200 },
        movement: { walk: 5, jump: 0 }, // Doesn't match
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.info.some(i => i.code === 'WALK_MP_MISMATCH')).toBe(true);
    });

    it('should not warn when walk MP matches engine', () => {
      const unit = createValidUnit({
        tonnage: 50,
        engine: { type: 'Standard', rating: 200 },
        movement: { walk: 4, jump: 0 }, // Matches: 200/50 = 4
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.info.find(i => i.code === 'WALK_MP_MISMATCH')).toBeUndefined();
    });
  });

  // ============================================================================
  // validateConvertedUnit() - Heat Sink Validation
  // ============================================================================
  describe('validateConvertedUnit() - Heat Sink Validation', () => {
    it('should warn on less than 10 heat sinks', () => {
      const unit = createValidUnit({
        heatSinks: { type: 'Single', count: 5 },
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.warnings.some(w => w.code === 'INSUFFICIENT_HEAT_SINKS')).toBe(true);
    });

    it('should not warn on 10 or more heat sinks', () => {
      const unit = createValidUnit({
        heatSinks: { type: 'Single', count: 10 },
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.warnings.find(w => w.code === 'INSUFFICIENT_HEAT_SINKS')).toBeUndefined();
    });
  });

  // ============================================================================
  // validateConvertedUnit() - Armor Validation
  // ============================================================================
  describe('validateConvertedUnit() - Armor Validation', () => {
    it('should error on head armor exceeding 9', () => {
      const unit = createValidUnit({
        armor: {
          type: 'Standard',
          allocation: {
            head: 12,
            centerTorso: 20,
            leftTorso: 15,
            rightTorso: 15,
            leftArm: 10,
            rightArm: 10,
            leftLeg: 15,
            rightLeg: 15,
          },
        },
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.errors.some(e => e.code === 'HEAD_ARMOR_EXCEEDED')).toBe(true);
    });

    it('should accept head armor of 9', () => {
      const unit = createValidUnit({
        armor: {
          type: 'Standard',
          allocation: {
            head: 9,
            centerTorso: 20,
            leftTorso: 15,
            rightTorso: 15,
            leftArm: 10,
            rightArm: 10,
            leftLeg: 15,
            rightLeg: 15,
          },
        },
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.errors.find(e => e.code === 'HEAD_ARMOR_EXCEEDED')).toBeUndefined();
    });

    it('should warn on location armor exceeding maximum', () => {
      const unit = createValidUnit({
        tonnage: 20, // Light mech has lower armor limits
        engine: { type: 'Standard', rating: 80 },
        movement: { walk: 4, jump: 0 },
        armor: {
          type: 'Standard',
          allocation: {
            head: 9,
            centerTorso: 20,
            leftTorso: 15,
            rightTorso: 15,
            leftArm: 50, // Way too much for a 20-ton mech
            rightArm: 50,
            leftLeg: 15,
            rightLeg: 15,
          },
        },
      });
      const result = validateConvertedUnit(unit);
      
      expect(result.warnings.some(w => w.code === 'ARMOR_EXCEEDED')).toBe(true);
    });

    it('should handle front/rear armor format', () => {
      const unit = createValidUnit({
        armor: {
          type: 'Standard',
          allocation: {
            head: 9,
            centerTorso: { front: 30, rear: 10 },
            leftTorso: { front: 20, rear: 8 },
            rightTorso: { front: 20, rear: 8 },
            leftArm: 16,
            rightArm: 16,
            leftLeg: 20,
            rightLeg: 20,
          },
        },
      });
      const result = validateConvertedUnit(unit);
      
      // Should be able to validate without errors
      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // validateConvertedUnit() - Required Fields
  // ============================================================================
  describe('validateConvertedUnit() - Required Fields', () => {
    it('should error on missing ID', () => {
      const unit = createValidUnit({ id: '' });
      const result = validateConvertedUnit(unit);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
    });

    it('should error on missing chassis', () => {
      const unit = createValidUnit({ chassis: '' });
      const result = validateConvertedUnit(unit);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_CHASSIS')).toBe(true);
    });

    it('should error on missing model', () => {
      const unit = createValidUnit({ model: '' });
      const result = validateConvertedUnit(unit);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_MODEL')).toBe(true);
    });

    it('should warn on no equipment', () => {
      const unit = createValidUnit({ equipment: [] });
      const result = validateConvertedUnit(unit);
      
      expect(result.warnings.some(w => w.code === 'NO_EQUIPMENT')).toBe(true);
    });
  });

  // ============================================================================
  // validateConvertedUnit() - Issue Structure
  // ============================================================================
  describe('validateConvertedUnit() - Issue Structure', () => {
    it('should include code in issues', () => {
      const unit = createValidUnit({ id: '' });
      const result = validateConvertedUnit(unit);
      
      expect(result.errors[0].code).toBeDefined();
    });

    it('should include message in issues', () => {
      const unit = createValidUnit({ id: '' });
      const result = validateConvertedUnit(unit);
      
      expect(result.errors[0].message).toBeDefined();
      expect(typeof result.errors[0].message).toBe('string');
    });

    it('should include severity in issues', () => {
      const unit = createValidUnit({ id: '' });
      const result = validateConvertedUnit(unit);
      
      expect(result.errors[0].severity).toBe(ConversionValidationSeverity.Error);
    });

    it('should include expected/actual in relevant issues', () => {
      const unit = createValidUnit({
        armor: {
          type: 'Standard',
          allocation: {
            head: 15,
            centerTorso: 20,
            leftTorso: 15,
            rightTorso: 15,
            leftArm: 10,
            rightArm: 10,
            leftLeg: 15,
            rightLeg: 15,
          },
        },
      });
      const result = validateConvertedUnit(unit);
      
      const headError = result.errors.find(e => e.code === 'HEAD_ARMOR_EXCEEDED');
      expect(headError?.expected).toBe(9);
      expect(headError?.actual).toBe(15);
    });
  });

  // ============================================================================
  // validateBatch()
  // ============================================================================
  describe('validateBatch()', () => {
    it('should validate multiple units', () => {
      const units = [
        createValidUnit({ id: 'unit-1' }),
        createValidUnit({ id: 'unit-2' }),
        createValidUnit({ id: 'unit-3' }),
      ];
      
      const result = validateBatch(units);
      
      expect(result.total).toBe(3);
      expect(result.valid).toBe(3);
      expect(result.invalid).toBe(0);
    });

    it('should count invalid units', () => {
      const units = [
        createValidUnit({ id: 'valid-1' }),
        createValidUnit({ id: '' }), // Invalid - missing ID
        createValidUnit({ id: 'valid-2' }),
      ];
      
      const result = validateBatch(units);
      
      expect(result.total).toBe(3);
      expect(result.valid).toBe(2);
      expect(result.invalid).toBe(1);
    });

    it('should count units with warnings', () => {
      const units = [
        createValidUnit({ id: 'unit-1' }),
        createValidUnit({ id: 'unit-2', tonnage: 47 }), // Warning - non-standard tonnage
      ];
      
      const result = validateBatch(units);
      
      expect(result.withWarnings).toBe(1);
    });

    it('should include per-unit results', () => {
      const units = [
        createValidUnit({ id: 'unit-1' }),
        createValidUnit({ id: 'unit-2' }),
      ];
      
      const result = validateBatch(units);
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0].id).toBe('unit-1');
      expect(result.results[1].id).toBe('unit-2');
    });

    it('should handle empty batch', () => {
      const result = validateBatch([]);
      
      expect(result.total).toBe(0);
      expect(result.valid).toBe(0);
      expect(result.invalid).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });
});

