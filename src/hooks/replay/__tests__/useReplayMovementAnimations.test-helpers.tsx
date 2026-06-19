import { act, cleanup, render } from '@testing-library/react';
import React from 'react';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IForwardStep,
  IGameEvent,
  IJumpStep,
  ILateralStep,
  IMovementDeclaredPayload,
  IMovementStep,
  MovementType,
} from '@/types/gameplay';

import { useReplayMovementAnimations } from '../useReplayMovementAnimations';

jest.mock('@/hooks/useReducedMotion', () => ({
  usePrefersReducedMotion: jest.fn(() => false),
}));

export { act, render, useAnimationQueue };

export const mockedUsePrefersReducedMotion =
  usePrefersReducedMotion as jest.MockedFunction<
    typeof usePrefersReducedMotion
  >;

export function makeEvent(
  overrides: Partial<IGameEvent> &
    Pick<IGameEvent, 'type' | 'payload' | 'sequence'>,
): IGameEvent {
  return {
    id: `evt-${overrides.sequence}`,
    gameId: 'test-game',
    timestamp: '2026-05-09T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.Movement,
    side: GameSide.Player,
    ...overrides,
  };
}

export function makeMovementEvent(
  sequence: number,
  unitId: string,
  steps: readonly IMovementStep[],
  options?: {
    movementType?: MovementType;
    facing?: Facing;
  },
): IGameEvent {
  const firstHexBearingStep = steps.find(
    (s) => s.kind === 'forward' || s.kind === 'lateral' || s.kind === 'jump',
  ) as IForwardStep | ILateralStep | IJumpStep | undefined;
  const lastHexBearingStep = [...steps]
    .reverse()
    .find(
      (s) => s.kind === 'forward' || s.kind === 'lateral' || s.kind === 'jump',
    ) as IForwardStep | ILateralStep | IJumpStep | undefined;
  const from = firstHexBearingStep?.from ?? { q: 0, r: 0 };
  const to = lastHexBearingStep?.to ?? from;

  const payload: IMovementDeclaredPayload = {
    unitId,
    from,
    to,
    facing: options?.facing ?? Facing.North,
    movementType: options?.movementType ?? MovementType.Walk,
    mpUsed: steps.length,
    heatGenerated: 0,
    steps,
  };

  return makeEvent({
    sequence,
    type: GameEventType.MovementDeclared,
    payload,
    actorId: unitId,
  });
}

export function makeLegacyMovementEvent(
  sequence: number,
  unitId: string,
  from: { q: number; r: number },
  to: { q: number; r: number },
): IGameEvent {
  const payload: IMovementDeclaredPayload = {
    unitId,
    from,
    to,
    facing: Facing.Southeast,
    movementType: MovementType.Walk,
    mpUsed: 3,
    heatGenerated: 0,
  };

  return makeEvent({
    sequence,
    type: GameEventType.MovementDeclared,
    payload,
    actorId: unitId,
  });
}

interface IHarnessProps {
  events: readonly IGameEvent[];
  currentSequence: number;
  mapId?: string;
}

export function Harness({
  events,
  currentSequence,
  mapId = 'test-replay',
}: IHarnessProps): React.ReactElement {
  useReplayMovementAnimations(events, currentSequence, { mapId });
  return <div data-testid="harness" />;
}

export function snapshotAllAnimations(): ReadonlyArray<{
  id: string;
  unitId?: string;
  hasPath: boolean;
  pathLength: number;
  mode?: string;
  hasInitialFacing: boolean;
  hasFinalFacing: boolean;
  eventSequence?: number;
}> {
  const state = useAnimationQueue.getState();
  return [...state.active, ...state.queue].map((a) => ({
    id: a.id,
    unitId: a.unitId,
    hasPath: a.path !== undefined,
    pathLength: a.path?.length ?? 0,
    mode: a.mode,
    hasInitialFacing: a.initialFacing !== undefined,
    hasFinalFacing: a.finalFacing !== undefined,
    eventSequence: a.eventSequence,
  }));
}

export function hardResetQueue(): void {
  useAnimationQueue.setState({ queue: [], active: [], isActive: false });
}

export function resetReplayAnimationTest(): void {
  cleanup();
  hardResetQueue();
  mockedUsePrefersReducedMotion.mockReturnValue(false);
}

export function cleanupReplayAnimationTest(): void {
  cleanup();
  hardResetQueue();
}
