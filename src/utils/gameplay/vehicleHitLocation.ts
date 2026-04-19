/**
 * Vehicle Hit Location Module
 *
 * Implements the 6-section vehicle hit-location table per attack direction
 * (Front / Side / Rear). VTOL variant redirects roll-of-12 on Front/Rear to
 * Rotor.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-hit-location-tables
 */

import {
  IVehicleHitLocationResult,
  VehicleAttackDirection,
  VehicleHitLocation,
} from '@/types/gameplay';

import { D6Roller, defaultD6Roller, roll2d6 } from './diceTypes';

// =============================================================================
// Hit Location Tables (2d6 → location)
// =============================================================================

/**
 * Front attack hit-location table.
 *  2=Front (TAC), 3-4=Right Side, 5-7=Front, 8-9=Left Side,
 *  10-11=Turret, 12=Front (TAC).
 */
export const VEHICLE_FRONT_HIT_TABLE: Readonly<
  Record<number, VehicleHitLocation>
> = {
  2: 'front',
  3: 'right_side',
  4: 'right_side',
  5: 'front',
  6: 'front',
  7: 'front',
  8: 'left_side',
  9: 'left_side',
  10: 'turret',
  11: 'turret',
  12: 'front',
};

/**
 * Side attack hit-location table (same table for a Left or Right arc hit).
 *  2=Side (TAC), 3-5=Rear, 6-8=Side, 9-10=Front, 11-12=Turret.
 */
export const VEHICLE_SIDE_HIT_TABLE_LEFT: Readonly<
  Record<number, VehicleHitLocation>
> = {
  2: 'left_side',
  3: 'rear',
  4: 'rear',
  5: 'rear',
  6: 'left_side',
  7: 'left_side',
  8: 'left_side',
  9: 'front',
  10: 'front',
  11: 'turret',
  12: 'turret',
};

export const VEHICLE_SIDE_HIT_TABLE_RIGHT: Readonly<
  Record<number, VehicleHitLocation>
> = {
  2: 'right_side',
  3: 'rear',
  4: 'rear',
  5: 'rear',
  6: 'right_side',
  7: 'right_side',
  8: 'right_side',
  9: 'front',
  10: 'front',
  11: 'turret',
  12: 'turret',
};

/**
 * Rear attack hit-location table.
 *  2=Rear (TAC), 3-5=Left/Right Side, 6-8=Rear, 9-10=Turret, 11-12=Rear (TAC).
 *
 * For rolls in 3-5 we alternate Right (odd dice subtotal) / Left (even);
 * mechanically TW allows either — we pick Right on odd, Left on even so unit
 * tests can drive the distribution deterministically.
 */
export const VEHICLE_REAR_HIT_TABLE: Readonly<
  Record<number, VehicleHitLocation>
> = {
  2: 'rear',
  3: 'right_side',
  4: 'left_side',
  5: 'right_side',
  6: 'rear',
  7: 'rear',
  8: 'rear',
  9: 'turret',
  10: 'turret',
  11: 'rear',
  12: 'rear',
};

/**
 * Rolls in the vehicle hit-location tables that are TAC (Through-Armor
 * Critical) triggers — 2 and 12.
 */
const TAC_ROLLS: ReadonlySet<number> = new Set([2, 12]);

// =============================================================================
// Public API
// =============================================================================

/**
 * Get the hit-location table for a given attack direction.
 *
 * For Side attacks the table is direction-specific: a Left-arc hit rolls on
 * the Left-side table (where 2 and 6-8 land on Left Side and 9-10 on Front),
 * and a Right-arc hit on the Right-side table (mirror image).
 */
export function getVehicleHitLocationTable(
  direction: VehicleAttackDirection,
): Readonly<Record<number, VehicleHitLocation>> {
  switch (direction) {
    case 'front':
      return VEHICLE_FRONT_HIT_TABLE;
    case 'left':
      return VEHICLE_SIDE_HIT_TABLE_LEFT;
    case 'right':
      return VEHICLE_SIDE_HIT_TABLE_RIGHT;
    case 'rear':
      return VEHICLE_REAR_HIT_TABLE;
  }
}

/**
 * Options for vehicle hit-location determination.
 */
export interface IVehicleHitLocationOptions {
  /** True when the target is a VTOL (roll-of-12 from Front/Rear → Rotor). */
  readonly isVTOL?: boolean;
}

/**
 * Roll 2d6 and resolve a vehicle hit location.
 */
export function determineVehicleHitLocation(
  direction: VehicleAttackDirection,
  diceRoller: D6Roller = defaultD6Roller,
  options: IVehicleHitLocationOptions = {},
): IVehicleHitLocationResult {
  const dice = roll2d6(diceRoller);
  return determineVehicleHitLocationFromRoll(
    direction,
    [dice.dice[0], dice.dice[1]],
    options,
  );
}

/**
 * Resolve a vehicle hit location for a given pre-determined 2d6 result.
 * Used in tests and deterministic replays.
 */
export function determineVehicleHitLocationFromRoll(
  direction: VehicleAttackDirection,
  dice: readonly [number, number],
  options: IVehicleHitLocationOptions = {},
): IVehicleHitLocationResult {
  const [d1, d2] = dice;
  const roll = d1 + d2;

  const table = getVehicleHitLocationTable(direction);
  let location = table[roll];

  // VTOL: roll of 12 on a Front or Rear attack lands on the Rotor instead of
  // the Turret/Rear slot (per `vehicle-hit-location-tables` scenario
  // "VTOL roll 12 hits Rotor").
  if (
    options.isVTOL &&
    roll === 12 &&
    (direction === 'front' || direction === 'rear')
  ) {
    location = 'rotor';
  }

  return {
    dice: [d1, d2],
    roll,
    direction,
    location,
    isTAC: TAC_ROLLS.has(roll),
  };
}

/**
 * True if a roll total is a TAC (Through-Armor Critical) trigger.
 */
export function isVehicleTACRoll(roll: number): boolean {
  return TAC_ROLLS.has(roll);
}
