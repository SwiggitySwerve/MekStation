/**
 * Movement Modifiers
 */

import type { MovementHeatProfile, MovementMotiveMode } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

function motiveModeGeneratesMovementHeat(
  movementMode: MovementMotiveMode | undefined,
): boolean {
  return movementMode === undefined || movementMode === 'walk';
}

function heatProfileGeneratesMovementHeat(
  movementHeatProfile: MovementHeatProfile | undefined,
  movementMode: MovementMotiveMode | undefined,
): boolean {
  if (movementHeatProfile === 'none') {
    return false;
  }
  if (movementHeatProfile === 'mek') {
    return true;
  }
  return motiveModeGeneratesMovementHeat(movementMode);
}

function isMekSwimMovementMode(
  movementMode: MovementMotiveMode | undefined,
): boolean {
  return movementMode === 'biped_swim' || movementMode === 'quad_swim';
}

function calculateAirMekMovementHeat(
  movementType: MovementType,
  hexesMoved: number,
): number | null {
  if (movementType === MovementType.Stationary) {
    return 0;
  }
  if (movementType === MovementType.Walk || movementType === MovementType.Run) {
    return Math.round(Math.max(hexesMoved, 3) / 3);
  }
  return null;
}

/**
 * Calculate heat generated from movement.
 *
 * MegaMek's base Entity movement heat is 0; Mek overrides that to engine
 * walk/run/jump heat. MekStation represents non-Mek motive systems through
 * `movementMode`, so only default/Mek-style movement generates this heat.
 */
export function calculateMovementHeat(
  movementType: MovementType,
  hexesMoved: number,
  movementMode?: MovementMotiveMode,
  movementHeatProfile?: MovementHeatProfile,
): number {
  if (movementHeatProfile === 'airmek') {
    const airMekHeat = calculateAirMekMovementHeat(movementType, hexesMoved);
    if (airMekHeat !== null) return airMekHeat;
  }

  if (
    isMekSwimMovementMode(movementMode) &&
    movementHeatProfile !== 'none' &&
    movementType !== MovementType.Stationary
  ) {
    return 1;
  }

  if (!heatProfileGeneratesMovementHeat(movementHeatProfile, movementMode)) {
    return 0;
  }

  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return 1;
    case MovementType.Run:
      return 2;
    case MovementType.Jump:
      return Math.max(hexesMoved, 3);
    default:
      return 0;
  }
}

/**
 * Calculate Target Movement Modifier based on movement this turn.
 */
export function calculateTMM(
  movementType: MovementType,
  hexesMoved: number,
): number {
  if (movementType === MovementType.Stationary) {
    return 0;
  }

  let tmm = Math.max(1, Math.ceil(hexesMoved / 5));

  if (movementType === MovementType.Jump) {
    tmm += 1;
  }

  return tmm;
}

/**
 * Calculate attacker movement modifier for to-hit rolls.
 */
export function calculateAttackerMovementModifier(
  movementType: MovementType,
): number {
  switch (movementType) {
    case MovementType.Stationary:
      return 0;
    case MovementType.Walk:
      return 1;
    case MovementType.Run:
      return 2;
    case MovementType.Jump:
      return 3;
    default:
      return 0;
  }
}
