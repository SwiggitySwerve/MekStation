/**
 * Armor Type Definitions
 *
 * Defines all standard BattleTech armor types.
 *
 * @spec openspec/specs/armor-system/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';

/**
 * Armor type enumeration
 */
export enum ArmorTypeEnum {
  STANDARD = 'Standard',
  FERRO_FIBROUS_IS = 'Ferro-Fibrous (IS)',
  FERRO_FIBROUS_CLAN = 'Ferro-Fibrous (Clan)',
  LIGHT_FERRO = 'Light Ferro-Fibrous',
  HEAVY_FERRO = 'Heavy Ferro-Fibrous',
  STEALTH = 'Stealth',
  REACTIVE = 'Reactive',
  REFLECTIVE = 'Reflective',
  HARDENED = 'Hardened',
  FERRO_LAMELLOR = 'Ferro-Lamellor',
  BALLISTIC_REINFORCED = 'Ballistic-Reinforced',
}

/**
 * Armor definition with all characteristics
 */
export interface ArmorDefinition {
  readonly type: ArmorTypeEnum;
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
}

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
    type: ArmorTypeEnum.LIGHT_FERRO,
    name: 'Light Ferro-Fibrous',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    pointsPerTon: 17.6,
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
    pointsPerTon: 24,
    criticalSlots: 21,
    costMultiplier: 2.0,
    introductionYear: 3069,
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
    pointsPerTon: 14,
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
] as const;

/**
 * Get armor definition by type
 */
export function getArmorDefinition(
  type: ArmorTypeEnum,
): ArmorDefinition | undefined {
  return ARMOR_DEFINITIONS.find((def) => def.type === type);
}

/**
 * Armor introduction dates MegaMek 48fcb2f6 uses in the intro-year check
 * (TestEntity.hasIncorrectIntroYear:1512-1552), per BLK armor code
 * (EquipmentType.T_ARMOR_*, EquipmentType.java:85-112) and armor variant.
 * TechAdvancement.getIntroductionDate:691-699 takes the prototype date, else
 * production; an approximate phase is 5 years earlier (:720-735, :95).
 * A side without a date is never flagged. Codes 1-3 have separate IS and
 * Clan armor types (ArmorType.of(code, isClan)); the rest are one type.
 */
const JAVA_ARMOR_INTRODUCTION: Readonly<
  Record<string, { readonly is?: number; readonly clan?: number }>
> = {
  '0': { is: 2455, clan: 2455 }, // Standard :372 (2460, approximate)
  '1': { is: 2557, clan: 2557 }, // IS Ferro-Fibrous :408-410
  '1:clan': { clan: 2815 }, // Clan Ferro-Fibrous :445 (2820, approximate)
  '2': { is: 3063 }, // IS Reactive :813
  '2:clan': { clan: 3065 }, // Clan Reactive :845
  '3': { is: 3058 }, // IS Reflective :878
  '3:clan': { clan: 3061 }, // Clan Reflective :911
  '4': { is: 3047, clan: 3061 }, // Hardened :939-941
  '5': { is: 3050 }, // Light Ferro-Fibrous :477 (3055, approximate)
  '6': { is: 3051 }, // Heavy Ferro-Fibrous :508 (3056, approximate)
  '8': { is: 3046 }, // Mek Stealth :977 (3051, approximate)
  '16': { clan: 3070 }, // Ferro-Lamellor :1038
  '22': { is: 3067 }, // Vehicular Stealth :1008 (production; no prototype)
  '26': { is: 3115 }, // Ballistic-Reinforced :1157 (3120, approximate)
};

/** Java armor names for the intro-year message (ArmorType.java `armor.name`). */
const JAVA_ARMOR_NAMES: Readonly<Record<string, string>> = {
  '0': 'Standard',
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
  const dates =
    JAVA_ARMOR_INTRODUCTION[clanArmor ? `${code}:clan` : `${code}`] ??
    JAVA_ARMOR_INTRODUCTION[`${code}`];
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
