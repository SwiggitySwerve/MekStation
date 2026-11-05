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
  INTERFACE = 'Interface',
  VRRP = 'Virtual Reality Piloting Pod',
  PRIMITIVE_INDUSTRIAL = 'Primitive Industrial',
}

export const INTERFACE_COCKPIT_SOURCE_TAG = 'INTERFACE';
export const VRRP_COCKPIT_SOURCE_TAG = 'VRRP';
export const PRIMITIVE_INDUSTRIAL_COCKPIT_SOURCE_TAG = 'PRIMITIVE_INDUSTRIAL';

/**
 * Fixed cockpit system positions (0-based) for the selected cockpit, shared by
 * slot topology and the derived head/other slot counts below. Pinned MegaMek
 * 48fcb2f64 Mek.java:5692-5702 (small), 5719-5727 (command console) and
 * 5797-5838 (torso-mounted: head sensors, the first two free center-torso
 * slots, and life support at side-torso slot 0 ahead of the engine).
 */
export function getCockpitSystemSlots(type: string = CockpitType.STANDARD): {
  readonly head: ReadonlyMap<number, string>;
  readonly centerTorso: readonly string[];
  readonly sideTorso: readonly string[];
} {
  if (type === CockpitType.TORSO_MOUNTED || type === CockpitType.VRRP)
    return {
      head: new Map([
        [0, 'Sensors'],
        [1, 'Sensors'],
      ]),
      centerTorso:
        type === CockpitType.VRRP
          ? ['Virtual Reality Piloting Pod', 'Life Support']
          : ['Torso-Mounted Cockpit', 'Sensors'],
      sideTorso: ['Life Support'],
    };
  const head = new Map([
    [0, 'Life Support'],
    [1, 'Sensors'],
    [2, 'Standard Cockpit'],
    [4, 'Sensors'],
    [5, 'Life Support'],
  ]);
  if (type === CockpitType.SMALL) {
    head.delete(4);
    head.delete(5);
    head.set(2, 'Small Cockpit');
    head.set(3, 'Sensors');
  } else if (type === CockpitType.COMMAND_CONSOLE) {
    head.set(3, 'Command Console');
  } else if (type === CockpitType.INTERFACE) {
    // MegaMek 48fcb2f64 Mek.java:5709-5720 occupies both cockpit cells.
    head.set(2, 'Interface Cockpit');
    head.set(3, 'Interface Cockpit');
  }
  return { head, centerTorso: [], sideTorso: [] };
}

/**
 * Cockpit definition with all characteristics
 */
export interface CockpitDefinition {
  readonly type: CockpitType;
  /** Native source tag for variants absent from legacy mapper aliases. */
  readonly sourceTag?: string;
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
    headSlots: 2, // sensors (2); Mek.java:5800-5805
    otherSlots: 4, // CT cockpit + sensors, life support per side torso
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
  {
    // MegaMek 48fcb2f64 TestMek.java:225-246.
    type: CockpitType.INTERFACE,
    sourceTag: INTERFACE_COCKPIT_SOURCE_TAG,
    name: 'Interface Cockpit',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    weight: 4,
    headSlots: 6,
    otherSlots: 0,
    introductionYear: 3074, // Earliest prototype: Mek.java:3818-3825.
  },
  {
    // 48fcb2f64 TestMek.java:225-230; Mek.java:5797-5838,3826-3836.
    type: CockpitType.VRRP,
    sourceTag: VRRP_COCKPIT_SOURCE_TAG,
    name: 'Virtual Reality Piloting Pod',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    weight: 3,
    headSlots: 2,
    otherSlots: 4,
    introductionYear: 3052,
  },
  {
    // 48fcb2f64 Mek.java:3785-3793; TestMek.java:238-242.
    type: CockpitType.PRIMITIVE_INDUSTRIAL,
    sourceTag: PRIMITIVE_INDUSTRIAL_COCKPIT_SOURCE_TAG,
    name: 'Primitive Industrial Cockpit',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 5,
    headSlots: 5,
    otherSlots: 0,
    introductionYear: 2295,
  },
] as const;

/** Shared native identity; legacy exact/fuzzy aliases retain their guards. */
export function getNativeCockpitType(source: string): CockpitType | undefined {
  const normalized = source.trim().toUpperCase();
  return COCKPIT_DEFINITIONS.find(
    (definition) =>
      definition.sourceTag !== undefined &&
      (definition.sourceTag === normalized ||
        definition.type.toUpperCase() === normalized ||
        definition.name.toUpperCase() === normalized),
  )?.type;
}

/** Recover a lost tag only from the complete native VRRP system layout. */
export function getCockpitTypeFromSystems(
  head: readonly string[],
  centerTorso: readonly string[],
  leftTorso: readonly string[],
  rightTorso: readonly string[],
): CockpitType | undefined {
  // Mek.java:5797-5838: torso cockpits use CT sensors instead of CT life support.
  if (
    head[0] === 'sensors' &&
    head[1] === 'sensors' &&
    !head.includes('cockpit') &&
    !head.includes('life support') &&
    centerTorso.includes('cockpit') &&
    centerTorso.includes('life support') &&
    leftTorso[0] === 'life support' &&
    rightTorso[0] === 'life support'
  )
    return CockpitType.VRRP;
  return undefined;
}

/**
 * Get cockpit definition by type
 */
export function getCockpitDefinition(
  type: CockpitType,
): CockpitDefinition | undefined {
  return COCKPIT_DEFINITIONS.find((def) => def.type === type);
}
