/**
 * ConventionalFighterUnitHandler Tests
 *
 * Tests for conventional fighter BLK parsing, validation, and serialization.
 * Conventional fighters are atmospheric-only aircraft that cannot operate in space.
 */

import { BlkParserService } from '@/services/conversion/BlkParserService';
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

      it('should calculate maxThrust as ceil(safeThrust * 1.5)', () => {
        const doc = createMockBlkDocument({ safeThrust: 6 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.maxThrust).toBe(9);
      });

      it('should calculate maxThrust correctly for odd safeThrust', () => {
        const doc = createMockBlkDocument({ safeThrust: 7 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.maxThrust).toBe(11); // ceil(7 * 1.5) = 11
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

      it('should default missing structural integrity to max(tonnage / 10, safe thrust)', () => {
        // Aero.java:804-808: 50 t gives 5, safe thrust 6 wins.
        const doc = createMockBlkDocument({ structuralIntegrity: undefined });
        const result = handler.parse(doc);

        expect(result.data?.unit?.structuralIntegrity).toBe(6);
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

describe('Conventional fighter engine tags through the raw BLK boundary', () => {
  function parseDocument(engineTag?: string) {
    const source = `<UnitType>ConvFighter</UnitType>
<Name>Engine tag probe</Name>
<year>3060</year>
<type>IS Level 2</type>
<tonnage>50</tonnage>
<SafeThrust>6</SafeThrust>
<fuel>160</fuel>
<structural_integrity>6</structural_integrity>
<armor>16\n12\n12\n8</armor>
${engineTag === undefined ? '' : `<engine_type>${engineTag}</engine_type>`}`;
    return new BlkParserService().parse(source);
  }

  function parseSource(engineTag?: string) {
    const parsed = parseDocument(engineTag);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
    return new ConventionalFighterUnitHandler().parse(parsed.data.document);
  }

  it.each([
    { tag: undefined, code: 0, identity: ConventionalFighterEngineType.FUSION },
    { tag: '0', code: 0, identity: ConventionalFighterEngineType.FUSION },
    { tag: '1', code: 1, identity: ConventionalFighterEngineType.ICE },
    { tag: ' 7 ', code: 7, identity: ConventionalFighterEngineType.FISSION },
    { tag: '+6', code: 6, identity: ConventionalFighterEngineType.FUEL_CELL },
  ])('preserves a valid or omitted tag: $tag', ({ tag, code, identity }) => {
    const result = parseSource(tag);
    expect(result.success).toBe(true);
    expect(result.data?.unit.engineType).toBe(code);
    expect(result.data?.unit.conventionalEngineType).toBe(identity);
  });

  it.each(['', '   ', 'not-an-engine', '0x63', '1garbage', '1.5', '1e0'])(
    'rejects an explicitly malformed tag: %j',
    (tag) => {
      const result = parseDocument(tag);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error?.errors.join('; ')).toContain('engine_type');
      const direct = new ConventionalFighterUnitHandler().parse(
        createMockBlkDocument({ engineType: 0, rawTags: { engine_type: tag } }),
      );
      expect(direct.success).toBe(false);
      expect(direct.data).toBeUndefined();
      expect(direct.error?.errors.join('; ')).toContain('engine_type');
    },
  );
});
