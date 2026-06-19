import type {
  Facing,
  IForwardStep,
  IHexCoordinate,
  IHexGrid,
  IJumpStep,
  ILateralStep,
  IMovementCapability,
  IMovementStep,
  IStandUpStep,
  ITurnStep,
} from '@/types/gameplay';

import { AXIAL_DIRECTION_DELTAS, MovementType } from '@/types/gameplay';
import { coordToKey, hexDistance, hexEquals } from '@/utils/gameplay/hexMath';

import {
  calculateManeuveringAceBipedLateralShiftCost,
  calculateManeuveringAceQuadLateralStepCost,
  maneuveringAceLateralShiftDirection,
} from './lateralShift';

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
  readonly movementCapability?: IMovementCapability;
  readonly startedProne?: boolean;
}

interface IGroundDecompositionState {
  readonly steps: IMovementStep[];
  nextIndex: number;
  currentFacing: Facing;
  currentCoord: IHexCoordinate;
  straightHexes: number;
  turningMpCost: number;
}

export function decomposeMovementSteps(
  input: IDecomposeMovementInput,
): IMovementDecomposition {
  const netDisplacement = hexDistance(input.from, input.to);

  if (
    input.movementType === MovementType.Stationary ||
    (hexEquals(input.from, input.to) && input.fromFacing === input.toFacing)
  ) {
    return emptyMovementDecomposition(netDisplacement);
  }

  if (hexEquals(input.from, input.to)) {
    return decomposeSameHexTurn(input, netDisplacement);
  }

  if (input.movementType === MovementType.Jump) {
    return decomposeJumpMove(input, netDisplacement);
  }

  return decomposeGroundMove(input, netDisplacement);
}

function emptyMovementDecomposition(
  netDisplacement: number,
): IMovementDecomposition {
  return {
    steps: [],
    hexesMoved: 0,
    straightHexes: 0,
    turningMpCost: 0,
    netDisplacement,
  };
}

function decomposeSameHexTurn(
  input: IDecomposeMovementInput,
  netDisplacement: number,
): IMovementDecomposition {
  const state = createGroundState(input);
  appendTurnSteps(state, input.toFacing);
  return {
    steps: state.steps,
    hexesMoved: 0,
    straightHexes: 0,
    turningMpCost: state.turningMpCost,
    netDisplacement,
  };
}

function decomposeJumpMove(
  input: IDecomposeMovementInput,
  netDisplacement: number,
): IMovementDecomposition {
  const { terrain } = lookupTerrain(input.grid, input.to);
  const jumpStep: IJumpStep = {
    kind: 'jump',
    index: 0,
    from: copyHex(input.from),
    to: copyHex(input.to),
    mpCost: input.mpUsed,
    terrainEntered: terrain,
  };
  return {
    steps: [jumpStep],
    hexesMoved: hexDistance(input.from, input.to),
    straightHexes: 0,
    turningMpCost: 0,
    netDisplacement,
  };
}

function decomposeGroundMove(
  input: IDecomposeMovementInput,
  netDisplacement: number,
): IMovementDecomposition {
  const path = input.path ?? [input.from, input.to];
  const state = createGroundState(input);

  if (input.startedProne) appendStandUpStep(state, input.from);

  const lateral = tryDecomposeLateralStep(input, state.nextIndex);
  if (lateral) return lateral;

  for (let i = 1; i < path.length; i++) {
    appendGroundTransition(state, input, path[i]);
  }
  appendTurnSteps(state, input.toFacing);

  return {
    steps: state.steps,
    hexesMoved: Math.max(0, path.length - 1),
    straightHexes: state.straightHexes,
    turningMpCost: state.turningMpCost,
    netDisplacement,
  };
}

function createGroundState(
  input: IDecomposeMovementInput,
): IGroundDecompositionState {
  return {
    steps: [],
    nextIndex: 0,
    currentFacing: input.fromFacing,
    currentCoord: input.from,
    straightHexes: 0,
    turningMpCost: 0,
  };
}

function appendStandUpStep(
  state: IGroundDecompositionState,
  from: IHexCoordinate,
): void {
  const standUp: IStandUpStep = {
    kind: 'standUp',
    index: state.nextIndex++,
    at: copyHex(from),
    mpCost: 2,
    psrTriggered: true,
  };
  state.steps.push(standUp);
  state.turningMpCost += 2;
}

function tryDecomposeLateralStep(
  input: IDecomposeMovementInput,
  nextIndex: number,
): IMovementDecomposition | null {
  const path = input.path ?? [input.from, input.to];
  if (path.length !== 2 || input.fromFacing !== input.toFacing) return null;

  const lateralDirection = maneuveringAceLateralShiftDirection({
    from: input.from,
    to: input.to,
    facing: input.fromFacing,
  });
  const lateralCost = lateralMovementCost(input, lateralDirection);
  if (!lateralDirection || lateralCost !== input.mpUsed) return null;

  const { terrain } = lookupTerrain(input.grid, input.to);
  const lateralStep: ILateralStep = {
    kind: 'lateral',
    index: nextIndex,
    direction: lateralDirection,
    from: copyHex(input.from),
    to: copyHex(input.to),
    mpCost: lateralCost,
    terrainEntered: terrain,
  };
  return {
    steps: [lateralStep],
    hexesMoved: 1,
    straightHexes: 1,
    turningMpCost: 0,
    netDisplacement: hexDistance(input.from, input.to),
  };
}

