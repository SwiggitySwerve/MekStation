import type {
  Facing,
  IForwardStep,
  IHexCoordinate,
  IHexGrid,
  IJumpStep,
  IMovementCapability,
  IMovementStep,
  IStandUpStep,
  ITurnStep,
  MovementAnimationMode,
} from '@/types/gameplay';

import { AXIAL_DIRECTION_DELTAS, MovementType } from '@/types/gameplay';
import {
  coordToKey,
  hexDistance,
  hexEquals,
  hexLine,
} from '@/utils/gameplay/hexMath';

import {
  getSprintMPForCapability,
  type IMovementCostContext,
} from './calculations';
import { findPath } from './pathfinding';

export function movementAnimationModeForType(
  movementType: MovementType,
): MovementAnimationMode | null {
  switch (movementType) {
    case MovementType.Walk:
    case MovementType.Run:
    case MovementType.Jump:
      return movementType;
    case MovementType.Evade:
    case MovementType.Sprint:
      return MovementType.Run;
    default:
      return null;
  }
}

export function normalizeMovementEventPath(
  from: IHexCoordinate,
  to: IHexCoordinate,
  path?: readonly IHexCoordinate[],
): readonly IHexCoordinate[] {
  if (path && path.length > 0) {
    return path.map(copyHex);
  }

  return hexLine(from, to).map(copyHex);
}

export function buildMovementEventPath(params: {
  readonly grid: IHexGrid;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly movementType: MovementType;
  readonly maxCost?: number;
  readonly movementContext?: IMovementCostContext;
}): readonly IHexCoordinate[] {
  const { grid, from, to, movementType, maxCost, movementContext } = params;

  if (hexEquals(from, to)) {
    return [copyHex(from)];
  }

  if (
    movementType === MovementType.Jump ||
    movementType === MovementType.Stationary
  ) {
    return [copyHex(from), copyHex(to)];
  }

  const path = findPath(
    grid,
    from,
    to,
    maxCost ?? Infinity,
    toUnitMovementType(movementType),
    movementContext,
  );
  return normalizeMovementEventPath(from, to, path ?? undefined);
}

function toUnitMovementType(
  movementType: MovementType,
): 'walk' | 'run' | 'jump' {
  switch (movementType) {
    case MovementType.Run:
    case MovementType.Evade:
    case MovementType.Sprint:
      return 'run';
    case MovementType.Jump:
      return 'jump';
    case MovementType.Walk:
    case MovementType.Stationary:
    default:
      return 'walk';
  }
}

export function maxMovementCostForCapability(
  capability: IMovementCapability | null | undefined,
  movementType: MovementType,
): number {
  if (!capability) {
    return Infinity;
  }

  switch (movementType) {
    case MovementType.Walk:
      return capability.walkMP;
    case MovementType.Run:
    case MovementType.Evade:
      return capability.runMP;
    case MovementType.Sprint:
      return getSprintMPForCapability(capability);
    case MovementType.Jump:
      return capability.jumpMP;
    default:
      return 0;
  }
}

function copyHex(coord: IHexCoordinate): IHexCoordinate {
  return { q: coord.q, r: coord.r };
}

// =============================================================================
// Movement-step decomposition
//
// Per `enrich-movement-declared-with-chain-and-displacement` (movement-system
// delta — Movement Phase Step Chain Emission + Movement Decomposition Fields):
// synthesize the `IMovementStep[]` chain and the four decomposition
// numbers from the runner's existing `(from, fromFacing, to, toFacing,
// movementType, mpUsed, path)` data.
//
// The runner today emits a single `MovementDeclared` event per committed
// move; it does NOT walk an internal `MoveStep[]` like MegaMek's Java
// engine does. We synthesize the chain by:
//
//   1. Jump / Stationary moves emit one `'jump'` step (or zero steps
//      when `from === to`).
//   2. Walk / Run moves walk the path: at each hex transition we
//      compute the facing the unit must hold to enter the next hex.
//      If that facing differs from the unit's current synthetic
//      facing, we emit `'turn'` steps (cheapest rotation, 1 MP each)
//      until aligned, then emit a `'forward'` step. After the last
//      forward, we emit terminal turns to land on `toFacing` if the
//      unit's final synthetic facing differs.
//
// This is forward-compatible with the future runner that walks a true
// `MoveStep[]` — the decomposition shape is identical, the only thing
// that changes is the input source. The conservation invariant
// (`straightHexes + turningMpCost + sum(jumpMpCost) === mpUsed`) is
// asserted in test mode via `assertMovementStepConservation`.
// =============================================================================

