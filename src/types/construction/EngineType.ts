/**
 * Engine Type Definitions
 *
 * Defines all standard BattleTech engine types with their characteristics.
 *
 * @spec openspec/specs/engine-system/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';

/**
 * Engine type enumeration
 */
export enum EngineType {
  STANDARD = 'Standard Fusion',
  XL_IS = 'XL Engine (IS)',
  XL_CLAN = 'XL Engine (Clan)',
  LIGHT = 'Light Engine',
  XXL = 'XXL Engine',
  COMPACT = 'Compact Engine',
  ICE = 'Internal Combustion',
  FUEL_CELL = 'Fuel Cell',
  FISSION = 'Fission',
}

/**
 * Engines only vehicles carry: MegaMek 48fcb2f6 Engine.NONE (8), STEAM (10)
 * and BATTERY (11) (Engine.java:100-103). Kept out of EngineType, which Mek
 * construction tables index exhaustively.
 */
export enum VehicleOnlyEngineType {
  NONE = 'None',
  STEAM = 'Steam',
  BATTERY = 'Battery',
}

/** Engine identity a vehicle can hold. */
export type VehicleEngineType = EngineType | VehicleOnlyEngineType;

/**
 * Engine definition with all characteristics
 */
export interface EngineDefinition {
  readonly type: EngineType;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** Weight multiplier compared to standard fusion (1.0 = standard) */
  readonly weightMultiplier: number;
  /** Slots required in center torso (base, before rating brackets) */
  readonly ctSlots: number;
  /** Slots required in each side torso (0 for CT-only engines) */
  readonly sideTorsoSlots: number;
  /** Can support fusion-powered equipment */
  readonly isFusion: boolean;
  /** Supports integral heat sinks */
  readonly supportsIntegralHeatSinks: boolean;
  /** Introduction year */
  readonly introductionYear: number;
}

/**
 * All engine type definitions
 */
export const ENGINE_DEFINITIONS: readonly EngineDefinition[] = [
  {
    type: EngineType.STANDARD,
    name: 'Standard Fusion',
    techBase: TechBase.INNER_SPHERE, // Available to both, but use IS as base
    rulesLevel: RulesLevel.INTRODUCTORY,
    weightMultiplier: 1.0,
    ctSlots: 6,
    sideTorsoSlots: 0,
    isFusion: true,
    supportsIntegralHeatSinks: true,
    introductionYear: 2020,
  },
  {
    type: EngineType.XL_IS,
    name: 'XL Engine (IS)',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weightMultiplier: 0.5,
    ctSlots: 6,
    sideTorsoSlots: 3,
    isFusion: true,
    supportsIntegralHeatSinks: true,
    introductionYear: 2579,
  },
  {
    type: EngineType.XL_CLAN,
    name: 'XL Engine (Clan)',
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weightMultiplier: 0.5,
    ctSlots: 6,
    sideTorsoSlots: 2,
    isFusion: true,
    supportsIntegralHeatSinks: true,
    introductionYear: 2824,
  },
  {
    type: EngineType.LIGHT,
    name: 'Light Engine',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weightMultiplier: 0.75,
    ctSlots: 6,
    sideTorsoSlots: 2,
    isFusion: true,
    supportsIntegralHeatSinks: true,
    introductionYear: 3062,
  },
  {
    type: EngineType.XXL,
    name: 'XXL Engine',
    techBase: TechBase.INNER_SPHERE, // Also available to Clan
    rulesLevel: RulesLevel.EXPERIMENTAL,
    // MegaMek 48fcb2f6 Engine.java divides by three before weight rounding.
    weightMultiplier: 1 / 3,
    ctSlots: 6,
    sideTorsoSlots: 3,
    isFusion: true,
    supportsIntegralHeatSinks: true,
    introductionYear: 3055,
  },
  {
    type: EngineType.COMPACT,
    name: 'Compact Engine',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightMultiplier: 1.5,
    ctSlots: 3,
    sideTorsoSlots: 0,
    isFusion: true,
    supportsIntegralHeatSinks: true,
    introductionYear: 3068,
  },
  {
    type: EngineType.ICE,
    name: 'Internal Combustion',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    weightMultiplier: 2.0,
    ctSlots: 6,
    sideTorsoSlots: 0,
    isFusion: false,
    supportsIntegralHeatSinks: false,
    introductionYear: 1950,
  },
  {
    type: EngineType.FUEL_CELL,
    name: 'Fuel Cell',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightMultiplier: 1.2,
    ctSlots: 6,
    sideTorsoSlots: 0,
    isFusion: false,
    supportsIntegralHeatSinks: false,
    introductionYear: 2470,
  },
  {
    type: EngineType.FISSION,
    name: 'Fission',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weightMultiplier: 1.75,
    ctSlots: 6,
    sideTorsoSlots: 0,
    isFusion: false,
    supportsIntegralHeatSinks: false,
    introductionYear: 2470,
  },
] as const;

/**
 * Get engine definition by type
 */
