/**
 * The `armor` section of mtf-component-vocabulary.json is the one owner of armor
 * identity (tag, enum member, export family, MTF names). This file proves every
 * other place that names an armor type either derives from it or equals it, so
 * a change to one without the other fails here. The Python half is
 * scripts/__tests__/test_armor_identity_owner.py. Both read only repository
 * files, so both run in CI.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/armor-system/spec.md
 */
import { encodeBlkArmorType } from '@/services/conversion/BlkArmorCodes';
import { ARMOR_EXPORT_FAMILIES } from '@/services/conversion/MTFArmorClassification';
import { getMTFArmorIdentities } from '@/services/conversion/MTFVocabulary';
import { parseArmorType as registryParse } from '@/services/units/EnumParserRegistry';
import { ARMOR_CODES as CAPITAL_ARMOR_CODES } from '@/services/units/unitLoaderService/capitalShipView';
import {
  mapArmorType as loaderMap,
  resolveArmorType as loaderResolve,
} from '@/services/units/unitLoaderService/componentMappers';
import {
  ARMOR_DEFINITIONS,
  ArmorTypeEnum,
  COMMERCIAL_ARMOR_SOURCE_TAG,
  FERRO_FIBROUS_PROTO_SOURCE_TAG,
  NATIVE_ONLY_ARMOR_SOURCE_TAGS,
  PATCHWORK_ARMOR,
  isNativeOnlyArmor,
} from '@/types/construction/ArmorType';
import { BATTLEMECH_ARMOR_TYPES } from '@/types/contracts/CustomCombatSnapshot';
import { TechBase } from '@/types/enums/TechBase';
import { getArmorBVMultiplier } from '@/types/validation/BattleValue';
import { ARMOR_TYPE } from '@/utils/serialization/CustomUnitSerializer.tags';

import schema from '../../../../public/data/equipment/_schema/unit-schema.json';
import { mapArmorType as bvArmorKey } from '../../../../scripts/validate-bv-unit-derived';
import { ARMOR_IDENTITY_ROWS, armorTagForEnumKey } from '../ArmorIdentity';
import { isClanTechLevel } from '../ArmorTechSide';
import blkArmorCodes from '../blk-armor-codes.json';
import vocabulary from '../mtf-component-vocabulary.json';

const rows = ARMOR_IDENTITY_ROWS;
const memberKeys = Object.keys(ArmorTypeEnum);
const valueOf = (key: string) =>
  ArmorTypeEnum[key as keyof typeof ArmorTypeEnum];
const enumRows = rows.filter((row) => row.enum !== null);
const mechRows = rows.filter((row) => row.family === 'MTF:mech');

describe('owner rows against the wire contract', () => {
  const contractTags: string[] = schema.$defs.standardArmorType.enum;

  it('has exactly one row per contract armor.type tag, in both directions', () => {
    expect(new Set(rows.map((row) => row.tag)).size).toBe(rows.length);
    expect([...rows.map((row) => row.tag)].sort()).toEqual(
      [...contractTags].sort(),
    );
  });

  it('classifies every row into a known export family', () => {
    const families = new Set([
      'MTF:mech',
      'BLK:battle-armor',
      'BLK:aerospace',
      'BLK:protomech',
      'BLK:support-vehicle-BAR',
    ]);
    expect(rows.filter((row) => !families.has(row.family))).toEqual([]);
  });

  it('has an mtf block exactly on the MTF:mech rows', () => {
    expect(
      rows
        .filter(
          (row) => (row.mtf !== undefined) !== (row.family === 'MTF:mech'),
        )
        .map((row) => row.tag),
    ).toEqual([]);
  });
});

describe('owner rows against the MTF names', () => {
  it('keeps write names, parse keys and spellings unique', () => {
    const writes = mechRows.map((row) => row.mtf!.write);
    const parses = mechRows.flatMap((row) =>
      row.mtf!.parse === null ? [] : [row.mtf!.parse],
    );
    const spellings = mechRows.flatMap((row) => row.mtf!.spellings);
    expect(new Set(writes).size).toBe(writes.length);
    expect(new Set(parses).size).toBe(parses.length);
    expect(new Set(spellings).size).toBe(spellings.length);
  });

  it('exposes the same families and MTF identities through the derived modules', () => {
    expect(
      Object.fromEntries(rows.map((row) => [row.tag, row.family])),
    ).toEqual(ARMOR_EXPORT_FAMILIES);
    expect([...getMTFArmorIdentities()]).toEqual(
      mechRows.map((row) => row.tag),
    );
  });
});

