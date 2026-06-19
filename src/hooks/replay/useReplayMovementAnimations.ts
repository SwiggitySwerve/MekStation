/**
 * useReplayMovementAnimations - side-effect adapter that drives
 * `useAnimationQueue` from a replay event log + scrubber cursor.
 *
 * The pure replay projection keeps token positions correct at every cursor;
 * this hook queues the visual transition between cursors.
 *
 * @spec openspec/changes/add-replay-step-and-effect-animations/specs/tactical-map-interface/spec.md
 */

import { useEffect, useRef } from 'react';

import type {
  IGameEvent,
  IMovementDeclaredPayload,
  IMovementStep,
  MovementAnimationMode,
} from '@/types/gameplay';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { Facing, GameEventType, MovementType } from '@/types/gameplay';

export interface IUseReplayMovementAnimationsOptions {
  /** Stable replay surface identifier, e.g. `replay` or `quickgame-replay`. */
  readonly mapId: string;
}

type PathMovementStep = Extract<
  IMovementStep,
  { readonly kind: 'forward' | 'lateral' }
>;

type JumpMovementStep = Extract<IMovementStep, { readonly kind: 'jump' }>;

type TurnMovementStep = Extract<IMovementStep, { readonly kind: 'turn' }>;

interface ReplayMovementAnimation {
  readonly id: string;
  readonly mapId: string;
  readonly unitId: string;
  readonly kind: 'movement';
  readonly path?: readonly [
    IMovementDeclaredPayload['from'],
    IMovementDeclaredPayload['to'],
  ];
  readonly occupiedHexes?: readonly [
    IMovementDeclaredPayload['from'],
    IMovementDeclaredPayload['to'],
  ];
  readonly mode?: MovementAnimationMode;
  readonly initialFacing?: Facing;
  readonly finalFacing?: Facing;
  readonly eventSequence: number;
}

const SKIPPED_STEP_KINDS: ReadonlySet<IMovementStep['kind']> = new Set<
  IMovementStep['kind']
>([
  'standUp',
  'convertMode',
  'altitudeControl',
  'hullDown',
  'goProne',
  'chargeDeclared',
  'dfaDeclared',
  'shakeOffSwarm',
]);

const MOVEMENT_ANIMATION_MODE_BY_TYPE: Readonly<
  Partial<Record<MovementType, MovementAnimationMode>>
> = {
  [MovementType.Walk]: MovementType.Walk,
  [MovementType.Run]: MovementType.Run,
  [MovementType.Jump]: MovementType.Jump,
};

