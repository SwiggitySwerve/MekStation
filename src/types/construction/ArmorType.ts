/**
 * Armor Type Definitions
 *
 * Defines all standard BattleTech armor types.
 *
 * @spec openspec/specs/armor-system/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';

// 48fcb2f64 ArmorType.java:487-510: prototype 3056, approximate by five years.
const HEAVY_FERRO_INTRODUCTION_YEAR = 3051;

/**
 * Armor type enumeration
 */
export enum ArmorTypeEnum {
  STANDARD = 'Standard',
  FERRO_FIBROUS_IS = 'Ferro-Fibrous (IS)',
  FERRO_FIBROUS_CLAN = 'Ferro-Fibrous (Clan)',
  FERRO_FIBROUS_PROTO = 'Ferro-Fibrous Prototype',
  LIGHT_FERRO = 'Light Ferro-Fibrous',
  HEAVY_FERRO = 'Heavy Ferro-Fibrous',
  STEALTH = 'Stealth',
  REACTIVE = 'Reactive',
  REFLECTIVE = 'Reflective',
  HARDENED = 'Hardened',
  FERRO_LAMELLOR = 'Ferro-Lamellor',
  BALLISTIC_REINFORCED = 'Ballistic-Reinforced',
  COMMERCIAL = 'Commercial',
  // Native-only identities (see NATIVE_ONLY_ARMOR_SOURCE_TAGS): the enum can
  // name them; the loader, serializer and editor do not use them yet.
  INDUSTRIAL = 'Industrial',
  HEAVY_INDUSTRIAL = 'Heavy Industrial',
  PRIMITIVE = 'Primitive',
  IMPACT_RESISTANT = 'Impact-Resistant',
  HEAT_DISSIPATING = 'Heat-Dissipating',
  ANTI_PENETRATIVE_ABLATION = 'Anti-Penetrative Ablation',
  PATCHWORK = 'Patchwork',
}

export const COMMERCIAL_ARMOR_SOURCE_TAG = 'COMMERCIAL';
export const FERRO_FIBROUS_PROTO_SOURCE_TAG = 'FERRO_FIBROUS_PROTO';

/**
 * Armor types that exist only as a name. The unit contract carries these tags
 * (`armor.type`), but `componentMappers.mapArmorType` still folds them into
 * Standard, the editor offers none of them, and the BLK reader does not decode
 * them. Whoever teaches the loader and serializer about one removes it here.
 */
export const NATIVE_ONLY_ARMOR_SOURCE_TAGS = {
  [ArmorTypeEnum.INDUSTRIAL]: 'INDUSTRIAL',
  [ArmorTypeEnum.HEAVY_INDUSTRIAL]: 'HEAVY_INDUSTRIAL',
  [ArmorTypeEnum.PRIMITIVE]: 'PRIMITIVE',
  [ArmorTypeEnum.IMPACT_RESISTANT]: 'IMPACT_RESISTANT',
  [ArmorTypeEnum.HEAT_DISSIPATING]: 'HEAT_DISSIPATING',
  [ArmorTypeEnum.ANTI_PENETRATIVE_ABLATION]: 'ANTI_PENETRATIVE_ABLATION',
  [ArmorTypeEnum.PATCHWORK]: 'PATCHWORK',
} as const;

export function isNativeOnlyArmor(type: ArmorTypeEnum): boolean {
  return type in NATIVE_ONLY_ARMOR_SOURCE_TAGS;
}

/**
 * Armor definition with all characteristics
 */
export interface ArmorDefinition {
  readonly type: ArmorTypeEnum;
  /** Native tag for identities absent from legacy mapper aliases. */
  readonly sourceTag?: string;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** Points per ton */
  readonly pointsPerTon: number;
  /** Critical slots required (distributed) */
  readonly criticalSlots: number;
  /** Cost multiplier */
  readonly costMultiplier: number;
  /** Introduction year */
  readonly introductionYear: number;
  /** Special properties */
  readonly isSpecial: boolean;
  /**
   * The type can be named but is not selectable, mapped from a source tag or
   * decoded from BLK yet (NATIVE_ONLY_ARMOR_SOURCE_TAGS).
   */
  readonly nativeOnly?: true;
}

