/**
 * Clan Reactive and Clan Reflective armor: the enum members and definitions.
 *
 * Types only. Both members are flagged nativeOnly: the loader still folds the
 * tags REACTIVE_CLAN and REFLECTIVE_CLAN into Standard (componentMappers), the
 * editor lists do not offer them, and the BLK reader keeps decoding codes 2 and
 * 3 to the Inner Sphere members. Mapping them is the identity fix that follows.
 *
 * Constants: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587.
 *   A = megamek/src/megamek/common/equipment/ArmorType.java
 *   M = megamek/src/megamek/common/equipment/MiscType.java
 *   B = megamek/src/megamek/common/battleValue/BVCalculator.java
 *   E = megamek/src/megamek/common/equipment/EquipmentType.java
 */
import {
  decodeBlkArmorType,
  encodeBlkArmorType,
} from '@/services/conversion/BlkArmorCodes';
import { mapArmorType } from '@/services/units/unitLoaderService/componentMappers';
import { getNativeArmorBVMultiplier } from '@/utils/construction/battleValueDefensive';
import { ARMOR_TYPE } from '@/utils/serialization/CustomUnitSerializer.tags';

import { mapArmorType as bvArmorKey } from '../../../../scripts/validate-bv-unit-derived';
import { RulesLevel } from '../../enums/RulesLevel';
import { TechBase } from '../../enums/TechBase';
import { getArmorBVMultiplier } from '../../validation/BattleValue';
import {
  ARMOR_DEFINITIONS,
  ArmorTypeEnum,
  NATIVE_ONLY_ARMOR_SOURCE_TAGS,
  getArmorDefinition,
  getNativeArmorType,
  isNativeOnlyArmor,
  javaArmorIntroduction,
} from '../ArmorType';

interface ClanExpected {
  readonly type: ArmorTypeEnum;
  readonly isType: ArmorTypeEnum;
  readonly name: string;
  readonly tag: string;
  /** Ordinary Mek critical slots for Clan armor on a standard-size Mek. */
  readonly criticalSlots: number;
  /** The same armor on an Inner Sphere unit, for the "fewer for Clan" check. */
  readonly isCriticalSlots: number;
  /** TechAdvancement.getIntroductionDate(clan): the Clan prototype date. */
  readonly introductionYear: number;
  /** EquipmentType.T_ARMOR_* shared by the IS and Clan armor. */
  readonly code: number;
}

const CLAN: readonly ClanExpected[] = [
  {
    // A:822-851: name "Reactive" :825, internal "Clan Reactive" :826, cost 30000 :829,
    // variable slots :830 -> 7 (M:1104-1109; 4 if superheavy :1106-1107; the same
    // branch gives IS 14, :1132), Clan tech rating F, Clan prototype 3065 not
    // approximate :843-846, static Advanced :847, T_ARMOR_REACTIVE :849.
    type: ArmorTypeEnum.REACTIVE_CLAN,
    isType: ArmorTypeEnum.REACTIVE,
    name: 'Reactive (Clan)',
    tag: 'REACTIVE_CLAN',
    criticalSlots: 7,
    isCriticalSlots: 14,
    introductionYear: 3065,
    code: 2, // E:87
  },
  {
    // A:887-917: name "Reflective" :890, internal "Clan Reflective" :891, cost 30000 :894,
    // variable slots :895 -> 5 (M:1135-1140; 3 if superheavy :1137-1138; IS 10 :1162),
    // Clan prototype 3061 not approximate :909-912, static Advanced :913,
    // T_ARMOR_REFLECTIVE :915.
    type: ArmorTypeEnum.REFLECTIVE_CLAN,
    isType: ArmorTypeEnum.REFLECTIVE,
    name: 'Reflective (Clan)',
    tag: 'REFLECTIVE_CLAN',
    criticalSlots: 5,
    isCriticalSlots: 10,
    introductionYear: 3061,
    code: 3, // E:88
  },
];

