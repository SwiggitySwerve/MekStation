/**
 * Heat Sink Type Definitions
 *
 * Defines all standard BattleTech heat sink types.
 *
 * @spec openspec/specs/heat-sink-system/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';

/**
 * Heat sink type enumeration
 */
export enum HeatSinkType {
  SINGLE = 'Single',
  DOUBLE_IS = 'Double (IS)',
  DOUBLE_CLAN = 'Double (Clan)',
  COMPACT = 'Compact',
  LASER = 'Laser',
}

/**
 * Heat sink definition with all characteristics
 */
export interface HeatSinkDefinition {
  readonly type: HeatSinkType;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** Heat dissipated per heat sink */
  readonly dissipation: number;
  /** Weight per heat sink in tons */
  readonly weight: number;
  /** Critical slots per heat sink (external) */
  readonly criticalSlots: number;
  /** Slots when engine-integrated */
  readonly integratedSlots: number;
  /** Introduction year */
  readonly introductionYear: number;
}

/**
 * All heat sink definitions
 */
export const HEAT_SINK_DEFINITIONS: readonly HeatSinkDefinition[] = [
  {
    type: HeatSinkType.SINGLE,
    name: 'Single Heat Sink',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    dissipation: 1,
    weight: 1.0,
    criticalSlots: 1,
    integratedSlots: 0,
    introductionYear: 2022,
  },
  {
    type: HeatSinkType.DOUBLE_IS,
    name: 'Double Heat Sink (IS)',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    dissipation: 2,
    weight: 1.0,
    criticalSlots: 3,
    integratedSlots: 0,
    introductionYear: 2567,
  },
  {
    type: HeatSinkType.DOUBLE_CLAN,
    name: 'Double Heat Sink (Clan)',
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    dissipation: 2,
    weight: 1.0,
    criticalSlots: 2,
    integratedSlots: 0,
    introductionYear: 2828,
  },
  {
    type: HeatSinkType.COMPACT,
    name: 'Compact Heat Sink',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    dissipation: 1,
    weight: 1.5,
    criticalSlots: 1,
    integratedSlots: 0,
    introductionYear: 3068,
  },
  {
    type: HeatSinkType.LASER,
    name: 'Laser Heat Sink',
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    dissipation: 2,
    weight: 1.0,
    criticalSlots: 2,
    integratedSlots: 0,
    introductionYear: 3079,
  },
] as const;

/**
 * Get heat sink definition by type
 */
export function getHeatSinkDefinition(
  type: HeatSinkType,
): HeatSinkDefinition | undefined {
  return HEAT_SINK_DEFINITIONS.find((def) => def.type === type);
}
