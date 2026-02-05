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
] as const;

/**
 * Get armor definition by type
 */
export function getArmorDefinition(
  type: ArmorTypeEnum,
): ArmorDefinition | undefined {
  return ARMOR_DEFINITIONS.find((def) => def.type === type);
}
