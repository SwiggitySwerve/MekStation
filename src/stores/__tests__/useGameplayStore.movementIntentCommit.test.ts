/**
 * Store-level test for `commitComposedMovement` (task 1.4): proves the
 * intent-first commit dispatches the SAME `applyMovement` declaration the
 * legacy `commitPlannedMovement` produces for an equivalent simple move, and
 * resets the composition afterwards.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import type { InteractiveSession } from '@/engine/GameEngine';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { appendWaypointReducer } from '@/stores/useGameplayStore.movementIntent';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameStatus,
  MovementType,
  type IGameSession,
  type ILocomotionLeg,
  type IMovementIntentState,
} from '@/types/gameplay';

interface RecordedMovement {
  unitId: string;
  to: { q: number; r: number };
  facing: Facing;
  type: MovementType;
  path?: readonly { q: number; r: number }[];
}

/**
 * Fake interactive session with a single unit at {0,0} facing North that
 * records `applyMovement` calls and emits a MovementDeclared event so the
 * store's commit path runs to completion.
 */
function buildFakeSessionWithUnit(): {
  session: InteractiveSession;
  movements: RecordedMovement[];
} {
  const movements: RecordedMovement[] = [];
  let snapshot: IGameSession = {
    id: 'commit-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [],
    events: [],
    currentState: {
      gameId: 'commit-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'unit-a': {
          id: 'unit-a',
          position: { q: 0, r: 0 },
          facing: Facing.North,
        },
      } as unknown as IGameSession['currentState']['units'],
      turnEvents: [],
    },
  };

  const fake = {
    applyMovement: (
      unitId: string,
      to: { q: number; r: number },
      facing: Facing,
      type: MovementType,
      path?: readonly { q: number; r: number }[],
    ) => {
      movements.push({
        unitId,
        to,
        facing,
        type,
        ...(path !== undefined ? { path } : {}),
      });
      snapshot = {
        ...snapshot,
        events: [
          ...snapshot.events,
          {
            id: `movement-event-${snapshot.events.length}`,
            gameId: snapshot.id,
            sequence: snapshot.events.length,
            timestamp: '2026-07-01T00:00:00.000Z',
            type: GameEventType.MovementDeclared,
            turn: 1,
            phase: GamePhase.Movement,
            actorId: unitId,
            payload: {
              unitId,
              from: { q: 0, r: 0 },
              to,
              facing,
              movementType: type,
              path,
              mpUsed: path?.length ?? 0,
              heatGenerated: 0,
            },
          },
        ],
      };
    },
    getSession: () => snapshot,
    getState: () => snapshot.currentState,
    isGameOver: () => false,
    getResult: () => null,
    advancePhase: () => undefined,
    runAITurn: () => undefined,
    getAvailableActions: () => ({ validMoves: [], validTargets: [] }),
    concede: () => undefined,
  };

  return { session: fake as unknown as InteractiveSession, movements };
}

function singleLeg(
  toHex: { q: number; r: number },
  path: readonly { q: number; r: number }[],
  mpCost: number,
): ILocomotionLeg {
  return {
    from: { hex: { q: 0, r: 0 }, facingChange: 0 },
    to: { hex: toHex, facingChange: 0 },
    path,
    mpCost,
  };
}

describe('commitComposedMovement (task 1.4)', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useAnimationQueue.getState().reset();
  });

  afterEach(() => {
    useAnimationQueue.getState().reset();
  });

  it('dispatches the same applyMovement declaration as an equivalent legacy simple move', () => {
    const composed: IMovementIntentState = appendWaypointReducer(
      { items: [], lockedMode: null },
      singleLeg({ q: 3, r: -1 }, [{ q: 3, r: -1 }], 3),
      Facing.Southeast,
    );

    // Reference: what the legacy commitPlannedMovement would send for this move.
    const legacy = buildFakeSessionWithUnit();
    useGameplayStore.setState({
      interactiveSession: legacy.session,
      plannedMovement: {
        unitId: 'unit-a',
        destination: { q: 3, r: -1 },
        facing: Facing.Southeast,
        movementType: MovementType.Run,
        path: [
          { q: 0, r: 0 },
          { q: 3, r: -1 },
        ],
      },
      ui: { ...useGameplayStore.getState().ui, selectedUnitId: 'unit-a' },
    });
    useGameplayStore.getState().commitPlannedMovement();

    // Intent-first: compose the equivalent move and commit via the new path.
    useGameplayStore.getState().reset();
    const composedRun = buildFakeSessionWithUnit();
    useGameplayStore.setState({
      interactiveSession: composedRun.session,
      movementIntent: composed,
      ui: { ...useGameplayStore.getState().ui, selectedUnitId: 'unit-a' },
    });
    useGameplayStore
      .getState()
      .commitComposedMovement(composed, MovementType.Run);

    expect(composedRun.movements).toHaveLength(1);
    expect(composedRun.movements[0]).toEqual(legacy.movements[0]);
    // Composition resets after commit.
    expect(useGameplayStore.getState().movementIntent).toEqual({
      items: [],
      lockedMode: null,
    });
  });

  it('is a no-op (no applyMovement) with no session or selected unit', () => {
    const { movements } = buildFakeSessionWithUnit();
    useGameplayStore
      .getState()
      .commitComposedMovement(
        { items: [], lockedMode: null },
        MovementType.Walk,
      );
    expect(movements).toHaveLength(0);
  });
});
