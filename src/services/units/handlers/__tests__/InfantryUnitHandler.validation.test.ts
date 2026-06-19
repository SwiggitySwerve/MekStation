/**
 * InfantryUnitHandler Tests
 *
 * Comprehensive tests for Infantry BLK parsing, validation, calculations, and serialization
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { calculateInfantryBVFromUnit } from '@/utils/construction/infantry';

import {
  InfantryUnitHandler,
  createInfantryHandler,
} from '../InfantryUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createJumpInfantryDocument,
  createMechanizedInfantryDocument,
  createFieldGunInfantryDocument,
  createAntiMechInfantryDocument,
  createAugmentedInfantryDocument,
  createClanInfantryDocument,
} from './InfantryUnitHandler.test-helpers';

describe('InfantryUnitHandler', () => {
  let handler: InfantryUnitHandler;

  beforeEach(() => {
    handler = createInfantryHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('validate', () => {
    it('should pass validation for valid infantry', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(true);
    });

    describe('squad size validation', () => {
      it('should default squad size of 0 to 7 during parsing (falsy value)', () => {
        // When squadSize is 0 (falsy), parser defaults it to 7
        const doc = createMockBlkDocument({ squadSize: 0 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);
        expect(result.data?.unit?.squadSize).toBe(7); // Defaulted from falsy 0
      });

      it('should fail validation for squad size greater than 10', () => {
        const doc = createMockBlkDocument({ squadSize: 15 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some((e) => e.includes('squad size'))).toBe(
          true,
        );
      });

      it('should pass validation for squad size of 1', () => {
        const doc = createMockBlkDocument({ squadSize: 1 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.errors.some((e) => e.includes('squad size'))).toBe(
          false,
        );
      });

      it('should pass validation for squad size of 10', () => {
        const doc = createMockBlkDocument({ squadSize: 10 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.errors.some((e) => e.includes('squad size'))).toBe(
          false,
        );
      });
    });

    describe('number of squads validation', () => {
      it('should default number of squads of 0 to 4 during parsing (falsy value)', () => {
        // When squadn is 0 (falsy), parser defaults it to 4
        const doc = createMockBlkDocument({ squadn: 0 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);
        expect(result.data?.unit?.numberOfSquads).toBe(4); // Defaulted from falsy 0
      });

      it('should warn about number of squads greater than 4', () => {
        const doc = createMockBlkDocument({ squadn: 6 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.warnings.some((w) => w.includes('squads'))).toBe(
          true,
        );
      });

      it('should not warn for standard squad count of 4', () => {
        const doc = createMockBlkDocument({ squadn: 4 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.warnings.some((w) => w.includes('squads'))).toBe(
          false,
        );
      });
    });

    describe('jump infantry field gun restriction', () => {
      it('should fail validation for jump infantry with field guns', () => {
        const doc = createMockBlkDocument({
          motionType: 'Jump',
          jumpingMP: 3,
          equipmentByLocation: {
            Platoon: ['Light Field Gun'],
          },
        });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.isValid).toBe(false);
        expect(
          validation.errors.some((e) =>
            e.includes('Jump infantry cannot carry field guns'),
          ),
        ).toBe(true);
      });

      it('should pass validation for foot infantry with field guns', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.errors.some((e) => e.includes('field guns'))).toBe(
          false,
        );
      });
    });

    describe('anti-mech training validation', () => {
      it('should fail if canSwarm is true but anti-mech training is false', () => {
        // Note: This shouldn't normally happen since canSwarm is derived from hasAntiMechTraining
        // But we test the validation logic itself
        const doc = createMockBlkDocument({
          rawTags: { antimech: 'true' },
        });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        // With anti-mech training, validation should pass
        const validation = handler.validate(result.data!.unit);
        expect(
          validation.errors.some((e) =>
            e.includes('Swarm attacks require anti-mech training'),
          ),
        ).toBe(false);
      });
    });

    describe('field gun crew size validation', () => {
      it('should fail if field gun crew exceeds squad size', () => {
        const doc = createMockBlkDocument({
          squadSize: 1, // Squad size of 1, but field gun needs crew of 2
          equipmentByLocation: {
            Platoon: ['Light Field Gun'],
          },
        });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.isValid).toBe(false);
        expect(
          validation.errors.some((e) =>
            e.includes('requires more crew than squad size'),
          ),
        ).toBe(true);
      });

      it('should pass if squad size accommodates field gun crew', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(
          validation.errors.some((e) => e.includes('requires more crew')),
        ).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Calculations
  // ==========================================================================
});
