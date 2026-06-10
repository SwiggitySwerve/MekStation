/**
 * Movement Modifiers
 */

import type { MovementHeatProfile, MovementMotiveMode } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

const STANDARD_EVADE_HEAT = 4;
const STANDARD_SPRINT_HEAT = 3;

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
 * Options for `calculateMovementHeat`.
 *
 * Audit 2026-06-09 B-3: the previous 3rd parameter was a
 * `MovementMotiveMode | number` union, which forced every caller to choose
 * between the motive-mode gate and the Partial Wing jump bonus — the
 * projection dropped the wing bonus while validateMovement/MoveAI dropped
 * the motive-mode gate. A single options object lets every caller pass the
 * full capability state so projection and engine compute identical heat.
 */
export interface IMovementHeatOptions {
  /** Chassis/squad motive mode; non-Mek modes generate no engine heat. */
  readonly movementMode?: MovementMotiveMode;
  /** Rules-level movement heat source (mek / airmek / none). */
  readonly movementHeatProfile?: MovementHeatProfile;
  /** Partial Wing jump-heat reduction, subtracted before the 3-heat floor. */
  readonly partialWingJumpBonus?: number;
}

/**
 * Calculate heat generated from movement.
 *
 * MegaMek's base Entity movement heat is 0; Mek overrides that to engine
 * walk/run/jump heat (and `Mek#getJumpHeat` subtracts the Partial Wing
 * bonus). MekStation represents non-Mek motive systems through
 * `movementMode`, so only default/Mek-style movement generates this heat.
 */
export function calculateMovementHeat(
  movementType: MovementType,
  hexesMoved: number,
  options: IMovementHeatOptions = {},
): number {
  const { movementMode, movementHeatProfile } = options;
  // Normalize the wing bonus defensively: hydration can leave it undefined
  // and synthetic fixtures may carry non-finite values.
  const partialWingJumpBonus =
    typeof options.partialWingJumpBonus === 'number' &&
    Number.isFinite(options.partialWingJumpBonus)
      ? Math.max(0, Math.floor(options.partialWingJumpBonus))
      : 0;

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
    case MovementType.Sprint:
      return STANDARD_SPRINT_HEAT;
    case MovementType.Evade:
      return STANDARD_EVADE_HEAT;
    case MovementType.Jump:
      return Math.max(hexesMoved - partialWingJumpBonus, 3);
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
    case MovementType.Evade:
    case MovementType.Sprint:
      return 2;
    case MovementType.Jump:
      return 3;
    default:
      return 0;
  }
}