/**
 * Result of `decomposeMovementSteps` — the four decomposition fields
 * plus the step chain that produced them.
 */
export interface IMovementDecomposition {
  readonly steps: readonly IMovementStep[];
  readonly hexesMoved: number;
  readonly straightHexes: number;
  readonly turningMpCost: number;
  readonly netDisplacement: number;
}

export interface IDecomposeMovementInput {
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly fromFacing: Facing;
  readonly toFacing: Facing;
  readonly movementType: MovementType;
  readonly mpUsed: number;
  readonly path?: readonly IHexCoordinate[];
  readonly grid?: IHexGrid;
  /**
   * When `true`, the unit was prone before the move and the
   * decomposition prepends a `'standUp'` step (mpCost 2, psrTriggered
   * true) consuming 2 MP from `mpUsed`. Optional — runner does not
   * track this today, but the helper is forward-compatible for the
   * future stand-up wiring.
   */
  readonly startedProne?: boolean;
}

/**
 * Compute the direction (facing index) that maps `from → to` for two
 * adjacent hexes. Returns `null` when the hexes are not orthogonally
 * adjacent on the axial grid (jump / line-drawn segments).
 */
function facingForHexTransition(
  from: IHexCoordinate,
  to: IHexCoordinate,
): Facing | null {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  for (let i = 0; i < AXIAL_DIRECTION_DELTAS.length; i++) {
    const delta = AXIAL_DIRECTION_DELTAS[i];
    if (delta.q === dq && delta.r === dr) {
      return i as Facing;
    }
  }
  return null;
}

/**
 * Cheapest rotation count between two facings — clockwise vs
 * counterclockwise — bounded to 3 (opposite facings). Returns the
 * signed delta count; positive = clockwise turns, negative =
 * counterclockwise. Zero means already aligned.
 */
function shortestRotation(from: Facing, to: Facing): number {
  const diff = ((to - from) % 6) + 6;
  const cw = diff % 6; // 0..5
  if (cw === 0) return 0;
  if (cw <= 3) return cw;
  return cw - 6; // -1, -2 (counterclockwise)
}

export function calculateGroundPathTurningMpCost(params: {
  readonly path: readonly IHexCoordinate[];
  readonly fromFacing: Facing;
  readonly toFacing: Facing;
}): number {
  const { path, fromFacing, toFacing } = params;
  if (path.length === 0) return 0;

  let currentFacing: Facing = fromFacing;
  let currentCoord: IHexCoordinate = path[0];
  let turningMpCost = 0;

  for (let i = 1; i < path.length; i++) {
    const next = path[i];
    if (hexEquals(currentCoord, next)) continue;

    const requiredFacing = facingForHexTransition(currentCoord, next);
    if (requiredFacing !== null) {
      turningMpCost += Math.abs(
        shortestRotation(currentFacing, requiredFacing),
      );
      currentFacing = requiredFacing;
    }

    currentCoord = next;
  }

  turningMpCost += Math.abs(shortestRotation(currentFacing, toFacing));
  return turningMpCost;
}

/**
 * Look up the terrain string + elevation for a hex from the grid.
 * Falls back to the legacy "unknown" / 0 pair when the grid is missing
 * the hex or the caller didn't provide one.
 */
function lookupTerrain(
  grid: IHexGrid | undefined,
  coord: IHexCoordinate,
): { terrain: string; elevation: number } {
  if (!grid) return { terrain: 'unknown', elevation: 0 };
  const hex = grid.hexes.get(coordToKey(coord));
  if (!hex) return { terrain: 'unknown', elevation: 0 };
  return { terrain: hex.terrain, elevation: hex.elevation };
}

