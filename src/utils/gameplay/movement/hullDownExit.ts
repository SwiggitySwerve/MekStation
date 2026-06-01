import type {
  CombatLocation,
  IComponentDamageState,
  IMovementCapability,
  IUnitGameState,
} from '@/types/gameplay';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { MovementType } from '@/types/gameplay';

import { getStandingCost } from './validation';

export const STANDING_HULL_DOWN_ENTRY_MP_COST = 2;
export const PRONE_HULL_DOWN_ENTRY_BASE_MP_COST = 1;
export const HULL_DOWN_DESTROYED_SUPPORT_LOCATION_MP_PENALTY = 99;

type HullDownEntryUnitState = Pick<
  IUnitGameState,
  'componentDamage' | 'destroyedLocations' | 'hullDown' | 'prone'
>;

const BIPED_HULL_DOWN_SUPPORT_LOCATIONS: readonly CombatLocation[] = [
  'right_leg',
  'left_leg',
];
const QUAD_HULL_DOWN_SUPPORT_LOCATIONS: readonly CombatLocation[] = [
  'right_arm',
  'left_arm',
  'right_leg',
  'left_leg',
];
const NON_HIP_LEG_ACTUATORS: readonly ActuatorType[] = [
  ActuatorType.UPPER_LEG,
  ActuatorType.LOWER_LEG,
  ActuatorType.FOOT,
];

export function isMekStyleHullDownExitCapability(
  capability: IMovementCapability,
): boolean {
  if (capability.movementHeatProfile === 'none') return false;
  if (capability.movementHeatProfile === 'airmek') return false;

  switch (capability.movementMode) {
    case undefined:
    case 'walk':
    case 'umu':
    case 'biped_swim':
    case 'quad_swim':
      return true;
    default:
      return false;
  }
}

export function getHullDownExitCost(
  unit: IUnitGameState,
  capability: IMovementCapability,
  movementType: MovementType,
): number {
  if (
    unit.prone ||
    !unit.hullDown ||
    movementType === MovementType.Jump ||
    movementType === MovementType.Stationary ||
    !isMekStyleHullDownExitCapability(capability)
  ) {
    return 0;
  }

  return getStandingCost(capability);
}

export function getStandingHullDownEntryCost(
  unit: HullDownEntryUnitState,
  capability: IMovementCapability,
): number {
  if (
    unit.prone ||
    unit.hullDown ||
    !isMekStyleHullDownExitCapability(capability)
  ) {
    return 0;
  }

  return STANDING_HULL_DOWN_ENTRY_MP_COST;
}

export function getHullDownEntryCost(
  unit: HullDownEntryUnitState,
  capability: IMovementCapability,
): number {
  if (unit.prone) {
    return getProneHullDownEntryCost(unit, capability);
  }
  return getStandingHullDownEntryCost(unit, capability);
}

export function getProneHullDownEntryCost(
  unit: HullDownEntryUnitState,
  capability: IMovementCapability,
): number {
  if (
    !unit.prone ||
    unit.hullDown ||
    !isMekStyleHullDownExitCapability(capability)
  ) {
    return 0;
  }

  let cost = PRONE_HULL_DOWN_ENTRY_BASE_MP_COST;
  const componentDamage = unit.componentDamage;
  for (const location of hullDownSupportLocations(capability)) {
    if (unit.destroyedLocations.includes(location)) {
      return cost + HULL_DOWN_DESTROYED_SUPPORT_LOCATION_MP_PENALTY;
    }
    cost += countNonHipLegActuatorCrits(componentDamage, location);
    if (hasHipCrit(componentDamage, location)) {
      cost += 1;
    }
  }

  return cost;
}

export function hullDownSupportDestroyedReason(
  unit: HullDownEntryUnitState,
  capability: IMovementCapability,
): string | null {
  if (!unit.prone) return null;
  const destroyed = new Set(unit.destroyedLocations);
  return hullDownSupportLocations(capability).some((location) =>
    destroyed.has(location),
  )
    ? 'Cannot enter hull-down with a destroyed leg/support location'
    : null;
}

function hullDownSupportLocations(
  capability: IMovementCapability,
): readonly CombatLocation[] {
  return capability.standUpCapability?.standUpLegProfile === 'quad'
    ? QUAD_HULL_DOWN_SUPPORT_LOCATIONS
    : BIPED_HULL_DOWN_SUPPORT_LOCATIONS;
}

function countNonHipLegActuatorCrits(
  componentDamage: IComponentDamageState | undefined,
  location: CombatLocation,
): number {
  const locationDamage = componentDamage?.actuatorsByLocation?.[location];
  if (!locationDamage) return 0;
  return NON_HIP_LEG_ACTUATORS.reduce(
    (count, actuator) => count + (locationDamage[actuator] ? 1 : 0),
    0,
  );
}

function hasHipCrit(
  componentDamage: IComponentDamageState | undefined,
  location: CombatLocation,
): boolean {
  return (
    componentDamage?.actuatorsByLocation?.[location]?.[ActuatorType.HIP] ===
    true
  );
}