describe('Clan Reactive and Reflective constants (pinned 48fcb2f64)', () => {
  it.each(CLAN)('$name matches the pinned constants', (e) => {
    const def = getArmorDefinition(e.type);
    expect(def).toBeDefined();
    expect(def?.name).toBe(e.name);
    expect(def?.sourceTag).toBe(e.tag);
    expect(def?.techBase).toBe(TechBase.CLAN); // A:843, :909
    expect(def?.rulesLevel).toBe(RulesLevel.ADVANCED); // static Advanced, A:847, :913
    expect(def?.pointsPerTon).toBe(16); // no pptMultiplier is set: A:61,302
    expect(def?.criticalSlots).toBe(e.criticalSlots);
    expect(def?.costMultiplier).toBe(3); // cost 30000 over Standard's 10000: A:829, :894, :369
    expect(def?.introductionYear).toBe(e.introductionYear);
    expect(def?.isSpecial).toBe(true);
    expect(def?.nativeOnly).toBe(true);
  });

  it.each(CLAN)(
    '$name takes fewer critical slots than the Inner Sphere armor',
    (e) => {
      const isDef = getArmorDefinition(e.isType);
      expect(isDef?.criticalSlots).toBe(e.isCriticalSlots);
      expect(getArmorDefinition(e.type)!.criticalSlots).toBeLessThan(
        e.isCriticalSlots,
      );
      // Everything else the Inner Sphere definition says that Java also says for Clan:
      expect(getArmorDefinition(e.type)?.pointsPerTon).toBe(
        isDef?.pointsPerTon,
      );
      expect(getArmorDefinition(e.type)?.costMultiplier).toBe(
        isDef?.costMultiplier,
      );
    },
  );

  it.each(CLAN)(
    '$name intro year is the Clan prototype date the existing Java table already records',
    (e) => {
      expect(javaArmorIntroduction(e.code, true, true, false)?.year).toBe(
        e.introductionYear,
      );
    },
  );

  it('keeps each definition in the table exactly once', () => {
    for (const e of CLAN) {
      expect(ARMOR_DEFINITIONS.filter((d) => d.type === e.type)).toHaveLength(
        1,
      );
    }
  });

  it.each(CLAN)(
    "$name BV multiplier is the existing BV owner's, equal to the IS armor (B:1492-1494)",
    (e) => {
      expect(getNativeArmorBVMultiplier(e.code)).toBe(1.5);
      expect(getArmorBVMultiplier(bvArmorKey(e.tag))).toBe(1.5);
      expect(getArmorBVMultiplier(bvArmorKey(ARMOR_TYPE[e.isType]))).toBe(1.5);
    },
  );
});

describe('Clan Reactive and Reflective can be named and nothing uses them (behaviour unchanged)', () => {
  it.each(CLAN)(
    '$name is flagged native-only and registered with its tag',
    (e) => {
      expect(isNativeOnlyArmor(e.type)).toBe(true);
      expect(
        NATIVE_ONLY_ARMOR_SOURCE_TAGS[
          e.type as keyof typeof NATIVE_ONLY_ARMOR_SOURCE_TAGS
        ],
      ).toBe(e.tag);
      expect(ARMOR_TYPE[e.type]).toBe(e.tag);
    },
  );

  it.each(CLAN)(
    '$name is not resolved from its tag: the loader still gives Standard',
    (e) => {
      expect(getNativeArmorType(e.tag)).toBeUndefined();
      expect(mapArmorType(e.tag, TechBase.INNER_SPHERE)).toBe(
        ArmorTypeEnum.STANDARD,
      );
      expect(mapArmorType(e.tag, TechBase.CLAN)).toBe(ArmorTypeEnum.STANDARD);
    },
  );

  it.each(CLAN)(
    '$name encodes to the shared BLK code and the reader still decodes that code to the Inner Sphere member',
    (e) => {
      expect(encodeBlkArmorType(e.type)).toBe(e.code);
      expect(decodeBlkArmorType(e.code, false)).toBe(e.isType);
      expect(decodeBlkArmorType(e.code, true)).toBe(e.isType);
    },
  );

  it("leaves the Inner Sphere members and every existing type's tag untouched", () => {
    expect(ARMOR_TYPE[ArmorTypeEnum.REACTIVE]).toBe('REACTIVE');
    expect(ARMOR_TYPE[ArmorTypeEnum.REFLECTIVE]).toBe('REFLECTIVE');
    expect(isNativeOnlyArmor(ArmorTypeEnum.REACTIVE)).toBe(false);
    expect(isNativeOnlyArmor(ArmorTypeEnum.REFLECTIVE)).toBe(false);
  });
});
