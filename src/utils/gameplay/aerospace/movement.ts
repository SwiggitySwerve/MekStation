/**
 * Aerospace 2D Movement
 *
 * Phase 6 / 7 simplification: flying units travel in a straight line plus one
 * ≤60° turn for up to `2 × safeThrust` hexes per turn. No altitude tracking,
 * no thrust-point economy.
 *
 * Reaching the board edge exits the unit into off-map state for a configurable
 * number of turns, after which it may re-enter from any edge hex with its
 * original facing restored.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/movement-system/spec.md
 */

import {
  AerospaceEventType,
  type AerospaceEvent,
  type IAerospaceEnteredEvent,
  type IAerospaceExitedEvent,
  type IFuelDepletedEvent,
  type IHexLikeCoord,
  type IUnitDestroyedEvent,
} from './events';
import { type IAerospaceCombatState } from './state';

// ============================================================================
// Constants
// ============================================================================

/** Default turns spent off-map before re-entry is legal. */
export const DEFAULT_OFFMAP_RETURN_DELAY = 2;

/** Maximum heading change per turn, in degrees. */
export const MAX_HEADING_CHANGE_DEG = 60;

// ============================================================================
// Types
// ============================================================================

export interface IAerospaceMovementConfig {
  /** Board radius in hex-distance from origin; used to detect edge hexes. */
  readonly boardRadius: number;
  /** Turns off-map before re-entry allowed. */
  readonly offMapReturnDelay?: number;
}

export interface IAerospaceMovementParams {
  readonly unitId: string;
  readonly state: IAerospaceCombatState;
  /** Current position (before this move). */
  readonly from: IHexLikeCoord;
  /** Desired final position. */
  readonly to: IHexLikeCoord;
  /** Current heading in degrees (0 = +x, counter-clockwise positive). */
  readonly currentHeadingDeg: number;
  /** Desired new heading after the move. */
  readonly newHeadingDeg: number;
  /** Current turn number. */
  readonly currentTurn: number;
  /** Board config (edge radius + return delay). */
  readonly board: IAerospaceMovementConfig;
}

export interface IAerospaceMovementResult {
  readonly state: IAerospaceCombatState;
  readonly legal: boolean;
  readonly reason?: string;
  /** Hexes traversed (length = distance + 1 when counting start & end). */
  readonly path: readonly IHexLikeCoord[];
  /** Thrust actually spent this turn (for fuel burn). */
  readonly thrustUsed: number;
  /** True when movement pushed the unit off the board this turn. */
  readonly exitedBoard: boolean;
  /** Events emitted. */
  readonly events: readonly AerospaceEvent[];
}

// ============================================================================
// Geometry helpers (axial hex coordinates)
// ============================================================================

/** Axial hex distance (cube-distance) between two hexes. */
export function hexDistance(a: IHexLikeCoord, b: IHexLikeCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -dq - dr;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

/**
 * Linear interpolation in axial coords. Rounds to the nearest hex.
 * Used to build the traversed-hex path for strafe attacks.
 */
function cubeRound(x: number, y: number, z: number): IHexLikeCoord {
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) {
    rx = -ry - rz;
  } else if (dy > dz) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  return { q: rx, r: rz };
}

/** Produce every hex on the straight line from `a` to `b` (inclusive). */
export function hexLine(
  a: IHexLikeCoord,
  b: IHexLikeCoord,
): readonly IHexLikeCoord[] {
  const dist = hexDistance(a, b);
  if (dist === 0) return [a];
  const aCube = { x: a.q, y: -a.q - a.r, z: a.r };
  const bCube = { x: b.q, y: -b.q - b.r, z: b.r };
  const out: IHexLikeCoord[] = [];
  for (let i = 0; i <= dist; i++) {
    const t = i / dist;
    const x = aCube.x + (bCube.x - aCube.x) * t;
    const y = aCube.y + (bCube.y - aCube.y) * t;
    const z = aCube.z + (bCube.z - aCube.z) * t;
    out.push(cubeRound(x, y, z));
  }
  return out;
}

/** Normalize a heading delta to the smallest signed offset in (-180, 180]. */
export function headingDelta(fromDeg: number, toDeg: number): number {
  let delta = ((((toDeg - fromDeg) % 360) + 540) % 360) - 180;
  if (delta === -180) delta = 180; // prefer +180 over -180
  return delta;
}

// ============================================================================
// Movement resolver
// ============================================================================

/**
 * Effective safe thrust after penalties (floor 0).
 */
export function effectiveSafeThrust(state: IAerospaceCombatState): number {
  return Math.max(0, state.baseSafeThrust - state.thrustPenalty);
}

/**
 * Maximum hex distance an aerospace unit may travel this turn.
 * Phase 6 simplification: 2 × effective safe thrust.
 */
export function maxHexesPerTurn(state: IAerospaceCombatState): number {
  return 2 * effectiveSafeThrust(state);
}

/**
 * Resolve a single aerospace movement from `from` → `to`.
 *
 * Rules:
 *  - distance ≤ `2 × safeThrust`
 *  - heading change ≤ 60°
 *  - off-map / fuel events are fired as appropriate
 *  - fuel is consumed equal to thrust used (thrust = ceil(distance / 2))
 */