/**
 * Patchwork armor: every location carries its own armor type, so there is no
 * single points-per-ton, slot count or cost. Each location uses the constants
 * and BV multiplier of its own type (BVCalculator.java:359-420 and 1489-1509).
 * It is deliberately absent from ARMOR_DEFINITIONS; getArmorDefinition returns
 * undefined for it.
 */
export interface PerLocationArmorDefinition {
  readonly type: ArmorTypeEnum;
  readonly sourceTag: string;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly introductionYear: number;
  readonly perLocation: true;
  readonly nativeOnly: true;
}

/** MegaMek 48fcb2f64 ArmorType.java:2066-2083 (createPatchworkArmor). */
export const PATCHWORK_ARMOR: PerLocationArmorDefinition = {
  type: ArmorTypeEnum.PATCHWORK,
  sourceTag: NATIVE_ONLY_ARMOR_SOURCE_TAGS[ArmorTypeEnum.PATCHWORK],
  name: 'Patchwork',
  // TechBase.ALL (:2074); the table has no "both", so the IS side like Standard.
  techBase: TechBase.INNER_SPHERE,
  // setStaticTechLevel(ADVANCED) :2079.
  rulesLevel: RulesLevel.ADVANCED,
  // Prototype DATE_PS = 1950 (:2075; ITechnology.java:54), not approximate (:2076).
  introductionYear: 1950,
  perLocation: true,
  nativeOnly: true,
};

/**
 * All armor definitions
 */
