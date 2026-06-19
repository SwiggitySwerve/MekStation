import {
  AXIAL_DIRECTION_DELTAS,
  type Facing,
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IHexCoordinate,
  type IPendingPSR,
  MovementType,
} from '@/types/gameplay';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecks';
import { hexDistance, hexEquals } from '@/utils/gameplay/hexMath';
import {
  createControlledSideslipPSR,
  createFlankingAndTurningPSR,
} from '@/utils/gameplay/pilotingSkillRolls';
import { hasSPA } from '@/utils/gameplay/spaModifiers';

import { queuePendingPSR } from './physicalAttackPsr';

type MovementControlStep = {
  readonly kind: string;
  readonly index: number;
  readonly direction?: string;
  readonly from?: IHexCoordinate;
  readonly to?: IHexCoordinate;
  readonly fromFacing?: Facing;
  readonly toFacing?: Facing;
};

const BATTLEMECH_LIKE_UNIT_TYPES = new Set([
  'battlemech',
  'omnimech',
  'industrialmech',
]);

function isJumpOrStationaryMovement(movementType: MovementType): boolean {
  return (
    movementType === MovementType.Jump ||
    movementType === MovementType.Stationary
  );
}

function suppressesControlledSideslipPSR(options: {
  readonly movementType: MovementType;
  readonly abilities: readonly string[];
}): boolean {
  return (
    options.movementType === MovementType.Walk &&
    hasSPA(options.abilities, 'maneuvering_ace')
  );
}

function isRunOrSprintMovement(movementType: MovementType): boolean {
  return (
    movementType === MovementType.Run || movementType === MovementType.Sprint
  );
}

function isBattleMechLikeUnitType(unitType: string | undefined): boolean {
  if (!unitType) return true;
  const canonical = unitType.toLowerCase().replace(/[^a-z0-9]/g, '');
  return BATTLEMECH_LIKE_UNIT_TYPES.has(canonical);
}

function isPositionChangingStep(
  step: MovementControlStep,
): step is MovementControlStep & {
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
} {
  return (
    step.from !== undefined &&
    step.to !== undefined &&
    !hexEquals(step.from, step.to)
  );
}

function facingForHexTransition(
  from: IHexCoordinate,
  to: IHexCoordinate,
): Facing | undefined {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  const facingIndex = AXIAL_DIRECTION_DELTAS.findIndex(
    (delta) => delta.q === dq && delta.r === dr,
  );
  return facingIndex >= 0 ? (facingIndex as Facing) : undefined;
}

function oppositeFacing(facing: Facing): Facing {
  return ((facing + 3) % 6) as Facing;
}

function facingForMovementStep(
  step: MovementControlStep,
  currentFacing: Facing | undefined,
): Facing | undefined {
  if (currentFacing !== undefined) return currentFacing;
  if (!isPositionChangingStep(step)) return undefined;
  if (step.kind === 'lateral') return undefined;

  const travelFacing = facingForHexTransition(step.from, step.to);
  if (travelFacing === undefined) return undefined;

  return step.direction === 'backward'
    ? oppositeFacing(travelFacing)
    : travelFacing;
}

function firstFlankingAndTurningStepIndex(
  steps: readonly MovementControlStep[],
): number | undefined {
  let currentFacing: Facing | undefined;
  let previousPositionFacing: Facing | undefined;
  let distance = 0;

  for (const step of steps) {
    if (step.kind === 'turn') {
      currentFacing ??= step.fromFacing;
      previousPositionFacing ??= step.fromFacing;
      currentFacing = step.toFacing ?? currentFacing;
      continue;
    }

    if (!isPositionChangingStep(step)) continue;

    const stepFacing = facingForMovementStep(step, currentFacing);
    distance += hexDistance(step.from, step.to);

    if (
      distance > 1 &&
      previousPositionFacing !== undefined &&
      stepFacing !== undefined &&
      previousPositionFacing !== stepFacing
    ) {
      return step.index;
    }

    if (stepFacing !== undefined) {
      previousPositionFacing = stepFacing;
      currentFacing = stepFacing;
    }
  }

  return undefined;
}

function appendMovementControlPSREvent(options: {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly unitId: string;
  readonly psr: IPendingPSR;
  readonly piloting: number | undefined;
}): void {
  options.events.push(
    createPSRTriggeredEvent(
      options.gameId,
      options.events.length,
      options.turn,
      GamePhase.Movement,
      options.unitId,
      options.psr.reason,
      options.psr.additionalModifier,
      options.psr.triggerSource,
      options.piloting,
      options.psr.reasonCode,
    ),
  );
}

export function queueMovementControlPSRs(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  movementType: MovementType;
  steps: readonly MovementControlStep[];
}): IGameState {
  const { events, gameId, movementType, steps, unitId } = options;
  let currentState = options.currentState;
  const psrs = movementControlPSRsForUnit(
    currentState,
    unitId,
    movementType,
    steps,
  );

  for (const psr of psrs) {
    currentState = queuePendingPSR(currentState, unitId, psr);
    appendMovementControlPSREvent({
      events,
      gameId,
      turn: currentState.turn,
      unitId,
      psr,
      piloting: currentState.units[unitId]?.piloting,
    });
  }

  return currentState;
}

function movementControlPSRsForUnit(
  state: IGameState,
  unitId: string,
  movementType: MovementType,
  steps: readonly MovementControlStep[],
): readonly IPendingPSR[] {
  if (isJumpOrStationaryMovement(movementType)) return [];

  const unit = state.units[unitId];
  if (!unit) return [];
  if (
    suppressesControlledSideslipPSR({
      movementType,
      abilities: unit.abilities ?? [],
    })
  ) {
    return [];
  }

  const flankingAndTurningStepIndex =
    isRunOrSprintMovement(movementType) &&
    isBattleMechLikeUnitType(unit.unitType)
      ? firstFlankingAndTurningStepIndex(steps)
      : undefined;
  const psrs: IPendingPSR[] =
    flankingAndTurningStepIndex === undefined
      ? []
      : [createFlankingAndTurningPSR(unitId, flankingAndTurningStepIndex)];

  const controlledSideslipPSRs = steps
    .filter((step) => step.kind === 'lateral')
    .filter((step) => step.index !== flankingAndTurningStepIndex)
    .map((step) => createControlledSideslipPSR(unitId, step.index));

  return [...psrs, ...controlledSideslipPSRs];
}
