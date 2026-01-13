/**
 * OmniMech Helper Functions
 *
 * Utilities for OmniMech-specific operations including pod mounting
 * determination, pod space calculation, and equipment categorization.
 *
 * @spec openspec/specs/omnimech-system/spec.md
 */

import { EquipmentCategory } from '@/types/equipment';
import { IMountedEquipmentInstance, UnitState } from '@/stores/unitState';
import { MechLocation, LOCATION_SLOT_COUNTS } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { calculateIntegralHeatSinks } from '@/utils/construction/engineCalculations';

/**
 * Equipment categories that are always fixed (cannot be pod-mounted)
 */
const OMNI_FIXED_ONLY_CATEGORIES: readonly EquipmentCategory[] = [
  // Structural components are always fixed
];

/**
 * Equipment names that are always fixed (cannot be pod-mounted)
 * These correspond to MegaMekLab's isOmniFixedOnly() check
 */
const OMNI_FIXED_ONLY_EQUIPMENT: readonly string[] = [
  // Engine components
  'Fusion Engine',
  'XL Engine',
  'Light Engine',
  'Compact Engine',
  'XXL Engine',
  // Gyro components
  'Gyro',
  'XL Gyro',
  'Compact Gyro',
  'Heavy-Duty Gyro',
  // Cockpit components
  'Cockpit',
  'Life Support',
  'Sensors',
  // Structure
  'Endo Steel',
  'Endo-Composite',
  'Reinforced',
  'Composite',
  // Armor (the structure slots, not the armor points)
  'Ferro-Fibrous',
  'Light Ferro-Fibrous',
  'Heavy Ferro-Fibrous',
  'Stealth Armor',
  'Reactive Armor',
  'Reflective Armor',
  // Myomer
  'Triple Strength Myomer',
  'Industrial TSM',
  // Actuators
  'Shoulder',
  'Upper Arm Actuator',
  'Lower Arm Actuator',
  'Hand Actuator',
  'Hip',
  'Upper Leg Actuator',
  'Lower Leg Actuator',
  'Foot Actuator',
];

/**
 * Check if an equipment item is "OmniFixedOnly" - meaning it can never be pod-mounted.
 * This includes structural components, engines, gyros, cockpits, and myomer.
 *
 * @param equipment The equipment instance to check
 * @returns true if the equipment can only be fixed, never pod-mounted
 */