export const ARMOR_DEFINITIONS: readonly ArmorDefinition[] = [
  {
    type: ArmorTypeEnum.STANDARD,
    name: 'Standard',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    pointsPerTon: 16,
    criticalSlots: 0,
    costMultiplier: 1.0,
    introductionYear: 2439,
    isSpecial: false,
  },
  {
    type: ArmorTypeEnum.FERRO_FIBROUS_IS,
    name: 'Ferro-Fibrous (IS)',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    pointsPerTon: 17.92,
    criticalSlots: 14,
    costMultiplier: 1.5,
    introductionYear: 2571,
    isSpecial: false,
  },
  {
    type: ArmorTypeEnum.FERRO_FIBROUS_CLAN,
    name: 'Ferro-Fibrous (Clan)',
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    pointsPerTon: 19.2,
    criticalSlots: 7,
    costMultiplier: 1.5,
    introductionYear: 2828,
    isSpecial: false,
  },
  {
    // MegaMek 48fcb2f64 ArmorType.java:518-540; EquipmentType.java:94 (code 9).
    type: ArmorTypeEnum.FERRO_FIBROUS_PROTO,
    sourceTag: FERRO_FIBROUS_PROTO_SOURCE_TAG,
    name: 'Ferro-Fibrous Prototype',
    // ArmorType.java:533; no production date (:535), IO rules (:532), so
    // TechAdvancement.java:982-989 resolves the static level to Experimental.
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    // ArmorType.java:61,301-302,540: 16 * 1.12 points per ton.
    pointsPerTon: 17.92,
    // ArmorType.java:525,530 delegates to MiscType.java:1224-1229 (ordinary Mek).
    criticalSlots: 16,
    // ArmorType.java:524,369: 60000 / Standard's 10000; no cost-formula claim.
    costMultiplier: 6,
    // ArmorType.java:535-536; TechAdvancement.java:720-735: 2557 approximate.
    introductionYear: 2552,
    isSpecial: false,
  },
  {
    type: ArmorTypeEnum.LIGHT_FERRO,
    name: 'Light Ferro-Fibrous',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    // MegaMek 48fcb2f6 ArmorType.java:61,301-302,481-482: 16 * 1.06.
    pointsPerTon: 16.96,
    criticalSlots: 7,
    costMultiplier: 1.25,
    introductionYear: 3067,
    isSpecial: false,
  },
  {
    type: ArmorTypeEnum.HEAVY_FERRO,
    name: 'Heavy Ferro-Fibrous',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    // MegaMek 48fcb2f6 ArmorType.java:61,301-302,512-513: 16 * 1.24.
    pointsPerTon: 19.84,
    criticalSlots: 21,
    costMultiplier: 2.0,
    introductionYear: HEAVY_FERRO_INTRODUCTION_YEAR,
    isSpecial: false,
  },
  {
    type: ArmorTypeEnum.STEALTH,
    name: 'Stealth',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 16,
    criticalSlots: 12,
    costMultiplier: 2.5,
    introductionYear: 3063,
    isSpecial: true,
  },
  {
    type: ArmorTypeEnum.REACTIVE,
    name: 'Reactive',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    // ArmorType.java:61,226,301-302,788-826 at 48fcb2f6: default multiplier 1.
    pointsPerTon: 16,
    criticalSlots: 14,
    costMultiplier: 3.0,
    introductionYear: 3063,
    isSpecial: true,
  },
  {
    type: ArmorTypeEnum.REFLECTIVE,
    name: 'Reflective',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    pointsPerTon: 16,
    criticalSlots: 10,
    costMultiplier: 3.0,
    introductionYear: 3058,
    isSpecial: true,
  },
  {
    type: ArmorTypeEnum.HARDENED,
    name: 'Hardened',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    pointsPerTon: 8,
    criticalSlots: 0,
    costMultiplier: 2.5,
    introductionYear: 3047,
    isSpecial: true,
  },
  {
    // MegaMek ArmorType.java:1017-1046: 16 x 0.875 points per ton, Advanced.
    type: ArmorTypeEnum.FERRO_LAMELLOR,
    name: 'Ferro-Lamellor',
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 14,
    criticalSlots: 12,
    costMultiplier: 3.5,
    introductionYear: 3070,
    isSpecial: true,
  },
  {
    // MegaMek ArmorType.java:1136-1166: 16 x 0.75 points per ton, Advanced;
    // 10 Mek slots (MiscType.java:1250-1255).
    type: ArmorTypeEnum.BALLISTIC_REINFORCED,
    name: 'Ballistic-Reinforced',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 12,
    criticalSlots: 10,
    costMultiplier: 2.5,
    introductionYear: 3120,
    isSpecial: true,
  },
  {
    // 48fcb2f64 ArmorType.java:669-688: 16 * 1.5 points/t; 2290 approximate.
    type: ArmorTypeEnum.COMMERCIAL,
    sourceTag: COMMERCIAL_ARMOR_SOURCE_TAG,
    name: 'Commercial',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    pointsPerTon: 24,
    criticalSlots: 0,
    costMultiplier: 0.3,
    introductionYear: 2285,
    isSpecial: false,
  },
  // Native-only types (nativeOnly). MegaMek 48fcb2f64 ArmorType.java. Points per
  // ton is 16 * pptMultiplier (:61,302); criticalSlots is MiscType.java
  // getNumCriticalSlots (:1071-1073 returns the field unless variable, then
  // :1244-1255); cost multiplier is `cost` over Standard's 10000 (:369);
  // introductionYear is TechAdvancement.getIntroductionDate (:691-699), the
  // prototype date else production, minus 5 when approximate (:95); TechBase.ALL
  // sits on the IS side like Standard. Rules level is the static level where
  // set, else guessStaticTechLevel (EquipmentType.java:355-360,
  // TechAdvancement.java:982-989). BV multipliers stay with their one owner
  // (types/validation/BattleValue.ts ARMOR_BV_MULTIPLIERS; BVCalculator.java:1489-1509).
  {
    // :694-721. Cost :706, multiplier 0.67 :718, TM rules ref :710 (Standard by
    // the guess), TechBase.ALL :711, prototype 2430 approximate :713-714.
    type: ArmorTypeEnum.INDUSTRIAL,
    sourceTag: NATIVE_ONLY_ARMOR_SOURCE_TAGS[ArmorTypeEnum.INDUSTRIAL],
    name: 'Industrial',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    pointsPerTon: 10.72,
    criticalSlots: 0,
    costMultiplier: 0.5,
    introductionYear: 2425,
    isSpecial: false,
    nativeOnly: true,
  },
  {
    // :723-742. Cost :729, multiplier left at 1.0, TM rules ref :732,
    // TechBase.ALL :733, prototype 2460 not approximate :735-736.
    type: ArmorTypeEnum.HEAVY_INDUSTRIAL,
    sourceTag: NATIVE_ONLY_ARMOR_SOURCE_TAGS[ArmorTypeEnum.HEAVY_INDUSTRIAL],
    name: 'Heavy Industrial',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    pointsPerTon: 16,
    criticalSlots: 0,
    costMultiplier: 1,
    introductionYear: 2460,
    isSpecial: false,
    nativeOnly: true,
  },
  {
    // :744-764. Cost :749, multiplier 0.67 :761, IO:AE rules ref :752 with a
    // production date (Advanced by the guess), IS only :753, prototype
    // DATE_ES = 2100 :755 (ITechnology.java:55), not approximate :756.
    type: ArmorTypeEnum.PRIMITIVE,
    sourceTag: NATIVE_ONLY_ARMOR_SOURCE_TAGS[ArmorTypeEnum.PRIMITIVE],
    name: 'Primitive',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 10.72,
    criticalSlots: 0,
    costMultiplier: 0.5,
    introductionYear: 2100,
    isSpecial: false,
    nativeOnly: true,
  },
  {
    // :1078-1103. Cost :1083, variable slots :1084 = 10 (MiscType.java:1250-1251),
    // multiplier 0.875 :1100, static Advanced :1097, IS prototype 3090
    // approximate :1094-1095.
    type: ArmorTypeEnum.IMPACT_RESISTANT,
    sourceTag: NATIVE_ONLY_ARMOR_SOURCE_TAGS[ArmorTypeEnum.IMPACT_RESISTANT],
    name: 'Impact-Resistant',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 14,
    criticalSlots: 10,
    costMultiplier: 2,
    introductionYear: 3085,
    isSpecial: true,
    nativeOnly: true,
  },
  {
    // :1048-1076. Cost :1054, variable slots :1055 = 6 (MiscType.java:1244-1245),
    // multiplier 0.625 :1073, static Advanced :1070, TechBase.ALL :1063, IS
    // prototype 3115 approximate :1065-1066. BV x1.1 (BVCalculator.java:1496).
    type: ArmorTypeEnum.HEAT_DISSIPATING,
    sourceTag: NATIVE_ONLY_ARMOR_SOURCE_TAGS[ArmorTypeEnum.HEAT_DISSIPATING],
    name: 'Heat-Dissipating',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 10,
    criticalSlots: 6,
    costMultiplier: 2.5,
    introductionYear: 3110,
    isSpecial: true,
    nativeOnly: true,
  },
  {
    // :1105-1134. Cost :1110, variable slots :1111 = 6 (MiscType.java:1244-1245),
    // multiplier 0.75 :1131, static Advanced :1128, IS prototype 3100
    // approximate :1125-1126. BV x1.2 (BVCalculator.java:1495).
    type: ArmorTypeEnum.ANTI_PENETRATIVE_ABLATION,
    sourceTag:
      NATIVE_ONLY_ARMOR_SOURCE_TAGS[ArmorTypeEnum.ANTI_PENETRATIVE_ABLATION],
    name: 'Anti-Penetrative Ablation',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    pointsPerTon: 12,
    criticalSlots: 6,
    costMultiplier: 1.5,
    introductionYear: 3095,
    isSpecial: true,
    nativeOnly: true,
  },
] as const;

