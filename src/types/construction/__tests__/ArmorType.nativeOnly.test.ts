import { renderHook } from '@testing-library/react';
/**
 * Native-only armor identities: Industrial, Heavy Industrial, Primitive,
 * Impact-Resistant, Heat-Dissipating, Anti-Penetrative Ablation and Patchwork.
 *
 * The enum and the definition table can NAME these types. Nothing selects,
 * loads, saves or maps to them yet: the loader still falls back to Standard
 * (componentMappers.mapArmorType), the editor lists do not offer them, and the
 * BLK reader does not decode them. These tests pin both halves.
 *
 * Constants: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
 * megamek/src/megamek/common/equipment/ArmorType.java unless another file is named.
 */
import fs from 'node:fs';
import path from 'node:path';

import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import {
  decodeBlkArmorType,
  encodeBlkArmorType,
} from '@/services/conversion/BlkArmorCodes';
import { mapArmorType } from '@/services/units/unitLoaderService/componentMappers';
import vocabulary from '@/types/formats/mtf-component-vocabulary.json';
import { getNativeArmorBVMultiplier } from '@/utils/construction/battleValueDefensive';
import { getAvailableArmorTypes } from '@/utils/construction/techBaseValidation';
import { ARMOR_TYPE } from '@/utils/serialization/CustomUnitSerializer.tags';
import {
  getValidArmorTypes,
  isArmorTypeValid,
} from '@/utils/techBaseValidation';

import { createISComponentTechBases } from '../../../__tests__/helpers/storeTestHelpers';
import { RulesLevel } from '../../enums/RulesLevel';
import { TechBase } from '../../enums/TechBase';
import {
  ARMOR_DEFINITIONS,
  ArmorTypeEnum,
  PATCHWORK_ARMOR,
  getArmorDefinition,
  getNativeArmorType,
  isNativeOnlyArmor,
} from '../ArmorType';

interface Expected {
  readonly type: ArmorTypeEnum;
  readonly name: string;
  readonly tag: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** 16 x pptMultiplier (ArmorType.java:61,302). */
  readonly pointsPerTon: number;
  /** MiscType.java:1071-1073 returns `criticalSlots`; 1244-1255 for the variable ones. */
  readonly criticalSlots: number;
  /** ArmorType.cost / Standard's 10000 (ArmorType.java:369). */
  readonly costMultiplier: number;
  /** TechAdvancement.java:691-699 prototype-else-production, minus 5 when approximate (:95). */
  readonly introductionYear: number;
  /** BVCalculator.java:1489-1509. */
  readonly bvMultiplier: number;
  /** EquipmentType.java T_ARMOR_*. */
  readonly blkCode: number;
}

const UNIFORM: readonly Expected[] = [
  {
    // :694-721. cost :706, ppt x0.67 :718, TM rules ref :710 (guess -> Standard,
    // TechAdvancement.java:982-989), TechBase.ALL :711, 2430 approximate :713-714.
    type: ArmorTypeEnum.INDUSTRIAL,
    name: 'Industrial',
    tag: 'INDUSTRIAL',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    pointsPerTon: 16 * 0.67,
    criticalSlots: 0,
    costMultiplier: 0.5,
    introductionYear: 2425,
    bvMultiplier: 1,
    blkCode: 14,
  },
  {
    // :723-742. cost :729, no ppt multiplier set (1.0), TM :732, TechBase.ALL :733,
    // 2460 not approximate :735-736.
    type: ArmorTypeEnum.HEAVY_INDUSTRIAL,
    name: 'Heavy Industrial',
    tag: 'HEAVY_INDUSTRIAL',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    pointsPerTon: 16,
    criticalSlots: 0,
    costMultiplier: 1,
    introductionYear: 2460,
    bvMultiplier: 1,
    blkCode: 15,
  },
  {
    // :744-764. cost :749, ppt x0.67 :761, IO:AE rules ref :752 with a production
    // date (guess -> Advanced), IS only :753, prototype DATE_ES 2100 :755 (ITechnology.java:55).
    type: ArmorTypeEnum.PRIMITIVE,
    name: 'Primitive',
    tag: 'PRIMITIVE',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 16 * 0.67,
    criticalSlots: 0,
    costMultiplier: 0.5,
    introductionYear: 2100,
    bvMultiplier: 1,
    blkCode: 17,
  },
  {
    // :1078-1103. cost :1083, variable slots :1084 -> 10 (MiscType.java:1250-1251),
    // ppt x0.875 :1100, static Advanced :1097, IS 3090 approximate :1094-1095.
    type: ArmorTypeEnum.IMPACT_RESISTANT,
    name: 'Impact-Resistant',
    tag: 'IMPACT_RESISTANT',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 16 * 0.875,
    criticalSlots: 10,
    costMultiplier: 2,
    introductionYear: 3085,
    bvMultiplier: 1,
    blkCode: 25,
  },
  {
    // :1048-1076. cost :1054, variable slots :1055 -> 6 (MiscType.java:1244-1245),
    // ppt x0.625 :1073, static Advanced :1070, IS 3115 approximate :1065-1066,
    // BV x1.1 (BVCalculator.java:1496).
    type: ArmorTypeEnum.HEAT_DISSIPATING,
    name: 'Heat-Dissipating',
    tag: 'HEAT_DISSIPATING',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 16 * 0.625,
    criticalSlots: 6,
    costMultiplier: 2.5,
    introductionYear: 3110,
    bvMultiplier: 1.1,
    blkCode: 24,
  },
  {
    // :1105-1134. cost :1110, variable slots :1111 -> 6 (MiscType.java:1244-1245),
    // ppt x0.75 :1131, static Advanced :1128, IS 3100 approximate :1125-1126,
    // BV x1.2 (BVCalculator.java:1495).
    type: ArmorTypeEnum.ANTI_PENETRATIVE_ABLATION,
    name: 'Anti-Penetrative Ablation',
    tag: 'ANTI_PENETRATIVE_ABLATION',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 16 * 0.75,
    criticalSlots: 6,
    costMultiplier: 1.5,
    introductionYear: 3095,
    bvMultiplier: 1.2,
    blkCode: 23,
  },
];

