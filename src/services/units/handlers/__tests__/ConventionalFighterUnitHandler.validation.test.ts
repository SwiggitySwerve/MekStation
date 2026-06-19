/**
 * ConventionalFighterUnitHandler Tests
 *
 * Tests for conventional fighter BLK parsing, validation, and serialization.
 * Conventional fighters are atmospheric-only aircraft that cannot operate in space.
 */

import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  ConventionalFighterEngineType,
  AerospaceCockpitType,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import {
  ConventionalFighterUnitHandler,
  createConventionalFighterHandler,
} from '../ConventionalFighterUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createLightFighterDocument,
  createMediumFighterDocument,
  createHeavyFighterDocument,
} from './ConventionalFighterUnitHandler.test-helpers';

describe('ConventionalFighterUnitHandler', () => {
  let handler: ConventionalFighterUnitHandler;

  beforeEach(() => {
    handler = createConventionalFighterHandler();
  });

  describe('validate', () => {
    describe('tonnage limits', () => {
      it('should fail validation for tonnage less than 5 tons', () => {
        const doc = createMockBlkDocument({ tonnage: 3 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.isValid).toBe(false);
        expect(
          validation.errors.some((e) => e.includes('at least 5 tons')),
        ).toBe(true);
      });

      it('should fail validation for tonnage exceeding 100 tons', () => {
        // Need to bypass parsing check first
        const doc = createMockBlkDocument({ tonnage: 50 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        // Manually create a unit with invalid tonnage for validation
        const invalidUnit = {
          ...result.data!.unit,
          tonnage: 150,
        };

        const validation = handler.validate(invalidUnit);
        expect(validation.isValid).toBe(false);
        expect(
          validation.errors.some((e) => e.includes('cannot exceed 100 tons')),
        ).toBe(true);
      });

      it('should pass validation for 5 ton fighter', () => {
        const doc = createMockBlkDocument({ tonnage: 5 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(
          validation.errors.some((e) => e.includes('at least 5 tons')),
        ).toBe(false);
      });

      it('should pass validation for 100 ton fighter', () => {
        const doc = createMockBlkDocument({ tonnage: 100 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(
          validation.errors.some((e) => e.includes('cannot exceed 100 tons')),
        ).toBe(false);
      });
    });

    describe('thrust validation', () => {
      it('should fail validation for zero safe thrust', () => {
        const doc = createMockBlkDocument({ safeThrust: 1 }); // Parse with valid value
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        // Create unit with invalid thrust
        const invalidUnit = {
          ...result.data!.unit,
          movement: { safeThrust: 0, maxThrust: 0 },
        };

        const validation = handler.validate(invalidUnit);
        expect(validation.isValid).toBe(false);
        expect(
          validation.errors.some((e) => e.includes('at least 1 safe thrust')),
        ).toBe(true);
      });

      it('should pass validation with at least 1 safe thrust', () => {
        const doc = createMockBlkDocument({ safeThrust: 1 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(
          validation.errors.some((e) => e.includes('at least 1 safe thrust')),
        ).toBe(false);
      });
    });

    describe('SI validation', () => {
      it('should fail validation for zero structural integrity', () => {
        const doc = createMockBlkDocument({ structuralIntegrity: 1 }); // Parse with valid
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const invalidUnit = {
          ...result.data!.unit,
          structuralIntegrity: 0,
        };

        const validation = handler.validate(invalidUnit);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some((e) => e.includes('at least 1 SI'))).toBe(
          true,
        );
      });

      it('should pass validation with at least 1 SI', () => {
        const doc = createMockBlkDocument({ structuralIntegrity: 1 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.errors.some((e) => e.includes('at least 1 SI'))).toBe(
          false,
        );
      });
    });

    describe('atmosphere-only info', () => {
      it('should include atmosphere-only info message', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(
          validation.infos.some((i) => i.includes('cannot operate in space')),
        ).toBe(true);
      });
    });

    describe('combined validation', () => {
      it('should pass validation for valid fighter', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.data!.unit);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });
  });

  // ============================================================================
  // Calculation Tests
  // ============================================================================
});
