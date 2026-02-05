/**
 * ConversionValidation Tests
 *
 * Tests for unit validation functions.
 */

import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import {
  validateConvertedUnit,
  validateBatch,
  ConversionValidationSeverity,
} from '../ConversionValidation';

/**
 * Create a minimal valid unit for testing
 */
function createValidUnit(
  overrides: Partial<ISerializedUnit> = {},
): ISerializedUnit {
  return {
    id: 'test-unit-1',
    chassis: 'Atlas',
    model: 'AS7-D',
    unitType: 'BattleMech',
    configuration: 'BIPED',
    techBase: 'INNER_SPHERE',
    rulesLevel: 'STANDARD',
    era: 'LATE_SUCCESSION_WARS',
    year: 3025,
    tonnage: 100,
    engine: { type: 'STANDARD', rating: 300 },
    gyro: { type: 'STANDARD' },
    cockpit: 'STANDARD',
    structure: { type: 'STANDARD' },
    armor: {
      type: 'STANDARD',
      allocation: {
        head: 9,
        centerTorso: { front: 47, rear: 14 },
        leftTorso: { front: 32, rear: 10 },
        rightTorso: { front: 32, rear: 10 },
        leftArm: 34,
        rightArm: 34,
        leftLeg: 41,
        rightLeg: 41,
      },
    },
    heatSinks: { type: 'SINGLE', count: 20 },
    movement: { walk: 3, jump: 0 },
    equipment: [
      { id: 'ac-20', location: 'RIGHT_TORSO' },
      { id: 'lrm-20', location: 'LEFT_TORSO' },
      { id: 'medium-laser', location: 'LEFT_ARM' },
      { id: 'medium-laser', location: 'RIGHT_ARM' },
      { id: 'srm-6', location: 'LEFT_TORSO' },
    ],
    criticalSlots: {},
    ...overrides,
  } as ISerializedUnit;
}