export function isOmniFixedOnly(equipment: IMountedEquipmentInstance): boolean {
  // Check by category
  if (OMNI_FIXED_ONLY_CATEGORIES.includes(equipment.category)) {
    return true;
  }

  // Check by name (case-insensitive partial match)
  const lowerName = equipment.name.toLowerCase();
  for (const fixedName of OMNI_FIXED_ONLY_EQUIPMENT) {
    if (lowerName.includes(fixedName.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Determine if a specific equipment item can be pod-mounted on an OmniMech.
 *
 * Rules from MegaMekLab's UnitUtil.canPodMount():
 * 1. Unit must be an OmniMech
 * 2. Equipment must not be "OmniFixedOnly"
 * 3. Heat sinks have special rules based on minimum fixed count
 * 4. All other equipment can be pod-mounted
 *
 * @param state The current unit state
 * @param equipment The equipment instance to check
 * @returns true if the equipment can be pod-mounted
 */
export function canPodMount(
  state: UnitState,
  equipment: IMountedEquipmentInstance
): boolean {
  // Rule 1: Only applies to OmniMechs
  if (!state.isOmni) {
    return false;
  }

  // Rule 2: Check for OmniFixedOnly equipment
  if (isOmniFixedOnly(equipment)) {
    return false;
  }

  // Rule 3: Special handling for heat sinks
  if (isHeatSinkEquipment(equipment)) {
    return canPodMountHeatSink(state, equipment);
  }

  // Rule 4: All other equipment can be pod-mounted
  return true;
}

/**
 * Check if equipment is a heat sink
 */
function isHeatSinkEquipment(equipment: IMountedEquipmentInstance): boolean {
  const lowerName = equipment.name.toLowerCase();
  return lowerName.includes('heat sink') || lowerName.includes('heatsink');
}

/**
 * Determine if a heat sink can be pod-mounted.
 * Heat sinks have special rules - we need to maintain a minimum number
 * of fixed heat sinks based on the engine's integral capacity.
 *
 * @param state The current unit state
 * @param heatSink The heat sink equipment to check
 * @returns true if this heat sink can be pod-mounted
 */
function canPodMountHeatSink(
  state: UnitState,
  heatSink: IMountedEquipmentInstance
): boolean {
  // Calculate the minimum required fixed heat sinks
  // This is based on the engine's weight-free heat sink capacity
  const integralHeatSinks = calculateIntegralHeatSinks(state.engineRating, state.engineType);

  // Get the base chassis heat sinks setting
  // If -1, use the integral heat sinks as default
  const baseChassisHeatSinks = state.baseChassisHeatSinks >= 0
    ? state.baseChassisHeatSinks
    : integralHeatSinks;

  // Count currently fixed (non-pod) heat sinks
  const fixedHeatSinks = state.equipment.filter(eq =>
    isHeatSinkEquipment(eq) && !eq.isOmniPodMounted
  ).length;

  // Don't count the heat sink we're checking if it's already fixed
  let adjustedFixed = fixedHeatSinks;
  if (!heatSink.isOmniPodMounted) {
    adjustedFixed--;
  }

  // Can only pod-mount if we have enough fixed heat sinks remaining
  return adjustedFixed >= baseChassisHeatSinks;
}

/**
 * Get all fixed equipment from a unit (equipment that is not pod-mounted)
 *
 * @param state The current unit state
 * @returns Array of fixed equipment instances
 */
export function getFixedEquipment(state: UnitState): IMountedEquipmentInstance[] {
  return state.equipment.filter(eq => !eq.isOmniPodMounted);
}

/**
 * Get all pod-mounted equipment from a unit
 *
 * @param state The current unit state
 * @returns Array of pod-mounted equipment instances
 */
export function getPodEquipment(state: UnitState): IMountedEquipmentInstance[] {
  return state.equipment.filter(eq => eq.isOmniPodMounted);
}

/**
 * Calculate available pod space for a specific location.
 * Pod space = total slots - fixed equipment slots - actuator slots
 *
 * @param state The current unit state
 * @param location The location to calculate pod space for
 * @returns Number of available pod slots
 */
export function calculatePodSpace(state: UnitState, location: MechLocation): number {
  // Get total slots for location
  const totalSlots = LOCATION_SLOT_COUNTS[location] || 0;

  // Get fixed equipment in this location
  const fixedEquipment = getFixedEquipment(state);
  const fixedSlotsUsed = fixedEquipment
    .filter(eq => eq.location === location)
    .reduce((total, eq) => total + eq.criticalSlots, 0);

  return Math.max(0, totalSlots - fixedSlotsUsed);
}

/**
 * Calculate total pod space across all locations
 *
 * @param state The current unit state
 * @returns Total available pod slots
 */
export function calculateTotalPodSpace(state: UnitState): number {
  // Get locations based on configuration
  const locations = getLocationsForConfiguration(state.configuration);

  return locations.reduce((total, location) =>
    total + calculatePodSpace(state, location), 0
  );
}

/**
 * Get the list of locations for a given mech configuration
 */
function getLocationsForConfiguration(configuration: string): MechLocation[] {
  switch (configuration) {
    case 'Quad':
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.FRONT_LEFT_LEG,
        MechLocation.FRONT_RIGHT_LEG,
        MechLocation.REAR_LEFT_LEG,
        MechLocation.REAR_RIGHT_LEG,
      ];
    case 'Tripod':
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
        MechLocation.CENTER_LEG,
      ];
    case 'Biped':
    default:
      return [
        MechLocation.HEAD,
        MechLocation.CENTER_TORSO,
        MechLocation.LEFT_TORSO,
        MechLocation.RIGHT_TORSO,
        MechLocation.LEFT_ARM,
        MechLocation.RIGHT_ARM,
        MechLocation.LEFT_LEG,
        MechLocation.RIGHT_LEG,
      ];
  }
}

/**
 * Get the effective base chassis heat sinks for a unit.
 * If baseChassisHeatSinks is -1 (not set), returns the engine's integral capacity.
 *
 * @param state The current unit state
 * @returns The effective base chassis heat sink count
 */
export function getEffectiveBaseChassisHeatSinks(state: UnitState): number {
  if (state.baseChassisHeatSinks >= 0) {
    return state.baseChassisHeatSinks;
  }
  return calculateIntegralHeatSinks(state.engineRating, state.engineType);
}
