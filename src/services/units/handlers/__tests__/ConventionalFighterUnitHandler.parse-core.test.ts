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

  describe('parse', () => {
    describe('basic parsing', () => {
      it('should parse valid BLK document successfully', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit).toBeDefined();
        expect(result.data?.unit?.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
      });

      it('should parse chassis and model correctly', () => {
        const doc = createMockBlkDocument({
          name: 'F-100 Super Sabre',
          model: 'Alpha',
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.metadata.chassis).toBe('F-100 Super Sabre');
        expect(result.data?.unit?.metadata.model).toBe('Alpha');
      });

      it('should parse tonnage correctly', () => {
        const doc = createMockBlkDocument({ tonnage: 75 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.tonnage).toBe(75);
      });

      it('should always set motionType to AERODYNE', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(
          AerospaceMotionType.AERODYNE,
        );
      });
    });

    describe('movement calculation', () => {
      it('should parse safeThrust correctly', () => {
        const doc = createMockBlkDocument({ safeThrust: 8 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.safeThrust).toBe(8);
      });

      it('should calculate maxThrust as floor(safeThrust * 1.5)', () => {
        const doc = createMockBlkDocument({ safeThrust: 6 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.maxThrust).toBe(9);
      });

      it('should calculate maxThrust correctly for odd safeThrust', () => {
        const doc = createMockBlkDocument({ safeThrust: 7 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.maxThrust).toBe(10); // floor(7 * 1.5) = 10
      });

      it('should fail validation when safeThrust is less than 1', () => {
        const doc = createMockBlkDocument({ safeThrust: 0 });
        const result = handler.parse(doc);

        expect(result.success).toBe(false);
        expect(
          result.error!.errors.some((e) =>
            e.includes('at least 1 safe thrust'),
          ),
        ).toBe(true);
      });
    });

    describe('fuel parsing', () => {
      it('should parse fuel correctly', () => {
        const doc = createMockBlkDocument({ fuel: 250 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.fuel).toBe(250);
      });

      it('should warn about very low fuel (< 40)', () => {
        const doc = createMockBlkDocument({ fuel: 30 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data!.warnings.some((w) => w.includes('low fuel'))).toBe(
          true,
        );
      });

      it('should not warn about adequate fuel', () => {
        const doc = createMockBlkDocument({ fuel: 100 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data!.warnings.some((w) => w.includes('low fuel'))).toBe(
          false,
        );
      });
    });

    describe('structural integrity parsing', () => {
      it('should parse structural integrity correctly', () => {
        const doc = createMockBlkDocument({ structuralIntegrity: 10 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.structuralIntegrity).toBe(10);
      });

      it('should handle missing structural integrity with default 0', () => {
        const doc = createMockBlkDocument({ structuralIntegrity: undefined });
        const result = handler.parse(doc);

        expect(result.data?.unit?.structuralIntegrity).toBe(0);
      });
    });

    describe('heat sinks parsing', () => {
      it('should parse heat sinks count correctly', () => {
        const doc = createMockBlkDocument({ heatsinks: 5 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.heatSinks).toBe(5);
      });

      it('should parse heat sink type correctly', () => {
        const doc = createMockBlkDocument({ sinkType: 1 }); // Double
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.heatSinkType).toBe(1);
      });

      it('should default heat sinks to 0', () => {
        const doc = createMockBlkDocument({ heatsinks: 0 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.heatSinks).toBe(0);
      });
    });

    describe('engine type mapping', () => {
      it('should map engine type 0 to ICE', () => {
        const doc = createMockBlkDocument({ engineType: 0 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.ICE,
        );
      });

      it('should map engine type 1 to FUEL_CELL', () => {
        const doc = createMockBlkDocument({ engineType: 1 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.FUEL_CELL,
        );
      });

      it('should map engine type 2 to ELECTRIC', () => {
        const doc = createMockBlkDocument({ engineType: 2 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.ELECTRIC,
        );
      });

      it('should map engine type 3 to FISSION', () => {
        const doc = createMockBlkDocument({ engineType: 3 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.FISSION,
        );
      });

      it('should map engine type 4 to FUSION', () => {
        const doc = createMockBlkDocument({ engineType: 4 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.FUSION,
        );
      });

      it('should map engine type 5 to SOLAR', () => {
        const doc = createMockBlkDocument({ engineType: 5 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.SOLAR,
        );
      });

      it('should map engine type 6 to MAGLEV', () => {
        const doc = createMockBlkDocument({ engineType: 6 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.MAGLEV,
        );
      });

      it('should default unknown engine type to ICE', () => {
        const doc = createMockBlkDocument({ engineType: 99 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.conventionalEngineType).toBe(
          ConventionalFighterEngineType.ICE,
        );
      });
    });
  });
});