/**
 * Shared native identity; legacy exact and fuzzy mappings retain precedence.
 * Native-only types are not resolved here, so the loader keeps its Standard
 * fallback for them.
 */
export function getNativeArmorType(source: string): ArmorTypeEnum | undefined {
  const normalized = source.trim().toUpperCase();
  return ARMOR_DEFINITIONS.find(
    (definition) =>
      !definition.nativeOnly && definition.sourceTag === normalized,
  )?.type;
}

/**
 * Get armor definition by type
 */
export function getArmorDefinition(
  type: ArmorTypeEnum,
): ArmorDefinition | undefined {
  return ARMOR_DEFINITIONS.find((def) => def.type === type);
}

/** Compatibility policy in the owner table; loader half-ton rounding stays local. */
export function getLoaderArmorPointsPerTon(type: ArmorTypeEnum): number {
  const armor = getArmorDefinition(type);
  return armor?.pointsPerTon ?? 16;
}

/**
 * Armor introduction dates MegaMek 48fcb2f6 uses in the intro-year check
 * (TestEntity.hasIncorrectIntroYear:1512-1552), per BLK armor code
 * (EquipmentType.T_ARMOR_*, EquipmentType.java:85-112) and armor variant.
 * TechAdvancement.getIntroductionDate:691-699 takes the prototype date, else
 * production; an approximate phase is 5 years earlier (:720-735, :95).
 * A side without a date is never flagged. Java looks the armor up by
 * "IS <name>" or "Clan <name>" (EquipmentType.getArmorTypeName:1086-1089) and
 * skips a name no armor registers (hasIncorrectIntroYear:1534-1537): only the
 * variants below resolve. Standard ("IS Standard") never does (:358-362).
 */
