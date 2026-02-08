/**
 * Internal Structure Type Definitions
 *
 * Defines all standard BattleTech internal structure types.
 *
 * @spec openspec/specs/internal-structure-system/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';

/**
 * Internal structure type enumeration
 */
export enum InternalStructureType {
  STANDARD = 'Standard',
  ENDO_STEEL_IS = 'Endo Steel (IS)',
  ENDO_STEEL_CLAN = 'Endo Steel (Clan)',
  ENDO_COMPOSITE = 'Endo-Composite',
  REINFORCED = 'Reinforced',
  COMPOSITE = 'Composite',
  INDUSTRIAL = 'Industrial',
}

/**
 * Internal structure definition with all characteristics
 */
export interface InternalStructureDefinition {
  readonly type: InternalStructureType;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** Weight as percentage of tonnage (0.10 = 10%) */
  readonly weightMultiplier: number;
  /** Critical slots required (distributed) */
  readonly criticalSlots: number;
  /** Structure point multiplier (1.0 = standard) */
  readonly structurePointMultiplier: number;
  /** Introduction year */
  readonly introductionYear: number;
}

/**
 * All internal structure definitions
 */
export const INTERNAL_STRUCTURE_DEFINITIONS: readonly InternalStructureDefinition[] =
  [
    {
      type: InternalStructureType.STANDARD,
      name: 'Standard',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.INTRODUCTORY,
      weightMultiplier: 0.1,
      criticalSlots: 0,
      structurePointMultiplier: 1.0,
      introductionYear: 2439,
    },
    {
      type: InternalStructureType.ENDO_STEEL_IS,
      name: 'Endo Steel (IS)',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.STANDARD,
      weightMultiplier: 0.05,
      criticalSlots: 14,
      structurePointMultiplier: 1.0,
      introductionYear: 2487,
    },
    {
      type: InternalStructureType.ENDO_STEEL_CLAN,
      name: 'Endo Steel (Clan)',
      techBase: TechBase.CLAN,
      rulesLevel: RulesLevel.STANDARD,
      weightMultiplier: 0.05,
      criticalSlots: 7,
      structurePointMultiplier: 1.0,
      introductionYear: 2827,
    },
    {
      type: InternalStructureType.ENDO_COMPOSITE,
      name: 'Endo-Composite',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.EXPERIMENTAL,
      weightMultiplier: 0.075,
      criticalSlots: 7,
      structurePointMultiplier: 1.0,
      introductionYear: 3067,
    },
    {
      type: InternalStructureType.REINFORCED,
      name: 'Reinforced',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.EXPERIMENTAL,
      weightMultiplier: 0.2,
      criticalSlots: 0,
      structurePointMultiplier: 2.0,
      introductionYear: 3057,
    },
    {
      type: InternalStructureType.COMPOSITE,
      name: 'Composite',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.EXPERIMENTAL,
      weightMultiplier: 0.05,
      criticalSlots: 0,
      structurePointMultiplier: 0.5,
      introductionYear: 3061,
    },
    {
      type: InternalStructureType.INDUSTRIAL,
      name: 'Industrial',
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.INTRODUCTORY,
      weightMultiplier: 0.2,
      criticalSlots: 0,
      structurePointMultiplier: 1.0,
      introductionYear: 2350,
    },
  ] as const;

/**
 * Get internal structure definition by type
 */
export function getInternalStructureDefinition(
  type: InternalStructureType,
): InternalStructureDefinition | undefined {
  return INTERNAL_STRUCTURE_DEFINITIONS.find((def) => def.type === type);
}

/**
 * Internal structure points by tonnage and location
 * Based on TechManual tables
 */
export const STRUCTURE_POINTS_TABLE: Record<number, Record<string, number>> = {
  10: { head: 3, centerTorso: 4, sideTorso: 3, arm: 1, leg: 2 },
  15: { head: 3, centerTorso: 5, sideTorso: 4, arm: 2, leg: 3 },
  20: { head: 3, centerTorso: 6, sideTorso: 5, arm: 3, leg: 4 },
  25: { head: 3, centerTorso: 8, sideTorso: 6, arm: 4, leg: 6 },
  30: { head: 3, centerTorso: 10, sideTorso: 7, arm: 5, leg: 7 },
  35: { head: 3, centerTorso: 11, sideTorso: 8, arm: 6, leg: 8 },
  40: { head: 3, centerTorso: 12, sideTorso: 10, arm: 6, leg: 10 },
  45: { head: 3, centerTorso: 14, sideTorso: 11, arm: 7, leg: 11 },
  50: { head: 3, centerTorso: 16, sideTorso: 12, arm: 8, leg: 12 },
  55: { head: 3, centerTorso: 18, sideTorso: 13, arm: 9, leg: 13 },
  60: { head: 3, centerTorso: 20, sideTorso: 14, arm: 10, leg: 14 },
  65: { head: 3, centerTorso: 21, sideTorso: 15, arm: 10, leg: 15 },
  70: { head: 3, centerTorso: 22, sideTorso: 15, arm: 11, leg: 15 },
  75: { head: 3, centerTorso: 23, sideTorso: 16, arm: 12, leg: 16 },
  80: { head: 3, centerTorso: 25, sideTorso: 17, arm: 13, leg: 17 },
  85: { head: 3, centerTorso: 27, sideTorso: 18, arm: 14, leg: 18 },
  90: { head: 3, centerTorso: 29, sideTorso: 19, arm: 15, leg: 19 },
  95: { head: 3, centerTorso: 30, sideTorso: 20, arm: 16, leg: 20 },
  100: { head: 3, centerTorso: 31, sideTorso: 21, arm: 17, leg: 21 },
};

/**
 * Get structure points for a location
 *
 * @param tonnage - Unit tonnage
 * @param location - Location name
 * @returns Structure points
 */
export function getStructurePoints(tonnage: number, location: string): number {
  const table = STRUCTURE_POINTS_TABLE[tonnage];
  if (!table) {
    return 0;
  }

  const normalizedLocation = location.toLowerCase().replace(/\s+/g, '');

  if (normalizedLocation.includes('head')) return table.head;
  if (normalizedLocation.includes('centertorso')) return table.centerTorso;
  if (normalizedLocation.includes('torso')) return table.sideTorso;
  if (normalizedLocation.includes('arm')) return table.arm;
  if (normalizedLocation.includes('leg')) return table.leg;

  return 0;
}