describe('owner rows against ArmorTypeEnum and its tag tables', () => {
  it("never uses an enum key that is another row's tag (export aliases would shadow it)", () => {
    const tags = new Set(rows.map((row) => row.tag));
    expect(
      enumRows
        .filter((row) => row.enum !== row.tag && tags.has(row.enum!))
        .map((row) => row.tag),
    ).toEqual([]);
  });

  it('has a row for every enum member and an enum member for every row', () => {
    expect(enumRows.map((row) => row.enum).sort()).toEqual(
      [...memberKeys].sort(),
    );
    expect(new Set(enumRows.map((row) => row.enum)).size).toBe(enumRows.length);
  });

  it('keeps the serializer tag table (a literal, for its literal types) equal to the owner', () => {
    const fromTable = Object.fromEntries(
      Object.entries(ARMOR_TYPE).map(([value, tag]) => [value, tag]),
    );
    const fromOwner = Object.fromEntries(
      enumRows.map((row) => [valueOf(row.enum!), row.tag]),
    );
    expect(fromTable).toEqual(fromOwner);
  });

  it('derives the source tags the definitions carry from the owner', () => {
    expect(COMMERCIAL_ARMOR_SOURCE_TAG).toBe(armorTagForEnumKey('COMMERCIAL'));
    expect(FERRO_FIBROUS_PROTO_SOURCE_TAG).toBe(
      armorTagForEnumKey('FERRO_FIBROUS_PROTO'),
    );
    for (const [value, tag] of Object.entries(NATIVE_ONLY_ARMOR_SOURCE_TAGS)) {
      const row = enumRows.find((r) => valueOf(r.enum!) === value);
      expect(row?.tag).toBe(tag);
    }
    expect(PATCHWORK_ARMOR.sourceTag).toBe(armorTagForEnumKey('PATCHWORK'));
    for (const def of ARMOR_DEFINITIONS) {
      if (def.sourceTag === undefined) continue;
      const row = enumRows.find((r) => valueOf(r.enum!) === def.type);
      expect(row?.tag).toBe(def.sourceTag);
    }
  });
});

describe('owner rows against the BLK armor codes', () => {
  const codeToTag = blkArmorCodes as Record<string, string>;

  it('names only owner tags in blk-armor-codes.json', () => {
    const tags = new Set(rows.map((row) => row.tag));
    expect(Object.values(codeToTag).filter((tag) => !tags.has(tag))).toEqual(
      [],
    );
  });

  const BLK_SHARED_CLAN_TAGS: Readonly<Record<string, string>> = {
    FERRO_FIBROUS_CLAN: 'FERRO_FIBROUS',
    REACTIVE_CLAN: 'REACTIVE',
    REFLECTIVE_CLAN: 'REFLECTIVE',
  };

  it('keeps the editor BLK code table (BlkArmorCodes.ts, a literal) pointing at the owner tag', () => {
    const mismatches = enumRows
      .map((row) => {
        const code = encodeBlkArmorType(valueOf(row.enum!));
        // Ferro-Fibrous, Reactive and Reflective each have one BLK code whose side comes
        // from the tech base (MegaMek 48fcb2f64 EquipmentType.java:87-88; ArmorType.java:849,915).
        const expected = BLK_SHARED_CLAN_TAGS[row.tag] ?? row.tag;
        return [row.tag, code, codeToTag[String(code)], expected];
      })
      .filter(([, , actual, expected]) => actual !== expected);
    expect(mismatches).toEqual([]);
  });
});