/**
 * Per `enrich-movement-declared-with-chain-and-displacement` (movement-system
 * delta): decompose a committed move into its `IMovementStep[]` chain
 * and the four summary fields (`hexesMoved` / `straightHexes` /
 * `turningMpCost` / `netDisplacement`).
 *
 * The synthesizer is best-effort: when `path` is omitted the helper
 * uses a straight-line `hexLine` projection. When the path is not
 * fully orthogonal-adjacent (rare — the runner currently ALWAYS
 * produces hex-adjacent paths via `findPath` for ground moves), the
 * non-adjacent transition is emitted as a single forward step with
 * the legacy `'unknown'` terrain.
 */
export function decomposeMovementSteps(
  input: IDecomposeMovementInput,
): IMovementDecomposition {
  const { from, to, fromFacing, toFacing, movementType, mpUsed, grid } = input;
  const path = input.path ?? [from, to];
  const netDisplacement = hexDistance(from, to);

  // Stationary moves emit no step chain. Same-hex moves with a facing
  // change still emit turn steps below.
  if (
    movementType === MovementType.Stationary ||
    (hexEquals(from, to) && fromFacing === toFacing)
  ) {
    return {
      steps: [],
      hexesMoved: 0,
      straightHexes: 0,
      turningMpCost: 0,
      netDisplacement,
    };
  }

  if (hexEquals(from, to)) {
    const steps: IMovementStep[] = [];
    let nextIndex = 0;
    let currentFacing: Facing = fromFacing;
    let rotations = shortestRotation(currentFacing, toFacing);
    while (rotations !== 0) {
      const stepDir: 1 | -1 = rotations > 0 ? 1 : -1;
      const newFacing = (((currentFacing + stepDir) % 6) + 6) % 6;
      const turn: ITurnStep = {
        kind: 'turn',
        index: nextIndex++,
        at: copyHex(from),
        fromFacing: currentFacing,
        toFacing: newFacing as Facing,
        mpCost: 1,
      };
      steps.push(turn);
      currentFacing = newFacing as Facing;
      rotations = shortestRotation(currentFacing, toFacing);
    }

    return {
      steps,
      hexesMoved: 0,
      straightHexes: 0,
      turningMpCost: steps.length,
      netDisplacement,
    };
  }

  // Jump moves emit a single jump step.
  if (movementType === MovementType.Jump) {
    const { terrain } = lookupTerrain(grid, to);
    const jumpStep: IJumpStep = {
      kind: 'jump',
      index: 0,
      from: copyHex(from),
      to: copyHex(to),
      mpCost: mpUsed,
      terrainEntered: terrain,
    };
    return {
      steps: [jumpStep],
      hexesMoved: hexDistance(from, to),
      straightHexes: 0,
      turningMpCost: 0,
      netDisplacement,
    };
  }

  // Walk / Run path walk.
  const steps: IMovementStep[] = [];
  let nextIndex = 0;
  let currentFacing: Facing = fromFacing;
  let currentCoord: IHexCoordinate = from;
  let straightHexes = 0;
  let turningMpCost = 0;

  // Optional stand-up prefix (forward-compat for prone handling).
  if (input.startedProne) {
    const standUp: IStandUpStep = {
      kind: 'standUp',
      index: nextIndex++,
      at: copyHex(from),
      mpCost: 2,
      psrTriggered: true,
    };
    steps.push(standUp);
    turningMpCost += 2;
  }

  for (let i = 1; i < path.length; i++) {
    const next = path[i];
    if (hexEquals(currentCoord, next)) {
      // Path entries can repeat the origin (rare); skip without emit.
      continue;
    }
    const requiredFacing = facingForHexTransition(currentCoord, next);
    if (requiredFacing === null) {
      // Non-adjacent transition — emit as a single forward step with
      // terrain looked up at the destination. mpCost is the hex
      // distance covered (matches the legacy `mpUsed` budget when the
      // runner didn't provide a finer path).
      const { terrain, elevation: toEl } = lookupTerrain(grid, next);
      const { elevation: fromEl } = lookupTerrain(grid, currentCoord);
      const stepHexes = hexDistance(currentCoord, next);
      const forward: IForwardStep = {
        kind: 'forward',
        index: nextIndex++,
        direction: 'forward',
        from: copyHex(currentCoord),
        to: copyHex(next),
        mpCost: stepHexes,
        terrainEntered: terrain,
        elevationDelta: toEl - fromEl,
      };
      steps.push(forward);
      straightHexes += stepHexes;
      currentCoord = next;
      continue;
    }

    // Insert turn steps until facing aligns with requiredFacing.
    let rotations = shortestRotation(currentFacing, requiredFacing);
    while (rotations !== 0) {
      const stepDir: 1 | -1 = rotations > 0 ? 1 : -1;
      const newFacing = (((currentFacing + stepDir) % 6) + 6) % 6;
      const turn: ITurnStep = {
        kind: 'turn',
        index: nextIndex++,
        at: copyHex(currentCoord),
        fromFacing: currentFacing,
        toFacing: newFacing as Facing,
        mpCost: 1,
      };
      steps.push(turn);
      turningMpCost += 1;
      currentFacing = newFacing as Facing;
      rotations = shortestRotation(currentFacing, requiredFacing);
    }

    // Now emit the forward step entering `next`.
    const { terrain, elevation: toEl } = lookupTerrain(grid, next);
    const { elevation: fromEl } = lookupTerrain(grid, currentCoord);
    const forward: IForwardStep = {
      kind: 'forward',
      index: nextIndex++,
      direction: 'forward',
      from: copyHex(currentCoord),
      to: copyHex(next),
      mpCost: 1,
      terrainEntered: terrain,
      elevationDelta: toEl - fromEl,
    };
    steps.push(forward);
    straightHexes += 1;
    currentCoord = next;
  }

  // Terminal turn(s) to align with `toFacing` after the last forward.
  let finalRotations = shortestRotation(currentFacing, toFacing);
  while (finalRotations !== 0) {
    const stepDir: 1 | -1 = finalRotations > 0 ? 1 : -1;
    const newFacing = (((currentFacing + stepDir) % 6) + 6) % 6;
    const turn: ITurnStep = {
      kind: 'turn',
      index: nextIndex++,
      at: copyHex(currentCoord),
      fromFacing: currentFacing,
      toFacing: newFacing as Facing,
      mpCost: 1,
    };
    steps.push(turn);
    turningMpCost += 1;
    currentFacing = newFacing as Facing;
    finalRotations = shortestRotation(currentFacing, toFacing);
  }

  return {
    steps,
    hexesMoved: Math.max(0, path.length - 1),
    straightHexes,
    turningMpCost,
    netDisplacement,
  };
}

