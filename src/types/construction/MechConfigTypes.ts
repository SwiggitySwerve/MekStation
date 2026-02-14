/**
 * Mech Configuration System - Shared Types
 *
 * Type definitions and enums shared across all mech configuration modules.
 *
 * @spec openspec/specs/mech-configuration-system/spec.md
 */

import { MechConfiguration } from '../unit/BattleMechInterfaces';
import { MechLocation } from './CriticalSlotAllocation';

// Re-export for convenience
export { MechLocation, MechConfiguration };

/**
 * Biped-only locations (for backward compatibility with existing code)
 */
export type BipedLocation =
  | MechLocation.HEAD
  | MechLocation.CENTER_TORSO
  | MechLocation.LEFT_TORSO
  | MechLocation.RIGHT_TORSO
  | MechLocation.LEFT_ARM
  | MechLocation.RIGHT_ARM
  | MechLocation.LEFT_LEG
  | MechLocation.RIGHT_LEG;

/**
 * All biped locations as an array
 */
export const BIPED_LOCATION_VALUES: BipedLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

/**
 * Check if a location is a biped location
 */
export function isBipedLocation(
  location: MechLocation,
): location is BipedLocation {
  return BIPED_LOCATION_VALUES.includes(location as BipedLocation);
}

/**
 * Actuator types
 */
export enum ActuatorType {
  // Arm actuators
  SHOULDER = 'Shoulder',
  UPPER_ARM = 'Upper Arm Actuator',
  LOWER_ARM = 'Lower Arm Actuator',
  HAND = 'Hand Actuator',

  // Leg actuators
  HIP = 'Hip',
  UPPER_LEG = 'Upper Leg Actuator',
  LOWER_LEG = 'Lower Leg Actuator',
  FOOT = 'Foot Actuator',
}

/**
 * Actuator slot definition
 */
export interface IActuatorSlot {
  readonly type: ActuatorType;
  readonly slotIndex: number;
  readonly required: boolean;
  readonly removable: boolean;
}

/**
 * Location definition within a configuration
 */
export interface ILocationDefinition {
  readonly id: MechLocation;
  readonly displayName: string;
  readonly abbreviation: string;
  readonly criticalSlots: number;
  readonly hasRearArmor: boolean;
  readonly isLimb: boolean;
  readonly actuators: readonly IActuatorSlot[];
  readonly transfersTo?: MechLocation;
  readonly maxArmorMultiplier: number; // Multiplied by internal structure points
}

/**
 * Equipment mounting rule
 */
export interface IMountingRule {
  readonly equipmentCategory: string;
  readonly allowedLocations: readonly MechLocation[];
  readonly requiresActuator?: ActuatorType;
  readonly prohibitedReason?: string;
}

/**
 * LAM operating mode
 */
export enum LAMMode {
  MECH = 'Mech',
  AIRMECH = 'AirMech',
  FIGHTER = 'Fighter',
}

/**
 * LAM mode definition
 */
export interface ILAMModeDefinition {
  readonly mode: LAMMode;
  readonly displayName: string;
  readonly movementType: 'ground' | 'vtol' | 'aerospace';
  readonly weaponRestrictions: readonly string[];
  readonly armorLocationMapping?: Readonly<Record<MechLocation, MechLocation>>;
}

/**
 * QuadVee operating mode
 */
export enum QuadVeeMode {
  MECH = 'Mech',
  VEHICLE = 'Vehicle',
}

/**
 * QuadVee mode definition
 */
export interface IQuadVeeModeDefinition {
  readonly mode: QuadVeeMode;
  readonly displayName: string;
  readonly movementType: 'ground' | 'tracked';
  readonly description: string;
}

/**
 * QuadVee mode definitions
 */
export const QUADVEE_MODES: readonly IQuadVeeModeDefinition[] = [
  {
    mode: QuadVeeMode.MECH,
    displayName: 'Mech Mode',
    movementType: 'ground',
    description: 'Standard quad mech movement with legs',
  },
  {
    mode: QuadVeeMode.VEHICLE,
    displayName: 'Vehicle Mode',
    movementType: 'tracked',
    description: 'Tracked vehicle movement with wheels/treads',
  },
];

/**
 * Complete mech configuration definition
 */
export interface IMechConfigurationDefinition {
  readonly id: MechConfiguration;
  readonly displayName: string;
  readonly description: string;

  // Location layout
  readonly locations: readonly ILocationDefinition[];

  // Equipment restrictions
  readonly mountingRules: readonly IMountingRule[];
  readonly prohibitedEquipment: readonly string[];

  // Movement modifiers
  readonly baseMovementModifier: number;

  // For transforming units (LAM, QuadVee)
  readonly modes?: readonly ILAMModeDefinition[];

  // Required equipment (e.g., LAM needs Landing Gear and Avionics)
  readonly requiredEquipment?: readonly {
    readonly equipmentId: string;
    readonly locations: readonly MechLocation[];
  }[];

  // Visual component reference
  readonly diagramComponentName: string;
}