describe('the loader mappers never map an owner tag to a different member', () => {
  const memberFor = (row: (typeof enumRows)[number]) => valueOf(row.enum!);
  const techBaseFor = (tag: string) =>
    tag === 'FERRO_FIBROUS_CLAN' ? TechBase.CLAN : TechBase.INNER_SPHERE;

  it('componentMappers.mapArmorType resolves every selectable tag to its member, and a native-only tag to Standard', () => {
    const wrong = enumRows
      .filter((row) => {
        const expected = isNativeOnlyArmor(memberFor(row))
          ? ArmorTypeEnum.STANDARD
          : memberFor(row);
        return loaderMap(row.tag, techBaseFor(row.tag)) !== expected;
      })
      .map((row) => row.tag);
    expect(wrong).toEqual([]);
  });

  it('componentMappers.resolveArmorType (the diagnostics read) is undefined for a native-only tag and the member otherwise', () => {
    const wrong = enumRows
      .filter((row) => {
        const expected = isNativeOnlyArmor(memberFor(row))
          ? undefined
          : memberFor(row);
        return loaderResolve(row.tag, techBaseFor(row.tag)) !== expected;
      })
      .map((row) => row.tag);
    expect(wrong).toEqual([]);
  });

  // The legacy ValueMappings.mapArmorType is deliberately not asserted: its
  // substring fallback (ValueMappings.ts:475-480) maps FERRO_LAMELLOR to
  // Ferro-Fibrous (IS), an existing defect recorded as OPEN in the fold's PR.
  // Pinned exactly: these tags already fall back to Standard in the legacy registry
  // (EnumParserRegistry.ts armor map). That is an existing defect recorded OPEN in the
  // fold's PR; the list is pinned so a further tag losing its member fails here.
  const REGISTRY_STANDARD_FALLBACK_TAGS: readonly string[] = [
    'BALLISTIC_REINFORCED',
    'COMMERCIAL',
    'FERRO_LAMELLOR',
  ];

  it('EnumParserRegistry.parseArmorType gives the owner member, except the pinned Standard fallbacks', () => {
    const results = enumRows
      .filter((row) => !isNativeOnlyArmor(memberFor(row)))
      .map((row) => ({ tag: row.tag, result: registryParse(row.tag) }));
    expect(
      results
        .filter(
          ({ tag, result }) =>
            result !== memberFor(enumRows.find((r) => r.tag === tag)!) &&
            result !== ArmorTypeEnum.STANDARD,
        )
        .map(({ tag }) => tag),
    ).toEqual([]);
    expect(
      results
        .filter(
          ({ tag, result }) =>
            result === ArmorTypeEnum.STANDARD &&
            memberFor(enumRows.find((r) => r.tag === tag)!) !==
              ArmorTypeEnum.STANDARD,
        )
        .map(({ tag }) => tag)
        .sort(),
    ).toEqual([...REGISTRY_STANDARD_FALLBACK_TAGS]);
  });
});

describe('other tag lists name only owner tags', () => {
  const ownerTags = new Set(rows.map((row) => row.tag));
  const codeToTag = blkArmorCodes as Record<string, string>;

  // The snapshot list is an older hand-kept prefix of the contract enum, not a designed
  // subset: it includes some native-only and BattleArmor tags and lacks a selectable mech
  // type. The missing selectable tags are pinned here and recorded OPEN (owner C3).
  const SNAPSHOT_MISSING_SELECTABLE_MECH_TAGS: readonly string[] = [
    'FERRO_FIBROUS_PROTO',
  ];

  it('the recorded combat snapshot names only owner tags, and lacks only the pinned selectable mech tags', () => {
    expect(BATTLEMECH_ARMOR_TYPES.filter((tag) => !ownerTags.has(tag))).toEqual(
      [],
    );
    expect(new Set(BATTLEMECH_ARMOR_TYPES).size).toBe(
      BATTLEMECH_ARMOR_TYPES.length,
    );
    const snapshot = new Set<string>(BATTLEMECH_ARMOR_TYPES);
    const missingSelectable = mechRows
      .filter(
        (row) =>
          row.enum !== null &&
          !isNativeOnlyArmor(valueOf(row.enum)) &&
          !snapshot.has(row.tag),
      )
      .map((row) => row.tag)
      .sort();
    expect(missingSelectable).toEqual([
      ...SNAPSHOT_MISSING_SELECTABLE_MECH_TAGS,
    ]);
  });

  it('the capital-ship view maps owner tags to the BLK code that blk-armor-codes.json gives them', () => {
    const wrong = Object.entries(CAPITAL_ARMOR_CODES)
      .filter(
        ([tag, code]) => !ownerTags.has(tag) || codeToTag[String(code)] !== tag,
      )
      .map(([tag]) => tag);
    expect(wrong).toEqual([]);
  });
});