function lateralMovementCost(
  input: IDecomposeMovementInput,
  lateralDirection: 'left' | 'right' | null,
): number {
  if (!lateralDirection) return Infinity;
  if (!input.grid) return 2;

  const params = {
    grid: input.grid,
    from: input.from,
    to: input.to,
    movementType: toUnitMovementType(input.movementType),
  };
  return input.movementCapability?.mekLegProfile === 'quad'
    ? calculateManeuveringAceQuadLateralStepCost(params)
    : calculateManeuveringAceBipedLateralShiftCost(params);
}

function appendGroundTransition(
  state: IGroundDecompositionState,
  input: IDecomposeMovementInput,
  next: IHexCoordinate,
): void {
  if (hexEquals(state.currentCoord, next)) return;

  const requiredFacing = facingForHexTransition(state.currentCoord, next);
  if (requiredFacing === null) {
    appendNonAdjacentForwardStep(state, input.grid, next);
    return;
  }

  appendTurnSteps(state, requiredFacing);
  appendAdjacentForwardStep(state, input.grid, next);
}

function appendNonAdjacentForwardStep(
  state: IGroundDecompositionState,
  grid: IHexGrid | undefined,
  next: IHexCoordinate,
): void {
  const { terrain, elevation: toElevation } = lookupTerrain(grid, next);
  const { elevation: fromElevation } = lookupTerrain(grid, state.currentCoord);
  const stepHexes = hexDistance(state.currentCoord, next);
  state.steps.push({
    kind: 'forward',
    index: state.nextIndex++,
    direction: 'forward',
    from: copyHex(state.currentCoord),
    to: copyHex(next),
    mpCost: stepHexes,
    terrainEntered: terrain,
    elevationDelta: toElevation - fromElevation,
  } satisfies IForwardStep);
  state.straightHexes += stepHexes;
  state.currentCoord = next;
}

function appendAdjacentForwardStep(
  state: IGroundDecompositionState,
  grid: IHexGrid | undefined,
  next: IHexCoordinate,
): void {
  const { terrain, elevation: toElevation } = lookupTerrain(grid, next);
  const { elevation: fromElevation } = lookupTerrain(grid, state.currentCoord);
  state.steps.push({
    kind: 'forward',
    index: state.nextIndex++,
    direction: 'forward',
    from: copyHex(state.currentCoord),
    to: copyHex(next),
    mpCost: 1,
    terrainEntered: terrain,
    elevationDelta: toElevation - fromElevation,
  } satisfies IForwardStep);
  state.straightHexes += 1;
  state.currentCoord = next;
}

function appendTurnSteps(
  state: IGroundDecompositionState,
  targetFacing: Facing,
): void {
  let rotations = shortestRotation(state.currentFacing, targetFacing);
  while (rotations !== 0) {
    const stepDir: 1 | -1 = rotations > 0 ? 1 : -1;
    const newFacing = (((state.currentFacing + stepDir) % 6) + 6) % 6;
    const turn: ITurnStep = {
      kind: 'turn',
      index: state.nextIndex++,
      at: copyHex(state.currentCoord),
      fromFacing: state.currentFacing,
      toFacing: newFacing as Facing,
      mpCost: 1,
    };
    state.steps.push(turn);
    state.turningMpCost += 1;
    state.currentFacing = newFacing as Facing;
    rotations = shortestRotation(state.currentFacing, targetFacing);
  }
}

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

function shortestRotation(from: Facing, to: Facing): number {
  const diff = ((to - from) % 6) + 6;
  const cw = diff % 6;
  if (cw === 0) return 0;
  if (cw <= 3) return cw;
  return cw - 6;
}

function lookupTerrain(
  grid: IHexGrid | undefined,
  coord: IHexCoordinate,
): { terrain: string; elevation: number } {
  if (!grid) return { terrain: 'unknown', elevation: 0 };
  const hex = grid.hexes.get(coordToKey(coord));
  if (!hex) return { terrain: 'unknown', elevation: 0 };
  return { terrain: hex.terrain, elevation: hex.elevation };
}

function copyHex(coord: IHexCoordinate): IHexCoordinate {
  return { q: coord.q, r: coord.r };
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

export function assertMovementStepConservation(
  decomposition: IMovementDecomposition,
  mpUsed: number,
): void {
  const jumpMp = decomposition.steps
    .filter((s): s is IJumpStep => s.kind === 'jump')
    .reduce((acc, s) => acc + s.mpCost, 0);
  const lateralMp = decomposition.steps
    .filter((s): s is ILateralStep => s.kind === 'lateral')
    .reduce((acc, s) => acc + s.mpCost, 0);
  const lateralStepCount = decomposition.steps.filter(
    (s) => s.kind === 'lateral',
  ).length;
  const lateralSurcharge = lateralMp - lateralStepCount;
  const total =
    decomposition.straightHexes +
    decomposition.turningMpCost +
    jumpMp +
    lateralSurcharge;

  if (total !== mpUsed) {
    throw new Error(
      `[movement-step decomposition] conservation violation: ` +
        `straightHexes(${decomposition.straightHexes}) + ` +
        `turningMpCost(${decomposition.turningMpCost}) + ` +
        `jumpMp(${jumpMp}) + ` +
        `lateralSurcharge(${lateralSurcharge}) = ${total} !== mpUsed(${mpUsed})`,
    );
  }
}
