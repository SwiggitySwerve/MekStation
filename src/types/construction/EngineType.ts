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
    weightMultiplier: 0.33,
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