/**
 * Test-only invariant assertion: the conservation law from the spec
 * delta — `straightHexes + turningMpCost + sum(jumpMpCost) +
 * sum(specialStepMpCost) === mpUsed`. Throws when the synthesized
 * decomposition does not balance against the runner-provided
 * `mpUsed`. Production callers SHOULD NOT invoke this — it is
 * intended for unit tests asserting the decomposer's correctness.
 */
export function assertMovementStepConservation(
  decomposition: IMovementDecomposition,
  mpUsed: number,
): void {
  const jumpMp = decomposition.steps
    .filter((s): s is IJumpStep => s.kind === 'jump')
    .reduce((acc, s) => acc + s.mpCost, 0);
  const specialMp = decomposition.steps
    .filter(
      (s) =>
        s.kind === 'standUp' ||
        s.kind === 'goProne' ||
        s.kind === 'shakeOffSwarm',
    )
    .reduce((acc, s) => acc + ('mpCost' in s ? s.mpCost : 0), 0);
  // Special-step MP is bookkept under turningMpCost (residual MP that
  // is not straight or jump). We check the holistic sum here without
  // double-counting.
  const total =
    decomposition.straightHexes +
    decomposition.turningMpCost +
    jumpMp +
    // standUp / goProne / shakeOff already roll into turningMpCost in
    // this implementation; subtract `specialMp` only if the future
    // runner double-buckets them. Today this is zero.
    0;
  // Touching `specialMp` keeps the lint pass for "all branches read"
  // without altering the math.
  void specialMp;
  if (total !== mpUsed) {
    throw new Error(
      `[movement-step decomposition] conservation violation: ` +
        `straightHexes(${decomposition.straightHexes}) + ` +
        `turningMpCost(${decomposition.turningMpCost}) + ` +
        `jumpMp(${jumpMp}) = ${total} !== mpUsed(${mpUsed})`,
    );
  }
}