// The two Clan variants (constants in ArmorType.clanReactiveReflective.test.ts)
// share their BLK codes with the Inner Sphere members, so they are checked here
// only for the "can be named, nothing uses them" behaviour.
const ALL_NATIVE_ONLY = [
  ...UNIFORM.map((e) => e.type),
  ArmorTypeEnum.PATCHWORK,
  ArmorTypeEnum.REACTIVE_CLAN,
  ArmorTypeEnum.REFLECTIVE_CLAN,
] as const;

describe('uniform native-only armor constants', () => {
  it.each(UNIFORM)('$name matches the pinned constants', (e) => {
    const def = getArmorDefinition(e.type);
    expect(def).toBeDefined();
    expect(def?.name).toBe(e.name);
    expect(def?.sourceTag).toBe(e.tag);
    expect(def?.techBase).toBe(e.techBase);
    expect(def?.rulesLevel).toBe(e.rulesLevel);
    expect(def?.pointsPerTon).toBeCloseTo(e.pointsPerTon, 10);
    expect(def?.criticalSlots).toBe(e.criticalSlots);
    expect(def?.costMultiplier).toBe(e.costMultiplier);
    expect(def?.introductionYear).toBe(e.introductionYear);
    expect(def?.nativeOnly).toBe(true);
  });

  it.each(UNIFORM)(
    "$name BV multiplier is the existing BV owner's (Java armorMultiplier)",
    (e) => {
      expect(getNativeArmorBVMultiplier(e.blkCode)).toBe(e.bvMultiplier);
    },
  );

  it('keeps the six definitions in the table exactly once each', () => {
    for (const e of UNIFORM) {
      expect(ARMOR_DEFINITIONS.filter((d) => d.type === e.type)).toHaveLength(
        1,
      );
    }
  });
});

describe('Patchwork is per location', () => {
  it('has no single points-per-ton, slots or cost: no uniform definition', () => {
    expect(getArmorDefinition(ArmorTypeEnum.PATCHWORK)).toBeUndefined();
    expect(
      ARMOR_DEFINITIONS.some((d) => d.type === ArmorTypeEnum.PATCHWORK),
    ).toBe(false);
  });

  it('names the type with the pinned identity (ArmorType.java:2066-2083)', () => {
    expect(PATCHWORK_ARMOR).toMatchObject({
      type: ArmorTypeEnum.PATCHWORK,
      name: 'Patchwork',
      sourceTag: 'PATCHWORK',
      techBase: TechBase.INNER_SPHERE, // TechBase.ALL :2074
      rulesLevel: RulesLevel.ADVANCED, // setStaticTechLevel :2079
      introductionYear: 1950, // prototype DATE_PS :2075, not approximate :2076
      perLocation: true,
      nativeOnly: true,
    });
    expect(PATCHWORK_ARMOR).not.toHaveProperty('pointsPerTon');
    expect(PATCHWORK_ARMOR).not.toHaveProperty('criticalSlots');
    expect(PATCHWORK_ARMOR).not.toHaveProperty('costMultiplier');
  });

  it('uses the existing BV owner per location type, so the type itself has no multiplier', () => {
    expect(getNativeArmorBVMultiplier(7)).toBe(1);
  });
});