export function resolveAerospaceMovement(
  params: IAerospaceMovementParams,
): IAerospaceMovementResult {
  const { state } = params;
  const events: AerospaceEvent[] = [];

  if (state.destroyed) {
    return {
      state,
      legal: false,
      reason: 'unit destroyed',
      path: [params.from],
      thrustUsed: 0,
      exitedBoard: false,
      events,
    };
  }

  // Off-map units may not move.
  if (state.offMap) {
    return {
      state,
      legal: false,
      reason: 'unit off-map',
      path: [params.from],
      thrustUsed: 0,
      exitedBoard: false,
      events,
    };
  }

  const dist = hexDistance(params.from, params.to);
  const cap = maxHexesPerTurn(state);
  if (dist > cap) {
    return {
      state,
      legal: false,
      reason: `distance ${dist} exceeds max ${cap}`,
      path: [params.from],
      thrustUsed: 0,
      exitedBoard: false,
      events,
    };
  }

  const turnMag = Math.abs(
    headingDelta(params.currentHeadingDeg, params.newHeadingDeg),
  );
  if (turnMag > MAX_HEADING_CHANGE_DEG + 1e-6) {
    return {
      state,
      legal: false,
      reason: `turn ${turnMag.toFixed(1)}° exceeds 60° limit`,
      path: [params.from],
      thrustUsed: 0,
      exitedBoard: false,
      events,
    };
  }

  // Build the path
  const path = hexLine(params.from, params.to);

  // Fuel consumption — aerospace thrust ~= ceil(hexes/2) because hexes/turn = 2 * thrust.
  const thrustUsed = Math.ceil(dist / 2);
  const newFuel = Math.max(0, state.fuelRemaining - thrustUsed);
  let newState: IAerospaceCombatState = {
    ...state,
    fuelRemaining: newFuel,
  };

  // Fuel depletion
  if (state.fuelRemaining > 0 && newFuel === 0) {
    newState = { ...newState, fuelDepleted: true };
    const ev: IFuelDepletedEvent = {
      type: AerospaceEventType.FUEL_DEPLETED,
      unitId: params.unitId,
    };
    events.push(ev);
  }

  // Edge-exit detection: `to` hex's distance from origin ≥ boardRadius.
  const radius = params.board.boardRadius;
  const delay = params.board.offMapReturnDelay ?? DEFAULT_OFFMAP_RETURN_DELAY;
  const exited = hexDistance({ q: 0, r: 0 }, params.to) >= radius;
  if (exited) {
    newState = {
      ...newState,
      offMap: true,
      offMapReturnTurn: params.currentTurn + delay,
    };
    const ev: IAerospaceExitedEvent = {
      type: AerospaceEventType.AEROSPACE_EXITED,
      unitId: params.unitId,
      exitCoord: params.to,
      returnTurn: params.currentTurn + delay,
    };
    events.push(ev);

    // Fuel-depleted unit cannot re-enter — mark as destroyed (off-map timeout style).
    if (newState.fuelDepleted) {
      const destroy: IUnitDestroyedEvent = {
        type: AerospaceEventType.UNIT_DESTROYED,
        unitId: params.unitId,
        cause: 'fuel_off_board',
      };
      events.push(destroy);
    }
  }

  // Clear one-shot thrust penalty after it's been paid this turn (but KEEP
  // penalties from crits / failed control rolls cumulative — i.e. reset to 0
  // only if it was applied; we still reset here because it already reduced
  // `effectiveSafeThrust` for this resolve). A penalty accrued mid-resolve
  // applies next turn by design.
  newState = { ...newState, thrustPenalty: 0 };

  return {
    state: newState,
    legal: true,
    path,
    thrustUsed,
    exitedBoard: exited,
    events,
  };
}

// ============================================================================
// Re-entry
// ============================================================================

export interface IAerospaceReEntryParams {
  readonly unitId: string;
  readonly state: IAerospaceCombatState;
  readonly currentTurn: number;
  /** Owner-chosen re-entry hex (must be a board-edge hex). */
  readonly entryCoord: IHexLikeCoord;
  readonly board: IAerospaceMovementConfig;
}

export interface IAerospaceReEntryResult {
  readonly state: IAerospaceCombatState;
  readonly legal: boolean;
  readonly reason?: string;
  readonly events: readonly AerospaceEvent[];
}

/**
 * Bring an off-map unit back onto the board. Requires `currentTurn` ≥ the
 * recorded `offMapReturnTurn` and an edge hex. Fuel-depleted units may NOT
 * re-enter.
 */
export function resolveAerospaceReEntry(
  params: IAerospaceReEntryParams,
): IAerospaceReEntryResult {
  const { state } = params;
  if (!state.offMap) {
    return {
      state,
      legal: false,
      reason: 'unit is not off-map',
      events: [],
    };
  }
  if (state.fuelDepleted) {
    return {
      state,
      legal: false,
      reason: 'fuel depleted — cannot re-enter',
      events: [],
    };
  }
  if (params.currentTurn < state.offMapReturnTurn) {
    return {
      state,
      legal: false,
      reason: `must wait until turn ${state.offMapReturnTurn}`,
      events: [],
    };
  }
  const radius = params.board.boardRadius;
  const dist = hexDistance({ q: 0, r: 0 }, params.entryCoord);
  if (dist !== radius) {
    return {
      state,
      legal: false,
      reason: `entry hex must be on board edge (distance ${radius})`,
      events: [],
    };
  }

  const newState: IAerospaceCombatState = {
    ...state,
    offMap: false,
    offMapReturnTurn: -1,
  };
  const ev: IAerospaceEnteredEvent = {
    type: AerospaceEventType.AEROSPACE_ENTERED,
    unitId: params.unitId,
    entryCoord: params.entryCoord,
  };
  return { state: newState, legal: true, events: [ev] };
}
