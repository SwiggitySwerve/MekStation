/**
 * Cockpit Type Definitions
 *
 * Defines all standard BattleTech cockpit types.
 *
 * @spec openspec/specs/cockpit-system/spec.md
 */

import { RulesLevel } from '../enums/RulesLevel';
import { TechBase } from '../enums/TechBase';

/**
 * Cockpit type enumeration
 */
export enum CockpitType {
  STANDARD = 'Standard',
  SMALL = 'Small',
  COMMAND_CONSOLE = 'Command Console',
  TORSO_MOUNTED = 'Torso-Mounted',
  PRIMITIVE = 'Primitive',
  INDUSTRIAL = 'Industrial',
  SUPER_HEAVY = 'Superheavy',
}

/**
 * Cockpit definition with all characteristics
 */
export interface CockpitDefinition {
  readonly type: CockpitType;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  /** Weight in tons */
  readonly weight: number;
  /** Critical slots in head */
  readonly headSlots: number;
  /** Critical slots elsewhere (for torso-mounted) */
  readonly otherSlots: number;
  /** Introduction year */
  readonly introductionYear: number;
}

/**
 * All cockpit definitions
 */
export const COCKPIT_DEFINITIONS: readonly CockpitDefinition[] = [
  {
    type: CockpitType.STANDARD,
    name: 'Standard Cockpit',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    weight: 3,
    headSlots: 5, // life support (2), sensors (2), cockpit (1)
    otherSlots: 0,
    introductionYear: 2439,
  },
  {
    type: CockpitType.SMALL,
    name: 'Small Cockpit',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 2,
    headSlots: 4, // life support (1), sensors (2), cockpit (1)
    otherSlots: 0,
    introductionYear: 3067,
  },
  {
    type: CockpitType.COMMAND_CONSOLE,
    name: 'Command Console',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 6,
    headSlots: 6, // life support (2), sensors (2), cockpit (1), console (1)
    otherSlots: 0,
    introductionYear: 3050,
  },
  {
    type: CockpitType.TORSO_MOUNTED,
    name: 'Torso-Mounted Cockpit',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 4,
    headSlots: 4, // sensors (2), life support (2)
    otherSlots: 2, // cockpit in CT
    introductionYear: 3053,
  },
  {
    type: CockpitType.PRIMITIVE,
    name: 'Primitive Cockpit',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    weight: 5,
    headSlots: 5,
    otherSlots: 0,
    introductionYear: 2300,
  },
  {
    type: CockpitType.INDUSTRIAL,
    name: 'Industrial Cockpit',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    weight: 3,
    headSlots: 5,
    otherSlots: 0,
    introductionYear: 2350,
  },
  {
    type: CockpitType.SUPER_HEAVY,
    name: 'Superheavy Cockpit',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 4,
    headSlots: 5,
    otherSlots: 0,
    introductionYear: 3076,
  },
] as const;

/**
 * Get cockpit definition by type
 */
export function getCockpitDefinition(
  type: CockpitType,
): CockpitDefinition | undefined {
  return COCKPIT_DEFINITIONS.find((def) => def.type === type);
}