export function useReplayMovementAnimations(
  events: readonly IGameEvent[],
  currentSequence: number,
  opts: IUseReplayMovementAnimationsOptions,
): void {
  const reducedMotion = usePrefersReducedMotion();
  const prevCursorRef = useRef<number>(-1);

  useEffect(() => {
    if (reducedMotion) {
      prevCursorRef.current = currentSequence;
      return;
    }

    const prev = prevCursorRef.current;
    const next = currentSequence;

    if (next < prev) {
      useAnimationQueue.getState().reset();
      prevCursorRef.current = next;
      return;
    }

    if (next === prev) return;

    for (const event of events) {
      if (event.type !== GameEventType.MovementDeclared) continue;
      if (event.sequence <= prev) continue;
      if (event.sequence > next) break;

      const payload = event.payload as IMovementDeclaredPayload;
      enqueueMovementForEvent(event, payload, opts.mapId);
    }

    prevCursorRef.current = next;
    // Reconnect dependencies are intentionally cursor-driven. See the
    // original spec notes: callers pass a stable replay event list and map id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSequence, opts.mapId, reducedMotion]);
}

function enqueueMovementForEvent(
  event: IGameEvent,
  payload: IMovementDeclaredPayload,
  mapId: string,
): void {
  const enqueue = useAnimationQueue.getState().enqueue;

  if (payload.steps === undefined || payload.steps.length === 0) {
    enqueue(fallbackAnimationForEvent(event, payload, mapId));
    return;
  }

  let runningFacing: Facing | undefined;
  for (const step of payload.steps) {
    const animation = animationForStep(
      step,
      payload,
      event,
      mapId,
      runningFacing,
    );
    if (animation === null) continue;

    if (animation.finalFacing !== undefined) {
      runningFacing = animation.finalFacing;
    }

    enqueue(animation);
  }
}

function fallbackAnimationForEvent(
  event: IGameEvent,
  payload: IMovementDeclaredPayload,
  mapId: string,
): ReplayMovementAnimation {
  const mode = movementAnimationModeForType(payload.movementType);
  return {
    id: `replay-movement-${event.id}-fallback`,
    mapId,
    unitId: payload.unitId,
    kind: 'movement',
    path: [payload.from, payload.to],
    occupiedHexes: [payload.from, payload.to],
    ...(mode !== null ? { mode } : {}),
    finalFacing: payload.facing,
    eventSequence: event.sequence,
  };
}

function animationForStep(
  step: IMovementStep,
  payload: IMovementDeclaredPayload,
  event: IGameEvent,
  mapId: string,
  runningFacing: Facing | undefined,
): ReplayMovementAnimation | null {
  const id = `replay-movement-${event.id}-${step.index}`;

  if (isPathMovementStep(step)) {
    return animationForPathStep(step, payload, event, mapId, id);
  }
  if (isJumpMovementStep(step)) {
    return animationForJumpStep(step, payload, event, mapId, id);
  }
  if (isTurnMovementStep(step)) {
    return animationForTurnStep(step, payload, event, mapId, id, runningFacing);
  }
  if (isSkippedMovementStep(step)) return null;

  return null;
}

function isPathMovementStep(step: IMovementStep): step is PathMovementStep {
  return step.kind === 'forward' || step.kind === 'lateral';
}

function isJumpMovementStep(step: IMovementStep): step is JumpMovementStep {
  return step.kind === 'jump';
}

function isTurnMovementStep(step: IMovementStep): step is TurnMovementStep {
  return step.kind === 'turn';
}

function isSkippedMovementStep(step: IMovementStep): boolean {
  return SKIPPED_STEP_KINDS.has(step.kind);
}

function animationForPathStep(
  step: PathMovementStep,
  payload: IMovementDeclaredPayload,
  event: IGameEvent,
  mapId: string,
  id: string,
): ReplayMovementAnimation {
  const mode = movementAnimationModeForType(payload.movementType);
  return {
    id,
    mapId,
    unitId: payload.unitId,
    kind: 'movement',
    path: [step.from, step.to],
    occupiedHexes: [step.from, step.to],
    ...(mode !== null ? { mode } : {}),
    eventSequence: event.sequence,
  };
}

function animationForJumpStep(
  step: JumpMovementStep,
  payload: IMovementDeclaredPayload,
  event: IGameEvent,
  mapId: string,
  id: string,
): ReplayMovementAnimation {
  return {
    id,
    mapId,
    unitId: payload.unitId,
    kind: 'movement',
    path: [step.from, step.to],
    occupiedHexes: [step.from, step.to],
    mode: MovementType.Jump,
    eventSequence: event.sequence,
  };
}

function animationForTurnStep(
  step: TurnMovementStep,
  payload: IMovementDeclaredPayload,
  event: IGameEvent,
  mapId: string,
  id: string,
  runningFacing: Facing | undefined,
): ReplayMovementAnimation {
  return {
    id,
    mapId,
    unitId: payload.unitId,
    kind: 'movement',
    initialFacing: runningFacing ?? step.fromFacing,
    finalFacing: step.toFacing,
    eventSequence: event.sequence,
  };
}

function movementAnimationModeForType(
  movementType: MovementType,
): MovementAnimationMode | null {
  return MOVEMENT_ANIMATION_MODE_BY_TYPE[movementType] ?? null;
}
