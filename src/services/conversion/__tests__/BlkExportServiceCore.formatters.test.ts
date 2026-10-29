import type { ProtoMechState } from '@/stores/protoMechState';

import { ConventionalFighterUnitHandler } from '@/services/units/handlers/ConventionalFighterUnitHandler';
/**
 * BlkExportServiceCore.formatters Tests
 *
 * Tier 1 invariant tests for the BLK code-token formatters. BLK is a numeric
 * tag-based format used by MegaMek for vehicles, aerospace, battle armor,
 * infantry, and protomechs. Each enum value must serialize to a specific
 * numeric or short-string code that MegaMek's BLK parser expects on the
 * round-trip. Wrong codes break unit imports in the real MegaMek client.
 *
 * Tests assert the exact code per enum member, fallback values, and the
 * armor-line layout (newline-joined order) per chassis type.
 */
import { ProtoMechUnitHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { SmallCraftUnitHandler } from '@/services/units/handlers/SmallCraftUnitHandler';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import {
  AerospaceLocation,
  ProtoMechLocation,
  VTOLLocation,
  VehicleLocation,
} from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { ConventionalFighterEngineType } from '@/types/unit/AerospaceInterfaces';
import {
  GroundMotionType,
  SquadMotionType,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
} from '@/types/unit/PersonnelInterfaces';

import {
  decodeBlkConstructionEngine,
  isClanBlkEngine,
} from '../blkEngineIdentity';
import {
  exportVehicle,
  exportAerospace,
} from '../BlkExportServiceCore.exporters';
import {
  aerospaceLocationToBlockName,
  formatAerospaceArmor,
  formatArmorTechCode,
  formatArmorTypeCode,
  formatBAChassisType,
  formatBAMotionType,
  formatBAWeightClass,
  formatEngineTypeCode,
  formatInfantryMotionType,
  formatMotionType,
  formatProtoMechArmor,
  formatTechType,
  formatVehicleArmor,
} from '../BlkExportServiceCore.formatters';
import { BlkParserService } from '../BlkParserService';
import {
  createMockVehicleState,
  createMockAerospaceState,
} from './BlkExportService.test-helpers';

describe('BlkExportServiceCore.formatters', () => {
  // ============================================================================
  // formatMotionType() — vehicle motion (Tracked/Wheeled/etc)
  // ============================================================================
  describe('formatMotionType()', () => {
    it.each([
      [GroundMotionType.TRACKED, 'Tracked'],
      [GroundMotionType.WHEELED, 'Wheeled'],
      [GroundMotionType.HOVER, 'Hover'],
      [GroundMotionType.VTOL, 'VTOL'],
      [GroundMotionType.WIGE, 'WiGE'],
      [GroundMotionType.NAVAL, 'Naval'],
      [GroundMotionType.HYDROFOIL, 'Hydrofoil'],
      [GroundMotionType.SUBMARINE, 'Submarine'],
      [GroundMotionType.RAIL, 'Rail'],
      [GroundMotionType.MAGLEV, 'Maglev'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatMotionType(input)).toBe(expected);
    });

    it('falls back to "Tracked" for an unknown motion type', () => {
      expect(formatMotionType('UNKNOWN' as GroundMotionType)).toBe('Tracked');
    });
  });

  // ============================================================================
  // formatBAMotionType / formatInfantryMotionType — pass-through (with FOOT default)
  // ============================================================================
  describe('formatBAMotionType()', () => {
    it('passes through known squad motion types', () => {
      expect(formatBAMotionType(SquadMotionType.JUMP)).toBe(
        SquadMotionType.JUMP,
      );
      expect(formatBAMotionType(SquadMotionType.UMU)).toBe(SquadMotionType.UMU);
    });

    it('falls back to FOOT for falsy input', () => {
      expect(formatBAMotionType('' as SquadMotionType)).toBe(
        SquadMotionType.FOOT,
      );
    });
  });

  describe('formatInfantryMotionType()', () => {
    it('passes through known squad motion types', () => {
      expect(formatInfantryMotionType(SquadMotionType.MECHANIZED)).toBe(
        SquadMotionType.MECHANIZED,
      );
    });

    it('falls back to FOOT for falsy input', () => {
      expect(formatInfantryMotionType('' as SquadMotionType)).toBe(
        SquadMotionType.FOOT,
      );
    });
  });

  // ============================================================================
  // formatBAChassisType()
  // ============================================================================
  describe('formatBAChassisType()', () => {
    it('passes through known chassis types', () => {
      expect(formatBAChassisType(BattleArmorChassisType.BIPED)).toBe(
        BattleArmorChassisType.BIPED,
      );
      expect(formatBAChassisType(BattleArmorChassisType.QUAD)).toBe(
        BattleArmorChassisType.QUAD,
      );
    });

    it('falls back to BIPED for falsy input', () => {
      expect(formatBAChassisType('' as BattleArmorChassisType)).toBe(
        BattleArmorChassisType.BIPED,
      );
    });
  });

  // ============================================================================
  // formatBAWeightClass() — must emit "0".."4" numeric codes
  // ============================================================================
  describe('formatBAWeightClass()', () => {
    it.each([
      [BattleArmorWeightClass.PA_L, '0'],
      [BattleArmorWeightClass.LIGHT, '1'],
      [BattleArmorWeightClass.MEDIUM, '2'],
      [BattleArmorWeightClass.HEAVY, '3'],
      [BattleArmorWeightClass.ASSAULT, '4'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatBAWeightClass(input)).toBe(expected);
    });

    it('falls back to "2" (MEDIUM) for unknown', () => {
      expect(formatBAWeightClass('UNKNOWN' as BattleArmorWeightClass)).toBe(
        '2',
      );
    });
  });

  // ============================================================================
  // formatTechType() — combines techbase + rules level
  // ============================================================================
  describe('formatTechType()', () => {
    it('formats IS + STANDARD as "IS Level 2"', () => {
      expect(formatTechType(TechBase.INNER_SPHERE, RulesLevel.STANDARD)).toBe(
        'IS Level 2',
      );
    });

    it('formats Clan + EXPERIMENTAL as "Clan Level 4"', () => {
      expect(formatTechType(TechBase.CLAN, RulesLevel.EXPERIMENTAL)).toBe(
        'Clan Level 4',
      );
    });

    it.each([
      [RulesLevel.INTRODUCTORY, 'IS Level 1'],
      [RulesLevel.STANDARD, 'IS Level 2'],
      [RulesLevel.ADVANCED, 'IS Level 3'],
      [RulesLevel.EXPERIMENTAL, 'IS Level 4'],
    ])('IS + %s formats to "%s"', (level, expected) => {
      expect(formatTechType(TechBase.INNER_SPHERE, level)).toBe(expected);
    });

    it('falls back to Level 2 for an unknown rules level', () => {
      expect(
        formatTechType(TechBase.INNER_SPHERE, 'UNKNOWN' as RulesLevel),
      ).toBe('IS Level 2');
    });
  });

  // ============================================================================
  // formatEngineTypeCode() — must emit numeric code "0".."8" per MegaMek
  // ============================================================================
  describe('formatEngineTypeCode()', () => {
    it.each([
      [EngineType.STANDARD, '0'],
      [EngineType.XL_IS, '2'],
      [EngineType.XL_CLAN, '2'],
      [EngineType.LIGHT, '4'],
      [EngineType.COMPACT, '5'],
      [EngineType.XXL, '3'],
      [EngineType.ICE, '1'],
      [EngineType.FUEL_CELL, '6'],
      [EngineType.FISSION, '7'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatEngineTypeCode(input)).toBe(expected);
    });

    it('rejects an unsupported engine identity', () => {
      expect(() => formatEngineTypeCode('UNKNOWN' as EngineType)).toThrow(
        /BLK engine/,
      );
    });
  });

  // ============================================================================
  // formatArmorTypeCode() — must emit numeric code "0".."8" per MegaMek
  // ============================================================================
  describe('formatArmorTypeCode()', () => {
    it.each([
      [ArmorTypeEnum.STANDARD, '0'],
      [ArmorTypeEnum.FERRO_FIBROUS_IS, '1'],
      [ArmorTypeEnum.FERRO_FIBROUS_CLAN, '2'],
      [ArmorTypeEnum.LIGHT_FERRO, '3'],
      [ArmorTypeEnum.HEAVY_FERRO, '4'],
      [ArmorTypeEnum.STEALTH, '5'],
      [ArmorTypeEnum.REACTIVE, '6'],
      [ArmorTypeEnum.REFLECTIVE, '7'],
      [ArmorTypeEnum.HARDENED, '8'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatArmorTypeCode(input)).toBe(expected);
    });

    it('falls back to "0" (Standard) for unknown', () => {
      expect(formatArmorTypeCode('UNKNOWN' as ArmorTypeEnum)).toBe('0');
    });
  });

  // ============================================================================
  // formatArmorTechCode() — "1" for IS, "2" for Clan
  // ============================================================================
  describe('formatArmorTechCode()', () => {
    it('returns "2" for Clan', () => {
      expect(formatArmorTechCode(TechBase.CLAN)).toBe('2');
    });

    it('returns "1" for Inner Sphere', () => {
      expect(formatArmorTechCode(TechBase.INNER_SPHERE)).toBe('1');
    });
  });

  // ============================================================================
  // formatVehicleArmor() — newline-joined Front/Left/Right/Rear/Turret(/Rotor)
  // ============================================================================
  describe('formatVehicleArmor()', () => {
    it('emits Front/Left/Right/Rear/Turret on a non-VTOL vehicle', () => {
      const allocation = {
        [VehicleLocation.FRONT]: 30,
        [VehicleLocation.LEFT]: 25,
        [VehicleLocation.RIGHT]: 25,
        [VehicleLocation.REAR]: 20,
        [VehicleLocation.TURRET]: 15,
      };
      expect(formatVehicleArmor(allocation, false)).toBe('30\n25\n25\n20\n15');
    });

    it('appends Rotor as a 6th line for VTOLs', () => {
      const allocation: Record<string, number> = {
        [VehicleLocation.FRONT]: 10,
        [VehicleLocation.LEFT]: 10,
        [VehicleLocation.RIGHT]: 10,
        [VehicleLocation.REAR]: 10,
        [VehicleLocation.TURRET]: 0,
        [VTOLLocation.ROTOR]: 2,
      };
      expect(formatVehicleArmor(allocation, true)).toBe('10\n10\n10\n10\n0\n2');
    });

    it('emits zeros for missing locations', () => {
      expect(formatVehicleArmor({}, false)).toBe('0\n0\n0\n0\n0');
      expect(formatVehicleArmor({}, true)).toBe('0\n0\n0\n0\n0\n0');
    });
  });

  // ============================================================================
  // formatAerospaceArmor() — newline-joined Nose/LeftWing/RightWing/Aft
  // ============================================================================
  describe('formatAerospaceArmor()', () => {
    it('emits Nose/LeftWing/RightWing/Aft in that order', () => {
      const allocation = {
        [AerospaceLocation.NOSE]: 60,
        [AerospaceLocation.LEFT_WING]: 50,
        [AerospaceLocation.RIGHT_WING]: 50,
        [AerospaceLocation.AFT]: 40,
      };
      expect(formatAerospaceArmor(allocation)).toBe('60\n50\n50\n40');
    });

    it('emits zeros for missing arcs', () => {
      expect(formatAerospaceArmor({})).toBe('0\n0\n0\n0');
    });
  });

  // ============================================================================
  // formatProtoMechArmor() — native Head/Torso/RA/LA/Legs/optional MainGun
  // ============================================================================
  describe('formatProtoMechArmor()', () => {
    it('emits Head/Torso/RA/LA/Legs/MainGun in that order', () => {
      const unit = {
        hasMainGun: true,
        armorByLocation: {
          [ProtoMechLocation.HEAD]: 2,
          [ProtoMechLocation.TORSO]: 8,
          [ProtoMechLocation.LEFT_ARM]: 4,
          [ProtoMechLocation.RIGHT_ARM]: 2,
          [ProtoMechLocation.LEGS]: 6,
          [ProtoMechLocation.MAIN_GUN]: 3,
        },
      } as unknown as ProtoMechState;
      expect(formatProtoMechArmor(unit)).toBe('2\n8\n2\n4\n6\n3');
    });

    it('emits zeros for missing locations', () => {
      const unit = {
        armorByLocation: {},
        hasMainGun: false,
      } as unknown as ProtoMechState;
      expect(formatProtoMechArmor(unit)).toBe('0\n0\n0\n0\n0');
    });
  });

  // ============================================================================
  // aerospaceLocationToBlockName()
  // ============================================================================
  describe('aerospaceLocationToBlockName()', () => {
    it.each([
      [AerospaceLocation.NOSE, 'Nose'],
      [AerospaceLocation.LEFT_WING, 'Left Wing'],
      [AerospaceLocation.RIGHT_WING, 'Right Wing'],
      [AerospaceLocation.AFT, 'Aft'],
      [AerospaceLocation.FUSELAGE, 'Fuselage'],
    ])('maps %s to "%s"', (input, expected) => {
      expect(aerospaceLocationToBlockName(input)).toBe(expected);
    });

    it('falls back to "Nose" for unknown', () => {
      expect(aerospaceLocationToBlockName('UNKNOWN' as AerospaceLocation)).toBe(
        'Nose',
      );
    });
  });
});

const parser = new BlkParserService();
const source = (
  family: string,
  code?: string,
) => `<UnitType>${family}</UnitType>
<Name>Engine fixture</Name><year>3060</year><Tonnage>${family === 'SmallCraft' ? 100 : 30}</Tonnage>
<type>IS Level 2</type><cruiseMP>5</cruiseMP><SafeThrust>5</SafeThrust>
<structural_integrity>5</structural_integrity>
${code === undefined ? '' : `<engine_type>${code}</engine_type>`}`;

// BLKMekFile.java:128-132 at MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587.
// Mek is the native source spelling; the other two are existing local aliases.
describe.each(['Mek', 'BattleMech', 'IndustrialMech'])(
  'BLK %s engine-tag reader',
  (family) => {
    it.each(['', '99', '-1', '1.5', '1garbage', 'Fusion'])(
      'rejects explicit malformed or unknown code %j',
      (code) => {
        const result = parser.parse(source(family, code));
        expect(result.success).toBe(false);
        expect(result.error?.errors.join(' ')).toMatch(/BLK engine/);
      },
    );

    it.each(Array.from({ length: 14 }, (_, code) => code))(
      'preserves known serialized code %s without claiming legality',
      (code) => {
        const result = parser.parse(source(family, String(code)));
        expect(result.success).toBe(true);
        expect(result.data?.document.engineType).toBe(code);
      },
    );

    it('preserves an omitted tag for family-specific default handling', () => {
      const result = parser.parse(source(family));
      expect(result.success).toBe(true);
      expect(result.data?.document.engineType).toBeUndefined();
    });
  },
);

describe('BLK engine export, parse and reload', () => {
  it.each(Array.from({ length: 14 }, (_, code) => code))(
    'retains known raw code %s in a document',
    (code) => {
      const result = parser.parse(source('Tank', String(code)));
      expect(result.success).toBe(true);
      expect(result.data?.document.engineType).toBe(code);
    },
  );
  it.each([
    [EngineType.STANDARD, 0, 22.375],
    [EngineType.ICE, 1, 26.375],
    [EngineType.XL_IS, 2, 16.375],
    [EngineType.XL_CLAN, 2, 16.375],
    [EngineType.XXL, 3, 13.875],
    [EngineType.LIGHT, 4, 19.375],
    [EngineType.COMPACT, 5, 28.875],
    [EngineType.FUEL_CELL, 6, 19.875],
    [EngineType.FISSION, 7, 31.875],
  ])(
    'exports %s and reloads serialized identity %s',
    (engineType, code, weight) => {
      const exported = exportVehicle(createMockVehicleState({ engineType }));
      expect(exported.success).toBe(true);
      const parsed = parser.parse(exported.content!);
      expect(parsed.success).toBe(true);
      expect(parsed.data?.document.engineType).toBe(code);
      const loaded = new VehicleUnitHandler().parse(parsed.data!.document);
      expect(loaded.success).toBe(true);
      expect(loaded.data?.unit.engineType).toBe(code);
      expect(new VehicleUnitHandler().calculateWeight(loaded.data!.unit)).toBe(
        weight,
      );
    },
  );
  it.each([
    [EngineType.XL_IS, TechBase.CLAN, 'false', 16.375],
    [EngineType.XL_CLAN, TechBase.INNER_SPHERE, 'true', 16.375],
  ])(
    'preserves %s context across opposite chassis tech',
    (engineType, techBase, flag, weight) => {
      const exported = exportVehicle(
        createMockVehicleState({ engineType, techBase }),
      );
      expect(exported.content).toContain(
        `<clan_engine>\n${flag}\n</clan_engine>`,
      );
      const document = parser.parse(exported.content!).data!.document;
      const handler = new VehicleUnitHandler();
      const loaded = handler.parse(document);
      expect(loaded.success).toBe(true);
      expect(loaded.data?.unit.clanEngine).toBe(flag === 'true');
      expect(handler.calculateWeight(loaded.data!.unit)).toBe(weight);
    },
  );
  it.each([
    [EngineType.STANDARD, ConventionalFighterEngineType.FUSION],
    [EngineType.ICE, ConventionalFighterEngineType.ICE],
    [EngineType.FUEL_CELL, ConventionalFighterEngineType.FUEL_CELL],
  ])(
    'reloads conventional %s through actual exporter',
    (engineType, expected) => {
      const exported = exportAerospace(
        createMockAerospaceState({
          unitType: UnitType.CONVENTIONAL_FIGHTER,
          engineType,
        }),
      );
      const document = parser.parse(exported.content!).data!.document;
      const loaded = new ConventionalFighterUnitHandler().parse(document);
      expect(loaded.success).toBe(true);
      expect(loaded.data?.unit.conventionalEngineType).toBe(expected);
    },
  );
  it.each(['', '99', '-1', '1.5', '1garbage', 'Fusion'])(
    'rejects explicit malformed/unknown tag %j',
    (code) => {
      const result = parser.parse(source('Tank', code));
      expect(result.success).toBe(false);
      expect(result.error?.errors.join(' ')).toMatch(/BLK engine/);
    },
  );
  it('defaults omitted engine tag to fusion for engine-tag readers', () => {
    const document = parser.parse(source('ConvFighter')).data!.document;
    const result = new ConventionalFighterUnitHandler().parse(document);
    expect(result.data?.unit.conventionalEngineType).toBe(
      ConventionalFighterEngineType.FUSION,
    );
  });
  it.each([undefined, '', '99', 'Fusion', '2'])(
    'retains ignored SmallCraft tag %j but uses runtime placeholder',
    (code) => {
      const result = parser.parse(source('SmallCraft', code));
      expect(result.success).toBe(true);
      expect(result.data?.document.rawTags.engine_type).toBe(code);
      const loaded = new SmallCraftUnitHandler().parse(result.data!.document);
      expect(loaded.success).toBe(true);
      expect(loaded.data?.unit.engineType).toBe(1);
      expect(loaded.data?.warnings.join(' ')).toMatch(/placeholder/);
    },
  );
  it.each([undefined, '', '1', '2', '99', 'Fusion'])(
    'does not reject ignored ProtoMech tag %j',
    (code) => {
      const parsed = parser.parse(source('ProtoMech', code));
      expect(parsed.success).toBe(true);
      const loaded = new ProtoMechUnitHandler().parse({
        ...parsed.data!.document,
        tonnage: 5,
      });
      expect(loaded.success).toBe(true);
      const baseline = new ProtoMechUnitHandler().parse({
        ...parser.parse(source('ProtoMech')).data!.document,
        tonnage: 5,
      });
      expect(baseline.success).toBe(true);
      expect(loaded.data?.unit.engineRating).toBe(
        baseline.data!.unit.engineRating,
      );
    },
  );
  it.each([9, 10, 11, 12, 13])(
    'vehicle rejects code %s without substituting fusion construction',
    (code) => {
      const parsed = parser.parse(source('Tank', String(code)));
      expect(parsed.success).toBe(true);
      const result = new VehicleUnitHandler().parse(parsed.data!.document);
      expect(result.success).toBe(false);
      expect(result.error?.errors.join(' ')).toMatch(/BLK engine/);
    },
  );
});

describe('BLK XL construction context', () => {
  it.each([
    ['IS Level 2', undefined, false],
    ['Clan Level 2', undefined, true],
    ['Mixed (Clan Chassis)', undefined, true],
    ['Mixed (IS Chassis)', undefined, false],
    ['Clan Level 2', 'false', false],
    ['IS Level 2', 'true', true],
  ])('resolves %s with override %s', (type, flag, clan) => {
    expect(isClanBlkEngine(type, flag)).toBe(clan);
    expect(decodeBlkConstructionEngine(2, clan)).toBe(
      clan ? EngineType.XL_CLAN : EngineType.XL_IS,
    );
  });
});

it('rejects unknown raw codes supplied directly to the vehicle handler', () => {
  const document = parser.parse(source('Tank', '0')).data!.document;
  const result = new VehicleUnitHandler().parse({
    ...document,
    engineType: 99,
  });
  expect(result.success).toBe(false);
  expect(result.error?.errors.join(' ')).toMatch(/BLK engine_type: 99/);
});