export function getEngineDefinition(
  type: EngineType,
): EngineDefinition | undefined {
  return ENGINE_DEFINITIONS.find((def) => def.type === type);
}

/**
 * Get all engine definitions for a tech base
 */
export function getEnginesForTechBase(techBase: TechBase): EngineDefinition[] {
  return ENGINE_DEFINITIONS.filter(
    (def) =>
      def.techBase === techBase || def.techBase === TechBase.INNER_SPHERE,
  );
}

interface JavaEngineDates {
  readonly is?: number;
  readonly clan?: number;
}
const both = (year: number): JavaEngineDates => ({ is: year, clan: year });

/**
 * Engine introduction dates MegaMek 48fcb2f6 uses in the intro-year check
 * (TestEntity.hasIncorrectIntroYear:1594-1607), per BLK engine identity
 * (blkEngineName, BLKFile.java:80-93) and Engine.getTechAdvancement's variant
 * (Engine.java:1016-1099): Clan flag, and Large for a rating above 400 (:259).
 * TechAdvancement.getIntroductionDate:691-699 takes the prototype date, else
 * production, five years earlier when approximate (:720-735); DATE_ES 2100 and
 * DATE_PS 1950 (ITechnology.java:54-55). Combat-vehicle engines only: support
 * engines (SUPPORT_VEE_ENGINE) are not here, and NONE has no engine (hasEngine).
 */
function javaEngineDates(
  blkName: string,
  clanEngine: boolean,
  large: boolean,
): JavaEngineDates | undefined {
  switch (blkName) {
    case 'ICE': // LARGE_ICE_TA :831 (production 2630); STANDARD_ICE_TA :824 (DATE_ES)
      return large ? both(2630) : both(2100);
    case 'FUSION': // LARGE_FUSION_TA :815; STANDARD_FUSION_TA :808 (DATE_ES)
      return large ? both(2630) : both(2100);
    case 'XL': // CLAN_XL_TA :876 (2824 approx), LARGE_CLAN_XL_TA :895 (2850 approx),
      // IS_XL_TA :867, LARGE_IS_XL_TA :885 (2635 approx)
      if (clanEngine) return large ? { clan: 2845 } : { clan: 2819 };
      return large ? { is: 2630 } : { is: 2556 };
    case 'XXL': // CLAN_XXL_TA :913, LARGE_CLAN_XXL_TA :931, IS_XXL_TA :904, LARGE_IS_XXL_TA :922
      if (clanEngine) return large ? { clan: 2630 } : { clan: 3030 };
      return large ? { is: 2630 } : { is: 3055 };
    case 'FUEL_CELL': // FUEL_CELL_TA :948 (2300 approx)
      return both(2295);
    case 'LIGHT': // LARGE_LIGHT_FUSION_TA :849 (3064 approx); LIGHT_FUSION_TA :840 (3055 approx)
      return large ? { is: 3059 } : { is: 3050 };
    case 'COMPACT': // COMPACT_FUSION_TA :858 (3060 approx)
      return { is: 3055 };
    case 'FISSION': // FISSION_TA :940
      return both(2470);
    case 'MAGLEV': // SUPPORT_MAGLEV_TA :999 (DATE_ES)
      return both(2100);
    case 'STEAM': // SUPPORT_STEAM_TA :957 (DATE_PS)
    case 'BATTERY': // SUPPORT_BATTERY_TA :969
    case 'SOLAR': // SUPPORT_SOLAR_TA :981
    case 'EXTERNAL': // SUPPORT_EXTERNAL_TA :1011 (common DATE_PS)
      return both(1950);
    default:
      return undefined;
  }
}

/** Engine.TYPE_KEYS:109-112 with messages.properties:196-215 names. */
const JAVA_ENGINE_NAMES: Readonly<Record<string, string>> = {
  ICE: ' ICE',
  FUSION: ' Fusion',
  XL: ' XL',
  XXL: ' XXL',
  FUEL_CELL: ' Fuel Cell',
  LIGHT: ' Light',
  COMPACT: ' Compact',
  FISSION: ' Fission',
  MAGLEV: ' MagLev',
  STEAM: ' Steam',
  BATTERY: ' Battery',
  SOLAR: ' Solar',
  EXTERNAL: ' External',
};

/**
 * The Java intro date and short name ("10 Fusion", Engine.getShortEngineName
 * :518-528) of a BLK engine, or undefined when it has no date for the unit's
 * side. A mixed-tech unit takes the earliest side (hasIncorrectIntroYear:1597-1599).
 */
export function javaEngineIntroduction(
  blkName: string,
  rating: number,
  clanEngine: boolean,
  clanUnit: boolean,
  mixed: boolean,
): { readonly name: string; readonly year: number } | undefined {
  const dates = javaEngineDates(blkName, clanEngine, rating > 400);
  const typeName = JAVA_ENGINE_NAMES[blkName];
  if (!dates || !typeName) return undefined;
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
  return year === undefined
    ? undefined
    : { name: `${rating}${typeName}`, year };
}