describe('behaviour is unchanged: the types can only be named', () => {
  it('flags exactly the nine types as native-only', () => {
    for (const type of Object.values(ArmorTypeEnum)) {
      expect(isNativeOnlyArmor(type)).toBe(
        ALL_NATIVE_ONLY.includes(type as never),
      );
    }
  });

  it.each(ALL_NATIVE_ONLY)(
    '%s is not reachable from a source tag (loader falls back to Standard)',
    (type) => {
      const tag = (
        type === ArmorTypeEnum.PATCHWORK
          ? PATCHWORK_ARMOR
          : getArmorDefinition(type)
      )?.sourceTag as string;
      expect(tag).toBeTruthy();
      expect(getNativeArmorType(tag)).toBeUndefined();
      expect(mapArmorType(tag, TechBase.INNER_SPHERE)).toBe(
        ArmorTypeEnum.STANDARD,
      );
      expect(mapArmorType(tag, TechBase.CLAN)).toBe(ArmorTypeEnum.STANDARD);
    },
  );

  it('is not offered by the editor option lists', () => {
    const { result } = renderHook(() =>
      useTechBaseSync(createISComponentTechBases()),
    );
    const offered = result.current.filteredOptions.armors.map((a) => a.type);
    const available = [
      ...getAvailableArmorTypes(TechBase.INNER_SPHERE, true),
      ...getAvailableArmorTypes(TechBase.CLAN, true),
    ];
    // The mech valid-armor validator (techBaseValidation.filters.ts filterArmorTypes)
    const valid = [
      ...getValidArmorTypes(TechBase.INNER_SPHERE),
      ...getValidArmorTypes(TechBase.CLAN),
    ];
    for (const type of ALL_NATIVE_ONLY) {
      expect(offered).not.toContain(type);
      expect(available).not.toContain(type);
      expect(valid).not.toContain(type);
      expect(isArmorTypeValid(type, TechBase.INNER_SPHERE)).toBe(false);
      expect(isArmorTypeValid(type, TechBase.CLAN)).toBe(false);
    }
  });

  it.each(UNIFORM)(
    '$name has a BLK code (EquipmentType.java) that encodes but is not decoded',
    (e) => {
      expect(encodeBlkArmorType(e.type)).toBe(e.blkCode);
      expect(decodeBlkArmorType(e.blkCode, false)).toBeUndefined();
      expect(decodeBlkArmorType(e.blkCode, true)).toBeUndefined();
    },
  );

  it('encodes Patchwork as T_ARMOR_PATCHWORK (7) and does not decode it', () => {
    expect(encodeBlkArmorType(ArmorTypeEnum.PATCHWORK)).toBe(7);
    expect(decodeBlkArmorType(7, false)).toBeUndefined();
  });

  it.each(ALL_NATIVE_ONLY)('%s serializes to its source tag', (type) => {
    const tag = (
      type === ArmorTypeEnum.PATCHWORK
        ? PATCHWORK_ARMOR
        : getArmorDefinition(type)
    )?.sourceTag;
    expect(ARMOR_TYPE[type]).toBe(tag);
  });
});

describe('names agree with the wire contract and the shared vocabulary', () => {
  const schema = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        'public/data/equipment/_schema/unit-schema.json',
      ),
      'utf8',
    ),
  ) as { $defs: { standardArmorType: { enum: string[] } } };
  const contractTags = new Set(schema.$defs.standardArmorType.enum);

  it.each(ALL_NATIVE_ONLY)('%s tag is a unit-contract armor.type', (type) => {
    const tag = (
      type === ArmorTypeEnum.PATCHWORK
        ? PATCHWORK_ARMOR
        : getArmorDefinition(type)
    )?.sourceTag as string;
    expect(contractTags.has(tag)).toBe(true);
  });

  it('agrees with the shared MTF vocabulary armor names once the vocabulary carries them', () => {
    // mtf-component-vocabulary.json has no `armor` section at this base (the
    // names are still in MTFVocabulary.ts ARMOR_NAMES and enum_mapping_tables.py
    // ARMOR_TYPE_MAP). When C3 adds one this compares it instead of passing blind.
    const armor = (vocabulary as { armor?: Record<string, string> }).armor;
    if (armor === undefined) return;
    const tagsInVocabulary = new Set(Object.values(armor));
    const nativeTags = new Set<string>(
      ALL_NATIVE_ONLY.map(
        (t) =>
          (t === ArmorTypeEnum.PATCHWORK
            ? PATCHWORK_ARMOR
            : getArmorDefinition(t)
          )?.sourceTag as string,
      ),
    );
    for (const tag of nativeTags) expect(tagsInVocabulary.has(tag)).toBe(true);
    for (const tag of tagsInVocabulary) {
      if (nativeTags.has(tag)) continue;
      // every other vocabulary armor tag must be an existing enum identity
      expect(Object.values(ARMOR_TYPE)).toContain(tag);
    }
  });
});
