/**
 * Battle Armor Chassis Utilities
 *
 * Rules for Biped vs Quad chassis: manipulator count, slot capacity,
 * and arm-mount eligibility.
 *
 * @spec openspec/changes/add-battlearmor-construction/specs/battle-armor-unit-system/spec.md
 * Requirement: Manipulator Configuration
 */

import {
  BAChassisType,
  BALocation,
  BA_BIPED_SLOT_CAPACITY,
  BA_QUAD_SLOT_CAPACITY,
  BAManipulator,
} from '@/types/unit/BattleArmorInterfaces';

/**
 * Return the slot capacity table for the given chassis type.
 * Quad has 0 arm slots; both share Body (2) and Leg (1) slots.
 */
export function getSlotCapacity(
  chassisType: BAChassisType,
): Readonly<Record<BALocation, number>> {
  return chassisType === BAChassisType.BIPED
    ? BA_BIPED_SLOT_CAPACITY
    : BA_QUAD_SLOT_CAPACITY;
}

/**
 * Return the default manipulators for a chassis type.
 * Biped defaults to Basic Claw on each arm.
 * Quad returns an empty array (no arms).
 */
export function getDefaultManipulators(
  chassisType: BAChassisType,
): [BAManipulator, BAManipulator] | [] {
  if (chassisType === BAChassisType.BIPED) {
    return [BAManipulator.BASIC_CLAW, BAManipulator.BASIC_CLAW];
  }
  return [];
}

/**
 * Determine whether arm-mounted equipment is allowed given chassis type.
 * Quad chassis has no arms; arm mounting is always disallowed.
 */
export function isArmMountAllowed(chassisType: BAChassisType): boolean {
  return chassisType === BAChassisType.BIPED;
}

/**
 * Check whether a given location is an arm location.
 */
export function isArmLocation(location: BALocation): boolean {
  return location === BALocation.LEFT_ARM || location === BALocation.RIGHT_ARM;
}

/**
 * Check whether a given location is a leg location.
 * Leg-mounted equipment is restricted to anti-personnel weapons only.
 */
export function isLegLocation(location: BALocation): boolean {
  return location === BALocation.LEFT_LEG || location === BALocation.RIGHT_LEG;
}