describe('the BV armor mapper agrees with pinned Java on every mech armor tag', () => {
  // BVCalculator.java:1489-1497 (48fcb2f64): the only armor types that move BV.
  const JAVA_BV_MULTIPLIER: Record<string, number> = {
    HARDENED: 2.0,
    REACTIVE: 1.5,
    REACTIVE_CLAN: 1.5,
    REFLECTIVE: 1.5,
    REFLECTIVE_CLAN: 1.5,
    BALLISTIC_REINFORCED: 1.5,
    FERRO_LAMELLOR: 1.2,
    ANTI_PENETRATIVE_ABLATION: 1.2,
    HEAT_DISSIPATING: 1.1,
  };

  it('gives each MTF:mech tag the Java multiplier (1.0 for every type Java does not list)', () => {
    const wrong = mechRows
      .map((row) => [
        row.tag,
        getArmorBVMultiplier(bvArmorKey(row.tag)),
        JAVA_BV_MULTIPLIER[row.tag] ?? 1.0,
      ])
      .filter(([, actual, expected]) => actual !== expected);
    expect(wrong).toEqual([]);
  });
});

describe("the owner file's critical-slot armor markers agree with the armor rows", () => {
  // criticalSlotMarkers (o3a) restates each armor marker's material and tech side. Every armor
  // marker must name an owner row: its material is that row's enum value (the Clan side of a type
  // whose Clan variant has its own row resolves to that row), and its tech side matches the row.
  const markers = (
    vocabulary as unknown as {
      criticalSlotMarkers: Record<
        string,
        { kind: string; material: string; techBase: 'INNER_SPHERE' | 'CLAN' }
      >;
    }
  ).criticalSlotMarkers;
  const rowForMarker = (material: string, techBase: string) => {
    const byValue = (value: string) =>
      enumRows.find((row) => valueOf(row.enum!) === value);
    if (techBase === 'CLAN') {
      const clanRow = enumRows.find(
        (row) =>
          row.tag.endsWith('_CLAN') &&
          byValue(material)?.tag + '_CLAN' === row.tag,
      );
      if (clanRow) return clanRow;
    }
    return byValue(material);
  };

  it('every armor marker resolves to an owner row on the same tech side', () => {
    const wrong = Object.entries(markers)
      .filter(([, marker]) => marker.kind === 'armor-marker')
      .filter(([name, marker]) => {
        // The marker's native name carries its side ("IS …" / "Clan …"); the field must agree.
        if (name.startsWith('Clan ') !== (marker.techBase === 'CLAN'))
          return true;
        const row = rowForMarker(marker.material, marker.techBase);
        if (!row) return true;
        const clanSide =
          row.tag.endsWith('_CLAN') || valueOf(row.enum!).includes('(Clan)');
        const clanOnlyType = ['FERRO_LAMELLOR'].includes(row.tag);
        return marker.techBase === 'CLAN'
          ? !(clanSide || clanOnlyType)
          : clanSide;
      })
      .map(([name]) => name);
    expect(wrong).toEqual([]);
  });
});

// MegaMek 48fcb2f64 TechConstants.java:55-75 levels; isClan:394-399 is the side
// ArmorType.forEntity:96-101 weighs by. One owner for TypeScript and Python.
describe('armor technology level side', () => {
  it('is TechConstants.isClan for every level', () => {
    const javaIsClan = new Set([2, 6, 8, 10, 12]);
    for (let level = -2; level <= 13; level++)
      expect([level, isClanTechLevel(level)]).toEqual([
        level,
        javaIsClan.has(level),
      ]);
    expect(vocabulary.clanTechLevels.levels).toEqual([2, 6, 8, 10, 12]);
  });
});
