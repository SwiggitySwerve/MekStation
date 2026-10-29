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
      it('defaults an omitted source tag to fusion', () => {
        const result = handler.parse(
          createMockBlkDocument({ engineType: undefined }),
        );
        expect(result.success).toBe(true);
        expect(result.data?.unit.conventionalEngineType).toBe(
          ConventionalFighterEngineType.FUSION,
        );
        expect(result.data?.unit.engineType).toBe(0);
      });

      it.each([
        [0, ConventionalFighterEngineType.FUSION],
        [1, ConventionalFighterEngineType.ICE],
        [6, ConventionalFighterEngineType.FUEL_CELL],
        [7, ConventionalFighterEngineType.FISSION],
        [9, ConventionalFighterEngineType.MAGLEV],
        [11, ConventionalFighterEngineType.ELECTRIC],
        [12, ConventionalFighterEngineType.SOLAR],
      ])('decodes BLK code %s', (engineType, expected) => {
        const result = handler.parse(createMockBlkDocument({ engineType }));
        expect(result.success).toBe(true);
        expect(result.data?.unit.conventionalEngineType).toBe(expected);
        expect(result.data?.unit.engineType).toBe(engineType);
      });
      it.each([2, 3, 4, 5, 8, 10, 13, 99])(
        'rejects unrepresentable code %s',
        (engineType) => {
          const result = handler.parse(createMockBlkDocument({ engineType }));
          expect(result.success).toBe(false);
          expect(result.error?.errors.join(' ')).toMatch(/BLK engine/);
        },
      );
    });
  });
});

describe('Conventional fighter independent engine technology', () => {
  it.each([0, 1, 6, 7, 9, 11, 12])(
    'preserves the Clan override for source %s',
    (engineType) => {
      for (const [type, flag] of [
        ['IS Level 2', 'true'],
        ['Clan Level 2', 'false'],
      ]) {
        const result = new ConventionalFighterUnitHandler().parse(
          createMockBlkDocument({
            type,
            engineType,
            rawTags: { clan_engine: flag },
          }),
        );
        expect(result.success).toBe(true);
        expect(result.data?.unit.clanEngine).toBe(flag === 'true');
        expect(result.data?.unit.engineType).toBe(engineType);
      }
    },
  );
});