const JAVA_ARMOR_INTRODUCTION: Readonly<
  Record<string, { readonly is?: number; readonly clan?: number }>
> = {
  '1': { is: 2557, clan: 2557 }, // IS Ferro-Fibrous :408-410
  '1:clan': { clan: 2815 }, // Clan Ferro-Fibrous :445 (2820, approximate)
  '2': { is: 3063 }, // IS Reactive :813
  '2:clan': { clan: 3065 }, // Clan Reactive :845
  '3': { is: 3058 }, // IS Reflective :878
  '3:clan': { clan: 3061 }, // Clan Reflective :911
  '4': { is: 3047, clan: 3061 }, // IS Hardened :939-941
  '4:clan': { is: 3047, clan: 3061 }, // "Clan Hardened" lookup, same type
  '5': { is: 3050 }, // Light Ferro-Fibrous :477 (3055, approximate)
  '6': { is: HEAVY_FERRO_INTRODUCTION_YEAR },
  '8': { is: 3046 }, // Mek Stealth :977 (3051, approximate)
  '16:clan': { clan: 3070 }, // Clan Ferro-Lamellor :1038
  '22': { is: 3067 }, // Vehicular Stealth :1008 (production; no prototype)
  '26': { is: 3115 }, // Ballistic-Reinforced :1157 (3120, approximate)
};

/** Java armor names for the intro-year message (ArmorType.java `armor.name`). */
const JAVA_ARMOR_NAMES: Readonly<Record<string, string>> = {
  '1': 'Ferro-Fibrous',
  '2': 'Reactive',
  '3': 'Reflective',
  '4': 'Hardened',
  '5': 'Light Ferro-Fibrous',
  '6': 'Heavy Ferro-Fibrous',
  '8': 'Stealth',
  '16': 'Ferro-Lamellor',
  '22': 'Vehicular Stealth',
  '26': 'Ballistic-Reinforced',
};

/**
 * The Java intro date and name of a BLK armor code, or undefined when the code
 * or the unit's tech side has no date. `clanArmor` picks the armor variant;
 * the date side follows the unit, and a mixed-tech unit takes the earliest
 * side (TestEntity.hasIncorrectIntroYear:1543-1546).
 */
export function javaArmorIntroduction(
  code: number,
  clanArmor: boolean,
  clanUnit: boolean,
  mixed: boolean,
): { readonly name: string; readonly year: number } | undefined {
  const dates = JAVA_ARMOR_INTRODUCTION[clanArmor ? `${code}:clan` : `${code}`];
  const name = JAVA_ARMOR_NAMES[`${code}`];
  if (!dates || !name) return undefined;
  const sides = [dates.is, dates.clan].filter(
    (year): year is number => year !== undefined,
  );
  const year = mixed
    ? sides.length > 0
      ? Math.min(...sides)
      : undefined
    : clanUnit
      ? dates.clan
      : dates.is;
  return year === undefined ? undefined : { name, year };
}