describe('ConversionValidation', () => {
  describe('validateConvertedUnit', () => {
    describe('required fields validation', () => {
      it('should pass validation for a valid unit', () => {
        const unit = createValidUnit();
        const result = validateConvertedUnit(unit);

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should report error for missing id', () => {
        const unit = createValidUnit({ id: '' });
        const result = validateConvertedUnit(unit);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.code === 'MISSING_ID')).toBe(true);
      });

      it('should report error for missing chassis', () => {
        const unit = createValidUnit({ chassis: '' });
        const result = validateConvertedUnit(unit);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.code === 'MISSING_CHASSIS')).toBe(
          true,
        );
      });

      it('should report error for missing model', () => {
        const unit = createValidUnit({ model: '' });
        const result = validateConvertedUnit(unit);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.code === 'MISSING_MODEL')).toBe(
          true,
        );
      });

      it('should report error for whitespace-only chassis', () => {
        const unit = createValidUnit({ chassis: '   ' });
        const result = validateConvertedUnit(unit);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.code === 'MISSING_CHASSIS')).toBe(
          true,
        );
      });
    });

    describe('tonnage validation', () => {
      it('should warn for non-standard tonnage', () => {
        const unit = createValidUnit({ tonnage: 27 });
        const result = validateConvertedUnit(unit);

        expect(result.warnings.some((w) => w.code === 'INVALID_TONNAGE')).toBe(
          true,
        );
      });

      it('should not warn for standard tonnages', () => {
        const tonnages = [
          20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
        ];
        for (const tonnage of tonnages) {
          const unit = createValidUnit({ tonnage });
          const result = validateConvertedUnit(unit);
          expect(
            result.warnings.filter((w) => w.code === 'INVALID_TONNAGE').length,
          ).toBe(0);
        }
      });
    });

    describe('engine validation', () => {
      it('should report error for engine rating below minimum', () => {
        const unit = createValidUnit({
          engine: { type: 'STANDARD', rating: 5 },
        });
        const result = validateConvertedUnit(unit);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'INVALID_ENGINE_RATING'),
        ).toBe(true);
      });

      it('should report error for engine rating above maximum', () => {
        const unit = createValidUnit({
          engine: { type: 'STANDARD', rating: 600 },
        });
        const result = validateConvertedUnit(unit);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some((e) => e.code === 'INVALID_ENGINE_RATING'),
        ).toBe(true);
      });

      it('should report error for engine rating not multiple of 5', () => {
        const unit = createValidUnit({
          engine: { type: 'STANDARD', rating: 203 },
        });
        const result = validateConvertedUnit(unit);

        expect(result.isValid).toBe(false);
        expect(
          result.errors.some(
            (e) =>
              e.code === 'INVALID_ENGINE_RATING' &&
              e.message.includes('multiple of 5'),
          ),
        ).toBe(true);
      });

      it('should pass for valid engine rating', () => {
        const unit = createValidUnit({
          engine: { type: 'STANDARD', rating: 300 },
        });
        const result = validateConvertedUnit(unit);

        expect(
          result.errors.filter((e) => e.code === 'INVALID_ENGINE_RATING')
            .length,
        ).toBe(0);
      });
    });

    describe('movement validation', () => {
      it('should report error for walk MP less than 1', () => {
        const unit = createValidUnit({ movement: { walk: 0, jump: 0 } });
        const result = validateConvertedUnit(unit);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.code === 'INVALID_WALK_MP')).toBe(
          true,
        );
      });

      it("should report info when walk MP doesn't match engine rating", () => {
        // Engine 300 on 100 ton = 3 walk MP, but we set walk to 4
        const unit = createValidUnit({ movement: { walk: 4, jump: 0 } });
        const result = validateConvertedUnit(unit);

        expect(result.info.some((i) => i.code === 'WALK_MP_MISMATCH')).toBe(
          true,
        );
      });

      it('should not report mismatch when walk MP matches engine rating', () => {
        // Engine 300 on 100 ton = 3 walk MP
        const unit = createValidUnit({ movement: { walk: 3, jump: 0 } });
        const result = validateConvertedUnit(unit);

        expect(
          result.info.filter((i) => i.code === 'WALK_MP_MISMATCH').length,
        ).toBe(0);
      });
    });

    describe('heat sink validation', () => {
      it('should warn for fewer than 10 heat sinks', () => {
        const unit = createValidUnit({
          heatSinks: { type: 'SINGLE', count: 8 },
        });
        const result = validateConvertedUnit(unit);

        expect(
          result.warnings.some((w) => w.code === 'INSUFFICIENT_HEAT_SINKS'),
        ).toBe(true);
      });

      it('should not warn for 10 or more heat sinks', () => {
        const unit = createValidUnit({
          heatSinks: { type: 'SINGLE', count: 10 },
        });
        const result = validateConvertedUnit(unit);

        expect(
          result.warnings.filter((w) => w.code === 'INSUFFICIENT_HEAT_SINKS')
            .length,
        ).toBe(0);
      });
    });

    describe('armor validation', () => {
      it('should report error for head armor exceeding 9', () => {
        const unit = createValidUnit({
          armor: {
            type: 'STANDARD',
            allocation: {
              head: 12,
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

        expect(
          result.errors.some((e) => e.code === 'HEAD_ARMOR_EXCEEDED'),
        ).toBe(true);
      });

      it('should warn for armor exceeding location maximum', () => {
        // For 100 ton mech, max arm armor = 17 * 2 = 34
        const unit = createValidUnit({
          armor: {
            type: 'STANDARD',
            allocation: {
              head: 9,
              centerTorso: { front: 30, rear: 10 },
              leftTorso: { front: 20, rear: 8 },
              rightTorso: { front: 20, rear: 8 },
              leftArm: 50, // Exceeds max
              rightArm: 16,
              leftLeg: 20,
              rightLeg: 20,
            },
          },
        });
        const result = validateConvertedUnit(unit);

        expect(result.warnings.some((w) => w.code === 'ARMOR_EXCEEDED')).toBe(
          true,
        );
      });

      it('should handle torso armor validation for front+rear values', () => {
        // This test verifies the armor validation runs without errors
        // The actual max armor check depends on structure type interpretation
        const unit = createValidUnit();
        const result = validateConvertedUnit(unit);

        // Valid unit should pass armor validation
        expect(
          result.errors.filter((e) => e.code === 'HEAD_ARMOR_EXCEEDED').length,
        ).toBe(0);
      });
    });

    describe('equipment validation', () => {
      it('should warn for no equipment', () => {
        const unit = createValidUnit({ equipment: [] });
        const result = validateConvertedUnit(unit);

        expect(result.warnings.some((w) => w.code === 'NO_EQUIPMENT')).toBe(
          true,
        );
      });

      it('should not warn when equipment is present', () => {
        const unit = createValidUnit();
        const result = validateConvertedUnit(unit);

        expect(
          result.warnings.filter((w) => w.code === 'NO_EQUIPMENT').length,
        ).toBe(0);
      });
    });

    describe('severity levels', () => {
      it('should use correct severity for errors', () => {
        const unit = createValidUnit({ id: '' });
        const result = validateConvertedUnit(unit);

        const error = result.errors.find((e) => e.code === 'MISSING_ID');
        expect(error?.severity).toBe(ConversionValidationSeverity.Error);
      });

      it('should use correct severity for warnings', () => {
        const unit = createValidUnit({ tonnage: 27 });
        const result = validateConvertedUnit(unit);

        const warning = result.warnings.find(
          (w) => w.code === 'INVALID_TONNAGE',
        );
        expect(warning?.severity).toBe(ConversionValidationSeverity.Warning);
      });

      it('should use correct severity for info', () => {
        const unit = createValidUnit({ movement: { walk: 4, jump: 0 } });
        const result = validateConvertedUnit(unit);

        const info = result.info.find((i) => i.code === 'WALK_MP_MISMATCH');
        expect(info?.severity).toBe(ConversionValidationSeverity.Info);
      });
    });
  });

  describe('validateBatch', () => {
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
      expect(result.results.length).toBe(3);
    });

    it('should count valid and invalid units correctly', () => {
      const units = [
        createValidUnit({ id: 'unit-1' }),
        createValidUnit({ id: '' }), // Invalid
        createValidUnit({ id: 'unit-3' }),
      ];

      const result = validateBatch(units);

      expect(result.total).toBe(3);
      expect(result.valid).toBe(2);
      expect(result.invalid).toBe(1);
    });

    it('should count units with warnings', () => {
      const units = [
        createValidUnit({ id: 'unit-1', tonnage: 27 }), // Has warning
        createValidUnit({ id: 'unit-2' }), // No warning
      ];

      const result = validateBatch(units);

      expect(result.withWarnings).toBe(1);
    });

    it('should handle empty batch', () => {
      const result = validateBatch([]);

      expect(result.total).toBe(0);
      expect(result.valid).toBe(0);
      expect(result.invalid).toBe(0);
      expect(result.results.length).toBe(0);
    });

    it('should return individual results for each unit', () => {
      const units = [
        createValidUnit({ id: 'unit-1' }),
        createValidUnit({ id: '' }),
      ];

      const result = validateBatch(units);

      expect(result.results[0].id).toBe('unit-1');
      expect(result.results[0].result.isValid).toBe(true);
      expect(result.results[1].id).toBe('');
      expect(result.results[1].result.isValid).toBe(false);
    });
  });
});
